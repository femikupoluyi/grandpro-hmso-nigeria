const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

class SecurityService {
    constructor() {
        // Encryption configuration
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
        this.saltLength = 64;
        
        // Get master key from environment or generate one
        this.masterKey = process.env.ENCRYPTION_MASTER_KEY || 
            crypto.randomBytes(32).toString('hex');
    }

    // =====================================================
    // ENCRYPTION METHODS
    // =====================================================

    /**
     * Encrypt sensitive data
     * @param {string} text - Plain text to encrypt
     * @param {string} dataType - Type of data (PII, PHI, FINANCIAL)
     * @returns {object} Encrypted data with metadata
     */
    encrypt(text, dataType = 'GENERAL') {
        try {
            // Generate random IV
            const iv = crypto.randomBytes(this.ivLength);
            
            // Derive key from master key
            const key = this.deriveKey(this.masterKey, dataType);
            
            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            
            // Encrypt data
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Get auth tag
            const authTag = cipher.getAuthTag();
            
            // Combine IV, auth tag, and encrypted data
            const combined = Buffer.concat([
                iv,
                authTag,
                Buffer.from(encrypted, 'hex')
            ]).toString('base64');
            
            return {
                encrypted: combined,
                algorithm: this.algorithm,
                dataType: dataType,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt sensitive data
     * @param {string} encryptedData - Base64 encoded encrypted data
     * @param {string} dataType - Type of data
     * @returns {string} Decrypted plain text
     */
    decrypt(encryptedData, dataType = 'GENERAL') {
        try {
            // Decode from base64
            const combined = Buffer.from(encryptedData, 'base64');
            
            // Extract components
            const iv = combined.slice(0, this.ivLength);
            const authTag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
            const encrypted = combined.slice(this.ivLength + this.tagLength);
            
            // Derive key from master key
            const key = this.deriveKey(this.masterKey, dataType);
            
            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            decipher.setAuthTag(authTag);
            
            // Decrypt data
            let decrypted = decipher.update(encrypted, null, 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Derive encryption key from master key
     * @param {string} masterKey - Master encryption key
     * @param {string} context - Context for key derivation
     * @returns {Buffer} Derived key
     */
    deriveKey(masterKey, context) {
        const salt = crypto.createHash('sha256').update(context).digest();
        return crypto.pbkdf2Sync(masterKey, salt, 10000, this.keyLength, 'sha256');
    }

    /**
     * Encrypt multiple fields in an object
     * @param {object} data - Object containing data to encrypt
     * @param {array} fields - Array of field names to encrypt
     * @param {string} dataType - Type of data
     * @returns {object} Object with encrypted fields
     */
    encryptFields(data, fields, dataType = 'PII') {
        const encrypted = { ...data };
        
        for (const field of fields) {
            if (encrypted[field]) {
                const encryptedField = this.encrypt(encrypted[field].toString(), dataType);
                encrypted[field] = encryptedField.encrypted;
                encrypted[`${field}_encrypted_metadata`] = {
                    algorithm: encryptedField.algorithm,
                    dataType: encryptedField.dataType,
                    timestamp: encryptedField.timestamp
                };
            }
        }
        
        return encrypted;
    }

    // =====================================================
    // PASSWORD MANAGEMENT
    // =====================================================

    /**
     * Hash password with bcrypt
     * @param {string} password - Plain text password
     * @returns {string} Hashed password
     */
    async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Verify password against hash
     * @param {string} password - Plain text password
     * @param {string} hash - Password hash
     * @returns {boolean} Password match result
     */
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    /**
     * Validate password against security policy
     * @param {string} password - Password to validate
     * @returns {object} Validation result
     */
    async validatePasswordPolicy(password) {
        const client = await pool.connect();
        try {
            // Get password policy
            const policyResult = await client.query(
                `SELECT policy_settings FROM security.security_policies 
                 WHERE policy_name = 'password_policy' AND is_active = true`
            );
            
            const policy = policyResult.rows[0]?.policy_settings || {
                min_length: 12,
                require_uppercase: true,
                require_lowercase: true,
                require_numbers: true,
                require_special_chars: true
            };
            
            const errors = [];
            
            // Check minimum length
            if (password.length < policy.min_length) {
                errors.push(`Password must be at least ${policy.min_length} characters long`);
            }
            
            // Check uppercase
            if (policy.require_uppercase && !/[A-Z]/.test(password)) {
                errors.push('Password must contain at least one uppercase letter');
            }
            
            // Check lowercase
            if (policy.require_lowercase && !/[a-z]/.test(password)) {
                errors.push('Password must contain at least one lowercase letter');
            }
            
            // Check numbers
            if (policy.require_numbers && !/\d/.test(password)) {
                errors.push('Password must contain at least one number');
            }
            
            // Check special characters
            if (policy.require_special_chars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
                errors.push('Password must contain at least one special character');
            }
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        } finally {
            client.release();
        }
    }

    // =====================================================
    // SESSION MANAGEMENT
    // =====================================================

    /**
     * Create JWT token for session
     * @param {object} payload - Token payload
     * @returns {string} JWT token
     */
    generateToken(payload) {
        const secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
        const options = {
            expiresIn: '30m',
            issuer: 'GrandPro HMSO',
            audience: 'grandpro-hmso-api'
        };
        
        return jwt.sign(payload, secret, options);
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {object} Decoded token payload
     */
    verifyToken(token) {
        const secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
        
        try {
            return jwt.verify(token, secret, {
                issuer: 'GrandPro HMSO',
                audience: 'grandpro-hmso-api'
            });
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Create user session
     * @param {string} userId - User ID
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent string
     * @returns {object} Session details
     */
    async createSession(userId, ipAddress, userAgent) {
        const client = await pool.connect();
        try {
            // Generate session token
            const sessionToken = crypto.randomBytes(32).toString('hex');
            
            // Get session policy
            const policyResult = await client.query(
                `SELECT policy_settings FROM security.security_policies 
                 WHERE policy_name = 'session_policy' AND is_active = true`
            );
            
            const policy = policyResult.rows[0]?.policy_settings || {
                max_session_duration_minutes: 30
            };
            
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + policy.max_session_duration_minutes);
            
            // Create session record
            const result = await client.query(
                `INSERT INTO security.user_sessions 
                 (user_id, session_token, ip_address, user_agent, expires_at)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, session_token, expires_at`,
                [userId, sessionToken, ipAddress, userAgent, expiresAt]
            );
            
            // Create JWT token with session info
            const jwtToken = this.generateToken({
                userId: userId,
                sessionId: result.rows[0].id,
                sessionToken: sessionToken
            });
            
            return {
                sessionId: result.rows[0].id,
                token: jwtToken,
                expiresAt: result.rows[0].expires_at
            };
        } finally {
            client.release();
        }
    }

    /**
     * Validate session
     * @param {string} sessionToken - Session token
     * @returns {object} Session validation result
     */
    async validateSession(sessionToken) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT s.*, u.email, u.status as user_status
                 FROM security.user_sessions s
                 JOIN users u ON s.user_id = u.id
                 WHERE s.session_token = $1 
                   AND s.is_active = true 
                   AND s.expires_at > CURRENT_TIMESTAMP`,
                [sessionToken]
            );
            
            if (result.rows.length === 0) {
                return { valid: false, reason: 'Invalid or expired session' };
            }
            
            const session = result.rows[0];
            
            // Update last activity
            await client.query(
                `UPDATE security.user_sessions 
                 SET last_activity = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [session.id]
            );
            
            return {
                valid: true,
                userId: session.user_id,
                email: session.email,
                sessionId: session.id
            };
        } finally {
            client.release();
        }
    }

    // =====================================================
    // ROLE-BASED ACCESS CONTROL (RBAC)
    // =====================================================

    /**
     * Check user permission
     * @param {string} userId - User ID
     * @param {string} resource - Resource name
     * @param {string} action - Action to perform
     * @returns {boolean} Permission check result
     */
    async checkPermission(userId, resource, action) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `SELECT security.check_permission($1, $2, $3) as has_permission`,
                [userId, resource, action]
            );
            
            return result.rows[0].has_permission;
        } finally {
            client.release();
        }
    }

    /**
     * Assign role to user
     * @param {string} userId - User ID
     * @param {string} roleId - Role ID
     * @param {string} hospitalId - Hospital ID (optional)
     * @param {string} assignedBy - ID of user assigning the role
     * @returns {object} Assignment result
     */
    async assignRole(userId, roleId, hospitalId, assignedBy) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO security.user_roles 
                 (user_id, role_id, hospital_id, assigned_by)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, role_id, hospital_id) 
                 DO UPDATE SET 
                    is_active = true,
                    assigned_at = CURRENT_TIMESTAMP,
                    assigned_by = $4
                 RETURNING *`,
                [userId, roleId, hospitalId, assignedBy]
            );
            
            // Log the role assignment
            await this.auditLog(assignedBy, 'ROLE_ASSIGNMENT', 'user_roles', result.rows[0].id, {
                userId: userId,
                roleId: roleId,
                hospitalId: hospitalId
            });
            
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    /**
     * Get user roles and permissions
     * @param {string} userId - User ID
     * @returns {object} User roles and permissions
     */
    async getUserRolesAndPermissions(userId) {
        const client = await pool.connect();
        try {
            // Get roles
            const rolesResult = await client.query(
                `SELECT r.id, r.name, r.description, ur.hospital_id, h.name as hospital_name
                 FROM security.user_roles ur
                 JOIN roles r ON ur.role_id = r.id
                 LEFT JOIN hospitals h ON ur.hospital_id = h.id
                 WHERE ur.user_id = $1 
                   AND ur.is_active = true
                   AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)`,
                [userId]
            );
            
            // Get permissions
            const permissionsResult = await client.query(
                `SELECT DISTINCT p.name, p.resource, p.action, p.description
                 FROM security.user_roles ur
                 JOIN security.role_permissions rp ON ur.role_id = rp.role_id
                 JOIN security.permissions p ON rp.permission_id = p.id
                 WHERE ur.user_id = $1 
                   AND ur.is_active = true
                   AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)`,
                [userId]
            );
            
            return {
                roles: rolesResult.rows,
                permissions: permissionsResult.rows
            };
        } finally {
            client.release();
        }
    }

    // =====================================================
    // AUDIT LOGGING
    // =====================================================

    /**
     * Log audit event
     * @param {string} userId - User ID performing action
     * @param {string} action - Action performed
     * @param {string} resourceType - Type of resource
     * @param {string} resourceId - Resource ID
     * @param {object} metadata - Additional metadata
     * @returns {void}
     */
    async auditLog(userId, action, resourceType, resourceId, metadata = {}) {
        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO audit.audit_log 
                 (user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    userId,
                    action,
                    resourceType,
                    resourceId,
                    JSON.stringify(metadata),
                    metadata.ipAddress || '127.0.0.1',
                    metadata.userAgent || 'System'
                ]
            );
        } catch (error) {
            console.error('Audit logging error:', error);
            // Don't throw - audit failures shouldn't break operations
        } finally {
            client.release();
        }
    }

    /**
     * Log data access (HIPAA compliance)
     * @param {object} accessInfo - Access information
     * @returns {void}
     */
    async logDataAccess(accessInfo) {
        const client = await pool.connect();
        try {
            await client.query(
                `SELECT audit.log_data_access($1, $2, $3, $4, $5, $6, $7)`,
                [
                    accessInfo.userId,
                    accessInfo.patientId,
                    accessInfo.accessType,
                    accessInfo.dataCategory,
                    accessInfo.dataFields,
                    accessInfo.ipAddress,
                    accessInfo.sessionId
                ]
            );
        } catch (error) {
            console.error('Data access logging error:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Log security incident
     * @param {object} incident - Incident details
     * @returns {string} Incident ID
     */
    async logSecurityIncident(incident) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO audit.security_incidents 
                 (incident_type, severity, user_id, ip_address, description, 
                  affected_resources, detection_method, reported_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id`,
                [
                    incident.type,
                    incident.severity,
                    incident.userId,
                    incident.ipAddress,
                    incident.description,
                    JSON.stringify(incident.affectedResources),
                    incident.detectionMethod,
                    incident.reportedBy
                ]
            );
            
            // Send alert for high/critical incidents
            if (['high', 'critical'].includes(incident.severity)) {
                await this.sendSecurityAlert(result.rows[0].id, incident);
            }
            
            return result.rows[0].id;
        } finally {
            client.release();
        }
    }

    // =====================================================
    // GDPR COMPLIANCE
    // =====================================================

    /**
     * Record patient consent
     * @param {object} consent - Consent details
     * @returns {string} Consent record ID
     */
    async recordConsent(consent) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO compliance.patient_consent 
                 (patient_id, consent_type, consent_given, ip_address, 
                  consent_method, purpose, retention_period)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [
                    consent.patientId,
                    consent.type,
                    consent.given,
                    consent.ipAddress,
                    consent.method,
                    consent.purpose,
                    consent.retentionDays
                ]
            );
            
            return result.rows[0].id;
        } finally {
            client.release();
        }
    }

    /**
     * Handle data subject request (GDPR Articles 15-22)
     * @param {object} request - Request details
     * @returns {string} Request ID
     */
    async handleDataSubjectRequest(request) {
        const client = await pool.connect();
        try {
            const result = await client.query(
                `INSERT INTO compliance.data_subject_requests 
                 (patient_id, request_type, verification_method, notes)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [
                    request.patientId,
                    request.type,
                    request.verificationMethod,
                    request.notes
                ]
            );
            
            const requestId = result.rows[0].id;
            
            // Process request based on type
            switch (request.type) {
                case 'access':
                    await this.handleAccessRequest(request.patientId, requestId);
                    break;
                case 'erasure':
                    await this.handleErasureRequest(request.patientId, requestId);
                    break;
                case 'portability':
                    await this.handlePortabilityRequest(request.patientId, requestId);
                    break;
                // Add other request types as needed
            }
            
            return requestId;
        } finally {
            client.release();
        }
    }

    /**
     * Handle data access request (GDPR Article 15)
     * @param {string} patientId - Patient ID
     * @param {string} requestId - Request ID
     * @returns {object} Patient data
     */
    async handleAccessRequest(patientId, requestId) {
        const client = await pool.connect();
        try {
            // Gather all patient data
            const patientData = await client.query(
                `SELECT * FROM patients WHERE id = $1`,
                [patientId]
            );
            
            const medicalRecords = await client.query(
                `SELECT * FROM medical_records WHERE patient_id = $1`,
                [patientId]
            );
            
            const appointments = await client.query(
                `SELECT * FROM appointments WHERE patient_id = $1`,
                [patientId]
            );
            
            const data = {
                personalData: patientData.rows[0],
                medicalRecords: medicalRecords.rows,
                appointments: appointments.rows
            };
            
            // Update request status
            await client.query(
                `UPDATE compliance.data_subject_requests 
                 SET status = 'completed', 
                     completed_date = CURRENT_TIMESTAMP,
                     response_data = $1
                 WHERE id = $2`,
                [JSON.stringify(data), requestId]
            );
            
            return data;
        } finally {
            client.release();
        }
    }

    /**
     * Handle data erasure request (GDPR Article 17)
     * @param {string} patientId - Patient ID
     * @param {string} requestId - Request ID
     * @returns {void}
     */
    async handleErasureRequest(patientId, requestId) {
        const client = await pool.connect();
        try {
            // Anonymize patient data instead of hard delete
            await client.query(
                `SELECT compliance.anonymize_patient_data($1)`,
                [patientId]
            );
            
            // Update request status
            await client.query(
                `UPDATE compliance.data_subject_requests 
                 SET status = 'completed', 
                     completed_date = CURRENT_TIMESTAMP,
                     response_data = '{"action": "data_anonymized"}'::jsonb
                 WHERE id = $1`,
                [requestId]
            );
        } finally {
            client.release();
        }
    }

    /**
     * Handle data portability request (GDPR Article 20)
     * @param {string} patientId - Patient ID
     * @param {string} requestId - Request ID
     * @returns {object} Portable data format
     */
    async handlePortabilityRequest(patientId, requestId) {
        const client = await pool.connect();
        try {
            const data = await this.handleAccessRequest(patientId, requestId);
            
            // Format data for portability (machine-readable format)
            const portableData = {
                format: 'JSON',
                version: '1.0',
                exportDate: new Date().toISOString(),
                data: data
            };
            
            return portableData;
        } finally {
            client.release();
        }
    }

    // =====================================================
    // UTILITY METHODS
    // =====================================================

    /**
     * Generate secure random token
     * @param {number} length - Token length in bytes
     * @returns {string} Hex encoded token
     */
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Send security alert
     * @param {string} incidentId - Incident ID
     * @param {object} incident - Incident details
     * @returns {void}
     */
    async sendSecurityAlert(incidentId, incident) {
        // Implementation would integrate with notification service
        console.log(`SECURITY ALERT: Incident ${incidentId} - ${incident.severity} severity`);
        console.log(`Type: ${incident.type}`);
        console.log(`Description: ${incident.description}`);
        
        // In production, would send email/SMS/webhook alerts
    }

    /**
     * Check for failed login attempts
     * @param {string} email - User email
     * @param {string} ipAddress - IP address
     * @returns {object} Lockout status
     */
    async checkFailedLoginAttempts(email, ipAddress) {
        const client = await pool.connect();
        try {
            // Get security policy
            const policyResult = await client.query(
                `SELECT policy_settings FROM security.security_policies 
                 WHERE policy_name = 'password_policy' AND is_active = true`
            );
            
            const policy = policyResult.rows[0]?.policy_settings || {
                max_failed_attempts: 5,
                lockout_duration_minutes: 30
            };
            
            // Check failed attempts in last lockout period
            const cutoffTime = new Date();
            cutoffTime.setMinutes(cutoffTime.getMinutes() - policy.lockout_duration_minutes);
            
            const result = await client.query(
                `SELECT COUNT(*) as attempt_count 
                 FROM security.failed_login_attempts 
                 WHERE email = $1 
                   AND ip_address = $2 
                   AND attempted_at > $3`,
                [email, ipAddress, cutoffTime]
            );
            
            const attemptCount = parseInt(result.rows[0].attempt_count);
            const isLocked = attemptCount >= policy.max_failed_attempts;
            
            return {
                isLocked: isLocked,
                attemptCount: attemptCount,
                maxAttempts: policy.max_failed_attempts,
                remainingAttempts: Math.max(0, policy.max_failed_attempts - attemptCount)
            };
        } finally {
            client.release();
        }
    }

    /**
     * Record failed login attempt
     * @param {string} email - User email
     * @param {string} ipAddress - IP address
     * @param {string} reason - Failure reason
     * @returns {void}
     */
    async recordFailedLogin(email, ipAddress, reason) {
        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO security.failed_login_attempts 
                 (email, ip_address, failure_reason)
                 VALUES ($1, $2, $3)`,
                [email, ipAddress, reason]
            );
        } finally {
            client.release();
        }
    }
}

module.exports = new SecurityService();
