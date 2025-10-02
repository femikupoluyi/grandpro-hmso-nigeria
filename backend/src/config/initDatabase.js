const { sql } = require('./database');

const initDatabase = async () => {
  try {
    console.log('Initializing database schema...');

    // Check if types exist and create them if not
    const checkStates = await sql`SELECT 1 FROM pg_type WHERE typname = 'nigerian_states'`;
    if (checkStates.length === 0) {
      await sql`
        CREATE TYPE nigerian_states AS ENUM (
          'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 
          'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 
          'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 
          'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 
          'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
        )
      `;
    }

    const checkAppStatus = await sql`SELECT 1 FROM pg_type WHERE typname = 'application_status'`;
    if (checkAppStatus.length === 0) {
      await sql`
        CREATE TYPE application_status AS ENUM (
          'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_PENDING', 'EVALUATION', 
          'APPROVED', 'REJECTED', 'CONTRACT_NEGOTIATION', 'CONTRACT_SIGNED', 
          'PAYMENT_SETUP', 'SYSTEM_SETUP', 'TRAINING', 'LAUNCH', 'COMPLETED'
        )
      `;
    }

    const checkDocType = await sql`SELECT 1 FROM pg_type WHERE typname = 'document_type'`;
    if (checkDocType.length === 0) {
      await sql`
        CREATE TYPE document_type AS ENUM (
          'CAC_CERTIFICATE', 'TAX_CLEARANCE', 'MEDICAL_LICENSE', 
          'FACILITY_LICENSE', 'INSURANCE_CERTIFICATE', 'STAFF_LIST',
          'EQUIPMENT_INVENTORY', 'FINANCIAL_STATEMENT', 'OTHER'
        )
      `;
    }

    const checkEvalStatus = await sql`SELECT 1 FROM pg_type WHERE typname = 'evaluation_status'`;
    if (checkEvalStatus.length === 0) {
      await sql`
        CREATE TYPE evaluation_status AS ENUM (
          'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
        )
      `;
    }

    // Create hospital applications table
    await sql`
      CREATE TABLE IF NOT EXISTS hospital_applications (
        id SERIAL PRIMARY KEY,
        application_number VARCHAR(20) UNIQUE NOT NULL,
        -- Hospital Information
        hospital_name VARCHAR(255) NOT NULL,
        hospital_type VARCHAR(100) NOT NULL,
        bed_capacity INTEGER,
        year_established INTEGER,
        registration_number VARCHAR(100),
        tax_id VARCHAR(100),
        
        -- Location
        state nigerian_states NOT NULL,
        lga VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        postal_code VARCHAR(10),
        
        -- Contact Information
        phone_primary VARCHAR(20) NOT NULL,
        phone_secondary VARCHAR(20),
        email VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        
        -- Owner Information
        owner_first_name VARCHAR(100) NOT NULL,
        owner_last_name VARCHAR(100) NOT NULL,
        owner_middle_name VARCHAR(100),
        owner_title VARCHAR(50),
        owner_nin VARCHAR(20),
        owner_phone VARCHAR(20) NOT NULL,
        owner_email VARCHAR(255) NOT NULL,
        
        -- Services and Specializations
        services_offered TEXT[],
        specializations TEXT[],
        has_emergency_unit BOOLEAN DEFAULT false,
        has_icu BOOLEAN DEFAULT false,
        has_laboratory BOOLEAN DEFAULT false,
        has_pharmacy BOOLEAN DEFAULT false,
        has_radiology BOOLEAN DEFAULT false,
        
        -- Financial Information
        annual_revenue_naira DECIMAL(15, 2),
        number_of_staff INTEGER,
        number_of_doctors INTEGER,
        number_of_nurses INTEGER,
        accepts_nhis BOOLEAN DEFAULT false,
        accepts_hmo BOOLEAN DEFAULT false,
        
        -- Application Metadata
        status application_status DEFAULT 'DRAFT',
        submission_date TIMESTAMPTZ,
        approval_date TIMESTAMPTZ,
        rejection_reason TEXT,
        evaluation_score DECIMAL(5, 2),
        
        -- System Fields
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create application documents table
    await sql`
      CREATE TABLE IF NOT EXISTS application_documents (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES hospital_applications(id) ON DELETE CASCADE,
        document_type document_type NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        is_verified BOOLEAN DEFAULT false,
        verification_date TIMESTAMPTZ,
        verification_notes TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create evaluation criteria table
    await sql`
      CREATE TABLE IF NOT EXISTS evaluation_criteria (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        criterion VARCHAR(255) NOT NULL,
        weight DECIMAL(3, 2) NOT NULL,
        max_score INTEGER DEFAULT 10,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create application evaluations table
    await sql`
      CREATE TABLE IF NOT EXISTS application_evaluations (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES hospital_applications(id) ON DELETE CASCADE,
        criterion_id INTEGER REFERENCES evaluation_criteria(id),
        score INTEGER NOT NULL,
        notes TEXT,
        evaluated_by VARCHAR(100),
        evaluated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create contracts table
    await sql`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES hospital_applications(id) ON DELETE CASCADE,
        contract_number VARCHAR(50) UNIQUE NOT NULL,
        contract_type VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        monthly_fee_naira DECIMAL(12, 2),
        revenue_share_percentage DECIMAL(5, 2),
        payment_terms TEXT,
        special_conditions TEXT,
        is_signed BOOLEAN DEFAULT false,
        signed_date TIMESTAMPTZ,
        signed_by_owner VARCHAR(255),
        signed_by_grandpro VARCHAR(255),
        contract_document_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'DRAFT',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Create onboarding checklist table
    await sql`
      CREATE TABLE IF NOT EXISTS onboarding_checklist (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES hospital_applications(id) ON DELETE CASCADE,
        task_name VARCHAR(255) NOT NULL,
        task_category VARCHAR(100) NOT NULL,
        is_required BOOLEAN DEFAULT true,
        is_completed BOOLEAN DEFAULT false,
        completed_date TIMESTAMPTZ,
        completed_by VARCHAR(100),
        notes TEXT,
        due_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Check if evaluation criteria exist, if not insert defaults
    const criteriaCount = await sql`SELECT COUNT(*) FROM evaluation_criteria`;
    if (criteriaCount[0].count === '0') {
      const criteria = [
        ['Infrastructure', 'Building Quality', 0.10, 10, 'Quality and condition of hospital building'],
        ['Infrastructure', 'Equipment Availability', 0.15, 10, 'Medical equipment and facilities'],
        ['Infrastructure', 'Bed Capacity', 0.05, 10, 'Number of beds relative to location needs'],
        ['Medical Services', 'Service Range', 0.10, 10, 'Variety of medical services offered'],
        ['Medical Services', 'Specializations', 0.10, 10, 'Specialized departments and expertise'],
        ['Medical Services', 'Emergency Services', 0.05, 10, 'Emergency unit capability'],
        ['Staffing', 'Doctor to Patient Ratio', 0.10, 10, 'Number of doctors relative to capacity'],
        ['Staffing', 'Nursing Staff', 0.05, 10, 'Adequate nursing staff'],
        ['Financial', 'Revenue History', 0.10, 10, 'Historical financial performance'],
        ['Financial', 'Insurance Acceptance', 0.05, 10, 'NHIS and HMO acceptance'],
        ['Compliance', 'Licensing', 0.10, 10, 'Valid licenses and certifications'],
        ['Compliance', 'Documentation', 0.05, 10, 'Complete and valid documentation']
      ];

      for (const [category, criterion, weight, max_score, description] of criteria) {
        await sql`
          INSERT INTO evaluation_criteria (category, criterion, weight, max_score, description)
          VALUES (${category}, ${criterion}, ${weight}, ${max_score}, ${description})
        `;
      }
    }

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_applications_status ON hospital_applications(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_applications_state ON hospital_applications(state)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_applications_number ON hospital_applications(application_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_application ON application_documents(application_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evaluations_application ON application_evaluations(application_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contracts_application ON contracts(application_id)`;

    console.log('✅ Database schema initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
};

module.exports = { initDatabase };
