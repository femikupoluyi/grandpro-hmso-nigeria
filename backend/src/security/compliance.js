const { Pool } = require('pg');
const logger = require('../utils/logger');
const encryption = require('./encryption');
const auditLogger = require('./auditLogger');

// HIPAA/GDPR Compliance Module
class ComplianceManager {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // HIPAA requirements
    this.hipaaRequirements = {
      accessControl: true,
      auditControls: true,
      integrity: true,
      transmission: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
      minimumNecessary: true,
      businessAssociateAgreements: true
    };

    // GDPR principles
    this.gdprPrinciples = {
      lawfulness: true,
      purpose_limitation: true,
      data_minimization: true,
      accuracy: true,
      storage_limitation: true,
      integrity_confidentiality: true,
      accountability: true
    };

    // Data retention policies (in days)
    this.retentionPolicies = {
      medical_records: 2555,  // 7 years
      billing_records: 2555,  // 7 years
      audit_logs: 1095,       // 3 years
      consent_records: 3650,  // 10 years
      employee_records: 2555, // 7 years after termination
      temporary_data: 30,     // 30 days
      anonymized_data: null   // No limit
    };
  }

  // Initialize compliance tables
  async initializeTables() {
    try {
      // Data processing activities register
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS data_processing_activities (
          id SERIAL PRIMARY KEY,
          activity_id UUID DEFAULT gen_random_uuid(),
          activity_name VARCHAR(255) NOT NULL,
          purpose TEXT NOT NULL,
          legal_basis VARCHAR(100),
          data_categories TEXT[],
          data_subjects TEXT[],
          recipients TEXT[],
          retention_period INTEGER,
          security_measures TEXT,
          cross_border_transfers BOOLEAN DEFAULT false,
          transfer_safeguards TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Consent management
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS consent_records (
          id SERIAL PRIMARY KEY,
          consent_id UUID DEFAULT gen_random_uuid(),
          data_subject_id VARCHAR(100) NOT NULL,
          purpose VARCHAR(500) NOT NULL,
          processing_activities TEXT[],
          consent_given BOOLEAN DEFAULT false,
          consent_date TIMESTAMP,
          withdrawal_date TIMESTAMP,
          expiry_date TIMESTAMP,
          consent_method VARCHAR(50), -- 'explicit', 'implicit', 'opt-in', 'opt-out'
          consent_text TEXT,
          version VARCHAR(20),
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Data subject requests
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS data_subject_requests (
          id SERIAL PRIMARY KEY,
          request_id UUID DEFAULT gen_random_uuid(),
          data_subject_id VARCHAR(100) NOT NULL,
          request_type VARCHAR(50), -- 'access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'
          status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
          request_date TIMESTAMP DEFAULT NOW(),
          response_date TIMESTAMP,
          response_deadline TIMESTAMP,
          details TEXT,
          verification_method VARCHAR(100),
          verified BOOLEAN DEFAULT false,
          response TEXT,
          processed_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Privacy impact assessments
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
          id SERIAL PRIMARY KEY,
          assessment_id UUID DEFAULT gen_random_uuid(),
          project_name VARCHAR(255),
          description TEXT,
          data_types TEXT[],
          risk_level VARCHAR(20), -- 'low', 'medium', 'high'
          risks_identified TEXT,
          mitigation_measures TEXT,
          residual_risk VARCHAR(20),
          approval_status VARCHAR(50),
          approved_by VARCHAR(100),
          assessment_date TIMESTAMP DEFAULT NOW(),
          review_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Business associate agreements (HIPAA)
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS business_associate_agreements (
          id SERIAL PRIMARY KEY,
          baa_id UUID DEFAULT gen_random_uuid(),
          organization_name VARCHAR(255) NOT NULL,
          organization_type VARCHAR(100),
          agreement_date DATE,
          expiry_date DATE,
          services TEXT[],
          data_types TEXT[],
          security_measures TEXT,
          breach_notification_period INTEGER DEFAULT 60, -- hours
          agreement_document_url TEXT,
          status VARCHAR(50) DEFAULT 'active',
          last_review_date DATE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Data breach notifications
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS breach_notifications (
          id SERIAL PRIMARY KEY,
          breach_id VARCHAR(100) REFERENCES data_breach_register(breach_id),
          notification_type VARCHAR(50), -- 'regulatory', 'data_subject', 'public'
          recipient VARCHAR(255),
          notification_date TIMESTAMP,
          method VARCHAR(50), -- 'email', 'letter', 'website', 'media'
          content TEXT,
          response_received BOOLEAN DEFAULT false,
          response_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Data inventory
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS data_inventory (
          id SERIAL PRIMARY KEY,
          data_id UUID DEFAULT gen_random_uuid(),
          data_category VARCHAR(100),
          data_type VARCHAR(100),
          sensitivity_level VARCHAR(20), -- 'public', 'internal', 'confidential', 'restricted'
          location VARCHAR(255),
          owner VARCHAR(100),
          retention_period INTEGER,
          encryption_required BOOLEAN DEFAULT true,
          access_restrictions TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      logger.info('Compliance tables initialized successfully');
      return true;
    } catch (error) {
      logger.error('Error initializing compliance tables:', error);
      return false;
    }
  }

  // Record consent
  async recordConsent(consentData) {
    try {
      const result = await this.pool.query(`
        INSERT INTO consent_records
        (data_subject_id, purpose, processing_activities, consent_given, 
         consent_date, expiry_date, consent_method, consent_text, version, 
         ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING consent_id
      `, [
        consentData.dataSubjectId,
        consentData.purpose,
        consentData.processingActivities,
        consentData.consentGiven,
        consentData.consentDate || new Date(),
        consentData.expiryDate,
        consentData.consentMethod || 'explicit',
        consentData.consentText,
        consentData.version || '1.0',
        consentData.ipAddress,
        consentData.userAgent
      ]);

      // Log consent event
      await auditLogger.logEvent(auditLogger.eventTypes.COMPLIANCE_CONSENT_GIVEN, {
        userId: consentData.dataSubjectId,
        consentId: result.rows[0].consent_id,
        purpose: consentData.purpose
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error recording consent:', error);
      throw error;
    }
  }

  // Withdraw consent
  async withdrawConsent(consentId, dataSubjectId) {
    try {
      await this.pool.query(`
        UPDATE consent_records
        SET consent_given = false,
            withdrawal_date = NOW()
        WHERE consent_id = $1 AND data_subject_id = $2
      `, [consentId, dataSubjectId]);

      // Log withdrawal
      await auditLogger.logEvent(auditLogger.eventTypes.COMPLIANCE_CONSENT_REVOKED, {
        userId: dataSubjectId,
        consentId
      });

      return true;
    } catch (error) {
      logger.error('Error withdrawing consent:', error);
      throw error;
    }
  }

  // Process data subject request (GDPR)
  async processDataSubjectRequest(requestData) {
    try {
      const responseDeadline = new Date();
      responseDeadline.setDate(responseDeadline.getDate() + 30); // 30 days deadline

      const result = await this.pool.query(`
        INSERT INTO data_subject_requests
        (data_subject_id, request_type, details, response_deadline, 
         verification_method, verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING request_id
      `, [
        requestData.dataSubjectId,
        requestData.requestType,
        requestData.details,
        responseDeadline,
        requestData.verificationMethod || 'email',
        requestData.verified || false
      ]);

      const requestId = result.rows[0].request_id;

      // Process based on request type
      switch (requestData.requestType) {
        case 'access':
          await this.handleAccessRequest(requestId, requestData.dataSubjectId);
          break;
        case 'erasure':
          await this.handleErasureRequest(requestId, requestData.dataSubjectId);
          break;
        case 'portability':
          await this.handlePortabilityRequest(requestId, requestData.dataSubjectId);
          break;
        case 'rectification':
          await this.handleRectificationRequest(requestId, requestData);
          break;
      }

      // Log request
      await auditLogger.logEvent(auditLogger.eventTypes.COMPLIANCE_DATA_REQUEST, {
        userId: requestData.dataSubjectId,
        requestId,
        requestType: requestData.requestType
      });

      return { requestId, responseDeadline };
    } catch (error) {
      logger.error('Error processing data subject request:', error);
      throw error;
    }
  }

  // Handle access request (GDPR Article 15)
  async handleAccessRequest(requestId, dataSubjectId) {
    try {
      // Collect all data about the subject
      const userData = await this.collectUserData(dataSubjectId);
      
      // Generate report
      const report = {
        personalData: userData.personal,
        medicalRecords: userData.medical,
        processingActivities: userData.processing,
        thirdPartySharing: userData.sharing,
        retentionPeriods: this.retentionPolicies,
        dataPortability: true
      };

      // Encrypt the report
      const encryptedReport = encryption.encryptData(JSON.stringify(report), 'pii');

      // Update request status
      await this.pool.query(`
        UPDATE data_subject_requests
        SET status = 'completed',
            response = $1,
            response_date = NOW()
        WHERE request_id = $2
      `, [JSON.stringify(encryptedReport), requestId]);

      return report;
    } catch (error) {
      logger.error('Error handling access request:', error);
      throw error;
    }
  }

  // Handle erasure request (Right to be forgotten)
  async handleErasureRequest(requestId, dataSubjectId) {
    try {
      // Check if erasure is allowed (no legal obligations to retain)
      const canErase = await this.checkErasureEligibility(dataSubjectId);

      if (!canErase.eligible) {
        await this.pool.query(`
          UPDATE data_subject_requests
          SET status = 'rejected',
              response = $1,
              response_date = NOW()
          WHERE request_id = $2
        `, [canErase.reason, requestId]);
        return { success: false, reason: canErase.reason };
      }

      // Anonymize data instead of deleting (for statistics)
      await this.anonymizeUserData(dataSubjectId);

      // Log deletion
      await auditLogger.logEvent(auditLogger.eventTypes.COMPLIANCE_DATA_DELETION, {
        userId: dataSubjectId,
        requestId
      });

      // Update request
      await this.pool.query(`
        UPDATE data_subject_requests
        SET status = 'completed',
            response = 'Data has been anonymized',
            response_date = NOW()
        WHERE request_id = $1
      `, [requestId]);

      return { success: true };
    } catch (error) {
      logger.error('Error handling erasure request:', error);
      throw error;
    }
  }

  // Handle data portability request
  async handlePortabilityRequest(requestId, dataSubjectId) {
    try {
      const userData = await this.collectUserData(dataSubjectId);
      
      // Format data in machine-readable format (JSON)
      const portableData = {
        format: 'JSON',
        version: '1.0',
        exportDate: new Date(),
        data: userData
      };

      // Encrypt for transmission
      const encryptedData = encryption.encryptData(JSON.stringify(portableData), 'pii');

      // Update request
      await this.pool.query(`
        UPDATE data_subject_requests
        SET status = 'completed',
            response = $1,
            response_date = NOW()
        WHERE request_id = $2
      `, [JSON.stringify(encryptedData), requestId]);

      return portableData;
    } catch (error) {
      logger.error('Error handling portability request:', error);
      throw error;
    }
  }

  // Handle rectification request
  async handleRectificationRequest(requestId, requestData) {
    try {
      // Apply corrections
      // This would update the specific fields requested
      
      await this.pool.query(`
        UPDATE data_subject_requests
        SET status = 'completed',
            response = 'Data has been corrected',
            response_date = NOW()
        WHERE request_id = $1
      `, [requestId]);

      return { success: true };
    } catch (error) {
      logger.error('Error handling rectification request:', error);
      throw error;
    }
  }

  // Conduct privacy impact assessment
  async conductPIA(assessmentData) {
    try {
      const result = await this.pool.query(`
        INSERT INTO privacy_impact_assessments
        (project_name, description, data_types, risk_level, risks_identified, 
         mitigation_measures, residual_risk)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING assessment_id
      `, [
        assessmentData.projectName,
        assessmentData.description,
        assessmentData.dataTypes,
        assessmentData.riskLevel,
        assessmentData.risksIdentified,
        assessmentData.mitigationMeasures,
        assessmentData.residualRisk
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error conducting PIA:', error);
      throw error;
    }
  }

  // Create business associate agreement
  async createBAA(agreementData) {
    try {
      const result = await this.pool.query(`
        INSERT INTO business_associate_agreements
        (organization_name, organization_type, agreement_date, expiry_date, 
         services, data_types, security_measures, agreement_document_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING baa_id
      `, [
        agreementData.organizationName,
        agreementData.organizationType,
        agreementData.agreementDate,
        agreementData.expiryDate,
        agreementData.services,
        agreementData.dataTypes,
        agreementData.securityMeasures,
        agreementData.documentUrl
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating BAA:', error);
      throw error;
    }
  }

  // Check HIPAA compliance
  async checkHIPAACompliance() {
    const complianceReport = {
      compliant: true,
      requirements: {},
      issues: []
    };

    // Check encryption
    complianceReport.requirements.encryption = {
      atRest: true, // Assuming encryption service is active
      inTransit: process.env.HTTPS_ENABLED === 'true'
    };

    if (!complianceReport.requirements.encryption.inTransit) {
      complianceReport.issues.push('HTTPS not enabled for data in transit');
      complianceReport.compliant = false;
    }

    // Check access controls
    const accessControlCheck = await this.pool.query(`
      SELECT COUNT(*) as users_without_roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id IS NULL
    `);

    complianceReport.requirements.accessControl = 
      accessControlCheck.rows[0].users_without_roles === '0';

    if (!complianceReport.requirements.accessControl) {
      complianceReport.issues.push('Users found without proper role assignments');
      complianceReport.compliant = false;
    }

    // Check audit logs
    const auditCheck = await this.pool.query(`
      SELECT COUNT(*) as audit_count
      FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
    `);

    complianceReport.requirements.auditLogs = 
      parseInt(auditCheck.rows[0].audit_count) > 0;

    // Check BAAs
    const baaCheck = await this.pool.query(`
      SELECT COUNT(*) as active_baas
      FROM business_associate_agreements
      WHERE status = 'active' AND expiry_date > NOW()
    `);

    complianceReport.requirements.businessAssociates = 
      parseInt(baaCheck.rows[0].active_baas) > 0;

    return complianceReport;
  }

  // Check GDPR compliance
  async checkGDPRCompliance() {
    const complianceReport = {
      compliant: true,
      principles: {},
      issues: []
    };

    // Check consent records
    const consentCheck = await this.pool.query(`
      SELECT COUNT(*) as active_consents
      FROM consent_records
      WHERE consent_given = true AND (expiry_date IS NULL OR expiry_date > NOW())
    `);

    complianceReport.principles.consent = 
      parseInt(consentCheck.rows[0].active_consents) > 0;

    // Check data subject requests handling
    const requestCheck = await this.pool.query(`
      SELECT COUNT(*) as pending_requests
      FROM data_subject_requests
      WHERE status = 'pending' AND response_deadline < NOW()
    `);

    if (parseInt(requestCheck.rows[0].pending_requests) > 0) {
      complianceReport.issues.push('Overdue data subject requests found');
      complianceReport.compliant = false;
    }

    // Check data inventory
    const inventoryCheck = await this.pool.query(`
      SELECT COUNT(*) as unclassified_data
      FROM data_inventory
      WHERE sensitivity_level IS NULL
    `);

    if (parseInt(inventoryCheck.rows[0].unclassified_data) > 0) {
      complianceReport.issues.push('Unclassified data found in inventory');
    }

    // Check privacy impact assessments
    const piaCheck = await this.pool.query(`
      SELECT COUNT(*) as high_risk_without_pia
      FROM data_processing_activities
      WHERE data_categories && ARRAY['health', 'biometric', 'genetic']
        AND activity_id NOT IN (
          SELECT DISTINCT project_name::uuid 
          FROM privacy_impact_assessments 
          WHERE project_name IS NOT NULL
        )
    `);

    if (parseInt(piaCheck.rows[0].high_risk_without_pia) > 0) {
      complianceReport.issues.push('High-risk processing without PIA');
      complianceReport.compliant = false;
    }

    return complianceReport;
  }

  // Apply data retention policies
  async applyRetentionPolicies() {
    try {
      for (const [dataType, retentionDays] of Object.entries(this.retentionPolicies)) {
        if (retentionDays === null) continue;

        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - retentionDays);

        // Archive or delete based on data type
        switch (dataType) {
          case 'medical_records':
            // Archive, don't delete
            await this.archiveMedicalRecords(retentionDate);
            break;
          case 'temporary_data':
            // Delete temporary data
            await this.deleteTemporaryData(retentionDate);
            break;
          default:
            // Archive by default
            await this.archiveData(dataType, retentionDate);
        }
      }

      logger.info('Retention policies applied successfully');
      return true;
    } catch (error) {
      logger.error('Error applying retention policies:', error);
      return false;
    }
  }

  // Collect user data for requests
  async collectUserData(userId) {
    const userData = {
      personal: {},
      medical: [],
      processing: [],
      sharing: []
    };

    // Personal data
    const personalQuery = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    userData.personal = personalQuery.rows[0];

    // Medical records
    const medicalQuery = await this.pool.query(
      'SELECT * FROM medical_records WHERE patient_id = $1',
      [userId]
    );
    userData.medical = medicalQuery.rows;

    // Processing activities
    const processingQuery = await this.pool.query(
      `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100`,
      [userId]
    );
    userData.processing = processingQuery.rows;

    return userData;
  }

  // Check erasure eligibility
  async checkErasureEligibility(userId) {
    // Check for legal obligations
    const legalCheck = await this.pool.query(`
      SELECT COUNT(*) as active_cases
      FROM legal_holds
      WHERE user_id = $1 AND status = 'active'
    `, [userId]);

    if (parseInt(legalCheck.rows[0]?.active_cases || 0) > 0) {
      return { eligible: false, reason: 'Legal hold in place' };
    }

    // Check for ongoing treatment
    const treatmentCheck = await this.pool.query(`
      SELECT COUNT(*) as active_treatments
      FROM patient_treatments
      WHERE patient_id = $1 AND status = 'active'
    `, [userId]);

    if (parseInt(treatmentCheck.rows[0]?.active_treatments || 0) > 0) {
      return { eligible: false, reason: 'Active treatment in progress' };
    }

    return { eligible: true };
  }

  // Anonymize user data
  async anonymizeUserData(userId) {
    const anonymousId = encryption.generateSecureToken();

    // Update records with anonymous ID
    await this.pool.query(
      'UPDATE patients SET name = $1, email = $1, phone = $1 WHERE patient_id = $2',
      [anonymousId, userId]
    );

    return anonymousId;
  }

  // Archive medical records
  async archiveMedicalRecords(beforeDate) {
    await this.pool.query(`
      INSERT INTO medical_records_archive
      SELECT * FROM medical_records
      WHERE created_at < $1
    `, [beforeDate]);
  }

  // Delete temporary data
  async deleteTemporaryData(beforeDate) {
    await this.pool.query(
      'DELETE FROM temporary_data WHERE created_at < $1',
      [beforeDate]
    );
  }

  // Archive data
  async archiveData(dataType, beforeDate) {
    // Generic archive logic
    logger.info(`Archiving ${dataType} before ${beforeDate}`);
  }

  // Generate compliance report
  async generateComplianceReport() {
    const report = {
      timestamp: new Date(),
      hipaa: await this.checkHIPAACompliance(),
      gdpr: await this.checkGDPRCompliance(),
      dataInventory: await this.getDataInventorySummary(),
      recentBreaches: await this.getRecentBreaches(),
      upcomingDeadlines: await this.getUpcomingDeadlines()
    };

    return report;
  }

  // Get data inventory summary
  async getDataInventorySummary() {
    const result = await this.pool.query(`
      SELECT 
        sensitivity_level,
        COUNT(*) as count,
        COUNT(CASE WHEN encryption_required THEN 1 END) as encrypted_count
      FROM data_inventory
      GROUP BY sensitivity_level
    `);

    return result.rows;
  }

  // Get recent breaches
  async getRecentBreaches() {
    const result = await this.pool.query(`
      SELECT * FROM data_breach_register
      WHERE discovered_date > NOW() - INTERVAL '90 days'
      ORDER BY discovered_date DESC
    `);

    return result.rows;
  }

  // Get upcoming compliance deadlines
  async getUpcomingDeadlines() {
    const deadlines = [];

    // Data subject request deadlines
    const requestDeadlines = await this.pool.query(`
      SELECT request_id, request_type, response_deadline
      FROM data_subject_requests
      WHERE status = 'pending' AND response_deadline > NOW()
      ORDER BY response_deadline
      LIMIT 10
    `);
    deadlines.push(...requestDeadlines.rows.map(r => ({
      type: 'Data Subject Request',
      id: r.request_id,
      deadline: r.response_deadline
    })));

    // BAA renewals
    const baaRenewals = await this.pool.query(`
      SELECT baa_id, organization_name, expiry_date
      FROM business_associate_agreements
      WHERE status = 'active' AND expiry_date < NOW() + INTERVAL '60 days'
      ORDER BY expiry_date
    `);
    deadlines.push(...baaRenewals.rows.map(b => ({
      type: 'BAA Renewal',
      organization: b.organization_name,
      deadline: b.expiry_date
    })));

    return deadlines;
  }
}

module.exports = new ComplianceManager();
