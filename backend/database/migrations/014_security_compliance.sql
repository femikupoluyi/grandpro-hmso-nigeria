-- Migration: Security and Compliance Infrastructure
-- HIPAA/GDPR Compliant Security Implementation

-- Create security schema for RBAC and encryption
CREATE SCHEMA IF NOT EXISTS security;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS compliance;

-- =====================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) TABLES
-- =====================================================

-- Security Permissions Table
CREATE TABLE IF NOT EXISTS security.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert Core Permissions
INSERT INTO security.permissions (name, resource, action, description) VALUES
-- Super Admin Permissions
('system.all', '*', '*', 'Full system access'),

-- Hospital Management Permissions
('hospital.view', 'hospital', 'read', 'View hospital information'),
('hospital.create', 'hospital', 'create', 'Create new hospitals'),
('hospital.update', 'hospital', 'update', 'Update hospital information'),
('hospital.delete', 'hospital', 'delete', 'Delete hospitals'),

-- Patient Management Permissions
('patient.view', 'patient', 'read', 'View patient records'),
('patient.create', 'patient', 'create', 'Register new patients'),
('patient.update', 'patient', 'update', 'Update patient information'),
('patient.delete', 'patient', 'delete', 'Delete patient records'),
('patient.view_medical', 'patient_medical', 'read', 'View patient medical records'),
('patient.update_medical', 'patient_medical', 'update', 'Update patient medical records'),

-- Billing Permissions
('billing.view', 'billing', 'read', 'View billing information'),
('billing.create', 'billing', 'create', 'Create bills and invoices'),
('billing.update', 'billing', 'update', 'Update billing information'),

-- Inventory Permissions
('inventory.view', 'inventory', 'read', 'View inventory'),
('inventory.manage', 'inventory', 'update', 'Manage inventory'),

-- Analytics Permissions
('analytics.view', 'analytics', 'read', 'View analytics and reports'),
('analytics.export', 'analytics', 'export', 'Export analytics data'),

-- Staff Management Permissions
('staff.view', 'staff', 'read', 'View staff information'),
('staff.manage', 'staff', 'update', 'Manage staff schedules and information'),

-- Compliance Permissions
('compliance.view', 'compliance', 'read', 'View compliance reports'),
('compliance.audit', 'compliance', 'audit', 'Perform compliance audits');

-- Role Permissions Mapping
CREATE TABLE IF NOT EXISTS security.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES security.permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    UNIQUE(role_id, permission_id)
);

-- User Roles Audit Table
CREATE TABLE IF NOT EXISTS security.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id, hospital_id)
);

-- =====================================================
-- AUDIT LOGGING TABLES (HIPAA COMPLIANT)
-- =====================================================

-- Comprehensive Audit Log
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    hospital_id UUID REFERENCES hospitals(id),
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    request_body JSONB,
    response_code INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    metadata JSONB,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient querying
CREATE INDEX idx_audit_log_user_id ON audit.audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_hospital ON audit.audit_log(hospital_id);

-- Data Access Log (HIPAA Required)
CREATE TABLE IF NOT EXISTS audit.data_access_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    access_type VARCHAR(50) NOT NULL, -- 'view', 'update', 'delete', 'export'
    data_category VARCHAR(100) NOT NULL, -- 'demographics', 'medical_records', 'billing', etc.
    reason TEXT,
    authorized_by UUID REFERENCES users(id),
    ip_address INET NOT NULL,
    session_id VARCHAR(255),
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_fields TEXT[], -- Array of accessed fields
    emergency_access BOOLEAN DEFAULT false
);

-- Create indexes for compliance reporting
CREATE INDEX idx_data_access_patient ON audit.data_access_log(patient_id);
CREATE INDEX idx_data_access_user ON audit.data_access_log(user_id);
CREATE INDEX idx_data_access_time ON audit.data_access_log(accessed_at DESC);

-- Security Incidents Table
CREATE TABLE IF NOT EXISTS audit.security_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_type VARCHAR(100) NOT NULL, -- 'unauthorized_access', 'data_breach', 'policy_violation'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    user_id UUID REFERENCES users(id),
    ip_address INET,
    description TEXT NOT NULL,
    affected_resources JSONB,
    detection_method VARCHAR(100),
    reported_by UUID REFERENCES users(id),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    requires_disclosure BOOLEAN DEFAULT false
);

-- =====================================================
-- ENCRYPTION KEY MANAGEMENT
-- =====================================================

-- Encryption Keys Table
CREATE TABLE IF NOT EXISTS security.encryption_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name VARCHAR(100) UNIQUE NOT NULL,
    key_type VARCHAR(50) NOT NULL, -- 'master', 'data', 'backup'
    algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    key_hash VARCHAR(255) NOT NULL, -- Store hash of key, not the key itself
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id)
);

-- Encrypted Data Registry
CREATE TABLE IF NOT EXISTS security.encrypted_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    encryption_key_id UUID REFERENCES security.encryption_keys(id),
    data_classification VARCHAR(50), -- 'PII', 'PHI', 'FINANCIAL', 'CONFIDENTIAL'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_name, column_name)
);

-- =====================================================
-- GDPR COMPLIANCE TABLES
-- =====================================================

-- Patient Consent Records
CREATE TABLE IF NOT EXISTS compliance.patient_consent (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    consent_type VARCHAR(100) NOT NULL, -- 'data_processing', 'marketing', 'research'
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    consent_method VARCHAR(50), -- 'online', 'paper', 'verbal'
    consent_version VARCHAR(20),
    purpose TEXT,
    data_controller VARCHAR(255) DEFAULT 'GrandPro HMSO',
    retention_period INTEGER, -- in days
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data Subject Requests (GDPR Articles 15-22)
CREATE TABLE IF NOT EXISTS compliance.data_subject_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    request_type VARCHAR(50) NOT NULL, -- 'access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
    completed_date TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    verification_method VARCHAR(100),
    response_data JSONB,
    rejection_reason TEXT,
    notes TEXT
);

-- Data Processing Activities (GDPR Article 30)
CREATE TABLE IF NOT EXISTS compliance.processing_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(100) NOT NULL, -- 'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'
    data_categories TEXT[],
    data_subjects TEXT[],
    recipients TEXT[],
    international_transfers BOOLEAN DEFAULT false,
    transfer_safeguards TEXT,
    retention_period INTEGER, -- in days
    security_measures TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SESSION MANAGEMENT AND SECURITY
-- =====================================================

-- User Sessions Table
CREATE TABLE IF NOT EXISTS security.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason VARCHAR(100)
);

-- Create index for session lookups
CREATE INDEX idx_session_token ON security.user_sessions(session_token) WHERE is_active = true;
CREATE INDEX idx_session_user ON security.user_sessions(user_id) WHERE is_active = true;

-- Failed Login Attempts (for account lockout)
CREATE TABLE IF NOT EXISTS security.failed_login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    failure_reason VARCHAR(100)
);

-- Create index for rate limiting
CREATE INDEX idx_failed_login_email ON security.failed_login_attempts(email, attempted_at DESC);
CREATE INDEX idx_failed_login_ip ON security.failed_login_attempts(ip_address, attempted_at DESC);

-- =====================================================
-- BACKUP AND RECOVERY TABLES
-- =====================================================

-- Backup History
CREATE TABLE IF NOT EXISTS security.backup_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'differential'
    backup_location TEXT NOT NULL,
    backup_size BIGINT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed'
    error_message TEXT,
    retention_days INTEGER DEFAULT 30,
    encrypted BOOLEAN DEFAULT true,
    checksum VARCHAR(255),
    created_by VARCHAR(100) DEFAULT 'system'
);

-- Failover Test Results
CREATE TABLE IF NOT EXISTS security.failover_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_type VARCHAR(50) NOT NULL, -- 'planned', 'unplanned'
    test_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER,
    success BOOLEAN NOT NULL,
    services_tested JSONB,
    issues_found TEXT[],
    recovery_time_seconds INTEGER,
    data_loss_assessment TEXT,
    performed_by UUID REFERENCES users(id),
    notes TEXT
);

-- =====================================================
-- DATA RETENTION POLICIES
-- =====================================================

-- Retention Policies Table
CREATE TABLE IF NOT EXISTS compliance.retention_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data_category VARCHAR(100) UNIQUE NOT NULL,
    retention_days INTEGER NOT NULL,
    deletion_method VARCHAR(50) DEFAULT 'soft_delete', -- 'soft_delete', 'anonymize', 'hard_delete'
    legal_requirement TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default retention policies
INSERT INTO compliance.retention_policies (data_category, retention_days, deletion_method, legal_requirement) VALUES
('medical_records', 2555, 'soft_delete', 'HIPAA - 6 years minimum'), -- 7 years
('billing_records', 2555, 'soft_delete', 'HIPAA - 6 years minimum'),
('audit_logs', 2555, 'soft_delete', 'HIPAA compliance requirement'),
('patient_consent', 3650, 'soft_delete', 'GDPR - maintain proof of consent'), -- 10 years
('security_incidents', 2555, 'soft_delete', 'Compliance and legal requirements'),
('backup_history', 365, 'hard_delete', 'Operational requirement'),
('session_data', 30, 'hard_delete', 'Security best practice'),
('temporary_data', 7, 'hard_delete', 'Operational requirement');

-- =====================================================
-- SECURITY POLICIES AND CONFIGURATIONS
-- =====================================================

-- Security Policies Table
CREATE TABLE IF NOT EXISTS security.security_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_name VARCHAR(100) UNIQUE NOT NULL,
    policy_type VARCHAR(50) NOT NULL, -- 'password', 'session', 'access', 'data'
    policy_settings JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Insert default security policies
INSERT INTO security.security_policies (policy_name, policy_type, policy_settings) VALUES
('password_policy', 'password', '{
    "min_length": 12,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_special_chars": true,
    "max_age_days": 90,
    "password_history": 5,
    "max_failed_attempts": 5,
    "lockout_duration_minutes": 30
}'::jsonb),
('session_policy', 'session', '{
    "max_session_duration_minutes": 30,
    "idle_timeout_minutes": 15,
    "concurrent_sessions_allowed": 1,
    "require_2fa": true,
    "remember_me_duration_days": 0
}'::jsonb),
('data_encryption_policy', 'data', '{
    "algorithm": "AES-256-GCM",
    "key_rotation_days": 90,
    "encrypt_at_rest": true,
    "encrypt_in_transit": true,
    "tls_version": "1.3",
    "pii_fields_encrypted": true,
    "phi_fields_encrypted": true
}'::jsonb),
('audit_policy', 'audit', '{
    "log_all_access": true,
    "log_failed_attempts": true,
    "log_data_changes": true,
    "log_configuration_changes": true,
    "retention_days": 2555,
    "real_time_alerts": true,
    "alert_on_suspicious_activity": true
}'::jsonb);

-- =====================================================
-- FUNCTIONS FOR SECURITY OPERATIONS
-- =====================================================

-- Function to log data access (HIPAA compliance)
CREATE OR REPLACE FUNCTION audit.log_data_access(
    p_user_id UUID,
    p_patient_id UUID,
    p_access_type VARCHAR(50),
    p_data_category VARCHAR(100),
    p_data_fields TEXT[],
    p_ip_address INET,
    p_session_id VARCHAR(255)
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit.data_access_log (
        user_id, patient_id, access_type, data_category,
        data_fields, ip_address, session_id
    ) VALUES (
        p_user_id, p_patient_id, p_access_type, p_data_category,
        p_data_fields, p_ip_address, p_session_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION security.check_permission(
    p_user_id UUID,
    p_resource VARCHAR(100),
    p_action VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM security.user_roles ur
        JOIN security.role_permissions rp ON ur.role_id = rp.role_id
        JOIN security.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
          AND ur.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
          AND (p.resource = p_resource OR p.resource = '*')
          AND (p.action = p_action OR p.action = '*')
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to anonymize patient data (GDPR compliance)
CREATE OR REPLACE FUNCTION compliance.anonymize_patient_data(p_patient_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update patient record with anonymized data
    UPDATE patients SET
        first_name = 'ANONYMIZED',
        last_name = 'ANONYMIZED',
        email = CONCAT('anonymized_', p_patient_id, '@example.com'),
        phone = '0000000000',
        address = 'ANONYMIZED',
        date_of_birth = '1900-01-01'::DATE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_patient_id;
    
    -- Log the anonymization
    INSERT INTO audit.audit_log (
        action, resource_type, resource_id, success, metadata
    ) VALUES (
        'GDPR_ANONYMIZATION', 'patient', p_patient_id, true,
        jsonb_build_object('reason', 'Data subject request')
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for patients table
CREATE POLICY patient_access_policy ON patients
    FOR ALL
    USING (
        -- Super admins can see all
        EXISTS (
            SELECT 1 FROM security.user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = current_setting('app.current_user_id')::UUID
              AND r.name = 'super_admin'
        )
        OR
        -- Hospital admins can see patients in their hospital
        EXISTS (
            SELECT 1 FROM security.user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = current_setting('app.current_user_id')::UUID
              AND r.name IN ('hospital_admin', 'doctor', 'nurse')
              AND ur.hospital_id = patients.hospital_id
        )
        OR
        -- Patients can see their own record
        patients.id = current_setting('app.current_user_id')::UUID
    );

-- =====================================================
-- TRIGGERS FOR AUDIT LOGGING
-- =====================================================

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION audit.trigger_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit.audit_log (
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        current_setting('app.current_user_id', true)::UUID,
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        jsonb_build_object(
            'old_values', to_jsonb(OLD),
            'new_values', to_jsonb(NEW)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_patients_changes
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION audit.trigger_audit_log();

CREATE TRIGGER audit_medical_records_changes
    AFTER INSERT OR UPDATE OR DELETE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION audit.trigger_audit_log();

CREATE TRIGGER audit_billing_changes
    AFTER INSERT OR UPDATE OR DELETE ON billing_records
    FOR EACH ROW EXECUTE FUNCTION audit.trigger_audit_log();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_sessions_expiry ON security.user_sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_consent_patient ON compliance.patient_consent(patient_id, consent_type);
CREATE INDEX idx_processing_activities ON compliance.processing_activities(legal_basis);
CREATE INDEX idx_retention_policies ON compliance.retention_policies(data_category);

-- =====================================================
-- GRANT PERMISSIONS FOR APPLICATION USER
-- =====================================================

-- Grant necessary permissions to the application user
GRANT USAGE ON SCHEMA security, audit, compliance TO neondb_owner;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA security TO neondb_owner;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO neondb_owner;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA compliance TO neondb_owner;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA security TO neondb_owner;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA audit TO neondb_owner;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA compliance TO neondb_owner;
