const pool = require('../config/database');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const schedule = require('node-schedule');
const securityService = require('./securityService');

class BackupService {
    constructor() {
        this.backupDir = process.env.BACKUP_DIR || '/var/backups/grandpro-hmso';
        this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
        this.neonConnectionString = process.env.DATABASE_URL;
        this.scheduledJobs = new Map();
        
        // Initialize backup directory
        this.initializeBackupDirectory();
    }

    /**
     * Initialize backup directory
     */
    async initializeBackupDirectory() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log(`Backup directory initialized: ${this.backupDir}`);
        } catch (error) {
            console.error('Failed to create backup directory:', error);
        }
    }

    // =====================================================
    // BACKUP OPERATIONS
    // =====================================================

    /**
     * Perform full database backup
     * @param {string} initiatedBy - User or system initiating backup
     * @returns {object} Backup details
     */
    async performFullBackup(initiatedBy = 'system') {
        const backupId = crypto.randomBytes(16).toString('hex');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `full-backup-${timestamp}-${backupId}.sql`;
        const backupPath = path.join(this.backupDir, backupFileName);
        
        const client = await pool.connect();
        
        try {
            // Log backup start
            await client.query(
                `INSERT INTO security.backup_history 
                 (id, backup_type, backup_location, status, created_by)
                 VALUES ($1, 'full', $2, 'in_progress', $3)`,
                [backupId, backupPath, initiatedBy]
            );
            
            console.log(`Starting full backup: ${backupId}`);
            
            // For Neon, we'll use pg_dump via connection string
            const dumpCommand = `pg_dump "${this.neonConnectionString}" > "${backupPath}"`;
            
            // Execute backup
            await execAsync(dumpCommand);
            
            // Get file size
            const stats = await fs.stat(backupPath);
            const fileSize = stats.size;
            
            // Compress backup
            const compressedPath = await this.compressBackup(backupPath);
            const compressedStats = await fs.stat(compressedPath);
            
            // Encrypt backup
            const encryptedPath = await this.encryptBackup(compressedPath);
            const encryptedStats = await fs.stat(encryptedPath);
            
            // Calculate checksum
            const checksum = await this.calculateChecksum(encryptedPath);
            
            // Clean up unencrypted files
            await fs.unlink(backupPath);
            await fs.unlink(compressedPath);
            
            // Update backup record
            await client.query(
                `UPDATE security.backup_history 
                 SET status = 'completed',
                     completed_at = CURRENT_TIMESTAMP,
                     backup_size = $1,
                     checksum = $2,
                     backup_location = $3
                 WHERE id = $4`,
                [encryptedStats.size, checksum, encryptedPath, backupId]
            );
            
            console.log(`Full backup completed: ${backupId}`);
            console.log(`Original size: ${this.formatBytes(fileSize)}`);
            console.log(`Compressed size: ${this.formatBytes(compressedStats.size)}`);
            console.log(`Encrypted size: ${this.formatBytes(encryptedStats.size)}`);
            console.log(`Compression ratio: ${((1 - compressedStats.size / fileSize) * 100).toFixed(2)}%`);
            
            return {
                backupId,
                type: 'full',
                location: encryptedPath,
                size: encryptedStats.size,
                checksum,
                compressionRatio: (1 - compressedStats.size / fileSize) * 100,
                timestamp: new Date()
            };
            
        } catch (error) {
            console.error('Backup failed:', error);
            
            // Log failure
            await client.query(
                `UPDATE security.backup_history 
                 SET status = 'failed',
                     completed_at = CURRENT_TIMESTAMP,
                     error_message = $1
                 WHERE id = $2`,
                [error.message, backupId]
            );
            
            // Clean up partial backup
            try {
                await fs.unlink(backupPath);
            } catch (e) {
                // File might not exist
            }
            
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Perform incremental backup (backup only changes since last full backup)
     * @param {string} initiatedBy - User or system initiating backup
     * @returns {object} Backup details
     */
    async performIncrementalBackup(initiatedBy = 'system') {
        const backupId = crypto.randomBytes(16).toString('hex');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `incremental-backup-${timestamp}-${backupId}.sql`;
        const backupPath = path.join(this.backupDir, backupFileName);
        
        const client = await pool.connect();
        
        try {
            // Get last full backup timestamp
            const lastBackup = await client.query(
                `SELECT completed_at FROM security.backup_history 
                 WHERE backup_type = 'full' AND status = 'completed'
                 ORDER BY completed_at DESC LIMIT 1`
            );
            
            if (lastBackup.rows.length === 0) {
                console.log('No full backup found, performing full backup instead');
                return await this.performFullBackup(initiatedBy);
            }
            
            const lastBackupTime = lastBackup.rows[0].completed_at;
            
            // Log backup start
            await client.query(
                `INSERT INTO security.backup_history 
                 (id, backup_type, backup_location, status, created_by)
                 VALUES ($1, 'incremental', $2, 'in_progress', $3)`,
                [backupId, backupPath, initiatedBy]
            );
            
            console.log(`Starting incremental backup: ${backupId}`);
            console.log(`Changes since: ${lastBackupTime}`);
            
            // For incremental backup, we'll export changed data based on updated_at timestamps
            // This is a simplified approach - in production, you'd use WAL-based incremental backups
            const tables = await this.getTablesWithTimestamps();
            
            let backupContent = `-- Incremental Backup\n`;
            backupContent += `-- Generated: ${new Date().toISOString()}\n`;
            backupContent += `-- Changes since: ${lastBackupTime}\n\n`;
            
            for (const table of tables) {
                const result = await client.query(
                    `SELECT * FROM ${table.schema}.${table.name} 
                     WHERE updated_at > $1`,
                    [lastBackupTime]
                );
                
                if (result.rows.length > 0) {
                    backupContent += `\n-- Table: ${table.schema}.${table.name}\n`;
                    backupContent += this.generateInsertStatements(table, result.rows);
                }
            }
            
            // Write backup to file
            await fs.writeFile(backupPath, backupContent);
            
            // Get file size
            const stats = await fs.stat(backupPath);
            const fileSize = stats.size;
            
            // Compress and encrypt
            const compressedPath = await this.compressBackup(backupPath);
            const encryptedPath = await this.encryptBackup(compressedPath);
            const encryptedStats = await fs.stat(encryptedPath);
            
            // Calculate checksum
            const checksum = await this.calculateChecksum(encryptedPath);
            
            // Clean up unencrypted files
            await fs.unlink(backupPath);
            await fs.unlink(compressedPath);
            
            // Update backup record
            await client.query(
                `UPDATE security.backup_history 
                 SET status = 'completed',
                     completed_at = CURRENT_TIMESTAMP,
                     backup_size = $1,
                     checksum = $2,
                     backup_location = $3
                 WHERE id = $4`,
                [encryptedStats.size, checksum, encryptedPath, backupId]
            );
            
            console.log(`Incremental backup completed: ${backupId}`);
            
            return {
                backupId,
                type: 'incremental',
                location: encryptedPath,
                size: encryptedStats.size,
                checksum,
                timestamp: new Date(),
                changesSince: lastBackupTime
            };
            
        } catch (error) {
            console.error('Incremental backup failed:', error);
            
            await client.query(
                `UPDATE security.backup_history 
                 SET status = 'failed',
                     completed_at = CURRENT_TIMESTAMP,
                     error_message = $1
                 WHERE id = $2`,
                [error.message, backupId]
            );
            
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Compress backup file using gzip
     * @param {string} filePath - Path to backup file
     * @returns {string} Path to compressed file
     */
    async compressBackup(filePath) {
        const compressedPath = `${filePath}.gz`;
        await execAsync(`gzip -c "${filePath}" > "${compressedPath}"`);
        return compressedPath;
    }

    /**
     * Encrypt backup file using AES-256-GCM
     * @param {string} filePath - Path to backup file
     * @returns {string} Path to encrypted file
     */
    async encryptBackup(filePath) {
        const encryptedPath = `${filePath}.enc`;
        
        // Read file
        const data = await fs.readFile(filePath);
        
        // Generate IV
        const iv = crypto.randomBytes(16);
        
        // Create cipher
        const cipher = crypto.createCipheriv(
            'aes-256-gcm',
            Buffer.from(this.encryptionKey, 'hex'),
            iv
        );
        
        // Encrypt data
        const encrypted = Buffer.concat([
            cipher.update(data),
            cipher.final()
        ]);
        
        // Get auth tag
        const authTag = cipher.getAuthTag();
        
        // Combine IV, auth tag, and encrypted data
        const combined = Buffer.concat([iv, authTag, encrypted]);
        
        // Write encrypted file
        await fs.writeFile(encryptedPath, combined);
        
        return encryptedPath;
    }

    /**
     * Decrypt backup file
     * @param {string} encryptedPath - Path to encrypted backup
     * @param {string} outputPath - Path for decrypted output
     * @returns {string} Path to decrypted file
     */
    async decryptBackup(encryptedPath, outputPath) {
        // Read encrypted file
        const combined = await fs.readFile(encryptedPath);
        
        // Extract components
        const iv = combined.slice(0, 16);
        const authTag = combined.slice(16, 32);
        const encrypted = combined.slice(32);
        
        // Create decipher
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(this.encryptionKey, 'hex'),
            iv
        );
        decipher.setAuthTag(authTag);
        
        // Decrypt data
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        // Write decrypted file
        await fs.writeFile(outputPath, decrypted);
        
        return outputPath;
    }

    /**
     * Calculate SHA-256 checksum of file
     * @param {string} filePath - Path to file
     * @returns {string} Hex encoded checksum
     */
    async calculateChecksum(filePath) {
        const data = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Verify backup integrity
     * @param {string} backupId - Backup ID
     * @returns {boolean} Verification result
     */
    async verifyBackup(backupId) {
        const client = await pool.connect();
        
        try {
            // Get backup details
            const result = await client.query(
                `SELECT * FROM security.backup_history WHERE id = $1`,
                [backupId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Backup not found');
            }
            
            const backup = result.rows[0];
            
            // Calculate current checksum
            const currentChecksum = await this.calculateChecksum(backup.backup_location);
            
            // Verify checksum
            const isValid = currentChecksum === backup.checksum;
            
            console.log(`Backup verification for ${backupId}:`);
            console.log(`Expected checksum: ${backup.checksum}`);
            console.log(`Current checksum: ${currentChecksum}`);
            console.log(`Valid: ${isValid}`);
            
            return isValid;
        } finally {
            client.release();
        }
    }

    // =====================================================
    // RESTORE OPERATIONS
    // =====================================================

    /**
     * Restore from backup (to a test environment)
     * @param {string} backupId - Backup ID to restore
     * @param {string} targetDatabase - Target database connection string
     * @returns {object} Restore details
     */
    async restoreBackup(backupId, targetDatabase) {
        const client = await pool.connect();
        
        try {
            // Get backup details
            const result = await client.query(
                `SELECT * FROM security.backup_history WHERE id = $1`,
                [backupId]
            );
            
            if (result.rows.length === 0) {
                throw new Error('Backup not found');
            }
            
            const backup = result.rows[0];
            
            console.log(`Restoring backup: ${backupId}`);
            
            // Verify backup integrity
            const isValid = await this.verifyBackup(backupId);
            if (!isValid) {
                throw new Error('Backup integrity check failed');
            }
            
            // Decrypt backup
            const decryptedPath = `${backup.backup_location}.decrypted`;
            await this.decryptBackup(backup.backup_location, decryptedPath);
            
            // Decompress backup
            const decompressedPath = decryptedPath.replace('.gz.enc', '.sql');
            await execAsync(`gunzip -c "${decryptedPath}" > "${decompressedPath}"`);
            
            // Restore to target database
            const restoreCommand = `psql "${targetDatabase}" < "${decompressedPath}"`;
            await execAsync(restoreCommand);
            
            // Clean up temporary files
            await fs.unlink(decryptedPath);
            await fs.unlink(decompressedPath);
            
            console.log(`Backup restored successfully`);
            
            return {
                backupId,
                restoredAt: new Date(),
                targetDatabase: targetDatabase.split('@')[1]?.split('/')[0] || 'unknown'
            };
            
        } finally {
            client.release();
        }
    }

    // =====================================================
    // FAILOVER TESTING
    // =====================================================

    /**
     * Perform failover test
     * @param {string} performedBy - User performing the test
     * @returns {object} Test results
     */
    async performFailoverTest(performedBy) {
        const testId = crypto.randomBytes(16).toString('hex');
        const startTime = Date.now();
        const client = await pool.connect();
        
        try {
            console.log(`Starting failover test: ${testId}`);
            
            const testResults = {
                database: false,
                backup: false,
                restore: false,
                dataIntegrity: false
            };
            
            // Test 1: Database connection failover
            try {
                await client.query('SELECT 1');
                testResults.database = true;
            } catch (error) {
                console.error('Database failover test failed:', error);
            }
            
            // Test 2: Backup creation
            try {
                const backup = await this.performIncrementalBackup('failover-test');
                testResults.backup = true;
                
                // Test 3: Backup restore to test environment
                if (process.env.TEST_DATABASE_URL) {
                    await this.restoreBackup(backup.backupId, process.env.TEST_DATABASE_URL);
                    testResults.restore = true;
                }
                
                // Test 4: Data integrity check
                const isValid = await this.verifyBackup(backup.backupId);
                testResults.dataIntegrity = isValid;
                
            } catch (error) {
                console.error('Backup/restore test failed:', error);
            }
            
            const duration = Math.floor((Date.now() - startTime) / 1000);
            const success = Object.values(testResults).every(result => result === true);
            
            // Log test results
            await client.query(
                `INSERT INTO security.failover_tests 
                 (id, test_type, duration_seconds, success, services_tested, 
                  recovery_time_seconds, performed_by, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    testId,
                    'planned',
                    duration,
                    success,
                    JSON.stringify(testResults),
                    duration,
                    performedBy,
                    `Automated failover test - ${success ? 'Passed' : 'Failed'}`
                ]
            );
            
            console.log(`Failover test completed: ${testId}`);
            console.log(`Duration: ${duration} seconds`);
            console.log(`Results:`, testResults);
            
            return {
                testId,
                success,
                duration,
                testResults,
                timestamp: new Date()
            };
            
        } finally {
            client.release();
        }
    }

    // =====================================================
    // SCHEDULED BACKUP OPERATIONS
    // =====================================================

    /**
     * Schedule automated backups
     */
    scheduleBackups() {
        console.log('Scheduling automated backups...');
        
        // Daily full backup at 2 AM
        const dailyJob = schedule.scheduleJob('0 2 * * *', async () => {
            console.log('Executing scheduled daily backup...');
            try {
                await this.performFullBackup('scheduled');
                await this.cleanupOldBackups();
            } catch (error) {
                console.error('Scheduled daily backup failed:', error);
                
                // Log incident
                await securityService.logSecurityIncident({
                    type: 'backup_failure',
                    severity: 'high',
                    description: `Scheduled daily backup failed: ${error.message}`,
                    affectedResources: { service: 'backup' },
                    detectionMethod: 'scheduled_job'
                });
            }
        });
        
        this.scheduledJobs.set('daily', dailyJob);
        
        // Hourly incremental backup
        const hourlyJob = schedule.scheduleJob('0 * * * *', async () => {
            console.log('Executing scheduled hourly incremental backup...');
            try {
                await this.performIncrementalBackup('scheduled');
            } catch (error) {
                console.error('Scheduled incremental backup failed:', error);
            }
        });
        
        this.scheduledJobs.set('hourly', hourlyJob);
        
        // Weekly full backup on Sunday at 3 AM (for archival)
        const weeklyJob = schedule.scheduleJob('0 3 * * 0', async () => {
            console.log('Executing scheduled weekly archive backup...');
            try {
                const backup = await this.performFullBackup('scheduled-archive');
                // Mark as archive with longer retention
                const client = await pool.connect();
                await client.query(
                    `UPDATE security.backup_history 
                     SET retention_days = 365 
                     WHERE id = $1`,
                    [backup.backupId]
                );
                client.release();
            } catch (error) {
                console.error('Scheduled weekly backup failed:', error);
            }
        });
        
        this.scheduledJobs.set('weekly', weeklyJob);
        
        // Monthly failover test on 1st of each month at 4 AM
        const monthlyTest = schedule.scheduleJob('0 4 1 * *', async () => {
            console.log('Executing scheduled monthly failover test...');
            try {
                await this.performFailoverTest('scheduled-test');
            } catch (error) {
                console.error('Scheduled failover test failed:', error);
            }
        });
        
        this.scheduledJobs.set('monthly-test', monthlyTest);
        
        console.log('Backup schedules configured:');
        console.log('- Daily full backup at 2:00 AM');
        console.log('- Hourly incremental backup');
        console.log('- Weekly archive backup on Sundays at 3:00 AM');
        console.log('- Monthly failover test on 1st at 4:00 AM');
    }

    /**
     * Cancel scheduled backups
     */
    cancelScheduledBackups() {
        for (const [name, job] of this.scheduledJobs.entries()) {
            job.cancel();
            console.log(`Cancelled scheduled job: ${name}`);
        }
        this.scheduledJobs.clear();
    }

    /**
     * Clean up old backups based on retention policy
     */
    async cleanupOldBackups() {
        const client = await pool.connect();
        
        try {
            console.log('Cleaning up old backups...');
            
            // Get backups past retention period
            const result = await client.query(
                `SELECT * FROM security.backup_history 
                 WHERE status = 'completed' 
                   AND started_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * retention_days`
            );
            
            for (const backup of result.rows) {
                try {
                    // Delete backup file
                    await fs.unlink(backup.backup_location);
                    
                    // Update record
                    await client.query(
                        `UPDATE security.backup_history 
                         SET status = 'deleted', 
                             backup_location = NULL 
                         WHERE id = $1`,
                        [backup.id]
                    );
                    
                    console.log(`Deleted old backup: ${backup.id}`);
                } catch (error) {
                    console.error(`Failed to delete backup ${backup.id}:`, error);
                }
            }
            
            console.log(`Cleaned up ${result.rows.length} old backups`);
            
        } finally {
            client.release();
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Get list of tables with updated_at timestamps
     */
    async getTablesWithTimestamps() {
        const client = await pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    table_schema as schema,
                    table_name as name
                FROM information_schema.columns
                WHERE column_name = 'updated_at'
                  AND table_schema NOT IN ('pg_catalog', 'information_schema', 'audit', 'security', 'compliance')
                GROUP BY table_schema, table_name
            `);
            
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Generate INSERT statements for backup
     */
    generateInsertStatements(table, rows) {
        if (rows.length === 0) return '';
        
        const columns = Object.keys(rows[0]);
        let sql = '';
        
        for (const row of rows) {
            const values = columns.map(col => {
                const value = row[col];
                if (value === null) return 'NULL';
                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                if (value instanceof Date) return `'${value.toISOString()}'`;
                if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
                return value;
            }).join(', ');
            
            sql += `INSERT INTO ${table.schema}.${table.name} (${columns.join(', ')}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
        }
        
        return sql;
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get backup statistics
     */
    async getBackupStatistics() {
        const client = await pool.connect();
        
        try {
            const stats = await client.query(`
                SELECT 
                    backup_type,
                    COUNT(*) as count,
                    SUM(backup_size) as total_size,
                    AVG(backup_size) as avg_size,
                    MAX(completed_at) as last_backup,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
                FROM security.backup_history
                WHERE started_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
                GROUP BY backup_type
            `);
            
            const failoverTests = await client.query(`
                SELECT 
                    COUNT(*) as total_tests,
                    COUNT(CASE WHEN success = true THEN 1 END) as successful_tests,
                    AVG(duration_seconds) as avg_duration
                FROM security.failover_tests
                WHERE test_date > CURRENT_TIMESTAMP - INTERVAL '30 days'
            `);
            
            return {
                backups: stats.rows,
                failoverTests: failoverTests.rows[0]
            };
        } finally {
            client.release();
        }
    }
}

module.exports = new BackupService();
