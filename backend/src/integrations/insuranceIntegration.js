const axios = require('axios');
const crypto = require('crypto');
const { sql } = require('../config/database');

// Nigerian Insurance/HMO Providers Configuration
const INSURANCE_PROVIDERS = {
  NHIS: {
    name: 'National Health Insurance Scheme',
    apiUrl: process.env.NHIS_API_URL || 'https://api.nhis.gov.ng/v1',
    apiKey: process.env.NHIS_API_KEY,
    type: 'government'
  },
  HYGEIA: {
    name: 'Hygeia HMO',
    apiUrl: process.env.HYGEIA_API_URL || 'https://api.hygeiahmo.com/v2',
    apiKey: process.env.HYGEIA_API_KEY,
    type: 'private'
  },
  RELIANCE: {
    name: 'Reliance HMO',
    apiUrl: process.env.RELIANCE_API_URL || 'https://api.reliancehmo.com/v1',
    apiKey: process.env.RELIANCE_API_KEY,
    type: 'private'
  },
  AXA_MANSARD: {
    name: 'AXA Mansard Health',
    apiUrl: process.env.AXA_API_URL || 'https://api.axamansard.com/health/v1',
    apiKey: process.env.AXA_API_KEY,
    type: 'private'
  },
  LEADWAY: {
    name: 'Leadway Health',
    apiUrl: process.env.LEADWAY_API_URL || 'https://api.leadway.com/health/v1',
    apiKey: process.env.LEADWAY_API_KEY,
    type: 'private'
  }
};

class InsuranceIntegration {
  constructor() {
    this.providers = INSURANCE_PROVIDERS;
    this.cache = new Map(); // Simple in-memory cache for eligibility checks
  }

  // Generate request signature for secure API calls
  generateSignature(data, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  // Verify patient insurance eligibility
  async verifyEligibility(providerId, patientData) {
    try {
      const cacheKey = `${providerId}:${patientData.insuranceNumber}`;
      
      // Check cache first (5 minutes TTL)
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutes
          return cached.data;
        }
      }

      const provider = this.providers[providerId];
      if (!provider) {
        throw new Error(`Unknown insurance provider: ${providerId}`);
      }

      // Simulate API call (would be actual API in production)
      const eligibilityData = await this.mockVerifyEligibility(providerId, patientData);

      // Store in database
      await sql`
        INSERT INTO insurance_verifications 
        (patient_id, provider_id, insurance_number, status, coverage_details, verified_at)
        VALUES (${patientData.patientId}, ${providerId}, ${patientData.insuranceNumber}, 
                ${eligibilityData.status}, ${JSON.stringify(eligibilityData.coverage)}, NOW())
        ON CONFLICT (patient_id, provider_id) 
        DO UPDATE SET 
          status = ${eligibilityData.status},
          coverage_details = ${JSON.stringify(eligibilityData.coverage)},
          verified_at = NOW()
      `;

      // Cache the result
      this.cache.set(cacheKey, {
        data: eligibilityData,
        timestamp: Date.now()
      });

      return eligibilityData;
    } catch (error) {
      console.error('Error verifying insurance eligibility:', error);
      throw error;
    }
  }

  // Submit insurance claim
  async submitClaim(providerId, claimData) {
    try {
      const provider = this.providers[providerId];
      if (!provider) {
        throw new Error(`Unknown insurance provider: ${providerId}`);
      }

      // Generate unique claim ID
      const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Simulate claim submission
      const claimResult = await this.mockSubmitClaim(providerId, {
        ...claimData,
        claimId
      });

      // Store claim in database
      await pool.query(
        `INSERT INTO insurance_claims 
         (claim_id, patient_id, provider_id, hospital_id, amount, services, status, 
          submission_date, response_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
        [
          claimId,
          claimData.patientId,
          providerId,
          claimData.hospitalId,
          claimData.amount,
          JSON.stringify(claimData.services),
          claimResult.status,
          JSON.stringify(claimResult)
        ]
      );

      return {
        claimId,
        ...claimResult
      };
    } catch (error) {
      console.error('Error submitting insurance claim:', error);
      throw error;
    }
  }

  // Get claim status
  async getClaimStatus(claimId, providerId) {
    try {
      // Check database first
      const dbResult = await pool.query(
        'SELECT * FROM insurance_claims WHERE claim_id = $1',
        [claimId]
      );

      if (dbResult.rows.length === 0) {
        throw new Error('Claim not found');
      }

      const claim = dbResult.rows[0];

      // If claim is still pending, check with provider
      if (claim.status === 'pending' || claim.status === 'processing') {
        const updatedStatus = await this.mockGetClaimStatus(claimId, providerId);
        
        // Update database if status changed
        if (updatedStatus.status !== claim.status) {
          await pool.query(
            'UPDATE insurance_claims SET status = $1, response_data = $2, updated_at = NOW() WHERE claim_id = $3',
            [updatedStatus.status, JSON.stringify(updatedStatus), claimId]
          );
        }

        return updatedStatus;
      }

      return {
        claimId: claim.claim_id,
        status: claim.status,
        amount: claim.amount,
        approvedAmount: claim.approved_amount,
        submissionDate: claim.submission_date,
        responseDate: claim.response_date
      };
    } catch (error) {
      console.error('Error getting claim status:', error);
      throw error;
    }
  }

  // Pre-authorization request
  async requestPreAuthorization(providerId, authData) {
    try {
      const provider = this.providers[providerId];
      if (!provider) {
        throw new Error(`Unknown insurance provider: ${providerId}`);
      }

      const authId = `AUTH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Simulate pre-authorization request
      const authResult = await this.mockPreAuthorization(providerId, {
        ...authData,
        authId
      });

      // Store in database
      await pool.query(
        `INSERT INTO pre_authorizations 
         (auth_id, patient_id, provider_id, hospital_id, service_type, 
          estimated_cost, status, request_date, response_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
        [
          authId,
          authData.patientId,
          providerId,
          authData.hospitalId,
          authData.serviceType,
          authData.estimatedCost,
          authResult.status,
          JSON.stringify(authResult)
        ]
      );

      return {
        authId,
        ...authResult
      };
    } catch (error) {
      console.error('Error requesting pre-authorization:', error);
      throw error;
    }
  }

  // Batch claims submission
  async submitBatchClaims(providerId, claims) {
    try {
      const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const results = [];

      for (const claim of claims) {
        try {
          const result = await this.submitClaim(providerId, claim);
          results.push({
            success: true,
            ...result
          });
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            patientId: claim.patientId
          });
        }
      }

      // Store batch submission record
      await pool.query(
        `INSERT INTO batch_submissions 
         (batch_id, provider_id, total_claims, successful_claims, failed_claims, 
          submission_date, results)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
        [
          batchId,
          providerId,
          claims.length,
          results.filter(r => r.success).length,
          results.filter(r => !r.success).length,
          JSON.stringify(results)
        ]
      );

      return {
        batchId,
        totalClaims: claims.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error submitting batch claims:', error);
      throw error;
    }
  }

  // Get provider network hospitals
  async getProviderNetwork(providerId) {
    try {
      const provider = this.providers[providerId];
      if (!provider) {
        throw new Error(`Unknown insurance provider: ${providerId}`);
      }

      // Check database for cached network data
      const cachedNetwork = await pool.query(
        `SELECT network_data FROM provider_networks 
         WHERE provider_id = $1 AND updated_at > NOW() - INTERVAL '24 hours'`,
        [providerId]
      );

      if (cachedNetwork.rows.length > 0) {
        return JSON.parse(cachedNetwork.rows[0].network_data);
      }

      // Simulate fetching provider network
      const networkData = await this.mockGetProviderNetwork(providerId);

      // Cache the network data
      await pool.query(
        `INSERT INTO provider_networks (provider_id, network_data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (provider_id) 
         DO UPDATE SET network_data = $2, updated_at = NOW()`,
        [providerId, JSON.stringify(networkData)]
      );

      return networkData;
    } catch (error) {
      console.error('Error getting provider network:', error);
      throw error;
    }
  }

  // Mock functions for demonstration (would be actual API calls in production)
  async mockVerifyEligibility(providerId, patientData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      status: 'active',
      patientName: patientData.patientName,
      insuranceNumber: patientData.insuranceNumber,
      provider: this.providers[providerId].name,
      coverage: {
        outpatient: {
          covered: true,
          copayPercentage: 10,
          annualLimit: 500000 // NGN
        },
        inpatient: {
          covered: true,
          copayPercentage: 20,
          annualLimit: 2000000 // NGN
        },
        maternity: {
          covered: true,
          copayPercentage: 0,
          annualLimit: 400000 // NGN
        },
        dental: {
          covered: true,
          copayPercentage: 30,
          annualLimit: 100000 // NGN
        },
        optical: {
          covered: true,
          copayPercentage: 25,
          annualLimit: 75000 // NGN
        },
        pharmacy: {
          covered: true,
          copayPercentage: 10,
          annualLimit: 300000 // NGN
        }
      },
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  async mockSubmitClaim(providerId, claimData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const approvalRate = 0.85; // 85% approval rate
    const isApproved = Math.random() < approvalRate;

    return {
      status: isApproved ? 'approved' : 'rejected',
      provider: this.providers[providerId].name,
      claimAmount: claimData.amount,
      approvedAmount: isApproved ? claimData.amount * 0.9 : 0,
      processingTime: '2-3 business days',
      referenceNumber: `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      remarks: isApproved 
        ? 'Claim approved for processing' 
        : 'Additional documentation required'
    };
  }

  async mockGetClaimStatus(claimId, providerId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const statuses = ['pending', 'processing', 'approved', 'paid', 'rejected'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      claimId,
      status: randomStatus,
      provider: this.providers[providerId]?.name || 'Unknown',
      lastUpdated: new Date().toISOString()
    };
  }

  async mockPreAuthorization(providerId, authData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const approvalRate = 0.9; // 90% approval rate for pre-auth
    const isApproved = Math.random() < approvalRate;

    return {
      status: isApproved ? 'approved' : 'requires_review',
      authorizationCode: isApproved ? `AUTH-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
      validFor: isApproved ? '30 days' : null,
      approvedAmount: isApproved ? authData.estimatedCost : 0,
      conditions: isApproved ? [] : ['Medical review required', 'Alternative treatment suggested']
    };
  }

  async mockGetProviderNetwork(providerId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 700));

    return {
      provider: this.providers[providerId].name,
      networkSize: Math.floor(Math.random() * 500) + 100,
      hospitals: [
        {
          name: 'Lagos General Hospital',
          location: 'Lagos Island',
          tier: 'Premium',
          services: ['General Medicine', 'Surgery', 'Pediatrics', 'Maternity']
        },
        {
          name: 'Abuja Central Medical Centre',
          location: 'Garki District',
          tier: 'Standard',
          services: ['General Medicine', 'Emergency Care', 'Diagnostics']
        },
        {
          name: 'Port Harcourt Specialist Hospital',
          location: 'Old GRA',
          tier: 'Premium',
          services: ['Specialist Care', 'Surgery', 'ICU', 'Oncology']
        },
        {
          name: 'Kano Teaching Hospital',
          location: 'Nassarawa',
          tier: 'Teaching',
          services: ['All Services', 'Research', 'Training']
        }
      ],
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = new InsuranceIntegration();
