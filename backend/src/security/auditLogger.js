const { Pool } = require('pg');
const logger = require('../utils/logger');
const encryption = require('./encryption');

// Comprehensive Audit Logging System
class AuditLogger {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Audit event types
    this.eventTypes = {
      // Authentication events
      AUTH_LOGIN: 'authentication.login',
      AUTH_LOGOUT: 'authentication.logout',
      AUTH_FAILED: 'authentication.failed',
      AUTH_TOKEN_REFRESH: 'authentication.token_refresh',
      AUTH_PASSWORD_CHANGE: 'authentication.password_change',
      AUTH_2FA_ENABLED: 'authentication.2fa_enabled',
      AUTH_2FA_DISABLED: 'authentication.2fa_disabled',
      
      // Data access events
      DATA_VIEW: 'data.view',
      DATA_CREATE: 'data.create',
      DATA_UPDATE: 'data.update',
      DATA_DELETE: 'data.delete',
      DATA_EXPORT: 'data.export',
      DATA_IMPORT: 'data.import',
      
      // Medical records events
      MEDICAL_RECORD_VIEW: 'medical.record_view',
      MEDICAL_RECORD_CREATE: 'medical.record_create',
      MEDICAL_RECORD_UPDATE: 'medical.record_update',
      MEDICAL_PRESCRIPTION_CREATE: 'medical.prescription_create',
      MEDICAL_LAB_RESULT_VIEW: 'medical.lab_result_view',
      
      // Financial events
      FINANCIAL_TRANSACTION: 'financial.transaction',
      FINANCIAL_BILLING_CREATE: 'financial.billing_create',
      FINANCIAL_PAYMENT_PROCESS: 'financial.payment_process',
      FINANCIAL_REFUND: 'financial.refund',
      FINANCIAL_REPORT_GENERATE: 'financial.report_generate',
      
      // System events
      SYSTEM_CONFIG_CHANGE: 'system.config_change',
      SYSTEM_BACKUP: 'system.backup',
      SYSTEM_RESTORE: 'system.restore',
      SYSTEM_ERROR: 'system.error',
      SYSTEM_WARNING: 'system.warning',
      
      // User management events
      USER_CREATE: 'user.create',
      USER_UPDATE: 'user.update',
      USER_DELETE: 'user.delete',
      USER_ROLE_ASSIGN: 'user.role_assign',
      USER_ROLE_REVOKE: 'user.role_revoke',
      USER_PERMISSION_CHANGE: 'user.permission_change',
      
      // Integration events
      INTEGRATION_API_CALL: 'integration.api_call',
      INTEGRATION_WEBHOOK_RECEIVED: 'integration.webhook_received',
      INTEGRATION_SYNC: 'integration.sync',
      INTEGRATION_ERROR: 'integration.error',
      
      // Compliance events
      COMPLIANCE_CONSENT_GIVEN: 'compliance.consent_given',
      COMPLIANCE_CONSENT_REVOKED: 'compliance.consent_revoked',
      COMPLIANCE_DATA_REQUEST: 'compliance.data_request',
      COMPLIANCE_DATA_DELETION: 'compliance.data_deletion',
      COMPLIANCE_BREACH_DETECTED: 'compliance.breach_detected'
    };

    // Severity levels
    this.severity = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
      INFO: 'info'
    };

    // Initialize audit log retention policies
    this.retentionPolicies = {
      critical: 2555, // 7 years in days
      high: 1095,     // 3 years
      medium: 365,    // 1 year
      low: 180,       // 6 months
      info: 90        // 3 months
    };
  }

  // Initialize audit tables
  async initializeTables() {
    try {
      // Main audit log table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          event_id UUID DEFAULT gen_random_uuid(),
          event_type VARCHAR(100) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          user_id VARCHAR(100),
          user_email VARCHAR(255),
          user_roles TEXT[],
          session_id VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          resource_type VARCHAR(100),
          resource_id VARCHAR(255),
          action VARCHAR(50),
          old_values JSONB,
          new_values JSONB,
          metadata JSONB,
          hospital_id VARCHAR(50),
          department_id VARCHAR(50),
          success BOOLEAN DEFAULT true,
          error_message TEXT,
          timestamp TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_hospital ON audit_logs(hospital_id);
      `);

      // Compliance audit table (immutable)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS compliance_audit_logs (
          id SERIAL PRIMARY KEY,
          event_id UUID DEFAULT gen_random_uuid(),
          event_type VARCHAR(100) NOT NULL,
          user_id VARCHAR(100),
          data_subject_id VARCHAR(100),
          action VARCHAR(100),
          legal_basis VARCHAR(255),
          purpose VARCHAR(500),
          data_categories TEXT[],
          retention_period INTEGER,
          third_party_sharing BOOLEAN DEFAULT false,
          third_party_details JSONB,
          consent_id VARCHAR(100),
          timestamp TIMESTAMP DEFAULT NOW(),
          signature VARCHAR(500) -- Digital signature for integrity
        )
      `);

      // Access logs for sensitive data
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS sensitive_data_access_logs (
          id SERIAL PRIMARY KEY,
          access_id UUID DEFAULT gen_random_uuid(),
          user_id VARCHAR(100) NOT NULL,
          patient_id VARCHAR(100),
          data_type VARCHAR(50), -- 'medical_record', 'lab_result', 'prescription', etc.
          fields_accessed TEXT[],
          purpose VARCHAR(255),
          emergency_override BOOLEAN DEFAULT false,
          authorization_id VARCHAR(100),
          access_timestamp TIMESTAMP DEFAULT NOW(),
          duration_seconds INTEGER
        )
      `);

      // Security events table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS security_events (
          id SERIAL PRIMARY KEY,
          event_id UUID DEFAULT gen_random_uuid(),
          event_type VARCHAR(100),
          threat_level VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
          source_ip INET,
          target_resource VARCHAR(255),
          attack_vector VARCHAR(100),
          blocked BOOLEAN DEFAULT false,
          user_id VARCHAR(100),
          details JSONB,
          response_action VARCHAR(255),
          timestamp TIMESTAMP DEFAULT NOW()
        )
      `);

      // Audit log archive table (for old logs)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs_archive (
          LIKE audit_logs INCLUDING ALL
        )
      `);

      // Data breach register
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS data_breach_register (
          id SERIAL PRIMARY KEY,
          breach_id UUID DEFAULT gen_random_uuid(),
          discovered_date TIMESTAMP,
          reported_date TIMESTAMP,
          breach_type VARCHAR(100),
          affected_records INTEGER,
          data_types TEXT[],
          cause VARCHAR(500),
          containment_measures TEXT,
          notification_sent BOOLEAN DEFAULT false,
          regulatory_reported BOOLEAN DEFAULT false,
          remediation_status VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      logger.info('Audit tables initialized successfully');
      return true;
    } catch (error) {
      logger.error('Error initializing audit tables:', error);
      return false;
    }
  }

  // Log audit event
  async logEvent(eventType, data) {
    try {
      const auditEntry = {
        event_type: eventType,
        severity: data.severity || this.determineSeverity(eventType),
        user_id: data.userId,
        user_email: data.userEmail,
        user_roles: data.userRoles,
        session_id: data.sessionId,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        action: data.action,
        old_values: data.oldValues ? JSON.stringify(data.oldValues) : null,
        new_values: data.newValues ? JSON.stringify(data.newValues) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        hospital_id: data.hospitalId,
        department_id: data.departmentId,
        success: data.success !== undefined ? data.success : true,
        error_message: data.errorMessage
      };

      const result = await this.pool.query(`
        INSERT INTO audit_logs 
        (event_type, severity, user_id, user_email, user_roles, session_id, 
         ip_address, user_agent, resource_type, resource_id, action, 
         old_values, new_values, metadata, hospital_id, department_id, 
         success, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING event_id, id
      `, Object.values(auditEntry));

      // If it's a critical event, trigger alerts
      if (auditEntry.severity === this.severity.CRITICAL) {
        await this.triggerSecurityAlert(eventType, data);
      }

      // Log to compliance audit if needed
      if (this.isComplianceEvent(eventType)) {
        await this.logComplianceEvent(eventType, data);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error logging audit event:', error);
      // Fallback to file logging if database fails
      this.logToFile(eventType, data);
    }
  }

  // Log medical record access (HIPAA compliance)
  async logMedicalRecordAccess(data) {
    try {
      await this.pool.query(`
        INSERT INTO sensitive_data_access_logs
        (user_id, patient_id, data_type, fields_accessed, purpose, 
         emergency_override, authorization_id, duration_seconds)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        data.userId,
        data.patientId,
        data.dataType,
        data.fieldsAccessed,
        data.purpose || 'Treatment',
        data.emergencyOverride || false,
        data.authorizationId,
        data.durationSeconds
      ]);

      // Also log to main audit
      await this.logEvent(this.eventTypes.MEDICAL_RECORD_VIEW, {
        ...data,
        severity: this.severity.HIGH
      });
    } catch (error) {
      logger.error('Error logging medical record access:', error);
    }
  }

  // Log security event
  async logSecurityEvent(data) {
    try {
      await this.pool.query(`
        INSERT INTO security_events
        (event_type, threat_level, source_ip, target_resource, 
         attack_vector, blocked, user_id, details, response_action)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        data.eventType,
        data.threatLevel,
        data.sourceIp,
        data.targetResource,
        data.attackVector,
        data.blocked !== undefined ? data.blocked : false,
        data.userId,
        JSON.stringify(data.details || {}),
        data.responseAction
      ]);

      // Log to main audit
      await this.logEvent(data.eventType, {
        ...data,
        severity: data.threatLevel
      });
    } catch (error) {
      logger.error('Error logging security event:', error);
    }
  }

  // Log compliance event (GDPR/HIPAA)
  async logComplianceEvent(eventType, data) {
    try {
      const signature = encryption.generateSecureToken();
      
      await this.pool.query(`
        INSERT INTO compliance_audit_logs
        (event_type, user_id, data_subject_id, action, legal_basis, 
         purpose, data_categories, retention_period, third_party_sharing, 
         third_party_details, consent_id, signature)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        eventType,
        data.userId,
        data.dataSubjectId,
        data.action,
        data.legalBasis || 'Legitimate Interest',
        data.purpose,
        data.dataCategories,
        data.retentionPeriod || 365,
        data.thirdPartySharing || false,
        data.thirdPartyDetails ? JSON.stringify(data.thirdPartyDetails) : null,
        data.consentId,
        signature
      ]);
    } catch (error) {
      logger.error('Error logging compliance event:', error);
    }
  }

  // Register data breach
  async registerDataBreach(breachData) {
    try {
      const result = await this.pool.query(`
        INSERT INTO data_breach_register
        (discovered_date, breach_type, affected_records, data_types, 
         cause, containment_measures, remediation_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING breach_id
      `, [
        breachData.discoveredDate || new Date(),
        breachData.breachType,
        breachData.affectedRecords,
        breachData.dataTypes,
        breachData.cause,
        breachData.containmentMeasures,
        breachData.remediationStatus || 'investigating'
      ]);

      // Log as critical security event
      await this.logSecurityEvent({
        eventType: this.eventTypes.COMPLIANCE_BREACH_DETECTED,
        threatLevel: this.severity.CRITICAL,
        details: breachData
      });

      // Trigger breach notification workflow
      await this.triggerBreachNotification(result.rows[0].breach_id, breachData);

      return result.rows[0];
    } catch (error) {
      logger.error('Error registering data breach:', error);
      throw error;
    }
  }

  // Query audit logs
  async queryAuditLogs(filters) {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters.userId) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(filters.userId);
      }

      if (filters.eventType) {
        query += ` AND event_type = $${paramIndex++}`;
        params.push(filters.eventType);
      }

      if (filters.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        params.push(filters.endDate);
      }

      if (filters.resourceType) {
        query += ` AND resource_type = $${paramIndex++}`;
        params.push(filters.resourceType);
      }

      if (filters.hospitalId) {
        query += ` AND hospital_id = $${paramIndex++}`;
        params.push(filters.hospitalId);
      }

      query += ' ORDER BY timestamp DESC';
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error querying audit logs:', error);
      throw error;
    }
  }

  // Generate audit report
  async generateAuditReport(startDate, endDate, options = {}) {
    try {
      const report = {
        period: { start: startDate, end: endDate },
        summary: {},
        details: {},
        compliance: {},
        security: {}
      };

      // Summary statistics
      const summaryQuery = await this.pool.query(`
        SELECT 
          event_type,
          severity,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM audit_logs
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY event_type, severity
        ORDER BY count DESC
      `, [startDate, endDate]);

      report.summary = summaryQuery.rows;

      // Failed authentication attempts
      const failedAuthQuery = await this.pool.query(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as failed_attempts,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM audit_logs
        WHERE event_type = $1 
          AND timestamp BETWEEN $2 AND $3
          AND success = false
        GROUP BY DATE(timestamp)
        ORDER BY date
      `, [this.eventTypes.AUTH_FAILED, startDate, endDate]);

      report.security.failedAuthentications = failedAuthQuery.rows;

      // Data access patterns
      const dataAccessQuery = await this.pool.query(`
        SELECT 
          data_type,
          COUNT(*) as access_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT patient_id) as unique_patients
        FROM sensitive_data_access_logs
        WHERE access_timestamp BETWEEN $1 AND $2
        GROUP BY data_type
      `, [startDate, endDate]);

      report.compliance.dataAccess = dataAccessQuery.rows;

      // Security events
      const securityEventsQuery = await this.pool.query(`
        SELECT 
          threat_level,
          COUNT(*) as count,
          COUNT(CASE WHEN blocked = true THEN 1 END) as blocked_count
        FROM security_events
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY threat_level
      `, [startDate, endDate]);

      report.security.threats = securityEventsQuery.rows;

      return report;
    } catch (error) {
      logger.error('Error generating audit report:', error);
      throw error;
    }
  }

  // Archive old audit logs
  async archiveOldLogs() {
    try {
      const archiveDate = new Date();
      archiveDate.setDate(archiveDate.getDate() - 90); // Archive logs older than 90 days

      // Move to archive table
      await this.pool.query(`
        INSERT INTO audit_logs_archive
        SELECT * FROM audit_logs
        WHERE timestamp < $1
      `, [archiveDate]);

      // Delete from main table
      const result = await this.pool.query(`
        DELETE FROM audit_logs
        WHERE timestamp < $1
      `, [archiveDate]);

      logger.info(`Archived ${result.rowCount} audit log entries`);
      return result.rowCount;
    } catch (error) {
      logger.error('Error archiving audit logs:', error);
      throw error;
    }
  }

  // Apply retention policies
  async applyRetentionPolicies() {
    try {
      for (const [severity, days] of Object.entries(this.retentionPolicies)) {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - days);

        const result = await this.pool.query(`
          DELETE FROM audit_logs_archive
          WHERE severity = $1 AND timestamp < $2
        `, [severity, retentionDate]);

        logger.info(`Deleted ${result.rowCount} ${severity} audit logs older than ${days} days`);
      }
    } catch (error) {
      logger.error('Error applying retention policies:', error);
      throw error;
    }
  }

  // Determine severity based on event type
  determineSeverity(eventType) {
    const criticalEvents = [
      this.eventTypes.DATA_DELETE,
      this.eventTypes.SYSTEM_CONFIG_CHANGE,
      this.eventTypes.USER_DELETE,
      this.eventTypes.COMPLIANCE_BREACH_DETECTED
    ];

    const highEvents = [
      this.eventTypes.MEDICAL_RECORD_UPDATE,
      this.eventTypes.FINANCIAL_TRANSACTION,
      this.eventTypes.USER_ROLE_ASSIGN,
      this.eventTypes.DATA_EXPORT
    ];

    if (criticalEvents.includes(eventType)) return this.severity.CRITICAL;
    if (highEvents.includes(eventType)) return this.severity.HIGH;
    if (eventType.includes('view') || eventType.includes('read')) return this.severity.LOW;
    
    return this.severity.MEDIUM;
  }

  // Check if event is compliance-related
  isComplianceEvent(eventType) {
    return eventType.startsWith('compliance.') || 
           eventType.includes('medical.') ||
           eventType.includes('consent');
  }

  // Trigger security alert
  async triggerSecurityAlert(eventType, data) {
    // In production, this would send alerts via email, SMS, or monitoring system
    logger.warn('SECURITY ALERT:', { eventType, ...data });
    
    // You can integrate with notification services here
    // await notificationService.sendAlert({...});
  }

  // Trigger breach notification
  async triggerBreachNotification(breachId, breachData) {
    // GDPR requires notification within 72 hours
    logger.error('DATA BREACH DETECTED:', { breachId, ...breachData });
    
    // In production, this would:
    // 1. Notify data protection officer
    // 2. Prepare regulatory notification
    // 3. Prepare user notifications if required
    // 4. Document containment measures
  }

  // Log to file (fallback)
  logToFile(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      ...data
    };
    
    // In production, write to secure log file
    console.error('AUDIT_LOG_FALLBACK:', JSON.stringify(logEntry));
  }

  // Export audit logs for compliance
  async exportAuditLogs(startDate, endDate, format = 'json') {
    try {
      const logs = await this.queryAuditLogs({ startDate, endDate });
      
      if (format === 'csv') {
        return this.convertToCSV(logs);
      }
      
      return logs;
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
      throw error;
    }
  }

  // Convert to CSV
  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];
    
    return csv.join('\n');
  }
}

module.exports = new AuditLogger();
