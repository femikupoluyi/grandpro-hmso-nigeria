# GrandPro HMSO Platform

## Tech-Driven Hospital Management Platform for Nigeria

A modular, secure, and scalable platform for hospital management built specifically for the Nigerian healthcare ecosystem.

## 🚀 Features

### Digital Sourcing & Partner Onboarding
- Web portal for hospital owners to submit applications
- Automated evaluation and scoring system
- Digital contract signing
- Progress tracking dashboard

### Core Capabilities
- **Multi-step Application Form**: Hospital information, location, owner details, services, and financial data
- **Document Upload**: Drag-and-drop interface for CAC certificates, licenses, and other documents  
- **Auto-Evaluation**: Intelligent scoring based on infrastructure, services, staffing, and compliance
- **Digital Contracts**: Review and sign contracts electronically
- **Progress Tracking**: Real-time status updates and checklist management

### Nigerian Context Features
- All 36 states + FCT with Local Government Areas (LGAs)
- Nigerian phone number validation (+234 format)
- NGN currency formatting
- Nigerian business registration fields (CAC, TIN, NIN)
- NHIS and HMO integration support

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Hook Form** with Yup validation
- **Zustand** for state management
- **Axios** for API calls
- **React Dropzone** for file uploads
- **React Hot Toast** for notifications
- **Date-fns** for date formatting

### Backend
- **Node.js** with Express
- **Neon PostgreSQL** (Serverless)
- **Multer** for file uploads
- **JWT** for authentication (ready for implementation)
- **Express Validator** for request validation
- **Bcrypt** for password hashing

### Database
- **Neon Serverless PostgreSQL**
- Custom types for Nigerian states and application statuses
- Comprehensive schema for applications, documents, evaluations, and contracts

## 📁 Project Structure

```
grandpro-hmso-platform/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── services/       # API service layer
│   │   ├── store/          # Zustand state management
│   │   └── data/           # Nigerian states/LGAs data
│   └── public/
├── backend/                 # Node.js backend server
│   ├── src/
│   │   ├── config/         # Database and app configuration
│   │   ├── routes/         # API route handlers
│   │   └── server.js       # Main server file
│   └── uploads/            # File upload directory
└── docs/                   # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- PostgreSQL database (Neon account)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/grandpro-hmso-platform.git
cd grandpro-hmso-platform
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Configuration

1. Backend configuration (backend/.env):
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:5173
```

2. Frontend configuration (frontend/.env):
```env
VITE_API_URL=http://localhost:5000/api
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## 🔗 Live URLs

- **Frontend**: https://frontend-ui-morphvm-wz7xxc7v.http.cloud.morph.so
- **Backend API**: https://backend-api-morphvm-wz7xxc7v.http.cloud.morph.so

## 📝 API Endpoints

### Onboarding Module

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/onboarding/applications/submit` | Submit new hospital application |
| GET | `/api/onboarding/applications/status/:applicationNumber` | Check application status |
| POST | `/api/onboarding/applications/:id/documents` | Upload documents |
| GET | `/api/onboarding/applications/:id/progress` | Get application progress |
| POST | `/api/onboarding/applications/:id/auto-evaluate` | Trigger auto-evaluation |
| POST | `/api/onboarding/applications/:id/contract/generate` | Generate contract |
| POST | `/api/onboarding/contracts/:id/sign` | Sign contract digitally |

## 🔐 Security Features

- End-to-end encryption for sensitive data
- Role-based access control (RBAC) ready
- HIPAA/GDPR compliance standards
- Secure file upload with validation
- SQL injection prevention
- XSS protection

## 🎯 Application Flow

1. **Application Submission**
   - Hospital owners complete multi-step form
   - Automatic application number generation
   - Initial status: SUBMITTED

2. **Document Upload**
   - Drag-and-drop interface
   - Support for PDF, DOC, DOCX, JPG, PNG
   - Document type assignment
   - Status update to DOCUMENTS_PENDING

3. **Auto-Evaluation**
   - Scoring based on 12 criteria
   - Weighted evaluation system
   - Automatic approval if score >= 7/10
   - Status update to APPROVED or UNDER_REVIEW

4. **Contract Generation & Signing**
   - Dynamic contract creation
   - Digital signature interface
   - Terms agreement checkbox
   - Status update to CONTRACT_SIGNED

5. **Progress Tracking**
   - Real-time status updates
   - Visual progress bar
   - Checklist management
   - Document verification status

## 🧪 Testing

```bash
# Run backend tests (when implemented)
cd backend
npm test

# Run frontend tests (when implemented)
cd frontend
npm test
```

## 🚢 Deployment

The application is designed to be deployed on:
- Frontend: Any static hosting service (Vercel, Netlify, etc.)
- Backend: Node.js hosting (Railway, Render, AWS, etc.)
- Database: Neon Serverless PostgreSQL

## 📊 Database Schema

Key tables:
- `hospital_applications`: Main application data
- `application_documents`: Uploaded documents
- `evaluation_criteria`: Scoring criteria
- `application_evaluations`: Evaluation results
- `contracts`: Generated contracts
- `onboarding_checklist`: Task tracking

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for GrandPro HMSO.

## 👥 Team

- Frontend Development
- Backend Development
- Database Architecture
- UI/UX Design

## 📞 Contact

For inquiries about the GrandPro HMSO platform:
- Email: info@grandprohmso.ng
- Phone: +234 800 123 4567
- Address: Lagos, Nigeria

---

Built with ❤️ for the Nigerian Healthcare System
