const express = require('express');
const router = express.Router();
const insuranceIntegration = require('../integrations/insuranceIntegration');
const pharmacyIntegration = require('../integrations/pharmacyIntegration');
// const telemedicineIntegration = require('../integrations/telemedicineIntegration');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ============= INSURANCE/HMO ROUTES =============

// Verify patient insurance eligibility
router.post('/insurance/verify-eligibility', 
  authenticateToken, 
  authorizeRoles('admin', 'doctor', 'billing'),
  async (req, res) => {
    try {
      const { providerId, patientData } = req.body;
      
      if (!providerId || !patientData) {
        return res.status(400).json({ 
          error: 'Provider ID and patient data are required' 
        });
      }

      const result = await insuranceIntegration.verifyEligibility(
        providerId, 
        patientData
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error verifying eligibility:', error);
      res.status(500).json({ 
        error: 'Failed to verify insurance eligibility',
        message: error.message 
      });
    }
});

// Submit insurance claim
router.post('/insurance/submit-claim',
  authenticateToken,
  authorizeRoles('admin', 'billing'),
  async (req, res) => {
    try {
      const { providerId, claimData } = req.body;
      
      if (!providerId || !claimData) {
        return res.status(400).json({ 
          error: 'Provider ID and claim data are required' 
        });
      }

      const result = await insuranceIntegration.submitClaim(
        providerId, 
        claimData
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error submitting claim:', error);
      res.status(500).json({ 
        error: 'Failed to submit insurance claim',
        message: error.message 
      });
    }
});

// Get claim status
router.get('/insurance/claim-status/:claimId',
  authenticateToken,
  async (req, res) => {
    try {
      const { claimId } = req.params;
      const { providerId } = req.query;
      
      const result = await insuranceIntegration.getClaimStatus(
        claimId, 
        providerId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting claim status:', error);
      res.status(500).json({ 
        error: 'Failed to get claim status',
        message: error.message 
      });
    }
});

// Request pre-authorization
router.post('/insurance/pre-authorization',
  authenticateToken,
  authorizeRoles('admin', 'doctor', 'billing'),
  async (req, res) => {
    try {
      const { providerId, authData } = req.body;
      
      const result = await insuranceIntegration.requestPreAuthorization(
        providerId, 
        authData
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error requesting pre-authorization:', error);
      res.status(500).json({ 
        error: 'Failed to request pre-authorization',
        message: error.message 
      });
    }
});

// Submit batch claims
router.post('/insurance/batch-claims',
  authenticateToken,
  authorizeRoles('admin', 'billing'),
  async (req, res) => {
    try {
      const { providerId, claims } = req.body;
      
      if (!Array.isArray(claims) || claims.length === 0) {
        return res.status(400).json({ 
          error: 'Claims must be a non-empty array' 
        });
      }

      const result = await insuranceIntegration.submitBatchClaims(
        providerId, 
        claims
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error submitting batch claims:', error);
      res.status(500).json({ 
        error: 'Failed to submit batch claims',
        message: error.message 
      });
    }
});

// Get provider network
router.get('/insurance/provider-network/:providerId',
  authenticateToken,
  async (req, res) => {
    try {
      const { providerId } = req.params;
      
      const result = await insuranceIntegration.getProviderNetwork(providerId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting provider network:', error);
      res.status(500).json({ 
        error: 'Failed to get provider network',
        message: error.message 
      });
    }
});

// ============= PHARMACY SUPPLIER ROUTES =============

// Check drug availability
router.post('/pharmacy/check-availability',
  authenticateToken,
  authorizeRoles('admin', 'pharmacist', 'inventory'),
  async (req, res) => {
    try {
      const { drugName, quantity, hospitalId } = req.body;
      
      if (!drugName || !quantity || !hospitalId) {
        return res.status(400).json({ 
          error: 'Drug name, quantity, and hospital ID are required' 
        });
      }

      const result = await pharmacyIntegration.checkDrugAvailability(
        drugName, 
        quantity, 
        hospitalId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({ 
        error: 'Failed to check drug availability',
        message: error.message 
      });
    }
});

// Place restock order
router.post('/pharmacy/restock-order',
  authenticateToken,
  authorizeRoles('admin', 'pharmacist', 'inventory'),
  async (req, res) => {
    try {
      const { hospitalId, orderItems, supplierId } = req.body;
      
      if (!hospitalId || !orderItems || !Array.isArray(orderItems)) {
        return res.status(400).json({ 
          error: 'Hospital ID and order items are required' 
        });
      }

      const result = await pharmacyIntegration.placeRestockOrder(
        hospitalId, 
        orderItems, 
        supplierId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error placing restock order:', error);
      res.status(500).json({ 
        error: 'Failed to place restock order',
        message: error.message 
      });
    }
});

// Setup auto-reorder rules
router.post('/pharmacy/auto-reorder',
  authenticateToken,
  authorizeRoles('admin', 'pharmacist'),
  async (req, res) => {
    try {
      const { hospitalId, rules } = req.body;
      
      if (!hospitalId || !rules || !Array.isArray(rules)) {
        return res.status(400).json({ 
          error: 'Hospital ID and rules are required' 
        });
      }

      const result = await pharmacyIntegration.setupAutoReorder(
        hospitalId, 
        rules
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error setting up auto-reorder:', error);
      res.status(500).json({ 
        error: 'Failed to setup auto-reorder',
        message: error.message 
      });
    }
});

// Check and trigger auto-reorders
router.post('/pharmacy/check-reorder/:hospitalId',
  authenticateToken,
  authorizeRoles('admin', 'pharmacist', 'system'),
  async (req, res) => {
    try {
      const { hospitalId } = req.params;
      
      const result = await pharmacyIntegration.checkAndReorder(hospitalId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error checking and reordering:', error);
      res.status(500).json({ 
        error: 'Failed to check and reorder',
        message: error.message 
      });
    }
});

// Get price comparison
router.get('/pharmacy/price-comparison',
  authenticateToken,
  async (req, res) => {
    try {
      const { drugName, quantity } = req.query;
      
      if (!drugName || !quantity) {
        return res.status(400).json({ 
          error: 'Drug name and quantity are required' 
        });
      }

      const result = await pharmacyIntegration.getPriceComparison(
        drugName, 
        parseInt(quantity)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting price comparison:', error);
      res.status(500).json({ 
        error: 'Failed to get price comparison',
        message: error.message 
      });
    }
});

// Track order
router.get('/pharmacy/track-order/:orderId',
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const result = await pharmacyIntegration.trackOrder(orderId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error tracking order:', error);
      res.status(500).json({ 
        error: 'Failed to track order',
        message: error.message 
      });
    }
});

// Get supplier catalog
router.get('/pharmacy/catalog/:supplierId',
  authenticateToken,
  async (req, res) => {
    try {
      const { supplierId } = req.params;
      const { category } = req.query;
      
      const result = await pharmacyIntegration.getSupplierCatalog(
        supplierId, 
        category
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting supplier catalog:', error);
      res.status(500).json({ 
        error: 'Failed to get supplier catalog',
        message: error.message 
      });
    }
});

// ============= TELEMEDICINE ROUTES =============

// Schedule consultation
router.post('/telemedicine/schedule',
  authenticateToken,
  async (req, res) => {
    try {
      const consultationData = req.body;
      
      if (!consultationData.patientId || !consultationData.doctorId) {
        return res.status(400).json({ 
          error: 'Patient ID and doctor ID are required' 
        });
      }

      const result = await telemedicineIntegration.scheduleConsultation(
        consultationData
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      res.status(500).json({ 
        error: 'Failed to schedule consultation',
        message: error.message 
      });
    }
});

// Start consultation
router.post('/telemedicine/start/:consultationId',
  authenticateToken,
  async (req, res) => {
    try {
      const { consultationId } = req.params;
      const { userId, userRole } = req.body;
      
      if (!userId || !userRole) {
        return res.status(400).json({ 
          error: 'User ID and role are required' 
        });
      }

      const result = await telemedicineIntegration.startConsultation(
        consultationId, 
        userId, 
        userRole
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error starting consultation:', error);
      res.status(500).json({ 
        error: 'Failed to start consultation',
        message: error.message 
      });
    }
});

// End consultation
router.post('/telemedicine/end/:consultationId',
  authenticateToken,
  async (req, res) => {
    try {
      const { consultationId } = req.params;
      const { summary } = req.body;
      
      const result = await telemedicineIntegration.endConsultation(
        consultationId, 
        summary || {}
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error ending consultation:', error);
      res.status(500).json({ 
        error: 'Failed to end consultation',
        message: error.message 
      });
    }
});

// Add prescription
router.post('/telemedicine/prescription',
  authenticateToken,
  authorizeRoles('doctor'),
  async (req, res) => {
    try {
      const { consultationId, prescriptionData } = req.body;
      
      if (!consultationId || !prescriptionData) {
        return res.status(400).json({ 
          error: 'Consultation ID and prescription data are required' 
        });
      }

      const result = await telemedicineIntegration.addPrescription(
        consultationId, 
        prescriptionData
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error adding prescription:', error);
      res.status(500).json({ 
        error: 'Failed to add prescription',
        message: error.message 
      });
    }
});

// Share medical records
router.post('/telemedicine/share-records',
  authenticateToken,
  async (req, res) => {
    try {
      const { consultationId, recordIds, sharedBy } = req.body;
      
      if (!consultationId || !recordIds || !Array.isArray(recordIds)) {
        return res.status(400).json({ 
          error: 'Consultation ID and record IDs are required' 
        });
      }

      const result = await telemedicineIntegration.shareMedialRecords(
        consultationId, 
        recordIds, 
        sharedBy
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error sharing medical records:', error);
      res.status(500).json({ 
        error: 'Failed to share medical records',
        message: error.message 
      });
    }
});

// AI triage
router.post('/telemedicine/ai-triage',
  authenticateToken,
  async (req, res) => {
    try {
      const { symptoms, patientData } = req.body;
      
      if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
        return res.status(400).json({ 
          error: 'Symptoms array is required' 
        });
      }

      const result = await telemedicineIntegration.performAITriage(
        symptoms, 
        patientData || {}
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error performing AI triage:', error);
      res.status(500).json({ 
        error: 'Failed to perform AI triage',
        message: error.message 
      });
    }
});

// Get consultation history
router.get('/telemedicine/history/:patientId',
  authenticateToken,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { limit } = req.query;
      
      const result = await telemedicineIntegration.getConsultationHistory(
        patientId, 
        limit ? parseInt(limit) : 10
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting consultation history:', error);
      res.status(500).json({ 
        error: 'Failed to get consultation history',
        message: error.message 
      });
    }
});

// Remote diagnostic
router.post('/telemedicine/diagnostic',
  authenticateToken,
  authorizeRoles('doctor', 'nurse'),
  async (req, res) => {
    try {
      const { consultationId, diagnosticType, data } = req.body;
      
      if (!consultationId || !diagnosticType || !data) {
        return res.status(400).json({ 
          error: 'Consultation ID, diagnostic type, and data are required' 
        });
      }

      const result = await telemedicineIntegration.performRemoteDiagnostic(
        consultationId, 
        diagnosticType, 
        data
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error performing remote diagnostic:', error);
      res.status(500).json({ 
        error: 'Failed to perform remote diagnostic',
        message: error.message 
      });
    }
});

module.exports = router;
