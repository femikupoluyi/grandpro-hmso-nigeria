const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { sql } = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed.'));
    }
  }
});

// Generate unique application number
const generateApplicationNumber = () => {
  const prefix = 'APP';
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${year}${random}`;
};

// Submit new hospital application
router.post('/applications/submit', [
  body('hospitalName').notEmpty().withMessage('Hospital name is required'),
  body('hospitalType').notEmpty().withMessage('Hospital type is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('lga').notEmpty().withMessage('LGA is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('phonePrimary').matches(/^\+234\d{10}$/).withMessage('Invalid Nigerian phone number'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('ownerFirstName').notEmpty().withMessage('Owner first name is required'),
  body('ownerLastName').notEmpty().withMessage('Owner last name is required'),
  body('ownerPhone').matches(/^\+234\d{10}$/).withMessage('Invalid owner phone number'),
  body('ownerEmail').isEmail().withMessage('Valid owner email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const applicationNumber = generateApplicationNumber();
    const {
      hospitalName, hospitalType, bedCapacity, yearEstablished,
      registrationNumber, taxId, state, lga, city, address, postalCode,
      phonePrimary, phoneSecondary, email, website,
      ownerFirstName, ownerLastName, ownerMiddleName, ownerTitle,
      ownerNin, ownerPhone, ownerEmail,
      servicesOffered, specializations,
      hasEmergencyUnit, hasIcu, hasLaboratory, hasPharmacy, hasRadiology,
      annualRevenueNaira, numberOfStaff, numberOfDoctors, numberOfNurses,
      acceptsNhis, acceptsHmo
    } = req.body;

    const result = await sql`
      INSERT INTO hospital_applications (
        application_number, hospital_name, hospital_type, bed_capacity,
        year_established, registration_number, tax_id, state, lga, city,
        address, postal_code, phone_primary, phone_secondary, email, website,
        owner_first_name, owner_last_name, owner_middle_name, owner_title,
        owner_nin, owner_phone, owner_email,
        services_offered, specializations,
        has_emergency_unit, has_icu, has_laboratory, has_pharmacy, has_radiology,
        annual_revenue_naira, number_of_staff, number_of_doctors, number_of_nurses,
        accepts_nhis, accepts_hmo,
        status, submission_date
      ) VALUES (
        ${applicationNumber}, ${hospitalName}, ${hospitalType}, ${bedCapacity},
        ${yearEstablished}, ${registrationNumber}, ${taxId}, ${state}, ${lga}, ${city},
        ${address}, ${postalCode}, ${phonePrimary}, ${phoneSecondary}, ${email}, ${website},
        ${ownerFirstName}, ${ownerLastName}, ${ownerMiddleName}, ${ownerTitle},
        ${ownerNin}, ${ownerPhone}, ${ownerEmail},
        ${servicesOffered || []}, ${specializations || []},
        ${hasEmergencyUnit || false}, ${hasIcu || false}, ${hasLaboratory || false},
        ${hasPharmacy || false}, ${hasRadiology || false},
        ${annualRevenueNaira}, ${numberOfStaff}, ${numberOfDoctors}, ${numberOfNurses},
        ${acceptsNhis || false}, ${acceptsHmo || false},
        'SUBMITTED', NOW()
      ) RETURNING id, application_number
    `;

    // Create default onboarding checklist items
    const checklistItems = [
      { category: 'Documents', task: 'Submit CAC Certificate', required: true },
      { category: 'Documents', task: 'Submit Tax Clearance', required: true },
      { category: 'Documents', task: 'Submit Medical License', required: true },
      { category: 'Documents', task: 'Submit Facility License', required: true },
      { category: 'Verification', task: 'Complete Background Check', required: true },
      { category: 'Verification', task: 'Site Inspection', required: true },
      { category: 'Contract', task: 'Review Contract Terms', required: true },
      { category: 'Contract', task: 'Sign Digital Contract', required: true },
      { category: 'Setup', task: 'Configure System Access', required: true },
      { category: 'Training', task: 'Complete Staff Training', required: true }
    ];

    for (const item of checklistItems) {
      await sql`
        INSERT INTO onboarding_checklist (
          application_id, task_name, task_category, is_required
        ) VALUES (
          ${result[0].id}, ${item.task}, ${item.category}, ${item.required}
        )
      `;
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicationNumber: result[0].application_number,
      applicationId: result[0].id
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get application status
router.get('/applications/status/:applicationNumber', async (req, res) => {
  try {
    const { applicationNumber } = req.params;
    
    const result = await sql`
      SELECT 
        id, application_number, hospital_name, status,
        submission_date, approval_date, evaluation_score,
        created_at, updated_at
      FROM hospital_applications
      WHERE application_number = ${applicationNumber}
    `;

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      application: result[0]
    });
  } catch (error) {
    console.error('Error fetching application status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload documents
router.post('/applications/:id/documents', 
  upload.array('documents', 10),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { documentTypes } = req.body;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No documents uploaded'
        });
      }

      const uploadedDocs = [];
      const types = Array.isArray(documentTypes) ? documentTypes : [documentTypes];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const docType = types[i] || 'OTHER';

        const result = await sql`
          INSERT INTO application_documents (
            application_id, document_type, document_name,
            file_path, file_size, mime_type
          ) VALUES (
            ${id}, ${docType}, ${file.originalname},
            ${file.filename}, ${file.size}, ${file.mimetype}
          ) RETURNING id, document_type, document_name
        `;
        
        uploadedDocs.push(result[0]);
      }

      // Update application status if needed
      await sql`
        UPDATE hospital_applications
        SET status = CASE 
          WHEN status = 'SUBMITTED' THEN 'DOCUMENTS_PENDING'
          ELSE status
        END,
        updated_at = NOW()
        WHERE id = ${id}
      `;

      res.json({
        success: true,
        message: 'Documents uploaded successfully',
        documents: uploadedDocs
      });
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload documents',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
});

// Get application progress
router.get('/applications/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get application details
    const application = await sql`
      SELECT status, submission_date, approval_date, evaluation_score
      FROM hospital_applications
      WHERE id = ${id}
    `;

    if (application.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Get checklist items
    const checklist = await sql`
      SELECT task_name, task_category, is_required, is_completed, completed_date
      FROM onboarding_checklist
      WHERE application_id = ${id}
      ORDER BY task_category, task_name
    `;

    // Get documents
    const documents = await sql`
      SELECT document_type, document_name, is_verified, uploaded_at
      FROM application_documents
      WHERE application_id = ${id}
    `;

    // Calculate progress percentage
    const totalTasks = checklist.length;
    const completedTasks = checklist.filter(item => item.is_completed).length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      success: true,
      progress: {
        status: application[0].status,
        percentage: progressPercentage,
        checklist: checklist,
        documents: documents,
        submissionDate: application[0].submission_date,
        approvalDate: application[0].approval_date,
        evaluationScore: application[0].evaluation_score
      }
    });
  } catch (error) {
    console.error('Error fetching application progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application progress',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Auto-evaluate application
router.post('/applications/:id/auto-evaluate', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get application details
    const application = await sql`
      SELECT * FROM hospital_applications WHERE id = ${id}
    `;

    if (application.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    const app = application[0];
    
    // Get evaluation criteria
    const criteria = await sql`
      SELECT * FROM evaluation_criteria WHERE is_active = true
    `;

    // Perform auto-evaluation based on provided information
    let totalScore = 0;
    let totalWeight = 0;
    const evaluations = [];

    for (const criterion of criteria) {
      let score = 5; // Default medium score

      // Basic scoring logic
      switch (criterion.category) {
        case 'Infrastructure':
          if (criterion.criterion === 'Bed Capacity' && app.bed_capacity) {
            score = app.bed_capacity >= 100 ? 10 : app.bed_capacity >= 50 ? 7 : 5;
          }
          break;
        case 'Medical Services':
          if (criterion.criterion === 'Emergency Services') {
            score = app.has_emergency_unit ? 10 : 3;
          }
          if (criterion.criterion === 'Service Range') {
            const serviceCount = app.services_offered ? app.services_offered.length : 0;
            score = serviceCount >= 10 ? 10 : serviceCount >= 5 ? 7 : 5;
          }
          break;
        case 'Staffing':
          if (criterion.criterion === 'Doctor to Patient Ratio' && app.number_of_doctors && app.bed_capacity) {
            const ratio = app.number_of_doctors / app.bed_capacity;
            score = ratio >= 0.2 ? 10 : ratio >= 0.1 ? 7 : 5;
          }
          break;
        case 'Financial':
          if (criterion.criterion === 'Insurance Acceptance') {
            score = (app.accepts_nhis && app.accepts_hmo) ? 10 : (app.accepts_nhis || app.accepts_hmo) ? 7 : 3;
          }
          break;
      }

      evaluations.push({
        application_id: id,
        criterion_id: criterion.id,
        score: score,
        evaluated_by: 'SYSTEM_AUTO'
      });

      totalScore += score * criterion.weight;
      totalWeight += criterion.weight;
    }

    // Insert evaluation records
    for (const eval of evaluations) {
      await sql`
        INSERT INTO application_evaluations (
          application_id, criterion_id, score, notes, evaluated_by
        ) VALUES (
          ${eval.application_id}, ${eval.criterion_id}, ${eval.score},
          'Auto-evaluated by system', ${eval.evaluated_by}
        )
      `;
    }

    // Calculate final score
    const finalScore = totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;

    // Update application with evaluation score
    await sql`
      UPDATE hospital_applications
      SET evaluation_score = ${finalScore},
          status = ${finalScore >= 7 ? 'APPROVED' : 'UNDER_REVIEW'},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    res.json({
      success: true,
      message: 'Auto-evaluation completed',
      evaluationScore: finalScore,
      status: finalScore >= 7 ? 'APPROVED' : 'UNDER_REVIEW',
      evaluations: evaluations.length
    });
  } catch (error) {
    console.error('Error during auto-evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform auto-evaluation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Generate contract
router.post('/applications/:id/contract/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const { contractType, monthlyFee, revenueSharePercentage, startDate, endDate } = req.body;
    
    // Get application details
    const application = await sql`
      SELECT * FROM hospital_applications WHERE id = ${id} AND status = 'APPROVED'
    `;

    if (application.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Approved application not found'
      });
    }

    const app = application[0];
    const contractNumber = `CTR${new Date().getFullYear()}${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

    // Create contract record
    const contract = await sql`
      INSERT INTO contracts (
        application_id, contract_number, contract_type,
        start_date, end_date, monthly_fee_naira, revenue_share_percentage,
        payment_terms, special_conditions, status
      ) VALUES (
        ${id}, ${contractNumber}, ${contractType || 'STANDARD'},
        ${startDate || new Date()}, ${endDate || null},
        ${monthlyFee || 0}, ${revenueSharePercentage || 0},
        'Monthly payment due on the 5th of each month',
        'Subject to quarterly performance review',
        'DRAFT'
      ) RETURNING *
    `;

    // Update application status
    await sql`
      UPDATE hospital_applications
      SET status = 'CONTRACT_NEGOTIATION',
          updated_at = NOW()
      WHERE id = ${id}
    `;

    // Generate contract content (simplified version)
    const contractContent = {
      contractNumber: contract[0].contract_number,
      parties: {
        grandpro: 'GrandPro HMSO',
        hospital: app.hospital_name,
        owner: `${app.owner_first_name} ${app.owner_last_name}`
      },
      terms: {
        startDate: contract[0].start_date,
        endDate: contract[0].end_date,
        monthlyFee: contract[0].monthly_fee_naira,
        revenueShare: contract[0].revenue_share_percentage,
        paymentTerms: contract[0].payment_terms
      },
      location: {
        state: app.state,
        lga: app.lga,
        address: app.address
      }
    };

    res.json({
      success: true,
      message: 'Contract generated successfully',
      contract: {
        id: contract[0].id,
        contractNumber: contract[0].contract_number,
        content: contractContent
      }
    });
  } catch (error) {
    console.error('Error generating contract:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate contract',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Sign contract digitally
router.post('/contracts/:id/sign', async (req, res) => {
  try {
    const { id } = req.params;
    const { signedByOwner, signedByGrandpro, signature } = req.body;
    
    // Update contract
    const result = await sql`
      UPDATE contracts
      SET is_signed = true,
          signed_date = NOW(),
          signed_by_owner = ${signedByOwner},
          signed_by_grandpro = ${signedByGrandpro},
          status = 'SIGNED',
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING application_id, contract_number
    `;

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    // Update application status
    await sql`
      UPDATE hospital_applications
      SET status = 'CONTRACT_SIGNED',
          updated_at = NOW()
      WHERE id = ${result[0].application_id}
    `;

    // Update checklist
    await sql`
      UPDATE onboarding_checklist
      SET is_completed = true,
          completed_date = NOW(),
          completed_by = ${signedByOwner}
      WHERE application_id = ${result[0].application_id}
      AND task_name = 'Sign Digital Contract'
    `;

    res.json({
      success: true,
      message: 'Contract signed successfully',
      contractNumber: result[0].contract_number
    });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sign contract',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
