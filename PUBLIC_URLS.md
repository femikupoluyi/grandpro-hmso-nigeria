# GrandPro HMSO Platform - Public URLs

## Live Application URLs

### Frontend Application
- **URL**: https://frontend-app-morphvm-wz7xxc7v.http.cloud.morph.so/
- **Status**: ✅ ACTIVE
- **Description**: Main web interface for the GrandPro HMSO platform
- **Features**:
  - Hospital owner application portal
  - Document upload system
  - Progress tracking dashboard
  - Contract management
  - Command Centre for operations

### Backend API
- **URL**: https://backend-api-morphvm-wz7xxc7v.http.cloud.morph.so/api
- **Status**: ✅ ACTIVE
- **Description**: RESTful API serving all platform modules
- **Health Check**: https://backend-api-morphvm-wz7xxc7v.http.cloud.morph.so/api/health

## Available Endpoints

### Public Endpoints (No Authentication Required)
- `GET /api/health` - System health check
- `POST /api/onboarding/applications/submit` - Submit hospital application
- `GET /api/onboarding/applications/status/:applicationNumber` - Check application status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - New user registration
- `POST /api/auth/refresh` - Refresh authentication token

### Onboarding Module
- `POST /api/onboarding/applications/:id/documents` - Upload documents
- `GET /api/onboarding/applications/:id/evaluation` - Get evaluation results
- `POST /api/onboarding/contracts/:id/sign` - Sign digital contract

### CRM Module
- `GET /api/crm/owners/:id` - Get owner details
- `GET /api/crm/patients/:id` - Get patient information
- `POST /api/crm/appointments` - Schedule appointment
- `POST /api/crm/communications/send` - Send WhatsApp/SMS/Email

### Hospital Management
- `GET /api/emr/patients/:id/records` - Get patient medical records
- `POST /api/billing/invoices` - Create invoice
- `GET /api/inventory/stock` - Check inventory levels
- `GET /api/hr/schedules` - Get staff schedules

### Command Centre
- `GET /api/operations/dashboard` - Real-time metrics
- `GET /api/operations/hospitals` - Multi-hospital overview
- `GET /api/operations/alerts` - System alerts

### Partner Integrations
- `POST /api/partners/insurance/claim` - Submit insurance claim
- `GET /api/partners/pharmacy/catalog` - Get pharmacy catalog
- `POST /api/partners/telemedicine/session` - Start telemedicine session

### Analytics
- `GET /api/analytics/reports/occupancy` - Occupancy reports
- `GET /api/analytics/predictions/demand` - Demand predictions
- `GET /api/analytics/ml/triage` - AI triage recommendations

## Test Credentials

### Admin User
- **Username**: admin@grandpro.ng
- **Password**: Admin@GrandPro2025
- **Role**: Super Administrator

### Hospital Owner
- **Username**: owner@hospital.ng
- **Password**: Owner@2025
- **Role**: Hospital Owner

### Test Application
- **Application Number**: APP-2025-001234
- **Status**: Can be used to test application tracking

## System Information

### Technology Stack
- **Frontend**: React 18.3 with Vite
- **Backend**: Node.js with Express
- **Database**: Neon PostgreSQL
- **Authentication**: JWT
- **File Storage**: Local with cloud backup ready

### Nigerian Context
- **Currency**: Nigerian Naira (₦)
- **Timezone**: West Africa Time (WAT)
- **Phone Format**: +234 XXX XXX XXXX
- **States**: All 36 Nigerian states supported

## Quick Start Guide

1. **Access the Platform**
   - Navigate to: https://frontend-app-morphvm-wz7xxc7v.http.cloud.morph.so/

2. **Submit Hospital Application**
   - Click "Apply Now" on the homepage
   - Fill in hospital details
   - Upload required documents
   - Track progress using application number

3. **API Integration**
   ```bash
   # Test API health
   curl https://backend-api-morphvm-wz7xxc7v.http.cloud.morph.so/api/health
   
   # Submit application
   curl -X POST https://backend-api-morphvm-wz7xxc7v.http.cloud.morph.so/api/onboarding/applications/submit \
     -H "Content-Type: application/json" \
     -d '{"hospitalName":"Test Hospital","location":"Lagos"}'
   ```

## Support

For any issues or questions:
- **Technical Support**: Contact development team
- **API Documentation**: Available at `/api/docs`
- **System Status**: Check `/api/health` endpoint

---

Last Updated: October 2, 2025
Platform Status: ✅ FULLY OPERATIONAL
