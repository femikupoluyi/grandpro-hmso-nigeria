const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const insuranceIntegration = require('../integrations/insuranceIntegration');
const logger = require('../utils/logger');

// Verify patient insurance eligibility
router.post('/verify-eligibility', authenticateToken, async (req, res) => {
  try {
    const { patientId, providerId, insuranceNumber, patientName } = req.body;
    
    const eligibility = await insuranceIntegration.verifyEligibility(providerId, {
      patientId,
      insuranceNumber,
      patientName
    });
    
    logger.info('Insurance eligibility verified', { patientId, providerId });
    res.json({ success: true, data: eligibility });
  } catch (error) {
    logger.error('Insurance verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit insurance claim
router.post('/submit-claim', authenticateToken, async (req, res) => {
  try {
    const { patientId, providerId, hospitalId, amount, services } = req.body;
    
    const claim = await insuranceIntegration.submitClaim(providerId, {
      patientId,
      hospitalId,
      amount,
      services
    });
    
    logger.info('Insurance claim submitted', { claimId: claim.claimId });
    res.json({ success: true, data: claim });
  } catch (error) {
    logger.error('Claim submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get claim status
router.get('/claim-status/:claimId', authenticateToken, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { providerId } = req.query;
    
    const status = await insuranceIntegration.getClaimStatus(claimId, providerId);
    
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('Claim status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Request pre-authorization
router.post('/pre-authorization', authenticateToken, async (req, res) => {
  try {
    const { patientId, providerId, hospitalId, serviceType, estimatedCost } = req.body;
    
    const authorization = await insuranceIntegration.requestPreAuthorization(providerId, {
      patientId,
      hospitalId,
      serviceType,
      estimatedCost
    });
    
    logger.info('Pre-authorization requested', { authId: authorization.authId });
    res.json({ success: true, data: authorization });
  } catch (error) {
    logger.error('Pre-authorization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit batch claims
router.post('/batch-claims', authenticateToken, authorizeRoles('admin', 'billing_clerk'), async (req, res) => {
  try {
    const { providerId, claims } = req.body;
    
    const result = await insuranceIntegration.submitBatchClaims(providerId, claims);
    
    logger.info('Batch claims submitted', { batchId: result.batchId });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Batch claims error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get provider network
router.get('/provider-network/:providerId', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    
    const network = await insuranceIntegration.getProviderNetwork(providerId);
    
    res.json({ success: true, data: network });
  } catch (error) {
    logger.error('Provider network error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
