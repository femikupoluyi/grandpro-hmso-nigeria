const axios = require('axios');
const { sql } = require('../config/database');
const crypto = require('crypto');

// Telemedicine Platform Configurations
const TELEMEDICINE_PROVIDERS = {
  WELLNESS: {
    name: 'WellaHealth Nigeria',
    apiUrl: process.env.WELLA_API_URL || 'https://api.wellahealth.ng/v1',
    apiKey: process.env.WELLA_API_KEY,
    webrtcServer: 'https://rtc.wellahealth.ng',
    features: ['video', 'audio', 'chat', 'file-sharing', 'prescription']
  },
  RELIANCE_TELEMEDICINE: {
    name: 'Reliance Telemedicine',
    apiUrl: process.env.RELIANCE_TELE_API_URL || 'https://api.reliancehmo.com/telemedicine/v1',
    apiKey: process.env.RELIANCE_TELE_API_KEY,
    webrtcServer: 'https://meet.reliancehmo.com',
    features: ['video', 'audio', 'chat', 'screen-sharing']
  },
  MOBIHEALTH: {
    name: 'Mobihealth International',
    apiUrl: process.env.MOBIHEALTH_API_URL || 'https://api.mobihealth.ng/v1',
    apiKey: process.env.MOBIHEALTH_API_KEY,
    webrtcServer: 'https://consult.mobihealth.ng',
    features: ['video', 'audio', 'chat', 'remote-diagnostics', 'ai-triage']
  },
  DOCTOORA: {
    name: 'Doctoora Health',
    apiUrl: process.env.DOCTOORA_API_URL || 'https://api.doctoora.com/v1',
    apiKey: process.env.DOCTOORA_API_KEY,
    webrtcServer: 'https://meet.doctoora.com',
    features: ['video', 'audio', 'chat', 'appointment-scheduling']
  }
};

// WebRTC Configuration
const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: process.env.TURN_SERVER || 'turn:turn.grandpro.ng:3478',
      username: process.env.TURN_USERNAME || 'grandpro',
      credential: process.env.TURN_PASSWORD || 'secure-turn-password'
    }
  ]
};

class TelemedicineIntegration {
  constructor() {
    this.providers = TELEMEDICINE_PROVIDERS;
    this.webrtcConfig = WEBRTC_CONFIG;
    this.activeSessions = new Map();
  }

  // Schedule virtual consultation
  async scheduleConsultation(consultationData) {
    try {
      const consultationId = `CONSULT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const provider = this.providers[consultationData.providerId] || this.providers.WELLNESS;

      // Generate secure room credentials
      const roomCredentials = this.generateRoomCredentials(consultationId);

      // Store consultation in database
      await pool.query(
        `INSERT INTO telemedicine_consultations 
         (consultation_id, patient_id, doctor_id, hospital_id, provider_id,
          scheduled_time, duration_minutes, consultation_type, chief_complaint,
          room_url, room_credentials, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          consultationId,
          consultationData.patientId,
          consultationData.doctorId,
          consultationData.hospitalId,
          consultationData.providerId || 'WELLNESS',
          consultationData.scheduledTime,
          consultationData.duration || 30,
          consultationData.type || 'general',
          consultationData.chiefComplaint,
          `${provider.webrtcServer}/room/${consultationId}`,
          JSON.stringify(roomCredentials),
          'scheduled'
        ]
      );

      // Send notifications
      await this.sendConsultationNotifications(consultationId, consultationData);

      return {
        consultationId,
        roomUrl: `${provider.webrtcServer}/room/${consultationId}`,
        scheduledTime: consultationData.scheduledTime,
        duration: consultationData.duration || 30,
        accessToken: roomCredentials.accessToken,
        status: 'scheduled'
      };
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      throw error;
    }
  }

  // Start virtual consultation session
  async startConsultation(consultationId, userId, userRole) {
    try {
      // Get consultation details
      const consultation = await pool.query(
        'SELECT * FROM telemedicine_consultations WHERE consultation_id = $1',
        [consultationId]
      );

      if (consultation.rows.length === 0) {
        throw new Error('Consultation not found');
      }

      const consultData = consultation.rows[0];

      // Verify user authorization
      if (userRole === 'doctor' && userId !== consultData.doctor_id) {
        throw new Error('Unauthorized access');
      }
      if (userRole === 'patient' && userId !== consultData.patient_id) {
        throw new Error('Unauthorized access');
      }

      // Generate session token
      const sessionToken = this.generateSessionToken(consultationId, userId, userRole);

      // Update consultation status
      await pool.query(
        `UPDATE telemedicine_consultations 
         SET status = 'in_progress', 
             start_time = NOW(),
             ${userRole}_joined_at = NOW()
         WHERE consultation_id = $1`,
        [consultationId]
      );

      // Initialize WebRTC session
      const webrtcSession = await this.initializeWebRTCSession(
        consultationId,
        userId,
        userRole,
        consultData
      );

      // Store active session
      this.activeSessions.set(consultationId, {
        ...webrtcSession,
        participants: [{ userId, userRole, joinedAt: new Date() }]
      });

      return {
        consultationId,
        sessionToken,
        roomUrl: consultData.room_url,
        webrtcConfig: this.webrtcConfig,
        iceServers: this.webrtcConfig.iceServers,
        features: this.providers[consultData.provider_id]?.features || [],
        status: 'connected'
      };
    } catch (error) {
      console.error('Error starting consultation:', error);
      throw error;
    }
  }

  // End consultation session
  async endConsultation(consultationId, summary) {
    try {
      // Get session data
      const session = this.activeSessions.get(consultationId);
      
      // Calculate duration
      const startTime = session?.startTime || new Date();
      const duration = Math.floor((Date.now() - startTime) / 60000); // in minutes

      // Update consultation record
      await pool.query(
        `UPDATE telemedicine_consultations 
         SET status = 'completed',
             end_time = NOW(),
             actual_duration = $2,
             consultation_summary = $3,
             recording_url = $4
         WHERE consultation_id = $1`,
        [
          consultationId,
          duration,
          JSON.stringify(summary),
          session?.recordingUrl || null
        ]
      );

      // Clean up active session
      this.activeSessions.delete(consultationId);

      // Generate consultation report
      const report = await this.generateConsultationReport(consultationId, summary);

      return {
        consultationId,
        duration,
        status: 'completed',
        reportUrl: report.url,
        prescriptions: summary.prescriptions || [],
        followUpRequired: summary.followUpRequired || false
      };
    } catch (error) {
      console.error('Error ending consultation:', error);
      throw error;
    }
  }

  // Add prescription during consultation
  async addPrescription(consultationId, prescriptionData) {
    try {
      const prescriptionId = `RX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store prescription
      await pool.query(
        `INSERT INTO telemedicine_prescriptions 
         (prescription_id, consultation_id, patient_id, doctor_id,
          medications, instructions, duration_days, refills_allowed,
          created_at, is_electronic)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), true)`,
        [
          prescriptionId,
          consultationId,
          prescriptionData.patientId,
          prescriptionData.doctorId,
          JSON.stringify(prescriptionData.medications),
          prescriptionData.instructions,
          prescriptionData.durationDays,
          prescriptionData.refillsAllowed || 0
        ]
      );

      // Generate e-prescription with QR code
      const ePrescription = await this.generateEPrescription(prescriptionId, prescriptionData);

      // Send to pharmacy if requested
      if (prescriptionData.sendToPharmacy) {
        await this.sendPrescriptionToPharmacy(prescriptionId, prescriptionData.pharmacyId);
      }

      return {
        prescriptionId,
        ePrescriptionUrl: ePrescription.url,
        qrCode: ePrescription.qrCode,
        status: 'issued'
      };
    } catch (error) {
      console.error('Error adding prescription:', error);
      throw error;
    }
  }

  // Share medical records during consultation
  async shareMedialRecords(consultationId, recordIds, sharedBy) {
    try {
      const shareId = `SHARE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store share record
      await pool.query(
        `INSERT INTO record_shares 
         (share_id, consultation_id, record_ids, shared_by, shared_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [
          shareId,
          consultationId,
          JSON.stringify(recordIds),
          sharedBy,
          new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
        ]
      );

      // Generate secure access URL
      const accessUrl = await this.generateSecureAccessUrl(shareId, recordIds);

      return {
        shareId,
        accessUrl,
        recordCount: recordIds.length,
        expiresIn: '24 hours'
      };
    } catch (error) {
      console.error('Error sharing medical records:', error);
      throw error;
    }
  }

  // AI-powered triage system
  async performAITriage(symptoms, patientData) {
    try {
      const triageId = `TRIAGE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Simulate AI triage (would connect to actual AI service in production)
      const triageResult = await this.mockAITriage(symptoms, patientData);

      // Store triage result
      await pool.query(
        `INSERT INTO ai_triage_results 
         (triage_id, patient_id, symptoms, triage_result, urgency_level,
          recommended_action, confidence_score, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          triageId,
          patientData.patientId,
          JSON.stringify(symptoms),
          JSON.stringify(triageResult),
          triageResult.urgencyLevel,
          triageResult.recommendedAction,
          triageResult.confidenceScore
        ]
      );

      return {
        triageId,
        urgencyLevel: triageResult.urgencyLevel,
        recommendedAction: triageResult.recommendedAction,
        possibleConditions: triageResult.possibleConditions,
        confidenceScore: triageResult.confidenceScore,
        shouldSeeDoctorImmediately: triageResult.urgencyLevel === 'critical'
      };
    } catch (error) {
      console.error('Error performing AI triage:', error);
      throw error;
    }
  }

  // Get consultation history
  async getConsultationHistory(patientId, limit = 10) {
    try {
      const history = await pool.query(
        `SELECT c.*, d.name as doctor_name, d.specialization
         FROM telemedicine_consultations c
         LEFT JOIN doctors d ON c.doctor_id = d.id
         WHERE c.patient_id = $1
         ORDER BY c.scheduled_time DESC
         LIMIT $2`,
        [patientId, limit]
      );

      return history.rows.map(row => ({
        consultationId: row.consultation_id,
        doctorName: row.doctor_name,
        specialization: row.specialization,
        scheduledTime: row.scheduled_time,
        duration: row.actual_duration || row.duration_minutes,
        status: row.status,
        chiefComplaint: row.chief_complaint,
        hasRecording: !!row.recording_url,
        hasPrescription: row.prescription_count > 0
      }));
    } catch (error) {
      console.error('Error getting consultation history:', error);
      throw error;
    }
  }

  // Remote diagnostic integration
  async performRemoteDiagnostic(consultationId, diagnosticType, data) {
    try {
      const diagnosticId = `DIAG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Process diagnostic data based on type
      let results;
      switch (diagnosticType) {
        case 'vitals':
          results = await this.processVitals(data);
          break;
        case 'ecg':
          results = await this.processECG(data);
          break;
        case 'image':
          results = await this.processImageDiagnostic(data);
          break;
        default:
          throw new Error(`Unknown diagnostic type: ${diagnosticType}`);
      }

      // Store diagnostic results
      await pool.query(
        `INSERT INTO remote_diagnostics 
         (diagnostic_id, consultation_id, diagnostic_type, raw_data,
          processed_results, timestamp)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          diagnosticId,
          consultationId,
          diagnosticType,
          JSON.stringify(data),
          JSON.stringify(results)
        ]
      );

      return {
        diagnosticId,
        type: diagnosticType,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error performing remote diagnostic:', error);
      throw error;
    }
  }

  // Helper functions
  generateRoomCredentials(consultationId) {
    return {
      roomId: consultationId,
      accessToken: crypto.randomBytes(32).toString('hex'),
      refreshToken: crypto.randomBytes(32).toString('hex'),
      expiresIn: 3600 // 1 hour
    };
  }

  generateSessionToken(consultationId, userId, userRole) {
    const payload = {
      consultationId,
      userId,
      userRole,
      timestamp: Date.now()
    };
    
    return crypto
      .createHmac('sha256', process.env.SESSION_SECRET || 'telemedicine-secret')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  async initializeWebRTCSession(consultationId, userId, userRole, consultData) {
    // Initialize WebRTC peer connection configuration
    return {
      consultationId,
      userId,
      userRole,
      startTime: new Date(),
      peerConnection: null, // Would be actual WebRTC peer connection
      dataChannel: null, // For chat and file sharing
      mediaStream: null, // For audio/video
      recordingEnabled: consultData.recording_enabled || false
    };
  }

  async sendConsultationNotifications(consultationId, consultationData) {
    // Send email/SMS notifications to patient and doctor
    // Implementation would use actual notification service
    console.log(`Notifications sent for consultation ${consultationId}`);
  }

  async generateConsultationReport(consultationId, summary) {
    // Generate PDF report of consultation
    // Would use actual PDF generation service
    return {
      url: `https://reports.grandpro.ng/consultations/${consultationId}.pdf`,
      generated: true
    };
  }

  async generateEPrescription(prescriptionId, prescriptionData) {
    // Generate electronic prescription with QR code
    // Would use actual e-prescription service
    return {
      url: `https://prescriptions.grandpro.ng/${prescriptionId}`,
      qrCode: `data:image/png;base64,${Buffer.from(prescriptionId).toString('base64')}`
    };
  }

  async sendPrescriptionToPharmacy(prescriptionId, pharmacyId) {
    // Send prescription to selected pharmacy
    // Would integrate with pharmacy systems
    console.log(`Prescription ${prescriptionId} sent to pharmacy ${pharmacyId}`);
  }

  async generateSecureAccessUrl(shareId, recordIds) {
    // Generate temporary secure URL for medical records
    const token = crypto.randomBytes(32).toString('hex');
    return `https://records.grandpro.ng/shared/${shareId}?token=${token}`;
  }

  // Mock functions for AI and diagnostic processing
  async mockAITriage(symptoms, patientData) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const urgencyLevels = ['low', 'medium', 'high', 'critical'];
    const urgencyIndex = symptoms.includes('chest pain') || symptoms.includes('difficulty breathing') 
      ? 3 : symptoms.length > 3 ? 2 : symptoms.length > 1 ? 1 : 0;

    return {
      urgencyLevel: urgencyLevels[urgencyIndex],
      recommendedAction: urgencyIndex >= 2 ? 'See doctor immediately' : 'Schedule consultation',
      possibleConditions: [
        { condition: 'Common cold', probability: 0.4 },
        { condition: 'Flu', probability: 0.3 },
        { condition: 'Allergy', probability: 0.2 }
      ],
      confidenceScore: 0.85
    };
  }

  async processVitals(data) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      bloodPressure: data.bloodPressure || '120/80',
      heartRate: data.heartRate || 72,
      temperature: data.temperature || 36.5,
      oxygenSaturation: data.oxygenSaturation || 98,
      status: 'normal',
      alerts: []
    };
  }

  async processECG(data) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      heartRhythm: 'Normal sinus rhythm',
      heartRate: 72,
      intervals: {
        pr: 160,
        qrs: 80,
        qt: 400
      },
      abnormalities: [],
      interpretation: 'Normal ECG'
    };
  }

  async processImageDiagnostic(data) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return {
      imageType: data.type || 'x-ray',
      findings: [],
      impression: 'No significant abnormalities detected',
      recommendations: 'Continue routine monitoring'
    };
  }
}

module.exports = new TelemedicineIntegration();
