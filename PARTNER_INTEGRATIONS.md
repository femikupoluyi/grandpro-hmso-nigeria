# Partner Integrations Documentation

## Overview
The GrandPro HMSO platform includes comprehensive integrations with Nigerian healthcare partners for Insurance/HMO, Pharmacy suppliers, and Telemedicine providers. All integrations use secure token-based authentication and follow Nigerian healthcare standards.

## 🏥 Insurance/HMO Integration

### Supported Providers
1. **NHIS** (National Health Insurance Scheme) - Government
2. **Hygeia HMO** - Private
3. **Reliance HMO** - Private
4. **AXA Mansard Health** - Private
5. **AIICO Multishield** - Private

### Features
- **Eligibility Verification**: Real-time patient coverage checks with 5-minute caching
- **Claims Management**: Submit, track, and manage insurance claims
- **Pre-authorization**: Request and track procedure authorizations
- **Batch Processing**: Submit multiple claims in one request
- **Provider Network**: Query in-network hospitals and clinics

### API Endpoints
```
POST /api/insurance/verify-eligibility
POST /api/insurance/submit-claim
GET  /api/insurance/claim-status/:claimId
POST /api/insurance/pre-authorization
POST /api/insurance/batch-claims
GET  /api/insurance/provider-network/:providerId
POST /api/insurance/webhook/claim-update
```

### Authentication Methods
- **NHIS**: HMAC-SHA256 signed tokens
- **Hygeia**: OAuth2 client credentials flow
- **Reliance**: Base64 encoded API key with merchant ID
- **Others**: Bearer token authentication

## 💊 Pharmacy Integration

### Supported Suppliers
1. **Emzor Pharmaceuticals** - Antibiotics, Analgesics, Anti-malarials
2. **Fidson Healthcare** - Injectables, Infusions, Critical Care
3. **May & Baker Nigeria** - Vaccines, Biologics, Specialty Drugs
4. **HealthPlus Pharmacy** - Retail Pharmacy, Medical Supplies
5. **MedPlus Pharmacy** - Retail Pharmacy, Medical Equipment

### Features
- **Drug Availability**: Check real-time stock across all suppliers
- **Price Comparison**: Compare prices across suppliers for best deals
- **Order Management**: Place and track pharmaceutical orders
- **Auto-Reordering**: Set up automatic reorder rules based on inventory levels
- **Webhook Support**: Receive real-time updates on order status

### API Endpoints
```
POST /api/pharmacy/check-availability
POST /api/pharmacy/compare-prices
POST /api/pharmacy/place-order
GET  /api/pharmacy/track-order/:orderId
POST /api/pharmacy/setup-auto-reorder
POST /api/pharmacy/process-auto-reorders
GET  /api/pharmacy/suppliers
POST /api/pharmacy/webhook/:supplierId
```

### Authentication Methods
- **Emzor**: OAuth2 with merchant ID
- **Fidson**: HMAC authentication with account number
- **May & Baker**: API key with partner ID
- **HealthPlus**: Bearer token with client credentials
- **MedPlus**: Custom headers with store code

## 🎥 Telemedicine Integration

### Supported Providers
1. **WellaHealth** - Full-service telemedicine with AI triage
2. **Mobihealth International** - Video consultations and e-prescriptions
3. **Doctoora** - Virtual consultations
4. **Reliance Telemedicine** - Integrated with Reliance HMO

### Features
- **Video Consultations**: WebRTC-based real-time video calls
- **Consultation Scheduling**: Book and manage virtual appointments
- **E-Prescriptions**: Generate digital prescriptions with QR codes
- **AI Triage**: Automated symptom assessment and urgency categorization
- **Doctor Availability**: Real-time doctor availability checking

### API Endpoints
```
POST /api/telemedicine/schedule-consultation
POST /api/telemedicine/video/initialize
POST /api/telemedicine/video/join
POST /api/telemedicine/video/end
POST /api/telemedicine/prescriptions/generate
POST /api/telemedicine/ai-triage
GET  /api/telemedicine/doctors/available
POST /api/telemedicine/payments/process
GET  /api/telemedicine/consultations/history
GET  /api/telemedicine/providers
POST /api/telemedicine/webhook/:providerId
```

### WebSocket Signaling
```
ws://[server]/ws/signaling
```
Used for WebRTC peer-to-peer connection establishment during video calls.

### Triage Categories
1. **EMERGENCY** (Red) - Immediate attention required
2. **URGENT** (Orange) - See doctor within 30 minutes
3. **LESS_URGENT** (Yellow) - See doctor within 2 hours
4. **NON_URGENT** (Green) - See doctor within 24 hours
5. **ROUTINE** (Blue) - Schedule regular appointment

## 🔐 Security Features

### Token Management
- Automatic token refresh for expired credentials
- Secure token storage with expiry tracking
- Provider-specific authentication methods
- Request signing for sensitive operations

### Data Protection
- End-to-end encryption for video calls
- HIPAA/GDPR-aligned data handling
- Audit logging for all transactions
- Role-based access control

### Webhook Security
- Signature verification for incoming webhooks
- Request ID tracking for idempotency
- Timestamp validation to prevent replay attacks

## 📊 Integration Dashboard

### Location
```
Frontend: /integrations
```

### Features
- Real-time connection status monitoring
- Test connections for each provider
- View recent transactions and claims
- Manage auto-reorder rules
- Monitor active video consultations
- AI triage queue management

## 🔄 Data Synchronization

### Caching Strategy
- Insurance eligibility: 5-minute cache
- Pharmacy prices: 5-minute cache
- Provider networks: 24-hour cache
- Order status: Real-time via webhooks

### Database Tables
```sql
-- Insurance
insurance_verifications
insurance_claims
pre_authorizations
provider_networks
batch_submissions

-- Pharmacy
drug_availability_checks
pharmacy_orders
auto_reorder_rules
auto_reorder_logs
price_updates

-- Telemedicine
telemedicine_consultations
telemedicine_prescriptions
ai_triage_results
consultation_payments
```

## 🚀 Quick Start

### Test Insurance Integration
```javascript
// Verify patient eligibility
POST /api/insurance/verify-eligibility
{
  "patientId": "PAT001",
  "providerId": "NHIS",
  "insuranceNumber": "NHIS-123456",
  "patientName": "Adebayo Ogundimu"
}
```

### Test Pharmacy Integration
```javascript
// Check drug availability
POST /api/pharmacy/check-availability
{
  "drugName": "Paracetamol",
  "quantity": 100,
  "hospitalId": "HOSP001"
}
```

### Test Telemedicine Integration
```javascript
// Schedule consultation
POST /api/telemedicine/schedule-consultation
{
  "patientId": "PAT001",
  "scheduledTime": "2024-01-15T14:00:00",
  "type": "video",
  "reason": "Follow-up consultation"
}
```

## 📱 Frontend Access

### Development
- Backend: http://localhost:5000
- Frontend: http://localhost:5175
- WebSocket: ws://localhost:5000/ws/signaling

### Production
- Backend: https://grandpro-backend.yourdomain.com
- Frontend: https://grandpro-frontend.yourdomain.com
- WebSocket: wss://grandpro-backend.yourdomain.com/ws/signaling

## 🛠️ Environment Variables

```env
# Insurance
NHIS_API_KEY=your_nhis_key
NHIS_SECRET_KEY=your_nhis_secret
HYGEIA_API_KEY=your_hygeia_key
HYGEIA_CLIENT_ID=your_hygeia_client_id
RELIANCE_API_KEY=your_reliance_key
RELIANCE_MERCHANT_ID=your_reliance_merchant

# Pharmacy
EMZOR_API_KEY=your_emzor_key
EMZOR_SECRET=your_emzor_secret
FIDSON_API_KEY=your_fidson_key
FIDSON_SECRET=your_fidson_secret
MAYBAKER_API_KEY=your_maybaker_key

# Telemedicine
WELLA_API_KEY=your_wella_key
WELLA_SECRET=your_wella_secret
MOBI_API_KEY=your_mobi_key
DOCTOORA_API_KEY=your_doctoora_key

# WebRTC
TURN_CREDENTIAL=your_turn_password
```

## 📝 Notes

1. All integrations currently use sandbox/mock endpoints for testing
2. Production API credentials should be obtained from respective providers
3. WebRTC requires HTTPS in production for camera/microphone access
4. TURN servers may be needed for video calls behind strict firewalls
5. All monetary values are in Nigerian Naira (NGN)
6. Timestamps use Africa/Lagos timezone

## 🔗 External URLs

- **Backend API**: https://grandpro-backend-morphvm-wz7xxc7v.http.cloud.morph.so
- **Frontend Application**: https://grandpro-frontend-morphvm-wz7xxc7v.http.cloud.morph.so
- **GitHub Repository**: https://github.com/femikupoluyi/grandpro-hmso-nigeria

## 📞 Support

For integration support, please contact:
- Technical Support: support@grandpro-hmso.ng
- Integration Team: integrations@grandpro-hmso.ng
- Emergency: +234-800-GRANDPRO
