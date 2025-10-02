const cron = require('node-cron');
const { Pool } = require('pg');
const logger = require('../utils/logger');
const dataLake = require('../analytics/dataLake');

class ETLPipeline {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.jobs = new Map();
    this.running = false;
  }

  // Initialize ETL jobs
  initialize() {
    logger.info('Initializing ETL Pipeline...');

    // Every 5 minutes - sync operational data
    this.scheduleJob('sync-operational', '*/5 * * * *', () => this.syncOperationalData());

    // Every hour - aggregate metrics
    this.scheduleJob('aggregate-metrics', '0 * * * *', () => this.aggregateHourlyMetrics());

    // Daily at 2 AM - comprehensive data sync
    this.scheduleJob('daily-sync', '0 2 * * *', () => this.performDailySync());

    // Weekly on Sunday at 3 AM - data quality checks
    this.scheduleJob('quality-check', '0 3 * * 0', () => this.performQualityChecks());

    // Monthly on 1st at 4 AM - archive old data
    this.scheduleJob('monthly-archive', '0 4 1 * *', () => this.archiveOldData());

    this.running = true;
    logger.info('ETL Pipeline initialized with 5 scheduled jobs');
  }

  // Schedule a job
  scheduleJob(name, schedule, handler) {
    const job = cron.schedule(schedule, async () => {
      try {
        logger.info(`Starting ETL job: ${name}`);
        const startTime = Date.now();
        
        await handler();
        
        const duration = Date.now() - startTime;
        logger.info(`ETL job ${name} completed in ${duration}ms`);
        
        // Log job execution
        await this.logJobExecution(name, 'success', duration);
      } catch (error) {
        logger.error(`ETL job ${name} failed:`, error);
        await this.logJobExecution(name, 'failed', 0, error.message);
      }
    }, {
      scheduled: false
    });

    job.start();
    this.jobs.set(name, job);
  }

  // Sync operational data (real-time)
  async syncOperationalData() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Sync patient admissions
      await client.query(`
        INSERT INTO dl_operations.patient_admissions
        SELECT * FROM patient_admissions 
        WHERE created_at > NOW() - INTERVAL '5 minutes'
        ON CONFLICT (admission_id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = NOW()
      `);

      // Sync bed occupancy
      await client.query(`
        INSERT INTO dl_operations.bed_occupancy
        SELECT 
          bed_id,
          ward_id,
          hospital_id,
          status,
          patient_id,
          NOW() as snapshot_time
        FROM beds
        WHERE updated_at > NOW() - INTERVAL '5 minutes'
      `);

      // Sync emergency cases
      await client.query(`
        INSERT INTO dl_operations.emergency_cases
        SELECT * FROM emergency_department
        WHERE arrival_time > NOW() - INTERVAL '5 minutes'
        ON CONFLICT (case_id) DO UPDATE SET
          status = EXCLUDED.status,
          triage_level = EXCLUDED.triage_level
      `);

      // Sync staff attendance
      await client.query(`
        INSERT INTO dl_hr.staff_attendance
        SELECT * FROM staff_attendance
        WHERE check_in_time > NOW() - INTERVAL '5 minutes'
        ON CONFLICT (attendance_id) DO UPDATE SET
          check_out_time = EXCLUDED.check_out_time
      `);

      await client.query('COMMIT');
      
      logger.info('Operational data synced successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Aggregate hourly metrics
  async aggregateHourlyMetrics() {
    const hospitals = await this.getActiveHospitals();
    
    for (const hospital of hospitals) {
      // Aggregate hospital metrics
      await dataLake.aggregateHospitalMetrics(hospital.hospital_id, new Date());
      
      // Aggregate financial metrics
      await dataLake.aggregateFinancialMetrics(hospital.hospital_id, new Date(), 'hourly');
      
      // Update real-time dashboards
      await this.updateRealTimeDashboards(hospital.hospital_id);
    }
    
    logger.info(`Hourly metrics aggregated for ${hospitals.length} hospitals`);
  }

  // Perform daily comprehensive sync
  async performDailySync() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Clinical data sync
      await this.syncClinicalData(client, yesterday);
      
      // Financial data sync
      await this.syncFinancialData(client, yesterday);
      
      // Inventory data sync
      await this.syncInventoryData(client, yesterday);
      
      // Partner integration data sync
      await this.syncPartnerData(client, yesterday);
      
      // Generate daily reports
      await this.generateDailyReports(yesterday);
      
      await client.query('COMMIT');
      
      logger.info('Daily comprehensive sync completed');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Sync clinical data
  async syncClinicalData(client, date) {
    // Patient records
    await client.query(`
      INSERT INTO dl_clinical.patient_records
      SELECT 
        p.*,
        DATE(p.created_at) as record_date
      FROM patients p
      WHERE DATE(p.created_at) = $1
      ON CONFLICT (patient_id, record_date) DO NOTHING
    `, [date]);

    // Medical records
    await client.query(`
      INSERT INTO dl_clinical.medical_records
      SELECT * FROM medical_records
      WHERE DATE(created_at) = $1
      ON CONFLICT (record_id) DO UPDATE SET
        updated_at = NOW()
    `, [date]);

    // Lab results
    await client.query(`
      INSERT INTO dl_clinical.lab_results
      SELECT * FROM lab_results
      WHERE DATE(result_date) = $1
      ON CONFLICT (result_id) DO NOTHING
    `, [date]);

    // Prescriptions
    await client.query(`
      INSERT INTO dl_clinical.prescriptions
      SELECT * FROM prescriptions
      WHERE DATE(prescribed_date) = $1
      ON CONFLICT (prescription_id) DO NOTHING
    `, [date]);
  }

  // Sync financial data
  async syncFinancialData(client, date) {
    // Transactions
    await client.query(`
      INSERT INTO dl_financial.transactions
      SELECT * FROM financial_transactions
      WHERE DATE(transaction_date) = $1
      ON CONFLICT (transaction_id) DO NOTHING
    `, [date]);

    // Billing
    await client.query(`
      INSERT INTO dl_financial.billing
      SELECT * FROM billing
      WHERE DATE(bill_date) = $1
      ON CONFLICT (bill_id) DO UPDATE SET
        payment_status = EXCLUDED.payment_status,
        paid_amount = EXCLUDED.paid_amount
    `, [date]);

    // Insurance claims
    await client.query(`
      INSERT INTO dl_financial.insurance_claims_sync
      SELECT * FROM insurance_claims
      WHERE DATE(submission_date) = $1
      ON CONFLICT (claim_id) DO UPDATE SET
        status = EXCLUDED.status,
        approved_amount = EXCLUDED.approved_amount
    `, [date]);
  }

  // Sync inventory data
  async syncInventoryData(client, date) {
    // Stock levels
    await client.query(`
      INSERT INTO dl_inventory.stock_levels
      SELECT 
        i.*,
        $1 as snapshot_date
      FROM inventory i
      ON CONFLICT (item_id, snapshot_date) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        value = EXCLUDED.value
    `, [date]);

    // Pharmacy orders
    await client.query(`
      INSERT INTO dl_inventory.pharmacy_orders_sync
      SELECT * FROM pharmacy_orders
      WHERE DATE(order_date) = $1
      ON CONFLICT (order_id) DO UPDATE SET
        status = EXCLUDED.status,
        delivery_date = EXCLUDED.delivery_date
    `, [date]);

    // Expiry tracking
    await client.query(`
      INSERT INTO dl_inventory.expiry_tracking
      SELECT 
        item_id,
        item_name,
        batch_number,
        expiry_date,
        quantity,
        $1 as check_date
      FROM inventory
      WHERE expiry_date <= NOW() + INTERVAL '30 days'
    `, [date]);
  }

  // Sync partner integration data
  async syncPartnerData(client, date) {
    // Insurance verifications
    await client.query(`
      INSERT INTO dl_partners.insurance_verifications_sync
      SELECT * FROM insurance_verifications
      WHERE DATE(verification_date) = $1
      ON CONFLICT (verification_id) DO NOTHING
    `, [date]);

    // Telemedicine consultations
    await client.query(`
      INSERT INTO dl_partners.telemedicine_sync
      SELECT * FROM telemedicine_consultations
      WHERE DATE(scheduled_time) = $1
      ON CONFLICT (consultation_id) DO UPDATE SET
        status = EXCLUDED.status,
        duration_minutes = EXCLUDED.duration_minutes
    `, [date]);
  }

  // Generate daily reports
  async generateDailyReports(date) {
    const hospitals = await this.getActiveHospitals();
    
    for (const hospital of hospitals) {
      const report = {
        hospitalId: hospital.hospital_id,
        date: date,
        metrics: {}
      };

      // Get key metrics
      const metrics = await this.pool.query(`
        SELECT 
          hm.total_patients,
          hm.admissions,
          hm.discharges,
          hm.bed_occupancy_rate,
          rm.total_revenue,
          rm.profit_margin,
          sm.attendance_rate
        FROM dl_analytics.hospital_metrics hm
        LEFT JOIN dl_analytics.revenue_metrics rm 
          ON hm.hospital_id = rm.hospital_id AND hm.metric_date = rm.period_date
        LEFT JOIN dl_analytics.staff_metrics sm
          ON hm.hospital_id = sm.hospital_id AND hm.metric_date = sm.metric_date
        WHERE hm.hospital_id = $1 AND hm.metric_date = $2
      `, [hospital.hospital_id, date]);

      if (metrics.rows.length > 0) {
        report.metrics = metrics.rows[0];
      }

      // Store report
      await this.pool.query(`
        INSERT INTO daily_reports 
        (hospital_id, report_date, report_data, generated_at)
        VALUES ($1, $2, $3, NOW())
      `, [hospital.hospital_id, date, JSON.stringify(report)]);
    }
  }

  // Perform data quality checks
  async performQualityChecks() {
    const tables = [
      'patients',
      'medical_records',
      'financial_transactions',
      'inventory',
      'staff',
      'insurance_claims'
    ];

    const results = [];
    
    for (const table of tables) {
      const result = await dataLake.performDataQualityCheck(table);
      results.push(result);
    }

    // Generate quality report
    const overallScore = results.reduce((sum, r) => sum + r.completenessScore, 0) / results.length;
    
    await this.pool.query(`
      INSERT INTO data_quality_reports
      (report_date, overall_score, table_scores, recommendations)
      VALUES ($1, $2, $3, $4)
    `, [
      new Date(),
      overallScore,
      JSON.stringify(results),
      this.generateQualityRecommendations(results)
    ]);

    logger.info(`Data quality check completed. Overall score: ${overallScore.toFixed(2)}%`);
  }

  // Archive old data
  async archiveOldData() {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const archiveDate = new Date();
      archiveDate.setMonth(archiveDate.getMonth() - 6); // Archive data older than 6 months
      
      // Archive old transactions
      await client.query(`
        INSERT INTO archived_transactions
        SELECT * FROM financial_transactions
        WHERE transaction_date < $1
      `, [archiveDate]);
      
      await client.query(`
        DELETE FROM financial_transactions
        WHERE transaction_date < $1
      `, [archiveDate]);
      
      // Archive old logs
      await client.query(`
        INSERT INTO archived_logs
        SELECT * FROM system_logs
        WHERE created_at < $1
      `, [archiveDate]);
      
      await client.query(`
        DELETE FROM system_logs
        WHERE created_at < $1
      `, [archiveDate]);
      
      await client.query('COMMIT');
      
      logger.info(`Data older than ${archiveDate.toISOString()} archived successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Update real-time dashboards
  async updateRealTimeDashboards(hospitalId) {
    // This would typically publish to a message queue or WebSocket
    // For now, we'll update a cache table
    const metrics = await this.pool.query(`
      SELECT 
        hm.*,
        rm.total_revenue,
        sm.attendance_rate
      FROM dl_analytics.hospital_metrics hm
      LEFT JOIN dl_analytics.revenue_metrics rm ON hm.hospital_id = rm.hospital_id
      LEFT JOIN dl_analytics.staff_metrics sm ON hm.hospital_id = sm.hospital_id
      WHERE hm.hospital_id = $1
      ORDER BY hm.metric_date DESC
      LIMIT 1
    `, [hospitalId]);

    if (metrics.rows.length > 0) {
      await this.pool.query(`
        INSERT INTO realtime_dashboard_cache
        (hospital_id, metrics, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (hospital_id) DO UPDATE SET
          metrics = $2,
          updated_at = NOW()
      `, [hospitalId, JSON.stringify(metrics.rows[0])]);
    }
  }

  // Get active hospitals
  async getActiveHospitals() {
    const result = await this.pool.query(`
      SELECT hospital_id, hospital_name 
      FROM hospitals 
      WHERE status = 'active'
    `);
    return result.rows;
  }

  // Generate quality recommendations
  generateQualityRecommendations(results) {
    const recommendations = [];
    
    for (const result of results) {
      if (result.completenessScore < 80) {
        recommendations.push(`Improve data completeness for ${result.tableName} (current: ${result.completenessScore.toFixed(2)}%)`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Data quality is within acceptable range');
    }
    
    return JSON.stringify(recommendations);
  }

  // Log job execution
  async logJobExecution(jobName, status, duration, error = null) {
    try {
      await this.pool.query(`
        INSERT INTO etl_job_logs
        (job_name, status, duration_ms, error_message, executed_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [jobName, status, duration, error]);
    } catch (err) {
      logger.error('Failed to log job execution:', err);
    }
  }

  // Stop all ETL jobs
  stop() {
    for (const [name, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped ETL job: ${name}`);
    }
    this.running = false;
  }

  // Get job status
  getStatus() {
    const status = [];
    for (const [name, job] of this.jobs) {
      status.push({
        name,
        running: this.running,
        scheduled: true
      });
    }
    return status;
  }
}

module.exports = new ETLPipeline();
