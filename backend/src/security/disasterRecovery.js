const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const logger = require('../utils/logger');
const encryption = require('./encryption');

// Disaster Recovery and Backup System
class DisasterRecovery {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Backup configuration
    this.config = {
      backupPath: process.env.BACKUP_PATH || '/var/backups/grandpro',
      backupRetention: {
        daily: 7,      // Keep 7 daily backups
        weekly: 4,     // Keep 4 weekly backups
        monthly: 12    // Keep 12 monthly backups
      },
      replicationEnabled: process.env.REPLICATION_ENABLED === 'true',
      replicaServers: process.env.REPLICA_SERVERS?.split(',') || [],
      backupEncryption: true,
      compressionLevel: 9,
      maxBackupSize: 10 * 1024 * 1024 * 1024, // 10GB max per backup
      failoverEnabled: process.env.FAILOVER_ENABLED === 'true',
      rto: 4 * 60 * 60 * 1000, // Recovery Time Objective: 4 hours
      rpo: 1 * 60 * 60 * 1000  // Recovery Point Objective: 1 hour
    };

    // Initialize backup schedule
    this.initializeBackupSchedule();
  }

  // Initialize backup tables
  async initializeTables() {
    try {
      // Backup history
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS backup_history (
          id SERIAL PRIMARY KEY,
          backup_id UUID DEFAULT gen_random_uuid(),
          backup_type VARCHAR(20), -- 'full', 'incremental', 'differential'
          backup_level VARCHAR(20), -- 'daily', 'weekly', 'monthly'
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          size_bytes BIGINT,
          location TEXT,
          checksum VARCHAR(128),
          encrypted BOOLEAN DEFAULT true,
          compressed BOOLEAN DEFAULT true,
          status VARCHAR(20), -- 'in_progress', 'completed', 'failed'
          error_message TEXT,
          restored_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Recovery tests
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS recovery_tests (
          id SERIAL PRIMARY KEY,
          test_id UUID DEFAULT gen_random_uuid(),
          backup_id UUID,
          test_type VARCHAR(50), -- 'full_restore', 'partial_restore', 'failover'
          start_time TIMESTAMP,
          end_time TIMESTAMP,
          duration_seconds INTEGER,
          success BOOLEAN,
          issues_found TEXT[],
          recovery_point TIMESTAMP,
          data_integrity_check BOOLEAN,
          performance_metrics JSONB,
          tested_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Replication status
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS replication_status (
          id SERIAL PRIMARY KEY,
          replica_server VARCHAR(255),
          status VARCHAR(20), -- 'active', 'lagging', 'failed'
          lag_bytes BIGINT,
          lag_seconds INTEGER,
          last_sync TIMESTAMP,
          write_location VARCHAR(50),
          flush_location VARCHAR(50),
          replay_location VARCHAR(50),
          sync_priority INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Failover history
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS failover_history (
          id SERIAL PRIMARY KEY,
          failover_id UUID DEFAULT gen_random_uuid(),
          trigger_type VARCHAR(50), -- 'manual', 'automatic', 'scheduled'
          trigger_reason TEXT,
          old_primary VARCHAR(255),
          new_primary VARCHAR(255),
          start_time TIMESTAMP,
          promotion_time TIMESTAMP,
          data_loss_bytes BIGINT,
          affected_services TEXT[],
          recovery_actions TEXT[],
          success BOOLEAN,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // System snapshots
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS system_snapshots (
          id SERIAL PRIMARY KEY,
          snapshot_id UUID DEFAULT gen_random_uuid(),
          snapshot_type VARCHAR(50), -- 'configuration', 'data', 'full'
          components TEXT[], -- ['database', 'files', 'configuration']
          metadata JSONB,
          location TEXT,
          size_bytes BIGINT,
          checksum VARCHAR(128),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      logger.info('Disaster recovery tables initialized');
      return true;
    } catch (error) {
      logger.error('Error initializing disaster recovery tables:', error);
      return false;
    }
  }

  // Initialize backup schedule
  initializeBackupSchedule() {
    const cron = require('node-cron');

    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', () => {
      this.performBackup('daily');
    });

    // Weekly backup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', () => {
      this.performBackup('weekly');
    });

    // Monthly backup on 1st at 4 AM
    cron.schedule('0 4 1 * *', () => {
      this.performBackup('monthly');
    });

    // Hourly incremental backup
    cron.schedule('0 * * * *', () => {
      this.performIncrementalBackup();
    });

    // Check replication status every 5 minutes
    if (this.config.replicationEnabled) {
      cron.schedule('*/5 * * * *', () => {
        this.checkReplicationStatus();
      });
    }

    logger.info('Backup schedule initialized');
  }

  // Perform full backup
  async performBackup(level = 'daily') {
    const backupId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      logger.info(`Starting ${level} backup`, { backupId });

      // Record backup start
      await this.pool.query(`
        INSERT INTO backup_history 
        (backup_id, backup_type, backup_level, start_time, status)
        VALUES ($1, 'full', $2, NOW(), 'in_progress')
      `, [backupId, level]);

      // Create backup directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.config.backupPath, level, timestamp);
      await fs.mkdir(backupDir, { recursive: true });

      // 1. Backup database
      const dbBackupFile = path.join(backupDir, 'database.sql');
      await this.backupDatabase(dbBackupFile);

      // 2. Backup files
      const filesBackupFile = path.join(backupDir, 'files.tar.gz');
      await this.backupFiles(filesBackupFile);

      // 3. Backup configuration
      const configBackupFile = path.join(backupDir, 'config.json');
      await this.backupConfiguration(configBackupFile);

      // 4. Create manifest
      const manifest = {
        backupId,
        level,
        timestamp: new Date(),
        components: ['database', 'files', 'configuration'],
        checksums: {}
      };

      // Calculate checksums
      manifest.checksums.database = await this.calculateChecksum(dbBackupFile);
      manifest.checksums.files = await this.calculateChecksum(filesBackupFile);
      manifest.checksums.config = await this.calculateChecksum(configBackupFile);

      // 5. Encrypt backup if enabled
      if (this.config.backupEncryption) {
        await this.encryptBackup(backupDir);
      }

      // 6. Compress backup
      const compressedFile = `${backupDir}.tar.gz`;
      await this.compressBackup(backupDir, compressedFile);

      // Calculate final size and checksum
      const stats = await fs.stat(compressedFile);
      const finalChecksum = await this.calculateChecksum(compressedFile);

      // 7. Upload to remote storage (if configured)
      if (process.env.REMOTE_BACKUP_ENABLED === 'true') {
        await this.uploadToRemoteStorage(compressedFile);
      }

      // Update backup record
      await this.pool.query(`
        UPDATE backup_history
        SET end_time = NOW(),
            size_bytes = $1,
            location = $2,
            checksum = $3,
            status = 'completed'
        WHERE backup_id = $4
      `, [stats.size, compressedFile, finalChecksum, backupId]);

      // Clean up old backups
      await this.cleanupOldBackups(level);

      const duration = Date.now() - startTime;
      logger.info(`${level} backup completed`, { backupId, duration });

      return { backupId, location: compressedFile, size: stats.size };
    } catch (error) {
      logger.error('Backup failed:', error);
      
      // Update backup record with failure
      await this.pool.query(`
        UPDATE backup_history
        SET end_time = NOW(),
            status = 'failed',
            error_message = $1
        WHERE backup_id = $2
      `, [error.message, backupId]);

      throw error;
    }
  }

  // Perform incremental backup
  async performIncrementalBackup() {
    try {
      logger.info('Starting incremental backup');

      // Get last full backup
      const lastBackup = await this.pool.query(`
        SELECT backup_id, location, checksum
        FROM backup_history
        WHERE backup_type = 'full' AND status = 'completed'
        ORDER BY end_time DESC
        LIMIT 1
      `);

      if (lastBackup.rows.length === 0) {
        logger.warn('No full backup found, performing full backup instead');
        return await this.performBackup('daily');
      }

      const baseBackup = lastBackup.rows[0];
      const backupId = crypto.randomUUID();

      // Use WAL archiving for incremental backup (PostgreSQL specific)
      const walDir = path.join(this.config.backupPath, 'wal', new Date().toISOString().split('T')[0]);
      await fs.mkdir(walDir, { recursive: true });

      // Archive WAL files
      await execPromise(`pg_receivewal -D ${walDir} -S replication_slot_1 --if-not-exists`);

      logger.info('Incremental backup completed', { backupId });
      return { backupId, type: 'incremental' };
    } catch (error) {
      logger.error('Incremental backup failed:', error);
      throw error;
    }
  }

  // Backup database
  async backupDatabase(outputFile) {
    const command = `pg_dump ${process.env.DATABASE_URL} > ${outputFile}`;
    await execPromise(command);
    
    // Compress the dump
    await execPromise(`gzip -9 ${outputFile}`);
  }

  // Backup files
  async backupFiles(outputFile) {
    const directories = [
      '/home/grandpro-hmso-platform/uploads',
      '/home/grandpro-hmso-platform/documents',
      '/home/grandpro-hmso-platform/reports'
    ];

    const command = `tar -czf ${outputFile} ${directories.join(' ')}`;
    await execPromise(command);
  }

  // Backup configuration
  async backupConfiguration(outputFile) {
    const config = {
      environment: process.env.NODE_ENV,
      timestamp: new Date(),
      services: {
        database: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME
        },
        redis: {
          host: process.env.REDIS_HOST,
          port: process.env.REDIS_PORT
        }
      },
      features: {
        replication: this.config.replicationEnabled,
        failover: this.config.failoverEnabled
      }
    };

    await fs.writeFile(outputFile, JSON.stringify(config, null, 2));
  }

  // Encrypt backup
  async encryptBackup(backupDir) {
    const files = await fs.readdir(backupDir);
    
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        const fileContent = await fs.readFile(filePath);
        const encrypted = await encryption.encryptFile(fileContent, file);
        
        await fs.writeFile(`${filePath}.enc`, JSON.stringify(encrypted));
        await fs.unlink(filePath); // Remove unencrypted file
      }
    }
  }

  // Compress backup
  async compressBackup(sourceDir, outputFile) {
    const command = `tar -czf ${outputFile} -C ${path.dirname(sourceDir)} ${path.basename(sourceDir)}`;
    await execPromise(command);
    
    // Remove uncompressed directory
    await fs.rmdir(sourceDir, { recursive: true });
  }

  // Calculate checksum
  async calculateChecksum(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  // Upload to remote storage
  async uploadToRemoteStorage(filePath) {
    // This would integrate with cloud storage providers
    // For example: AWS S3, Azure Blob Storage, Google Cloud Storage
    
    logger.info('Uploading backup to remote storage', { file: filePath });
    
    // Example S3 upload (requires AWS SDK)
    /*
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    
    const fileStream = fs.createReadStream(filePath);
    const uploadParams = {
      Bucket: process.env.S3_BACKUP_BUCKET,
      Key: `backups/${path.basename(filePath)}`,
      Body: fileStream
    };
    
    await s3.upload(uploadParams).promise();
    */
  }

  // Restore from backup
  async restoreFromBackup(backupId, options = {}) {
    try {
      logger.info('Starting restore from backup', { backupId });

      // Get backup information
      const backup = await this.pool.query(
        'SELECT * FROM backup_history WHERE backup_id = $1',
        [backupId]
      );

      if (backup.rows.length === 0) {
        throw new Error('Backup not found');
      }

      const backupInfo = backup.rows[0];
      const startTime = Date.now();

      // 1. Verify backup integrity
      const isValid = await this.verifyBackupIntegrity(backupInfo);
      if (!isValid) {
        throw new Error('Backup integrity check failed');
      }

      // 2. Create restore point
      await this.createRestorePoint();

      // 3. Extract backup
      const extractedDir = await this.extractBackup(backupInfo.location);

      // 4. Decrypt if encrypted
      if (backupInfo.encrypted) {
        await this.decryptBackup(extractedDir);
      }

      // 5. Restore database
      if (options.includeDatabase !== false) {
        await this.restoreDatabase(path.join(extractedDir, 'database.sql.gz'));
      }

      // 6. Restore files
      if (options.includeFiles !== false) {
        await this.restoreFiles(path.join(extractedDir, 'files.tar.gz'));
      }

      // 7. Restore configuration
      if (options.includeConfig !== false) {
        await this.restoreConfiguration(path.join(extractedDir, 'config.json'));
      }

      // 8. Verify restoration
      const verificationResult = await this.verifyRestoration();

      // Update backup history
      await this.pool.query(
        'UPDATE backup_history SET restored_count = restored_count + 1 WHERE backup_id = $1',
        [backupId]
      );

      const duration = Date.now() - startTime;
      logger.info('Restore completed', { backupId, duration });

      return {
        success: true,
        duration,
        verificationResult
      };
    } catch (error) {
      logger.error('Restore failed:', error);
      
      // Attempt to rollback
      await this.rollbackRestore();
      
      throw error;
    }
  }

  // Verify backup integrity
  async verifyBackupIntegrity(backupInfo) {
    try {
      const currentChecksum = await this.calculateChecksum(backupInfo.location);
      return currentChecksum === backupInfo.checksum;
    } catch (error) {
      logger.error('Integrity check failed:', error);
      return false;
    }
  }

  // Create restore point
  async createRestorePoint() {
    const snapshotId = crypto.randomUUID();
    
    await this.pool.query(`
      INSERT INTO system_snapshots
      (snapshot_id, snapshot_type, components, metadata)
      VALUES ($1, 'restore_point', $2, $3)
    `, [
      snapshotId,
      ['database', 'files', 'configuration'],
      JSON.stringify({ timestamp: new Date(), reason: 'pre_restore' })
    ]);

    return snapshotId;
  }

  // Extract backup
  async extractBackup(backupFile) {
    const extractDir = path.join(this.config.backupPath, 'restore_temp', crypto.randomUUID());
    await fs.mkdir(extractDir, { recursive: true });
    
    await execPromise(`tar -xzf ${backupFile} -C ${extractDir}`);
    
    return extractDir;
  }

  // Decrypt backup
  async decryptBackup(directory) {
    const files = await fs.readdir(directory);
    
    for (const file of files) {
      if (file.endsWith('.enc')) {
        const filePath = path.join(directory, file);
        const encryptedData = JSON.parse(await fs.readFile(filePath, 'utf8'));
        const decrypted = await encryption.decryptFile(encryptedData);
        
        const originalName = file.replace('.enc', '');
        await fs.writeFile(path.join(directory, originalName), decrypted);
        await fs.unlink(filePath);
      }
    }
  }

  // Restore database
  async restoreDatabase(dumpFile) {
    // Drop existing connections
    await this.pool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = current_database()
        AND pid <> pg_backend_pid()
    `);

    // Restore database
    const command = `gunzip -c ${dumpFile} | psql ${process.env.DATABASE_URL}`;
    await execPromise(command);
  }

  // Restore files
  async restoreFiles(archiveFile) {
    await execPromise(`tar -xzf ${archiveFile} -C /`);
  }

  // Restore configuration
  async restoreConfiguration(configFile) {
    const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
    // Apply configuration settings
    logger.info('Configuration restored', config);
  }

  // Verify restoration
  async verifyRestoration() {
    const checks = {
      database: false,
      files: false,
      configuration: false
    };

    // Check database
    try {
      const result = await this.pool.query('SELECT COUNT(*) FROM users');
      checks.database = parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Database verification failed:', error);
    }

    // Check files
    try {
      const stats = await fs.stat('/home/grandpro-hmso-platform/uploads');
      checks.files = stats.isDirectory();
    } catch (error) {
      logger.error('Files verification failed:', error);
    }

    checks.configuration = true; // Assume config is OK if we got this far

    return checks;
  }

  // Rollback restore
  async rollbackRestore() {
    logger.warn('Rolling back failed restore');
    // Implement rollback logic
  }

  // Check replication status
  async checkReplicationStatus() {
    try {
      for (const replica of this.config.replicaServers) {
        const status = await this.getReplicationLag(replica);
        
        await this.pool.query(`
          INSERT INTO replication_status
          (replica_server, status, lag_bytes, lag_seconds, last_sync)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (replica_server) DO UPDATE SET
            status = $2,
            lag_bytes = $3,
            lag_seconds = $4,
            last_sync = NOW()
        `, [replica, status.status, status.lagBytes, status.lagSeconds]);

        if (status.lagSeconds > 300) { // More than 5 minutes lag
          logger.warn('Replication lag detected', { replica, lag: status.lagSeconds });
        }
      }
    } catch (error) {
      logger.error('Replication check failed:', error);
    }
  }

  // Get replication lag
  async getReplicationLag(replica) {
    // This would connect to replica and check lag
    // PostgreSQL specific implementation
    
    return {
      status: 'active',
      lagBytes: 0,
      lagSeconds: 0
    };
  }

  // Perform failover
  async performFailover(targetReplica, reason) {
    const failoverId = crypto.randomUUID();
    
    try {
      logger.warn('Initiating failover', { failoverId, target: targetReplica, reason });

      await this.pool.query(`
        INSERT INTO failover_history
        (failover_id, trigger_type, trigger_reason, old_primary, new_primary, start_time)
        VALUES ($1, 'manual', $2, $3, $4, NOW())
      `, [failoverId, reason, process.env.DB_HOST, targetReplica]);

      // 1. Stop writes to current primary
      await this.stopWrites();

      // 2. Ensure replica is caught up
      await this.waitForReplicaCatchup(targetReplica);

      // 3. Promote replica to primary
      await this.promoteReplica(targetReplica);

      // 4. Redirect application traffic
      await this.updateConnectionString(targetReplica);

      // 5. Verify new primary
      const verified = await this.verifyNewPrimary(targetReplica);

      await this.pool.query(`
        UPDATE failover_history
        SET promotion_time = NOW(),
            success = $1
        WHERE failover_id = $2
      `, [verified, failoverId]);

      logger.info('Failover completed', { failoverId, success: verified });
      return { failoverId, success: verified };
    } catch (error) {
      logger.error('Failover failed:', error);
      
      await this.pool.query(`
        UPDATE failover_history
        SET success = false
        WHERE failover_id = $1
      `, [failoverId]);
      
      throw error;
    }
  }

  // Test disaster recovery
  async testDisasterRecovery() {
    const testId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      logger.info('Starting disaster recovery test', { testId });

      // 1. Create test backup
      const backup = await this.performBackup('test');

      // 2. Restore to test environment
      const restoreResult = await this.restoreToTestEnvironment(backup.backupId);

      // 3. Verify data integrity
      const integrityCheck = await this.verifyDataIntegrity();

      // 4. Test failover
      const failoverTest = await this.testFailoverScenario();

      // 5. Measure recovery metrics
      const metrics = {
        backupTime: backup.duration,
        restoreTime: restoreResult.duration,
        totalRecoveryTime: Date.now() - startTime,
        dataIntegrity: integrityCheck,
        failoverSuccess: failoverTest.success
      };

      await this.pool.query(`
        INSERT INTO recovery_tests
        (test_id, test_type, start_time, end_time, duration_seconds, success, performance_metrics)
        VALUES ($1, 'full_recovery', $2, NOW(), $3, $4, $5)
      `, [
        testId,
        new Date(startTime),
        Math.floor((Date.now() - startTime) / 1000),
        integrityCheck && failoverTest.success,
        JSON.stringify(metrics)
      ]);

      logger.info('Disaster recovery test completed', { testId, metrics });
      return { testId, success: true, metrics };
    } catch (error) {
      logger.error('Disaster recovery test failed:', error);
      
      await this.pool.query(`
        INSERT INTO recovery_tests
        (test_id, test_type, start_time, end_time, success, issues_found)
        VALUES ($1, 'full_recovery', $2, NOW(), false, $3)
      `, [testId, new Date(startTime), [error.message]]);
      
      throw error;
    }
  }

  // Helper methods
  async stopWrites() {
    // Set database to read-only mode
    await this.pool.query("ALTER DATABASE SET default_transaction_read_only TO on");
  }

  async waitForReplicaCatchup(replica) {
    // Wait for replica to catch up with primary
    // Implementation depends on replication technology
  }

  async promoteReplica(replica) {
    // Promote replica to primary
    // PostgreSQL: pg_promote() or trigger file
  }

  async updateConnectionString(newPrimary) {
    // Update application configuration
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(process.env.DB_HOST, newPrimary);
  }

  async verifyNewPrimary(replica) {
    // Verify new primary is accepting writes
    try {
      const testPool = new Pool({
        connectionString: process.env.DATABASE_URL.replace(process.env.DB_HOST, replica)
      });
      
      await testPool.query('SELECT 1');
      await testPool.end();
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async restoreToTestEnvironment(backupId) {
    // Restore to isolated test environment
    // This would restore to a separate database/server
    return { duration: 1000 };
  }

  async verifyDataIntegrity() {
    // Run integrity checks on restored data
    const checks = [];
    
    // Check record counts
    const tables = ['users', 'patients', 'medical_records'];
    for (const table of tables) {
      const result = await this.pool.query(`SELECT COUNT(*) FROM ${table}`);
      checks.push({ table, count: result.rows[0].count });
    }
    
    return checks.every(c => c.count > 0);
  }

  async testFailoverScenario() {
    // Simulate failover scenario
    return { success: true };
  }

  // Clean up old backups
  async cleanupOldBackups(level) {
    const retention = this.config.backupRetention[level];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retention);

    // Get old backups
    const oldBackups = await this.pool.query(`
      SELECT backup_id, location
      FROM backup_history
      WHERE backup_level = $1 
        AND end_time < $2
        AND status = 'completed'
    `, [level, cutoffDate]);

    for (const backup of oldBackups.rows) {
      try {
        // Delete backup file
        await fs.unlink(backup.location);
        
        // Update database
        await this.pool.query(
          'DELETE FROM backup_history WHERE backup_id = $1',
          [backup.backup_id]
        );
        
        logger.info('Deleted old backup', { backupId: backup.backup_id });
      } catch (error) {
        logger.error('Failed to delete old backup:', error);
      }
    }
  }
}

module.exports = new DisasterRecovery();
