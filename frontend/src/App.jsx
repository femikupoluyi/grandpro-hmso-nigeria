import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ApplicationForm from './pages/ApplicationForm';
import DocumentUpload from './pages/DocumentUpload';
import ApplicationProgress from './pages/ApplicationProgress';
import ContractReview from './pages/ContractReview';
import HomePage from './pages/HomePage';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/apply" element={<ApplicationForm />} />
          <Route path="/upload-documents/:applicationId" element={<DocumentUpload />} />
          <Route path="/progress/:applicationNumber" element={<ApplicationProgress />} />
          <Route path="/contract/:contractId" element={<ContractReview />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
