-- Insurance/HMO Integration Tables

-- Insurance verifications
CREATE TABLE IF NOT EXISTS insurance_verifications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    provider_id VARCHAR(50) NOT NULL,
    insurance_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    coverage_details JSONB,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(patient_id, provider_id)
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    id SERIAL PRIMARY KEY,
    claim_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    provider_id VARCHAR(50) NOT NULL,
    hospital_id INTEGER REFERENCES hospitals(id),
    amount DECIMAL(12, 2) NOT NULL,
    approved_amount DECIMAL(12, 2),
    services JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_date TIMESTAMP,
    response_data JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pre-authorizations
CREATE TABLE IF NOT EXISTS pre_authorizations (
    id SERIAL PRIMARY KEY,
    auth_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    provider_id VARCHAR(50) NOT NULL,
    hospital_id INTEGER REFERENCES hospitals(id),
    service_type VARCHAR(100) NOT NULL,
    estimated_cost DECIMAL(12, 2) NOT NULL,
    approved_amount DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_date TIMESTAMP,
    response_data JSONB,
    valid_until TIMESTAMP
);

-- Batch submissions
CREATE TABLE IF NOT EXISTS batch_submissions (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    total_claims INTEGER NOT NULL,
    successful_claims INTEGER DEFAULT 0,
    failed_claims INTEGER DEFAULT 0,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    results JSONB
);

-- Provider networks cache
CREATE TABLE IF NOT EXISTS provider_networks (
    id SERIAL PRIMARY KEY,
    provider_id VARCHAR(50) UNIQUE NOT NULL,
    network_data JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacy Integration Tables

-- Drug availability checks
CREATE TABLE IF NOT EXISTS drug_availability_checks (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id),
    drug_name VARCHAR(200) NOT NULL,
    quantity_requested INTEGER NOT NULL,
    check_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    results JSONB NOT NULL
);

-- Pharmacy orders
CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    hospital_id INTEGER REFERENCES hospitals(id),
    supplier_id VARCHAR(50),
    order_items JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    order_status VARCHAR(50) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery TIMESTAMP,
    actual_delivery TIMESTAMP,
    tracking_info JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto-reorder rules
CREATE TABLE IF NOT EXISTS auto_reorder_rules (
    id SERIAL PRIMARY KEY,
    rule_id VARCHAR(100),
    hospital_id INTEGER REFERENCES hospitals(id),
    drug_name VARCHAR(200) NOT NULL,
    minimum_quantity INTEGER NOT NULL,
    reorder_quantity INTEGER NOT NULL,
    preferred_supplier VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id, drug_name)
);

-- Inventory tracking
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    hospital_id INTEGER REFERENCES hospitals(id),
    drug_name VARCHAR(200) NOT NULL,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    unit_of_measure VARCHAR(50),
    batch_number VARCHAR(100),
    expiry_date DATE,
    last_restocked TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id, drug_name, batch_number)
);

-- Telemedicine Integration Tables

-- Telemedicine consultations
CREATE TABLE IF NOT EXISTS telemedicine_consultations (
    id SERIAL PRIMARY KEY,
    consultation_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    doctor_id INTEGER REFERENCES doctors(id),
    hospital_id INTEGER REFERENCES hospitals(id),
    provider_id VARCHAR(50) DEFAULT 'WELLNESS',
    scheduled_time TIMESTAMP NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INTEGER DEFAULT 30,
    actual_duration INTEGER,
    consultation_type VARCHAR(50) DEFAULT 'general',
    chief_complaint TEXT,
    consultation_summary JSONB,
    room_url TEXT,
    room_credentials JSONB,
    recording_url TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    patient_joined_at TIMESTAMP,
    doctor_joined_at TIMESTAMP,
    prescription_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Telemedicine prescriptions
CREATE TABLE IF NOT EXISTS telemedicine_prescriptions (
    id SERIAL PRIMARY KEY,
    prescription_id VARCHAR(100) UNIQUE NOT NULL,
    consultation_id VARCHAR(100) REFERENCES telemedicine_consultations(consultation_id),
    patient_id INTEGER REFERENCES patients(id),
    doctor_id INTEGER REFERENCES doctors(id),
    medications JSONB NOT NULL,
    instructions TEXT,
    duration_days INTEGER,
    refills_allowed INTEGER DEFAULT 0,
    is_electronic BOOLEAN DEFAULT true,
    pharmacy_sent_to VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical record shares
CREATE TABLE IF NOT EXISTS record_shares (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(100) UNIQUE NOT NULL,
    consultation_id VARCHAR(100),
    record_ids JSONB NOT NULL,
    shared_by INTEGER REFERENCES users(id),
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- AI triage results
CREATE TABLE IF NOT EXISTS ai_triage_results (
    id SERIAL PRIMARY KEY,
    triage_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    symptoms JSONB NOT NULL,
    triage_result JSONB NOT NULL,
    urgency_level VARCHAR(20) NOT NULL,
    recommended_action VARCHAR(200),
    confidence_score DECIMAL(3, 2),
    consultation_scheduled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Remote diagnostics
CREATE TABLE IF NOT EXISTS remote_diagnostics (
    id SERIAL PRIMARY KEY,
    diagnostic_id VARCHAR(100) UNIQUE NOT NULL,
    consultation_id VARCHAR(100) REFERENCES telemedicine_consultations(consultation_id),
    diagnostic_type VARCHAR(50) NOT NULL,
    raw_data JSONB,
    processed_results JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_insurance_claims_patient ON insurance_claims(patient_id);
CREATE INDEX idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX idx_pharmacy_orders_hospital ON pharmacy_orders(hospital_id);
CREATE INDEX idx_pharmacy_orders_status ON pharmacy_orders(order_status);
CREATE INDEX idx_inventory_hospital_drug ON inventory(hospital_id, drug_name);
CREATE INDEX idx_telemedicine_patient ON telemedicine_consultations(patient_id);
CREATE INDEX idx_telemedicine_doctor ON telemedicine_consultations(doctor_id);
CREATE INDEX idx_telemedicine_status ON telemedicine_consultations(status);
CREATE INDEX idx_ai_triage_patient ON ai_triage_results(patient_id);
CREATE INDEX idx_ai_triage_urgency ON ai_triage_results(urgency_level);
