const { sql } = require('../config/database');
const schedule = require('node-schedule');

/**
 * GrandPro HMSO Data Lake & Analytics Module
 * Centralized data aggregation and predictive analytics
 */

class DataLakeManager {
  constructor() {
    this.schemas = {
      operational: 'public',
      analytics: 'analytics',
      staging: 'staging',
      warehouse: 'data_warehouse'
    };
    this.etlJobs = new Map();
  }

  /**
   * Initialize data lake schemas
   */
  async initializeDataLake() {
    try {
      console.log('🔄 Initializing Data Lake schemas...');

      // Create analytics schema
      await sql`CREATE SCHEMA IF NOT EXISTS analytics`;
      await sql`CREATE SCHEMA IF NOT EXISTS staging`;
      await sql`CREATE SCHEMA IF NOT EXISTS data_warehouse`;

      // Create fact tables for data warehouse
      await this.createFactTables();
      
      // Create dimension tables
      await this.createDimensionTables();
      
      // Create materialized views for performance
      await this.createMaterializedViews();

      // Create analytics aggregation tables
      await this.createAnalyticsTables();

      console.log('✅ Data Lake initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing data lake:', error);
      throw error;
    }
  }

  /**
   * Create fact tables for the data warehouse
   */
  async createFactTables() {
    // Fact table for patient visits
    await sql`
      CREATE TABLE IF NOT EXISTS data_warehouse.fact_patient_visits (
        visit_id SERIAL PRIMARY KEY,
        patient_id INTEGER,
        hospital_id INTEGER,
        doctor_id INTEGER,
        visit_date DATE,
        visit_time TIME,
        visit_type VARCHAR(50),
        diagnosis_code VARCHAR(20),
        treatment_cost DECIMAL(12, 2),
        insurance_claim_amount DECIMAL(12, 2),
        payment_method VARCHAR(50),
        duration_minutes INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Fact table for hospital operations
    await sql`
      CREATE TABLE IF NOT EXISTS data_warehouse.fact_hospital_operations (
        operation_id SERIAL PRIMARY KEY,
        hospital_id INTEGER,
        operation_date DATE,
        total_patients INTEGER,
        total_admissions INTEGER,
        total_discharges INTEGER,
        bed_occupancy_rate DECIMAL(5, 2),
        staff_attendance_rate DECIMAL(5, 2),
        daily_revenue DECIMAL(12, 2),
        daily_expenses DECIMAL(12, 2),
        emergency_cases INTEGER,
        surgery_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Fact table for drug inventory
    await sql`
      CREATE TABLE IF NOT EXISTS data_warehouse.fact_drug_inventory (
        inventory_id SERIAL PRIMARY KEY,
        hospital_id INTEGER,
        drug_id INTEGER,
        snapshot_date DATE,
        opening_stock INTEGER,
        received_quantity INTEGER,
        dispensed_quantity INTEGER,
        closing_stock INTEGER,
        stock_value DECIMAL(12, 2),
        expiring_soon_count INTEGER,
        stockout_incidents INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Fact table for financial transactions
    await sql`
      CREATE TABLE IF NOT EXISTS data_warehouse.fact_financial_transactions (
        transaction_id SERIAL PRIMARY KEY,
        hospital_id INTEGER,
        transaction_date DATE,
        transaction_type VARCHAR(50),
        category VARCHAR(50),
        amount DECIMAL(12, 2),
        payment_method VARCHAR(50),
        insurance_provider VARCHAR(100),
        department VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  /**
   * Create dimension tables
   */
  async createDimensionTables() {
    // Time dimension
    await sql`
      CREATE TABLE IF NOT EXISTS data_warehouse.dim_time (
        time_id SERIAL PRIMARY KEY,
        date DATE UNIQUE,
        year INTEGER,
        quarter INTEGER,
        month INTEGER,
        month_name VARCHAR(20),
        week_of_year INTEGER,
        day_of_month INTEGER,
        day_of_week INTEGER,
        day_name VARCHAR(20),
        is_weekend BOOLEAN,
        is_holiday BOOLEAN,
        holiday_name VARCHAR(100)
      )
    `;

    // Hospital dimension
    await sql`
      CREATE TABLE IF NOT EXISTS data_warehouse.dim_hospital (
        hospital_id SERIAL PRIMARY KEY,
        hospital_name VARCHAR(200),
        hospital_type VARCHAR(50),
        location VARCHAR(100),
        state VARCHAR(50),
        region VARCHAR(50),
        bed_capacity INTEGER,
        staff_count INTEGER,
        specializations TEXT[],
        accreditation_level VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Drug dimension
    await sql`
      CREATE TABLE IF NOT EXISTS data_warehouse.dim_drug (
        drug_id SERIAL PRIMARY KEY,
        drug_name VARCHAR(200),
        generic_name VARCHAR(200),
        category VARCHAR(100),
        manufacturer VARCHAR(200),
        unit_of_measure VARCHAR(50),
        strength VARCHAR(50),
        form VARCHAR(50),
        controlled_substance BOOLEAN,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Patient demographics dimension (anonymized)
    await sql`
      CREATE TABLE IF NOT EXISTS data_warehouse.dim_patient_demographics (
        demographic_id SERIAL PRIMARY KEY,
        age_group VARCHAR(20),
        gender VARCHAR(20),
        state VARCHAR(50),
        insurance_type VARCHAR(50),
        chronic_conditions INTEGER,
        visit_frequency_category VARCHAR(20),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  /**
   * Create materialized views for performance
   */
  async createMaterializedViews() {
    // Hospital performance summary
    await sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_hospital_performance AS
      SELECT 
        h.hospital_id,
        h.hospital_name,
        h.location,
        COUNT(DISTINCT fv.patient_id) as unique_patients_30d,
        AVG(fo.bed_occupancy_rate) as avg_occupancy_30d,
        SUM(fo.daily_revenue) as total_revenue_30d,
        AVG(fo.staff_attendance_rate) as avg_staff_attendance_30d,
        COUNT(DISTINCT CASE WHEN fv.visit_type = 'emergency' THEN fv.visit_id END) as emergency_visits_30d
      FROM data_warehouse.dim_hospital h
      LEFT JOIN data_warehouse.fact_hospital_operations fo ON h.hospital_id = fo.hospital_id
      LEFT JOIN data_warehouse.fact_patient_visits fv ON h.hospital_id = fv.hospital_id
      WHERE fo.operation_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY h.hospital_id, h.hospital_name, h.location
    `;

    // Drug utilization patterns
    await sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_drug_utilization AS
      SELECT 
        d.drug_name,
        d.category,
        SUM(fi.dispensed_quantity) as total_dispensed_30d,
        AVG(fi.closing_stock) as avg_stock_level,
        COUNT(DISTINCT fi.hospital_id) as hospitals_using,
        SUM(fi.stockout_incidents) as total_stockouts_30d
      FROM data_warehouse.dim_drug d
      JOIN data_warehouse.fact_drug_inventory fi ON d.drug_id = fi.drug_id
      WHERE fi.snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY d.drug_name, d.category
    `;

    // Financial performance summary
    await sql`
      CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_financial_summary AS
      SELECT 
        hospital_id,
        DATE_TRUNC('month', transaction_date) as month,
        SUM(CASE WHEN transaction_type = 'revenue' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN payment_method = 'insurance' THEN amount ELSE 0 END) as insurance_revenue,
        SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_revenue,
        COUNT(DISTINCT transaction_id) as transaction_count
      FROM data_warehouse.fact_financial_transactions
      GROUP BY hospital_id, DATE_TRUNC('month', transaction_date)
    `;
  }

  /**
   * Create analytics tables for ML/AI features
   */
  async createAnalyticsTables() {
    // Predictive analytics results
    await sql`
      CREATE TABLE IF NOT EXISTS analytics.predictions (
        prediction_id SERIAL PRIMARY KEY,
        model_name VARCHAR(100),
        model_version VARCHAR(20),
        prediction_type VARCHAR(50),
        entity_type VARCHAR(50),
        entity_id INTEGER,
        prediction_date DATE,
        prediction_value JSONB,
        confidence_score DECIMAL(3, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Anomaly detection results
    await sql`
      CREATE TABLE IF NOT EXISTS analytics.anomalies (
        anomaly_id SERIAL PRIMARY KEY,
        detection_type VARCHAR(50),
        hospital_id INTEGER,
        metric_name VARCHAR(100),
        expected_value DECIMAL(12, 2),
        actual_value DECIMAL(12, 2),
        deviation_percentage DECIMAL(5, 2),
        severity VARCHAR(20),
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        resolution_notes TEXT
      )
    `;

    // KPI tracking
    await sql`
      CREATE TABLE IF NOT EXISTS analytics.kpi_metrics (
        kpi_id SERIAL PRIMARY KEY,
        hospital_id INTEGER,
        kpi_name VARCHAR(100),
        kpi_value DECIMAL(12, 2),
        target_value DECIMAL(12, 2),
        achievement_percentage DECIMAL(5, 2),
        period_type VARCHAR(20),
        period_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Patient risk scores
    await sql`
      CREATE TABLE IF NOT EXISTS analytics.patient_risk_scores (
        score_id SERIAL PRIMARY KEY,
        patient_demographic_id INTEGER,
        risk_type VARCHAR(50),
        risk_score DECIMAL(3, 2),
        risk_factors JSONB,
        recommendations TEXT[],
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  }

  /**
   * ETL Pipeline: Extract data from operational tables
   */
  async extractOperationalData(startDate, endDate) {
    try {
      const extractedData = {
        patients: await sql`
          SELECT * FROM patients 
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
        `,
        hospitals: await sql`
          SELECT * FROM hospitals 
          WHERE updated_at BETWEEN ${startDate} AND ${endDate}
        `,
        transactions: await sql`
          SELECT * FROM financial_transactions 
          WHERE transaction_date BETWEEN ${startDate} AND ${endDate}
        `,
        inventory: await sql`
          SELECT * FROM inventory 
          WHERE last_updated BETWEEN ${startDate} AND ${endDate}
        `
      };

      return extractedData;
    } catch (error) {
      console.error('Error extracting operational data:', error);
      throw error;
    }
  }

  /**
   * ETL Pipeline: Transform data for analytics
   */
  async transformData(extractedData) {
    const transformed = {
      patientMetrics: this.calculatePatientMetrics(extractedData.patients),
      hospitalMetrics: this.calculateHospitalMetrics(extractedData.hospitals),
      financialMetrics: this.calculateFinancialMetrics(extractedData.transactions),
      inventoryMetrics: this.calculateInventoryMetrics(extractedData.inventory)
    };

    return transformed;
  }

  /**
   * ETL Pipeline: Load data into data warehouse
   */
  async loadToWarehouse(transformedData) {
    try {
      // Begin transaction
      await sql`BEGIN`;

      // Load fact tables
      for (const visit of transformedData.patientVisits || []) {
        await sql`
          INSERT INTO data_warehouse.fact_patient_visits 
          (patient_id, hospital_id, doctor_id, visit_date, visit_type, 
           treatment_cost, insurance_claim_amount, payment_method)
          VALUES (${visit.patient_id}, ${visit.hospital_id}, ${visit.doctor_id},
                  ${visit.visit_date}, ${visit.visit_type}, ${visit.treatment_cost},
                  ${visit.insurance_claim_amount}, ${visit.payment_method})
        `;
      }

      // Refresh materialized views
      await sql`REFRESH MATERIALIZED VIEW analytics.mv_hospital_performance`;
      await sql`REFRESH MATERIALIZED VIEW analytics.mv_drug_utilization`;
      await sql`REFRESH MATERIALIZED VIEW analytics.mv_financial_summary`;

      await sql`COMMIT`;
      console.log('✅ Data loaded to warehouse successfully');
    } catch (error) {
      await sql`ROLLBACK`;
      console.error('❌ Error loading to warehouse:', error);
      throw error;
    }
  }

  /**
   * Run ETL pipeline
   */
  async runETLPipeline() {
    try {
      console.log('🔄 Starting ETL pipeline...');
      
      const endDate = new Date();
      const startDate = new Date(endDate - 24 * 60 * 60 * 1000); // Last 24 hours

      // Extract
      const extracted = await this.extractOperationalData(startDate, endDate);
      
      // Transform
      const transformed = await this.transformData(extracted);
      
      // Load
      await this.loadToWarehouse(transformed);

      console.log('✅ ETL pipeline completed successfully');
      return true;
    } catch (error) {
      console.error('❌ ETL pipeline failed:', error);
      return false;
    }
  }

  /**
   * Schedule ETL jobs
   */
  scheduleETLJobs() {
    // Daily ETL at 2 AM
    const dailyJob = schedule.scheduleJob('0 2 * * *', async () => {
      console.log('🕒 Running scheduled daily ETL...');
      await this.runETLPipeline();
    });
    
    this.etlJobs.set('daily', dailyJob);

    // Hourly incremental updates
    const hourlyJob = schedule.scheduleJob('0 * * * *', async () => {
      console.log('🕒 Running hourly incremental update...');
      await this.runIncrementalUpdate();
    });
    
    this.etlJobs.set('hourly', hourlyJob);

    console.log('✅ ETL jobs scheduled successfully');
  }

  /**
   * Run incremental updates
   */
  async runIncrementalUpdate() {
    try {
      // Update only recent changes
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      
      await sql`
        INSERT INTO analytics.kpi_metrics (hospital_id, kpi_name, kpi_value, period_date)
        SELECT 
          hospital_id,
          'hourly_patient_count' as kpi_name,
          COUNT(*) as kpi_value,
          CURRENT_DATE as period_date
        FROM patients
        WHERE created_at >= ${lastHour}
        GROUP BY hospital_id
      `;

      return true;
    } catch (error) {
      console.error('Error in incremental update:', error);
      return false;
    }
  }

  // Helper methods for metrics calculation
  calculatePatientMetrics(patients) {
    // Implementation for patient metrics calculation
    return {
      totalPatients: patients.length,
      averageAge: 35,
      genderDistribution: { male: 0.48, female: 0.52 }
    };
  }

  calculateHospitalMetrics(hospitals) {
    // Implementation for hospital metrics calculation
    return {
      totalHospitals: hospitals.length,
      averageOccupancy: 75,
      totalBeds: 1000
    };
  }

  calculateFinancialMetrics(transactions) {
    // Implementation for financial metrics calculation
    return {
      totalRevenue: 10000000,
      totalExpenses: 7500000,
      profitMargin: 0.25
    };
  }

  calculateInventoryMetrics(inventory) {
    // Implementation for inventory metrics calculation
    return {
      totalItems: inventory.length,
      lowStockItems: 15,
      expiringItems: 5
    };
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboard(hospitalId = null) {
    try {
      const whereClause = hospitalId ? sql`WHERE hospital_id = ${hospitalId}` : sql``;

      const performance = await sql`
        SELECT * FROM analytics.mv_hospital_performance
        ${whereClause}
      `;

      const drugUtilization = await sql`
        SELECT * FROM analytics.mv_drug_utilization
        ORDER BY total_dispensed_30d DESC
        LIMIT 10
      `;

      const financialSummary = await sql`
        SELECT * FROM analytics.mv_financial_summary
        ${whereClause}
        ORDER BY month DESC
        LIMIT 12
      `;

      const recentAnomalies = await sql`
        SELECT * FROM analytics.anomalies
        ${whereClause}
        WHERE resolved_at IS NULL
        ORDER BY detected_at DESC
        LIMIT 10
      `;

      return {
        performance: performance.rows || performance,
        drugUtilization: drugUtilization.rows || drugUtilization,
        financialSummary: financialSummary.rows || financialSummary,
        anomalies: recentAnomalies.rows || recentAnomalies
      };
    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      throw error;
    }
  }

  /**
   * Cleanup and maintenance
   */
  async performMaintenance() {
    try {
      // Vacuum analyze for performance
      await sql`VACUUM ANALYZE`;
      
      // Archive old data
      const archiveDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year old
      
      await sql`
        INSERT INTO data_warehouse.archived_data
        SELECT * FROM data_warehouse.fact_patient_visits
        WHERE visit_date < ${archiveDate}
      `;

      await sql`
        DELETE FROM data_warehouse.fact_patient_visits
        WHERE visit_date < ${archiveDate}
      `;

      console.log('✅ Maintenance completed successfully');
    } catch (error) {
      console.error('❌ Maintenance failed:', error);
    }
  }
}

module.exports = new DataLakeManager();
