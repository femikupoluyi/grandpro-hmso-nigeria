import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ApplicationForm from './pages/ApplicationForm';
import DocumentUpload from './pages/DocumentUpload';
import ApplicationProgress from './pages/ApplicationProgress';
import ContractReview from './pages/ContractReview';
import HomePage from './pages/HomePage';
import CommandCentreSimple from './pages/operations/CommandCentreSimple';
import PartnerIntegrations from './pages/integrations/PartnerIntegrations';
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
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/apply" element={<Layout><ApplicationForm /></Layout>} />
        <Route path="/upload-documents/:applicationId" element={<Layout><DocumentUpload /></Layout>} />
        <Route path="/progress/:applicationNumber" element={<Layout><ApplicationProgress /></Layout>} />
        <Route path="/contract/:contractId" element={<Layout><ContractReview /></Layout>} />
        <Route path="/command-centre" element={<CommandCentreSimple />} />
        <Route path="/integrations" element={<PartnerIntegrations />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
