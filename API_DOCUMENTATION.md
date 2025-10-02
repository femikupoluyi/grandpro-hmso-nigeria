# GrandPro HMSO API Documentation

## Base URL
```
Production: https://api.grandpro-hmso.ng
Development: http://localhost:3000
```

## Authentication
All API requests require JWT authentication token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Login to the system
```json
Request:
{
  "email": "user@hospital.com",
  "password": "SecureP@ssw0rd!"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@hospital.com",
    "role": "doctor",
    "hospital_id": "uuid"
  }
}
```

#### POST /api/auth/logout
Logout and invalidate session
```json
Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/auth/refresh
Refresh JWT token
```json
Response:
{
  "success": true,
  "token": "new_jwt_token"
}
```

### Module 1: Digital Sourcing & Partner Onboarding

#### GET /api/hospitals
Get list of hospitals
```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Lagos University Teaching Hospital",
      "state": "Lagos",
      "city": "Ikeja",
      "status": "active",
      "bed_capacity": 500
    }
  ]
}
```

#### POST /api/onboarding/applications
Submit hospital application
```json
Request:
{
  "hospital_name": "New Hospital",
  "owner_name": "Dr. Adesanya",
  "email": "admin@newhospital.ng",
  "phone": "+2348012345678",
  "state": "Lagos",
  "city": "Victoria Island",
  "bed_capacity": 100,
  "specialties": ["General Medicine", "Surgery", "Pediatrics"]
}
```

#### POST /api/onboarding/documents
Upload application documents
```
Content-Type: multipart/form-data
Fields:
- application_id: uuid
- document_type: "license" | "certificate" | "insurance"
- file: binary
```

#### GET /api/onboarding/contracts/{id}
Get contract details
```json
Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "hospital_id": "uuid",
    "status": "pending_signature",
    "terms": {...},
    "signature_url": "https://..."
  }
}
```

### Module 2: CRM & Relationship Management

#### GET /api/patients
Get patient list
```json
Query Parameters:
- page: 1
- limit: 20
- search: "patient name"
- hospital_id: uuid

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 5
  }
}
```

#### POST /api/appointments
Create appointment
```json
Request:
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "date": "2024-01-15",
  "time": "14:30",
  "department": "Cardiology",
  "reason": "Routine checkup"
}
```

#### POST /api/communications/send
Send communication
```json
Request:
{
  "type": "sms" | "email" | "whatsapp",
  "recipient_id": "uuid",
  "template": "appointment_reminder",
  "variables": {
    "appointment_date": "2024-01-15",
    "doctor_name": "Dr. Okonkwo"
  }
}
```

#### POST /api/feedback
Submit patient feedback
```json
Request:
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "rating": 5,
  "comments": "Excellent service"
}
```

### Module 3: Hospital Management (Core Operations)

#### GET /api/medical-records/{patient_id}
Get patient medical records
```json
Response:
{
  "success": true,
  "data": {
    "patient": {...},
    "records": [
      {
        "id": "uuid",
        "date": "2024-01-10",
        "diagnosis": "Hypertension",
        "treatment": "Medication prescribed",
        "doctor": "Dr. Adebayo"
      }
    ]
  }
}
```

#### POST /api/medical-records
Create medical record
```json
Request:
{
  "patient_id": "uuid",
  "diagnosis": "Type 2 Diabetes",
  "symptoms": ["Increased thirst", "Fatigue"],
  "treatment": "Metformin 500mg twice daily",
  "lab_results": {...},
  "prescriptions": [...]
}
```

#### POST /api/billing/invoices
Create invoice
```json
Request:
{
  "patient_id": "uuid",
  "items": [
    {
      "description": "Consultation",
      "amount": 15000,
      "quantity": 1
    },
    {
      "description": "Blood Test",
      "amount": 5000,
      "quantity": 1
    }
  ],
  "payment_method": "cash" | "card" | "insurance",
  "insurance_id": "uuid"
}
```

#### GET /api/inventory
Get inventory items
```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Paracetamol 500mg",
      "category": "Medicine",
      "quantity": 1000,
      "unit": "tablets",
      "reorder_level": 200,
      "price": 50
    }
  ]
}
```

#### POST /api/inventory/restock
Restock inventory
```json
Request:
{
  "item_id": "uuid",
  "quantity": 500,
  "supplier_id": "uuid",
  "cost": 20000,
  "expiry_date": "2025-12-31"
}
```

#### GET /api/staff/schedules
Get staff schedules
```json
Query Parameters:
- date: "2024-01-15"
- department: "Emergency"

Response:
{
  "success": true,
  "data": [
    {
      "staff_id": "uuid",
      "name": "Nurse Fatima",
      "shift": "morning",
      "start_time": "07:00",
      "end_time": "15:00",
      "department": "Emergency"
    }
  ]
}
```

### Module 4: Centralized Operations & Development

#### GET /api/command-centre/metrics
Get real-time metrics
```json
Response:
{
  "success": true,
  "data": {
    "total_hospitals": 10,
    "total_patients": 50000,
    "active_admissions": 1200,
    "bed_occupancy": 78.5,
    "revenue_today": 5000000,
    "staff_on_duty": 450
  }
}
```

#### GET /api/alerts
Get system alerts
```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "low_stock",
      "severity": "high",
      "message": "Insulin stock below reorder level",
      "hospital_id": "uuid",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### GET /api/projects
Get development projects
```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "New Wing Construction",
      "hospital_id": "uuid",
      "status": "in_progress",
      "progress": 45,
      "budget": 100000000,
      "spent": 45000000
    }
  ]
}
```

### Module 5: Partner & Ecosystem Integrations

#### POST /api/insurance/verify
Verify insurance coverage
```json
Request:
{
  "patient_id": "uuid",
  "policy_number": "NHIS123456",
  "provider": "NHIS"
}

Response:
{
  "success": true,
  "data": {
    "covered": true,
    "coverage_percentage": 70,
    "remaining_limit": 500000
  }
}
```

#### POST /api/insurance/claim
Submit insurance claim
```json
Request:
{
  "patient_id": "uuid",
  "invoice_id": "uuid",
  "policy_number": "NHIS123456",
  "amount": 20000,
  "documents": ["uuid1", "uuid2"]
}
```

#### POST /api/pharmacy/order
Order from pharmacy supplier
```json
Request:
{
  "supplier_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 100,
      "unit_price": 500
    }
  ],
  "delivery_date": "2024-01-20"
}
```

#### POST /api/telemedicine/sessions
Create telemedicine session
```json
Request:
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "scheduled_time": "2024-01-15T14:00:00Z",
  "duration_minutes": 30,
  "type": "video" | "audio"
}

Response:
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "room_url": "https://meet.grandpro.ng/room123",
    "access_token": "token123"
  }
}
```

### Module 6: Data & Analytics

#### GET /api/analytics/dashboard
Get analytics dashboard data
```json
Query Parameters:
- period: "day" | "week" | "month" | "year"
- hospital_id: uuid

Response:
{
  "success": true,
  "data": {
    "patient_flow": {...},
    "revenue": {...},
    "occupancy": {...},
    "staff_performance": {...},
    "predictions": {
      "next_week_admissions": 145,
      "drug_shortage_risk": ["Insulin", "Antibiotics"]
    }
  }
}
```

#### POST /api/analytics/report
Generate custom report
```json
Request:
{
  "type": "financial" | "clinical" | "operational",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "filters": {
    "hospital_id": "uuid",
    "department": "Surgery"
  },
  "format": "pdf" | "excel" | "json"
}
```

#### GET /api/ml/predictions/demand
Get demand predictions
```json
Response:
{
  "success": true,
  "data": {
    "predictions": [
      {
        "date": "2024-01-16",
        "expected_patients": 120,
        "confidence": 0.85,
        "departments": {
          "emergency": 30,
          "outpatient": 60,
          "inpatient": 30
        }
      }
    ]
  }
}
```

### Module 7: Security & Compliance

#### GET /api/audit/logs
Get audit logs
```json
Query Parameters:
- user_id: uuid
- action: "LOGIN" | "VIEW_PATIENT" | "UPDATE_RECORD"
- start_date: "2024-01-01"
- end_date: "2024-01-31"

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "VIEW_PATIENT",
      "resource_type": "patient",
      "resource_id": "uuid",
      "ip_address": "192.168.1.100",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST /api/compliance/consent
Record patient consent
```json
Request:
{
  "patient_id": "uuid",
  "consent_type": "data_processing" | "marketing" | "research",
  "granted": true,
  "purpose": "Medical treatment and record keeping",
  "retention_days": 2555
}
```

#### POST /api/compliance/data-request
Handle GDPR data request
```json
Request:
{
  "patient_id": "uuid",
  "request_type": "access" | "rectification" | "erasure" | "portability",
  "verification_code": "ABC123"
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {...}
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED` - Authentication required
- `INVALID_TOKEN` - Invalid or expired JWT token
- `PERMISSION_DENIED` - Insufficient permissions
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVER_ERROR` - Internal server error

## Rate Limiting
- Default: 100 requests per minute per user
- Authentication endpoints: 5 requests per minute per IP
- File uploads: 10 requests per hour per user

## Pagination
All list endpoints support pagination:
```
GET /api/patients?page=1&limit=20&sort=created_at&order=desc
```

## Filtering
Most list endpoints support filtering:
```
GET /api/patients?hospital_id=uuid&status=active&created_after=2024-01-01
```

## WebSocket Endpoints

### Real-time Updates
```javascript
ws://api.grandpro-hmso.ng/ws

// Subscribe to updates
{
  "type": "subscribe",
  "channels": ["alerts", "metrics", "notifications"]
}

// Receive updates
{
  "type": "update",
  "channel": "alerts",
  "data": {...}
}
```

### Video Call Signaling
```javascript
ws://api.grandpro-hmso.ng/ws/signaling

// WebRTC signaling for telemedicine
{
  "type": "offer" | "answer" | "ice-candidate",
  "session_id": "uuid",
  "data": {...}
}
```

## SDK Usage Examples

### JavaScript/Node.js
```javascript
const GrandProAPI = require('@grandpro/hmso-sdk');

const api = new GrandProAPI({
  apiKey: 'your_api_key',
  environment: 'production'
});

// Login
const { token, user } = await api.auth.login(email, password);

// Get patients
const patients = await api.patients.list({ 
  hospital_id: 'uuid',
  page: 1,
  limit: 20 
});

// Create appointment
const appointment = await api.appointments.create({
  patient_id: 'uuid',
  doctor_id: 'uuid',
  date: '2024-01-15',
  time: '14:30'
});
```

### Python
```python
from grandpro_hmso import GrandProAPI

api = GrandProAPI(api_key='your_api_key')

# Login
token, user = api.auth.login(email, password)

# Get medical records
records = api.medical_records.get(patient_id='uuid')

# Submit insurance claim
claim = api.insurance.submit_claim(
    patient_id='uuid',
    invoice_id='uuid',
    amount=20000
)
```

## Testing Endpoints

### Health Check
```
GET /api/health

Response:
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "services": {
    "redis": "connected",
    "whatsapp": "connected",
    "email": "connected"
  }
}
```

### Test Authentication
```
POST /api/test/auth

Response:
{
  "authenticated": true,
  "user": {...},
  "permissions": [...]
}
```

## API Versioning
The API uses URL versioning. Current version is v1:
```
https://api.grandpro-hmso.ng/v1/patients
```

## Support
For API support and questions:
- Email: api-support@grandpro-hmso.ng
- Documentation: https://docs.grandpro-hmso.ng
- Status Page: https://status.grandpro-hmso.ng

---

*API Documentation Version 1.0.0 - October 2024*
