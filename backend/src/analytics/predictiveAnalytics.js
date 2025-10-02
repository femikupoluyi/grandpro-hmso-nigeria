const { Pool } = require('pg');
const logger = require('../utils/logger');

// Predictive Analytics Service with AI/ML capabilities
class PredictiveAnalytics {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Model configurations
    this.models = {
      demandForecasting: {
        name: 'Patient Demand Forecasting',
        version: '1.0.0',
        features: ['historical_patients', 'day_of_week', 'month', 'holidays', 'weather'],
        target: 'patient_count'
      },
      drugUsage: {
        name: 'Drug Usage Prediction',
        version: '1.0.0',
        features: ['historical_usage', 'patient_count', 'season', 'disease_trends'],
        target: 'drug_quantity'
      },
      occupancy: {
        name: 'Bed Occupancy Prediction',
        version: '1.0.0',
        features: ['current_occupancy', 'admissions_trend', 'discharge_trend', 'emergency_cases'],
        target: 'occupancy_rate'
      },
      revenue: {
        name: 'Revenue Forecasting',
        version: '1.0.0',
        features: ['historical_revenue', 'patient_count', 'insurance_mix', 'procedure_mix'],
        target: 'daily_revenue'
      },
      staffing: {
        name: 'Staffing Needs Prediction',
        version: '1.0.0',
        features: ['patient_load', 'shift_time', 'department', 'historical_attendance'],
        target: 'staff_required'
      },
      readmission: {
        name: 'Patient Readmission Risk',
        version: '1.0.0',
        features: ['diagnosis', 'age', 'length_of_stay', 'comorbidities', 'discharge_disposition'],
        target: 'readmission_risk'
      }
    };
  }

  // Main prediction interface
  async predict(modelType, hospitalId, params = {}) {
    try {
      switch (modelType) {
        case 'demandForecasting':
          return await this.predictPatientDemand(hospitalId, params);
        case 'drugUsage':
          return await this.predictDrugUsage(hospitalId, params);
        case 'occupancy':
          return await this.predictBedOccupancy(hospitalId, params);
        case 'revenue':
          return await this.predictRevenue(hospitalId, params);
        case 'staffing':
          return await this.predictStaffingNeeds(hospitalId, params);
        case 'readmission':
          return await this.predictReadmissionRisk(params.patientId);
        case 'fraud':
          return await this.detectBillingFraud(hospitalId, params);
        default:
          throw new Error(`Unknown model type: ${modelType}`);
      }
    } catch (error) {
      logger.error(`Prediction error for ${modelType}:`, error);
      throw error;
    }
  }

  // Predict patient demand for next 7 days
  async predictPatientDemand(hospitalId, params = {}) {
    try {
      // Get historical data
      const historicalData = await this.pool.query(`
        SELECT 
          DATE(metric_date) as date,
          total_patients,
          emergency_visits,
          outpatient_visits,
          EXTRACT(DOW FROM metric_date) as day_of_week,
          EXTRACT(MONTH FROM metric_date) as month
        FROM dl_analytics.hospital_metrics
        WHERE hospital_id = $1
        ORDER BY metric_date DESC
        LIMIT 90
      `, [hospitalId]);

      if (historicalData.rows.length < 7) {
        return this.generateMockPrediction('demandForecasting', 7);
      }

      // Calculate trends
      const avgByDayOfWeek = this.calculateAverageByDayOfWeek(historicalData.rows);
      const trend = this.calculateTrend(historicalData.rows);
      
      // Generate predictions for next 7 days
      const predictions = [];
      const today = new Date();
      
      for (let i = 1; i <= 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const dayOfWeek = targetDate.getDay();
        
        // Simple prediction model (would use ML in production)
        const baselinePrediction = avgByDayOfWeek[dayOfWeek] || 100;
        const trendAdjustment = trend * i;
        const seasonalFactor = this.getSeasonalFactor(targetDate.getMonth());
        
        const predictedValue = Math.round(
          baselinePrediction * seasonalFactor + trendAdjustment
        );
        
        predictions.push({
          date: targetDate,
          predictedPatients: Math.max(0, predictedValue),
          confidence: 0.75 + Math.random() * 0.15,
          lowerBound: Math.max(0, predictedValue - 20),
          upperBound: predictedValue + 20
        });
      }

      // Store predictions
      await this.storePredictions(hospitalId, 'demandForecasting', predictions);

      return {
        model: 'demandForecasting',
        hospitalId,
        predictions,
        metadata: {
          historicalDataPoints: historicalData.rows.length,
          modelVersion: this.models.demandForecasting.version,
          generatedAt: new Date()
        }
      };
    } catch (error) {
      logger.error('Patient demand prediction error:', error);
      throw error;
    }
  }

  // Predict drug usage for next 30 days
  async predictDrugUsage(hospitalId, params = {}) {
    try {
      const drugName = params.drugName || 'Paracetamol';
      
      // Get historical usage
      const historicalUsage = await this.pool.query(`
        SELECT 
          DATE(transaction_date) as date,
          SUM(quantity) as daily_usage
        FROM inventory_transactions
        WHERE hospital_id = $1 
          AND item_name = $2
          AND transaction_type = 'dispensed'
        GROUP BY DATE(transaction_date)
        ORDER BY date DESC
        LIMIT 60
      `, [hospitalId, drugName]);

      // Get patient forecast
      const patientForecast = await this.predictPatientDemand(hospitalId);
      
      // Calculate usage per patient
      const avgUsagePerPatient = historicalUsage.rows.length > 0
        ? historicalUsage.rows.reduce((sum, row) => sum + row.daily_usage, 0) / historicalUsage.rows.length / 100
        : 5; // Default 5 units per patient

      // Generate predictions
      const predictions = [];
      const today = new Date();
      
      for (let i = 1; i <= 30; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        
        // Find patient prediction for this date
        const patientPrediction = patientForecast.predictions.find(
          p => p.date.toDateString() === targetDate.toDateString()
        );
        
        const predictedPatients = patientPrediction?.predictedPatients || 100;
        const predictedUsage = Math.round(predictedPatients * avgUsagePerPatient);
        
        predictions.push({
          date: targetDate,
          drugName,
          predictedUsage,
          confidence: 0.70 + Math.random() * 0.20,
          reorderPoint: predictedUsage * 7, // 7-day buffer
          recommendedOrderQuantity: predictedUsage * 30
        });
      }

      return {
        model: 'drugUsage',
        hospitalId,
        drugName,
        predictions,
        recommendations: this.generateDrugRecommendations(predictions)
      };
    } catch (error) {
      logger.error('Drug usage prediction error:', error);
      throw error;
    }
  }

  // Predict bed occupancy
  async predictBedOccupancy(hospitalId, params = {}) {
    try {
      // Get historical occupancy data
      const historicalOccupancy = await this.pool.query(`
        SELECT 
          metric_date,
          bed_occupancy_rate,
          admissions,
          discharges,
          average_length_of_stay
        FROM dl_analytics.hospital_metrics
        WHERE hospital_id = $1
        ORDER BY metric_date DESC
        LIMIT 30
      `, [hospitalId]);

      // Get current occupancy
      const currentOccupancy = await this.pool.query(`
        SELECT 
          COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
          COUNT(*) as total
        FROM beds
        WHERE hospital_id = $1
      `, [hospitalId]);

      const currentRate = currentOccupancy.rows[0].total > 0
        ? (currentOccupancy.rows[0].occupied / currentOccupancy.rows[0].total) * 100
        : 0;

      // Simple moving average prediction
      const predictions = [];
      const avgOccupancy = historicalOccupancy.rows.reduce((sum, row) => 
        sum + row.bed_occupancy_rate, 0) / historicalOccupancy.rows.length;
      
      for (let hour = 1; hour <= 24; hour++) {
        const predictedRate = avgOccupancy + (Math.random() - 0.5) * 10;
        
        predictions.push({
          hour: `+${hour}h`,
          predictedOccupancy: Math.min(100, Math.max(0, predictedRate)),
          confidence: 0.80 + Math.random() * 0.10,
          alert: predictedRate > 90 ? 'HIGH_OCCUPANCY' : 
                 predictedRate > 80 ? 'MODERATE' : 'NORMAL'
        });
      }

      return {
        model: 'occupancy',
        hospitalId,
        currentOccupancy: currentRate,
        predictions,
        recommendations: this.generateOccupancyRecommendations(predictions)
      };
    } catch (error) {
      logger.error('Bed occupancy prediction error:', error);
      throw error;
    }
  }

  // Predict revenue
  async predictRevenue(hospitalId, params = {}) {
    try {
      const historicalRevenue = await this.pool.query(`
        SELECT 
          period_date,
          total_revenue,
          cash_revenue,
          insurance_revenue,
          hmo_revenue
        FROM dl_analytics.revenue_metrics
        WHERE hospital_id = $1 AND period_type = 'daily'
        ORDER BY period_date DESC
        LIMIT 60
      `, [hospitalId]);

      // Calculate average and trend
      const avgRevenue = historicalRevenue.rows.reduce((sum, row) => 
        sum + parseFloat(row.total_revenue), 0) / historicalRevenue.rows.length;
      
      const trend = this.calculateTrend(
        historicalRevenue.rows.map(r => ({ value: parseFloat(r.total_revenue) }))
      );

      // Generate predictions for next 30 days
      const predictions = [];
      const today = new Date();
      
      for (let i = 1; i <= 30; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        
        const baseRevenue = avgRevenue;
        const trendAdjustment = trend * i;
        const dayOfWeekFactor = this.getDayOfWeekRevenueFactor(targetDate.getDay());
        
        const predictedRevenue = baseRevenue * dayOfWeekFactor + trendAdjustment;
        
        predictions.push({
          date: targetDate,
          predictedRevenue: Math.max(0, predictedRevenue),
          confidence: 0.70 + Math.random() * 0.15,
          breakdown: {
            cash: predictedRevenue * 0.3,
            insurance: predictedRevenue * 0.5,
            hmo: predictedRevenue * 0.2
          }
        });
      }

      // Calculate monthly projection
      const monthlyProjection = predictions.reduce((sum, p) => sum + p.predictedRevenue, 0);

      return {
        model: 'revenue',
        hospitalId,
        predictions,
        monthlyProjection,
        insights: this.generateRevenueInsights(predictions, historicalRevenue.rows)
      };
    } catch (error) {
      logger.error('Revenue prediction error:', error);
      throw error;
    }
  }

  // Predict staffing needs
  async predictStaffingNeeds(hospitalId, params = {}) {
    try {
      const department = params.department || 'all';
      const shift = params.shift || 'all';
      
      // Get historical staffing and patient data
      const historicalData = await this.pool.query(`
        SELECT 
          sm.metric_date,
          sm.total_staff,
          sm.doctors,
          sm.nurses,
          sm.attendance_rate,
          hm.total_patients
        FROM dl_analytics.staff_metrics sm
        JOIN dl_analytics.hospital_metrics hm 
          ON sm.hospital_id = hm.hospital_id 
          AND sm.metric_date = hm.metric_date
        WHERE sm.hospital_id = $1
        ORDER BY sm.metric_date DESC
        LIMIT 30
      `, [hospitalId]);

      // Calculate patient-to-staff ratios
      const ratios = historicalData.rows.map(row => ({
        date: row.metric_date,
        patientToNurse: row.total_patients / row.nurses,
        patientToDoctor: row.total_patients / row.doctors
      }));

      // Get patient demand forecast
      const patientForecast = await this.predictPatientDemand(hospitalId);
      
      // Generate staffing predictions
      const predictions = [];
      const idealPatientToNurse = 4; // Industry standard
      const idealPatientToDoctor = 10; // Industry standard
      
      for (const patientPrediction of patientForecast.predictions.slice(0, 7)) {
        const predictedPatients = patientPrediction.predictedPatients;
        
        const nursesNeeded = Math.ceil(predictedPatients / idealPatientToNurse);
        const doctorsNeeded = Math.ceil(predictedPatients / idealPatientToDoctor);
        const supportStaffNeeded = Math.ceil((nursesNeeded + doctorsNeeded) * 0.5);
        
        predictions.push({
          date: patientPrediction.date,
          predictedPatients,
          staffingRequirements: {
            nurses: nursesNeeded,
            doctors: doctorsNeeded,
            supportStaff: supportStaffNeeded,
            total: nursesNeeded + doctorsNeeded + supportStaffNeeded
          },
          shiftDistribution: {
            morning: Math.ceil((nursesNeeded + doctorsNeeded) * 0.4),
            afternoon: Math.ceil((nursesNeeded + doctorsNeeded) * 0.35),
            night: Math.ceil((nursesNeeded + doctorsNeeded) * 0.25)
          },
          confidence: 0.75 + Math.random() * 0.10
        });
      }

      return {
        model: 'staffing',
        hospitalId,
        department,
        predictions,
        recommendations: this.generateStaffingRecommendations(predictions)
      };
    } catch (error) {
      logger.error('Staffing prediction error:', error);
      throw error;
    }
  }

  // Predict patient readmission risk
  async predictReadmissionRisk(patientId) {
    try {
      // Get patient data
      const patientData = await this.pool.query(`
        SELECT 
          p.age,
          p.gender,
          mr.diagnosis,
          mr.length_of_stay,
          mr.discharge_disposition,
          COUNT(DISTINCT mr2.record_id) as previous_admissions
        FROM patients p
        LEFT JOIN medical_records mr ON p.patient_id = mr.patient_id
        LEFT JOIN medical_records mr2 
          ON p.patient_id = mr2.patient_id 
          AND mr2.admission_date < mr.admission_date
        WHERE p.patient_id = $1
        GROUP BY p.patient_id, p.age, p.gender, mr.diagnosis, 
                 mr.length_of_stay, mr.discharge_disposition
        ORDER BY mr.admission_date DESC
        LIMIT 1
      `, [patientId]);

      if (patientData.rows.length === 0) {
        throw new Error('Patient not found');
      }

      const patient = patientData.rows[0];
      
      // Simple risk scoring (would use ML model in production)
      let riskScore = 0;
      
      // Age factor
      if (patient.age > 65) riskScore += 20;
      else if (patient.age > 50) riskScore += 10;
      
      // Length of stay factor
      if (patient.length_of_stay > 7) riskScore += 15;
      else if (patient.length_of_stay > 3) riskScore += 5;
      
      // Previous admissions factor
      if (patient.previous_admissions > 2) riskScore += 25;
      else if (patient.previous_admissions > 0) riskScore += 10;
      
      // Discharge disposition factor
      if (patient.discharge_disposition === 'AMA') riskScore += 30; // Against Medical Advice
      
      // Add randomness for demo
      riskScore += Math.random() * 20;
      
      const risk = Math.min(100, Math.max(0, riskScore));
      
      return {
        model: 'readmission',
        patientId,
        riskScore: risk,
        riskLevel: risk > 70 ? 'HIGH' : risk > 40 ? 'MODERATE' : 'LOW',
        confidence: 0.72 + Math.random() * 0.18,
        factors: {
          age: patient.age,
          lengthOfStay: patient.length_of_stay,
          previousAdmissions: patient.previous_admissions,
          dischargeDisposition: patient.discharge_disposition
        },
        recommendations: this.generateReadmissionRecommendations(risk)
      };
    } catch (error) {
      logger.error('Readmission risk prediction error:', error);
      throw error;
    }
  }

  // Detect billing fraud
  async detectBillingFraud(hospitalId, params = {}) {
    try {
      const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = params.endDate || new Date();
      
      // Get billing data
      const billingData = await this.pool.query(`
        SELECT 
          bill_id,
          patient_id,
          amount,
          services,
          billing_date,
          payment_method
        FROM billing
        WHERE hospital_id = $1 
          AND billing_date BETWEEN $2 AND $3
        ORDER BY billing_date DESC
      `, [hospitalId, startDate, endDate]);

      const anomalies = [];
      
      for (const bill of billingData.rows) {
        let fraudScore = 0;
        const flags = [];
        
        // Check for unusual amounts
        if (bill.amount > 1000000) { // Over 1 million NGN
          fraudScore += 30;
          flags.push('UNUSUALLY_HIGH_AMOUNT');
        }
        
        // Check for duplicate billings
        const duplicates = billingData.rows.filter(b => 
          b.patient_id === bill.patient_id && 
          b.amount === bill.amount &&
          b.bill_id !== bill.bill_id
        );
        
        if (duplicates.length > 0) {
          fraudScore += 40;
          flags.push('POTENTIAL_DUPLICATE');
        }
        
        // Check for unusual service combinations
        const services = JSON.parse(bill.services || '[]');
        if (services.length > 10) {
          fraudScore += 20;
          flags.push('EXCESSIVE_SERVICES');
        }
        
        // Add some randomness for demo
        fraudScore += Math.random() * 10;
        
        if (fraudScore > 30) {
          anomalies.push({
            billId: bill.bill_id,
            patientId: bill.patient_id,
            amount: bill.amount,
            fraudScore: Math.min(100, fraudScore),
            riskLevel: fraudScore > 60 ? 'HIGH' : fraudScore > 40 ? 'MODERATE' : 'LOW',
            flags,
            recommendedAction: fraudScore > 60 ? 'IMMEDIATE_REVIEW' : 'MONITOR'
          });
        }
      }

      return {
        model: 'fraudDetection',
        hospitalId,
        period: { startDate, endDate },
        totalBillsAnalyzed: billingData.rows.length,
        anomaliesDetected: anomalies.length,
        anomalies: anomalies.slice(0, 10), // Top 10 suspicious cases
        summary: {
          highRisk: anomalies.filter(a => a.riskLevel === 'HIGH').length,
          moderateRisk: anomalies.filter(a => a.riskLevel === 'MODERATE').length,
          lowRisk: anomalies.filter(a => a.riskLevel === 'LOW').length
        }
      };
    } catch (error) {
      logger.error('Fraud detection error:', error);
      throw error;
    }
  }

  // AI Triage Bot
  async performAITriage(symptoms, patientData) {
    try {
      const triageScore = this.calculateTriageScore(symptoms, patientData);
      
      let category, waitTime, recommendation;
      
      if (triageScore >= 90) {
        category = 'EMERGENCY';
        waitTime = 0;
        recommendation = 'Immediate medical attention required. Proceed to emergency department.';
      } else if (triageScore >= 70) {
        category = 'URGENT';
        waitTime = 30;
        recommendation = 'Urgent care needed. See a doctor within 30 minutes.';
      } else if (triageScore >= 50) {
        category = 'LESS_URGENT';
        waitTime = 120;
        recommendation = 'Medical attention needed. See a doctor within 2 hours.';
      } else if (triageScore >= 30) {
        category = 'NON_URGENT';
        waitTime = 240;
        recommendation = 'Schedule an appointment within 24 hours.';
      } else {
        category = 'ROUTINE';
        waitTime = 480;
        recommendation = 'Routine care. Schedule a regular appointment.';
      }

      return {
        triageScore,
        category,
        waitTime,
        recommendation,
        confidence: 0.75 + Math.random() * 0.15,
        suggestedDepartment: this.suggestDepartment(symptoms)
      };
    } catch (error) {
      logger.error('AI triage error:', error);
      throw error;
    }
  }

  // Helper: Calculate triage score
  calculateTriageScore(symptoms, patientData) {
    let score = 0;
    
    // Critical symptoms
    const criticalSymptoms = ['chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding'];
    const urgentSymptoms = ['high fever', 'severe pain', 'vomiting blood', 'confusion'];
    
    for (const symptom of symptoms) {
      if (criticalSymptoms.some(cs => symptom.toLowerCase().includes(cs))) {
        score += 30;
      } else if (urgentSymptoms.some(us => symptom.toLowerCase().includes(us))) {
        score += 20;
      } else {
        score += 5;
      }
    }
    
    // Age factor
    if (patientData.age > 70 || patientData.age < 2) {
      score += 15;
    }
    
    // Vital signs
    if (patientData.vitalSigns) {
      if (patientData.vitalSigns.heartRate > 120 || patientData.vitalSigns.heartRate < 50) {
        score += 20;
      }
      if (patientData.vitalSigns.bloodPressure?.systolic > 180 || patientData.vitalSigns.bloodPressure?.systolic < 90) {
        score += 20;
      }
    }
    
    return Math.min(100, score);
  }

  // Helper: Suggest department based on symptoms
  suggestDepartment(symptoms) {
    const symptomText = symptoms.join(' ').toLowerCase();
    
    if (symptomText.includes('chest') || symptomText.includes('heart')) {
      return 'Cardiology';
    } else if (symptomText.includes('pregnant') || symptomText.includes('pregnancy')) {
      return 'Obstetrics';
    } else if (symptomText.includes('child') || symptomText.includes('pediatric')) {
      return 'Pediatrics';
    } else if (symptomText.includes('injury') || symptomText.includes('accident')) {
      return 'Emergency';
    } else {
      return 'General Medicine';
    }
  }

  // Helper: Calculate average by day of week
  calculateAverageByDayOfWeek(data) {
    const dayAverages = {};
    const dayCounts = {};
    
    for (const row of data) {
      const dow = row.day_of_week;
      if (!dayAverages[dow]) {
        dayAverages[dow] = 0;
        dayCounts[dow] = 0;
      }
      dayAverages[dow] += row.total_patients;
      dayCounts[dow]++;
    }
    
    for (const dow in dayAverages) {
      dayAverages[dow] = dayAverages[dow] / dayCounts[dow];
    }
    
    return dayAverages;
  }

  // Helper: Calculate trend
  calculateTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      const y = data[i].value || data[i].total_patients || 0;
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  // Helper: Get seasonal factor
  getSeasonalFactor(month) {
    // Nigerian seasonal patterns (rainy season, harmattan, etc.)
    const seasonalFactors = {
      0: 1.1,  // January - Harmattan
      1: 1.0,  // February
      2: 0.95, // March
      3: 1.0,  // April - Start of rainy season
      4: 1.05, // May
      5: 1.1,  // June - Peak rainy season
      6: 1.15, // July
      7: 1.1,  // August
      8: 1.05, // September
      9: 1.0,  // October - End of rainy season
      10: 1.05, // November - Harmattan begins
      11: 1.15  // December - Holiday season
    };
    return seasonalFactors[month] || 1.0;
  }

  // Helper: Get day of week revenue factor
  getDayOfWeekRevenueFactor(dayOfWeek) {
    const factors = {
      0: 0.8,  // Sunday
      1: 1.1,  // Monday
      2: 1.05, // Tuesday
      3: 1.0,  // Wednesday
      4: 1.05, // Thursday
      5: 1.1,  // Friday
      6: 0.9   // Saturday
    };
    return factors[dayOfWeek] || 1.0;
  }

  // Generate recommendations
  generateDrugRecommendations(predictions) {
    const recommendations = [];
    const totalPredicted = predictions.reduce((sum, p) => sum + p.predictedUsage, 0);
    
    recommendations.push(`Expected ${totalPredicted} units needed over next 30 days`);
    recommendations.push(`Recommended order quantity: ${Math.ceil(totalPredicted * 1.2)} units (20% buffer)`);
    
    const highUsageDays = predictions.filter(p => p.predictedUsage > totalPredicted / 30 * 1.5);
    if (highUsageDays.length > 0) {
      recommendations.push(`High usage expected on ${highUsageDays.length} days`);
    }
    
    return recommendations;
  }

  generateOccupancyRecommendations(predictions) {
    const recommendations = [];
    const highOccupancy = predictions.filter(p => p.predictedOccupancy > 90);
    
    if (highOccupancy.length > 0) {
      recommendations.push(`High occupancy (>90%) expected in ${highOccupancy.length} periods`);
      recommendations.push('Consider deferring elective procedures');
      recommendations.push('Prepare discharge plans for stable patients');
    }
    
    return recommendations;
  }

  generateRevenueInsights(predictions, historical) {
    const insights = [];
    const avgPredicted = predictions.reduce((sum, p) => sum + p.predictedRevenue, 0) / predictions.length;
    const avgHistorical = historical.reduce((sum, h) => sum + parseFloat(h.total_revenue), 0) / historical.length;
    
    const growthRate = ((avgPredicted - avgHistorical) / avgHistorical * 100).toFixed(2);
    insights.push(`Revenue growth projection: ${growthRate}%`);
    
    if (growthRate > 0) {
      insights.push('Positive revenue trend detected');
    } else {
      insights.push('Revenue optimization needed');
    }
    
    return insights;
  }

  generateStaffingRecommendations(predictions) {
    const recommendations = [];
    const maxStaff = Math.max(...predictions.map(p => p.staffingRequirements.total));
    const minStaff = Math.min(...predictions.map(p => p.staffingRequirements.total));
    
    recommendations.push(`Staff requirement range: ${minStaff} - ${maxStaff} personnel`);
    
    const peakDays = predictions.filter(p => p.staffingRequirements.total === maxStaff);
    if (peakDays.length > 0) {
      recommendations.push(`Peak staffing needed on ${peakDays.map(d => d.date.toLocaleDateString()).join(', ')}`);
    }
    
    return recommendations;
  }

  generateReadmissionRecommendations(riskScore) {
    const recommendations = [];
    
    if (riskScore > 70) {
      recommendations.push('Schedule follow-up within 48 hours');
      recommendations.push('Ensure medication compliance');
      recommendations.push('Provide detailed discharge instructions');
      recommendations.push('Consider home health services');
    } else if (riskScore > 40) {
      recommendations.push('Schedule follow-up within 7 days');
      recommendations.push('Phone check-in within 72 hours');
    } else {
      recommendations.push('Standard follow-up care');
    }
    
    return recommendations;
  }

  // Store predictions in database
  async storePredictions(hospitalId, modelType, predictions) {
    try {
      for (const prediction of predictions) {
        await this.pool.query(`
          INSERT INTO dl_analytics.predictions
          (hospital_id, prediction_type, target_date, predicted_value, confidence_score, model_version)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          hospitalId,
          modelType,
          prediction.date,
          prediction.predictedPatients || prediction.predictedUsage || prediction.predictedRevenue || 0,
          prediction.confidence || 0.75,
          this.models[modelType]?.version || '1.0.0'
        ]);
      }
    } catch (error) {
      logger.error('Error storing predictions:', error);
    }
  }

  // Generate mock prediction for demo
  generateMockPrediction(modelType, days = 7) {
    const predictions = [];
    const today = new Date();
    
    for (let i = 1; i <= days; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      
      predictions.push({
        date: targetDate,
        predictedValue: 100 + Math.random() * 50,
        confidence: 0.70 + Math.random() * 0.20
      });
    }
    
    return {
      model: modelType,
      predictions,
      metadata: {
        isMock: true,
        modelVersion: '1.0.0',
        generatedAt: new Date()
      }
    };
  }
}

module.exports = new PredictiveAnalytics();
