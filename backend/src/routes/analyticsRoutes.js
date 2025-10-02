const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const dataLake = require('../analytics/dataLake');
const predictiveAnalytics = require('../analytics/predictiveAnalytics');
const etlPipeline = require('../etl/pipeline');
const logger = require('../utils/logger');

// Initialize data lake schemas
router.post('/initialize', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await dataLake.initializeSchemas();
    
    if (result) {
      // Start ETL pipeline
      etlPipeline.initialize();
      
      res.json({ 
        success: true, 
        message: 'Data lake initialized and ETL pipeline started' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to initialize data lake' 
      });
    }
  } catch (error) {
    logger.error('Data lake initialization error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cross-hospital analytics
router.get('/cross-hospital', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const analytics = await dataLake.getCrossHospitalAnalytics(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate || new Date()
    );
    
    res.json({ success: true, data: analytics });
  } catch (error) {
    logger.error('Cross-hospital analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Aggregate metrics for a hospital
router.post('/aggregate/:hospitalId', authenticateToken, async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { date } = req.body;
    
    const hospitalMetrics = await dataLake.aggregateHospitalMetrics(
      hospitalId, 
      date ? new Date(date) : new Date()
    );
    
    const financialMetrics = await dataLake.aggregateFinancialMetrics(
      hospitalId,
      date ? new Date(date) : new Date()
    );
    
    res.json({ 
      success: true, 
      data: {
        hospital: hospitalMetrics,
        financial: financialMetrics
      }
    });
  } catch (error) {
    logger.error('Metrics aggregation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Predictive analytics endpoints

// Patient demand forecasting
router.post('/predict/demand', authenticateToken, async (req, res) => {
  try {
    const { hospitalId } = req.body;
    
    const prediction = await predictiveAnalytics.predict(
      'demandForecasting',
      hospitalId || req.user.hospitalId
    );
    
    res.json({ success: true, data: prediction });
  } catch (error) {
    logger.error('Demand forecasting error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Drug usage prediction
router.post('/predict/drug-usage', authenticateToken, async (req, res) => {
  try {
    const { hospitalId, drugName } = req.body;
    
    const prediction = await predictiveAnalytics.predict(
      'drugUsage',
      hospitalId || req.user.hospitalId,
      { drugName }
    );
    
    res.json({ success: true, data: prediction });
  } catch (error) {
    logger.error('Drug usage prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bed occupancy prediction
router.post('/predict/occupancy', authenticateToken, async (req, res) => {
  try {
    const { hospitalId } = req.body;
    
    const prediction = await predictiveAnalytics.predict(
      'occupancy',
      hospitalId || req.user.hospitalId
    );
    
    res.json({ success: true, data: prediction });
  } catch (error) {
    logger.error('Occupancy prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revenue forecasting
router.post('/predict/revenue', authenticateToken, async (req, res) => {
  try {
    const { hospitalId } = req.body;
    
    const prediction = await predictiveAnalytics.predict(
      'revenue',
      hospitalId || req.user.hospitalId
    );
    
    res.json({ success: true, data: prediction });
  } catch (error) {
    logger.error('Revenue forecasting error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Staffing needs prediction
router.post('/predict/staffing', authenticateToken, async (req, res) => {
  try {
    const { hospitalId, department, shift } = req.body;
    
    const prediction = await predictiveAnalytics.predict(
      'staffing',
      hospitalId || req.user.hospitalId,
      { department, shift }
    );
    
    res.json({ success: true, data: prediction });
  } catch (error) {
    logger.error('Staffing prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Patient readmission risk
router.post('/predict/readmission', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Patient ID is required' 
      });
    }
    
    const prediction = await predictiveAnalytics.predict(
      'readmission',
      null,
      { patientId }
    );
    
    res.json({ success: true, data: prediction });
  } catch (error) {
    logger.error('Readmission risk prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fraud detection
router.post('/detect/fraud', authenticateToken, authorizeRoles('admin', 'billing'), async (req, res) => {
  try {
    const { hospitalId, startDate, endDate } = req.body;
    
    const detection = await predictiveAnalytics.predict(
      'fraud',
      hospitalId || req.user.hospitalId,
      { startDate, endDate }
    );
    
    res.json({ success: true, data: detection });
  } catch (error) {
    logger.error('Fraud detection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Triage
router.post('/ai-triage', authenticateToken, async (req, res) => {
  try {
    const { symptoms, patientData } = req.body;
    
    if (!symptoms || symptoms.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Symptoms are required' 
      });
    }
    
    const triageResult = await predictiveAnalytics.performAITriage(
      symptoms,
      patientData || {}
    );
    
    res.json({ success: true, data: triageResult });
  } catch (error) {
    logger.error('AI triage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Data quality check
router.post('/quality-check', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { tableName } = req.body;
    
    if (!tableName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Table name is required' 
      });
    }
    
    const result = await dataLake.performDataQualityCheck(tableName);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Data quality check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export data for external analytics
router.get('/export', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { module, startDate, endDate, format } = req.query;
    
    if (!module) {
      return res.status(400).json({ 
        success: false, 
        error: 'Module is required' 
      });
    }
    
    const data = await dataLake.exportDataForAnalytics(
      module,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate || new Date(),
      format || 'json'
    );
    
    if (format === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.attachment(`${module}_export_${Date.now()}.csv`);
      res.send(data);
    } else {
      res.json({ success: true, data });
    }
  } catch (error) {
    logger.error('Data export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get ETL pipeline status
router.get('/etl/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const status = etlPipeline.getStatus();
    
    res.json({ success: true, data: status });
  } catch (error) {
    logger.error('ETL status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual ETL sync
router.post('/etl/sync', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { type } = req.body;
    
    switch (type) {
      case 'operational':
        await etlPipeline.syncOperationalData();
        break;
      case 'hourly':
        await etlPipeline.aggregateHourlyMetrics();
        break;
      case 'daily':
        await etlPipeline.performDailySync();
        break;
      case 'quality':
        await etlPipeline.performQualityChecks();
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid sync type' 
        });
    }
    
    res.json({ success: true, message: `${type} sync completed` });
  } catch (error) {
    logger.error('Manual ETL sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
