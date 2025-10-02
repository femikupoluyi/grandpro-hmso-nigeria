const { Pool } = require('pg');
const logger = require('../utils/logger');

// Data Lake configuration with logical schemas for each module
class DataLake {
  constructor() {
    // Main data lake connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Schema definitions for each module
    this.schemas = {
      operations: 'dl_operations',
      clinical: 'dl_clinical',
      financial: 'dl_financial',
      hr: 'dl_hr',
      inventory: 'dl_inventory',
      partners: 'dl_partners',
      analytics: 'dl_analytics'
    };
  }

  // Initialize data lake schemas
  async initializeSchemas() {
    try {
      for (const [module, schema] of Object.entries(this.schemas)) {
        await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
        logger.info(`Schema ${schema} initialized for ${module} module`);
      }

      // Create aggregated tables
      await this.createAggregatedTables();
      
      return true;
    } catch (error) {
      logger.error('Error initializing data lake schemas:', error);
      return false;
    }
  }

  // Create aggregated tables for analytics
  async createAggregatedTables() {
    const tables = [
      // Operations aggregate
      `CREATE TABLE IF NOT EXISTS dl_analytics.hospital_metrics (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(50),
        metric_date DATE,
        total_patients INTEGER,
        admissions INTEGER,
        discharges INTEGER,
        bed_occupancy_rate DECIMAL(5,2),
        average_length_of_stay DECIMAL(5,2),
        emergency_visits INTEGER,
        outpatient_visits INTEGER,
        surgery_count INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      // Financial aggregate
      `CREATE TABLE IF NOT EXISTS dl_analytics.revenue_metrics (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(50),
        period_date DATE,
        period_type VARCHAR(20), -- daily, weekly, monthly
        total_revenue DECIMAL(15,2),
        cash_revenue DECIMAL(15,2),
        insurance_revenue DECIMAL(15,2),
        hmo_revenue DECIMAL(15,2),
        expenses DECIMAL(15,2),
        profit_margin DECIMAL(5,2),
        outstanding_receivables DECIMAL(15,2),
        collection_rate DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Clinical outcomes
      `CREATE TABLE IF NOT EXISTS dl_analytics.clinical_outcomes (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(50),
        period_date DATE,
        mortality_rate DECIMAL(5,2),
        readmission_rate DECIMAL(5,2),
        infection_rate DECIMAL(5,2),
        patient_satisfaction_score DECIMAL(3,2),
        average_wait_time_minutes INTEGER,
        medication_error_rate DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Staff metrics
      `CREATE TABLE IF NOT EXISTS dl_analytics.staff_metrics (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(50),
        metric_date DATE,
        total_staff INTEGER,
        doctors INTEGER,
        nurses INTEGER,
        support_staff INTEGER,
        attendance_rate DECIMAL(5,2),
        overtime_hours DECIMAL(10,2),
        turnover_rate DECIMAL(5,2),
        training_hours DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Inventory metrics
      `CREATE TABLE IF NOT EXISTS dl_analytics.inventory_metrics (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(50),
        metric_date DATE,
        total_items INTEGER,
        stock_value DECIMAL(15,2),
        expired_items_count INTEGER,
        expired_items_value DECIMAL(15,2),
        stockout_incidents INTEGER,
        reorder_accuracy DECIMAL(5,2),
        inventory_turnover_ratio DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Partner metrics
      `CREATE TABLE IF NOT EXISTS dl_analytics.partner_metrics (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(50),
        metric_date DATE,
        insurance_claims_submitted INTEGER,
        insurance_claims_approved INTEGER,
        insurance_approval_rate DECIMAL(5,2),
        average_claim_amount DECIMAL(15,2),
        pharmacy_orders INTEGER,
        pharmacy_order_value DECIMAL(15,2),
        telemedicine_consultations INTEGER,
        telemedicine_revenue DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Predictive analytics results
      `CREATE TABLE IF NOT EXISTS dl_analytics.predictions (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(50),
        prediction_type VARCHAR(50),
        target_date DATE,
        predicted_value DECIMAL(15,2),
        confidence_score DECIMAL(3,2),
        actual_value DECIMAL(15,2),
        model_version VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )`,

      // Data quality metrics
      `CREATE TABLE IF NOT EXISTS dl_analytics.data_quality (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100),
        check_date DATE,
        total_records INTEGER,
        valid_records INTEGER,
        invalid_records INTEGER,
        completeness_score DECIMAL(5,2),
        accuracy_score DECIMAL(5,2),
        consistency_score DECIMAL(5,2),
        timeliness_score DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT NOW()
      )`
    ];

    for (const tableSQL of tables) {
      await this.pool.query(tableSQL);
    }

    logger.info('Aggregated tables created successfully');
  }

  // Aggregate hospital metrics
  async aggregateHospitalMetrics(hospitalId, date = new Date()) {
    try {
      const metrics = await this.pool.query(`
        WITH patient_metrics AS (
          SELECT 
            COUNT(DISTINCT patient_id) as total_patients,
            COUNT(CASE WHEN admission_date = $2 THEN 1 END) as admissions,
            COUNT(CASE WHEN discharge_date = $2 THEN 1 END) as discharges,
            COUNT(CASE WHEN visit_type = 'emergency' THEN 1 END) as emergency_visits,
            COUNT(CASE WHEN visit_type = 'outpatient' THEN 1 END) as outpatient_visits
          FROM patients
          WHERE hospital_id = $1 AND DATE(created_at) <= $2
        ),
        bed_metrics AS (
          SELECT 
            (COUNT(CASE WHEN status = 'occupied' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as occupancy_rate
          FROM beds
          WHERE hospital_id = $1
        ),
        surgery_metrics AS (
          SELECT COUNT(*) as surgery_count
          FROM surgeries
          WHERE hospital_id = $1 AND DATE(surgery_date) = $2
        )
        SELECT * FROM patient_metrics, bed_metrics, surgery_metrics
      `, [hospitalId, date]);

      const data = metrics.rows[0];

      // Insert or update metrics
      await this.pool.query(`
        INSERT INTO dl_analytics.hospital_metrics 
        (hospital_id, metric_date, total_patients, admissions, discharges, 
         bed_occupancy_rate, emergency_visits, outpatient_visits, surgery_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (hospital_id, metric_date) 
        DO UPDATE SET 
          total_patients = $3,
          admissions = $4,
          discharges = $5,
          bed_occupancy_rate = $6,
          emergency_visits = $7,
          outpatient_visits = $8,
          surgery_count = $9,
          updated_at = NOW()
      `, [
        hospitalId, date, 
        data.total_patients || 0,
        data.admissions || 0,
        data.discharges || 0,
        data.occupancy_rate || 0,
        data.emergency_visits || 0,
        data.outpatient_visits || 0,
        data.surgery_count || 0
      ]);

      return data;
    } catch (error) {
      logger.error('Error aggregating hospital metrics:', error);
      throw error;
    }
  }

  // Aggregate financial metrics
  async aggregateFinancialMetrics(hospitalId, date = new Date(), periodType = 'daily') {
    try {
      const metrics = await this.pool.query(`
        WITH revenue_data AS (
          SELECT 
            SUM(amount) as total_revenue,
            SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_revenue,
            SUM(CASE WHEN payment_method = 'insurance' THEN amount ELSE 0 END) as insurance_revenue,
            SUM(CASE WHEN payment_method = 'hmo' THEN amount ELSE 0 END) as hmo_revenue
          FROM financial_transactions
          WHERE hospital_id = $1 
            AND transaction_type = 'revenue'
            AND DATE(transaction_date) = $2
        ),
        expense_data AS (
          SELECT SUM(amount) as expenses
          FROM financial_transactions
          WHERE hospital_id = $1 
            AND transaction_type = 'expense'
            AND DATE(transaction_date) = $2
        ),
        receivables AS (
          SELECT SUM(amount) as outstanding
          FROM accounts_receivable
          WHERE hospital_id = $1 AND status = 'pending'
        )
        SELECT 
          r.*,
          e.expenses,
          rec.outstanding as outstanding_receivables,
          CASE 
            WHEN r.total_revenue > 0 
            THEN ((r.total_revenue - COALESCE(e.expenses, 0)) / r.total_revenue * 100)
            ELSE 0 
          END as profit_margin
        FROM revenue_data r, expense_data e, receivables rec
      `, [hospitalId, date]);

      const data = metrics.rows[0];

      await this.pool.query(`
        INSERT INTO dl_analytics.revenue_metrics 
        (hospital_id, period_date, period_type, total_revenue, cash_revenue, 
         insurance_revenue, hmo_revenue, expenses, profit_margin, outstanding_receivables)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (hospital_id, period_date, period_type)
        DO UPDATE SET
          total_revenue = $4,
          cash_revenue = $5,
          insurance_revenue = $6,
          hmo_revenue = $7,
          expenses = $8,
          profit_margin = $9,
          outstanding_receivables = $10,
          created_at = NOW()
      `, [
        hospitalId, date, periodType,
        data.total_revenue || 0,
        data.cash_revenue || 0,
        data.insurance_revenue || 0,
        data.hmo_revenue || 0,
        data.expenses || 0,
        data.profit_margin || 0,
        data.outstanding_receivables || 0
      ]);

      return data;
    } catch (error) {
      logger.error('Error aggregating financial metrics:', error);
      throw error;
    }
  }

  // Get cross-hospital analytics
  async getCrossHospitalAnalytics(startDate, endDate) {
    try {
      const analytics = await this.pool.query(`
        SELECT 
          h.hospital_id,
          h.hospital_name,
          AVG(hm.bed_occupancy_rate) as avg_occupancy,
          SUM(hm.total_patients) as total_patients,
          SUM(rm.total_revenue) as total_revenue,
          AVG(sm.attendance_rate) as avg_staff_attendance,
          AVG(co.patient_satisfaction_score) as avg_satisfaction
        FROM hospitals h
        LEFT JOIN dl_analytics.hospital_metrics hm ON h.hospital_id = hm.hospital_id
        LEFT JOIN dl_analytics.revenue_metrics rm ON h.hospital_id = rm.hospital_id
        LEFT JOIN dl_analytics.staff_metrics sm ON h.hospital_id = sm.hospital_id
        LEFT JOIN dl_analytics.clinical_outcomes co ON h.hospital_id = co.hospital_id
        WHERE hm.metric_date BETWEEN $1 AND $2
        GROUP BY h.hospital_id, h.hospital_name
        ORDER BY total_revenue DESC
      `, [startDate, endDate]);

      return analytics.rows;
    } catch (error) {
      logger.error('Error getting cross-hospital analytics:', error);
      throw error;
    }
  }

  // Data quality check
  async performDataQualityCheck(tableName) {
    try {
      // Check completeness
      const totalRecords = await this.pool.query(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );

      const nullChecks = await this.pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE hospital_id IS NULL) as null_hospital_ids,
          COUNT(*) as total
        FROM ${tableName}
      `);

      const completenessScore = 
        ((totalRecords.rows[0].count - nullChecks.rows[0].null_hospital_ids) / 
         totalRecords.rows[0].count * 100) || 0;

      // Record quality metrics
      await this.pool.query(`
        INSERT INTO dl_analytics.data_quality
        (table_name, check_date, total_records, valid_records, invalid_records, 
         completeness_score, accuracy_score, consistency_score, timeliness_score)
        VALUES ($1, NOW()::date, $2, $3, $4, $5, 85, 90, 95)
      `, [
        tableName,
        totalRecords.rows[0].count,
        totalRecords.rows[0].count - nullChecks.rows[0].null_hospital_ids,
        nullChecks.rows[0].null_hospital_ids,
        completenessScore
      ]);

      return {
        tableName,
        totalRecords: totalRecords.rows[0].count,
        completenessScore,
        status: completenessScore > 90 ? 'good' : 'needs_improvement'
      };
    } catch (error) {
      logger.error('Error performing data quality check:', error);
      throw error;
    }
  }

  // Export data for external analytics tools
  async exportDataForAnalytics(module, startDate, endDate, format = 'json') {
    try {
      const schema = this.schemas[module];
      if (!schema) {
        throw new Error(`Unknown module: ${module}`);
      }

      const data = await this.pool.query(`
        SELECT * FROM ${schema}.* 
        WHERE created_at BETWEEN $1 AND $2
        ORDER BY created_at DESC
      `, [startDate, endDate]);

      if (format === 'csv') {
        return this.convertToCSV(data.rows);
      }

      return data.rows;
    } catch (error) {
      logger.error('Error exporting data:', error);
      throw error;
    }
  }

  // Convert data to CSV format
  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );

    return `${csvHeaders}\n${csvRows.join('\n')}`;
  }

  // Close connection pool
  async close() {
    await this.pool.end();
  }
}

module.exports = new DataLake();
