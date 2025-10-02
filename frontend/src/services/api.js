import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

// Onboarding API endpoints
export const onboardingAPI = {
  // Submit application
  submitApplication: (data) => api.post('/onboarding/applications/submit', data),
  
  // Get application status
  getApplicationStatus: (applicationNumber) => 
    api.get(`/onboarding/applications/status/${applicationNumber}`),
  
  // Upload documents
  uploadDocuments: (applicationId, formData) => 
    api.post(`/onboarding/applications/${applicationId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Get application progress
  getApplicationProgress: (applicationId) => 
    api.get(`/onboarding/applications/${applicationId}/progress`),
  
  // Auto-evaluate application
  autoEvaluate: (applicationId) => 
    api.post(`/onboarding/applications/${applicationId}/auto-evaluate`),
  
  // Generate contract
  generateContract: (applicationId, data) => 
    api.post(`/onboarding/applications/${applicationId}/contract/generate`, data),
  
  // Sign contract
  signContract: (contractId, data) => 
    api.post(`/onboarding/contracts/${contractId}/sign`, data),
};

export default api;
