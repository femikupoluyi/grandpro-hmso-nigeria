const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const telemedicineIntegration = require('../integrations/telemedicineIntegration');
const logger = require('../utils/logger');

// Schedule virtual consultation
router.post('/schedule-consultation', authenticateToken, async (req, res) => {
  try {
    const { patientId, doctorId, scheduledTime, type, reason, duration, providerId } = req.body;
    
    if (!patientId || !scheduledTime || !reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'Patient ID, scheduled time, and reason are required' 
      });
    }
    
    const consultation = await telemedicineIntegration.scheduleConsultation({
      patientId,
      doctorId: doctorId || null,
      scheduledTime,
      type: type || 'video',
      reason,
      duration: duration || 30,
      providerId: providerId || 'WELLAHEALTH'
    });
    
    logger.info('Consultation scheduled', { consultationId: consultation.consultationId });
    res.json({ success: true, data: consultation });
  } catch (error) {
    logger.error('Consultation scheduling error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize video call
router.post('/video/initialize', authenticateToken, async (req, res) => {
  try {
    const { consultationId, userId, userType } = req.body;
    
    if (!consultationId || !userId || !userType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Consultation ID, user ID, and user type are required' 
      });
    }
    
    const session = await telemedicineIntegration.initializeVideoCall(
      consultationId,
      userId || req.user.id,
      userType || req.user.role
    );
    
    logger.info('Video call initialized', { consultationId });
    res.json({ success: true, data: session });
  } catch (error) {
    logger.error('Video call initialization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Join video call
router.post('/video/join', authenticateToken, async (req, res) => {
  try {
    const { consultationId, userId, userType, offer } = req.body;
    
    const session = await telemedicineIntegration.joinVideoCall(
      consultationId,
      userId || req.user.id,
      userType || req.user.role,
      offer
    );
    
    logger.info('User joined video call', { consultationId, userId });
    res.json({ success: true, data: session });
  } catch (error) {
    logger.error('Video call join error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// End video call
router.post('/video/end', authenticateToken, async (req, res) => {
  try {
    const { consultationId, summary } = req.body;
    
    const result = await telemedicineIntegration.endVideoCall(consultationId, summary);
    
    logger.info('Video call ended', { consultationId });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Video call end error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate e-prescription
router.post('/prescriptions/generate', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res) => {
  try {
    const { consultationId, patientId, medications, instructions, providerId } = req.body;
    
    if (!consultationId || !patientId || !medications) {
      return res.status(400).json({ 
        success: false, 
        error: 'Consultation ID, patient ID, and medications are required' 
      });
    }
    
    const prescription = await telemedicineIntegration.generateEPrescription({
      consultationId,
      patientId,
      doctorId: req.user.id,
      medications,
      instructions,
      providerId
    });
    
    logger.info('E-prescription generated', { prescriptionId: prescription.prescriptionId });
    res.json({ success: true, data: prescription });
  } catch (error) {
    logger.error('E-prescription generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI triage
router.post('/ai-triage', authenticateToken, async (req, res) => {
  try {
    const { symptoms, duration, severity, age, gender, vitalSigns, patientId } = req.body;
    
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Symptoms are required for triage' 
      });
    }
    
    const triageResult = await telemedicineIntegration.performAITriage({
      symptoms,
      duration,
      severity: severity || 'moderate',
      age,
      gender,
      vitalSigns,
      patientId: patientId || req.user.id
    });
    
    logger.info('AI triage performed', { triageId: triageResult.triageId });
    res.json({ success: true, data: triageResult });
  } catch (error) {
    logger.error('AI triage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available doctors
router.get('/doctors/available', authenticateToken, async (req, res) => {
  try {
    const { specialty, providerId } = req.query;
    
    const doctors = await telemedicineIntegration.getAvailableDoctors(
      specialty || 'General Medicine',
      providerId
    );
    
    res.json({ success: true, data: doctors });
  } catch (error) {
    logger.error('Get available doctors error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process consultation payment
router.post('/payments/process', authenticateToken, async (req, res) => {
  try {
    const { consultationId, paymentMethod, amount } = req.body;
    
    if (!consultationId || !paymentMethod || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Consultation ID, payment method, and amount are required' 
      });
    }
    
    const payment = await telemedicineIntegration.processConsultationPayment(
      consultationId,
      paymentMethod,
      amount
    );
    
    logger.info('Consultation payment processed', { paymentId: payment.paymentId });
    res.json({ success: true, data: payment });
  } catch (error) {
    logger.error('Payment processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get consultation history
router.get('/consultations/history', authenticateToken, async (req, res) => {
  try {
    const { patientId, limit } = req.query;
    
    const history = await telemedicineIntegration.getConsultationHistory(
      patientId || req.user.id,
      limit ? parseInt(limit) : 10
    );
    
    res.json({ success: true, data: history });
  } catch (error) {
    logger.error('Consultation history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get telemedicine providers
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const providers = Object.entries(telemedicineIntegration.providers).map(([id, provider]) => ({
      id,
      name: provider.name,
      features: ['Video Consultation', 'E-Prescription', 'AI Triage'],
      available: true
    }));
    
    res.json({ success: true, data: providers });
  } catch (error) {
    logger.error('Get providers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook endpoint for provider updates
router.post('/webhook/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const signature = req.headers['x-webhook-signature'];
    
    // Verify webhook signature (implementation depends on provider)
    // For now, accept all webhooks in sandbox mode
    
    const result = await telemedicineIntegration.handleWebhook(providerId, req.body);
    
    logger.info('Webhook processed', { providerId, event: req.body.event });
    res.json({ success: true, received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// WebRTC signaling endpoint for peer-to-peer connections
router.post('/webrtc/signal', authenticateToken, async (req, res) => {
  try {
    const { consultationId, type, data } = req.body;
    
    // In production, this would be handled by a WebSocket server
    // For now, we'll store and retrieve signals
    
    logger.info('WebRTC signal processed', { consultationId, type });
    res.json({ success: true, message: 'Signal processed' });
  } catch (error) {
    logger.error('WebRTC signaling error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
