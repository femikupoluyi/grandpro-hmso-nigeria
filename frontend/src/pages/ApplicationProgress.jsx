import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { onboardingAPI } from '../services/api';
import useApplicationStore from '../store/useApplicationStore';
import { 
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  RefreshIcon,
  ClipboardCheckIcon
} from '@heroicons/react/outline';

const ApplicationProgress = () => {
  const { applicationNumber } = useParams();
  const navigate = useNavigate();
  const { updateProgress } = useApplicationStore();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [applicationInfo, setApplicationInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const statusSteps = [
    { status: 'SUBMITTED', label: 'Application Submitted', icon: DocumentTextIcon },
    { status: 'DOCUMENTS_PENDING', label: 'Documents Review', icon: ClipboardCheckIcon },
    { status: 'EVALUATION', label: 'Evaluation', icon: ClockIcon },
    { status: 'APPROVED', label: 'Approved', icon: CheckCircleIcon },
    { status: 'CONTRACT_NEGOTIATION', label: 'Contract Negotiation', icon: DocumentTextIcon },
    { status: 'CONTRACT_SIGNED', label: 'Contract Signed', icon: CheckCircleIcon },
    { status: 'SYSTEM_SETUP', label: 'System Setup', icon: ClockIcon },
    { status: 'TRAINING', label: 'Training', icon: ClipboardCheckIcon },
    { status: 'COMPLETED', label: 'Onboarding Complete', icon: CheckCircleIcon }
  ];

  useEffect(() => {
    fetchProgress();
  }, [applicationNumber]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      // First get application status
      const statusResponse = await onboardingAPI.getApplicationStatus(applicationNumber);
      setApplicationInfo(statusResponse.application);

      // Then get detailed progress
      const progressResponse = await onboardingAPI.getApplicationProgress(statusResponse.application.id);
      setProgressData(progressResponse.progress);
      updateProgress(progressResponse.progress);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch application progress');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProgress();
    setRefreshing(false);
    toast.success('Progress updated');
  };

  const triggerEvaluation = async () => {
    if (!applicationInfo?.id) return;
    
    try {
      const response = await onboardingAPI.autoEvaluate(applicationInfo.id);
      toast.success(`Evaluation completed! Score: ${response.evaluationScore.toFixed(2)}/10`);
      fetchProgress();
      
      if (response.status === 'APPROVED') {
        setTimeout(() => {
          navigate(`/contract/${applicationInfo.id}`);
        }, 2000);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to trigger evaluation');
    }
  };

  const getCurrentStepIndex = () => {
    if (!progressData?.status) return 0;
    const index = statusSteps.findIndex(step => step.status === progressData.status);
    return index !== -1 ? index : 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy, hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshIcon className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading application progress...</p>
        </div>
      </div>
    );
  }

  if (!progressData || !applicationInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No application found with this number.</p>
        <button
          onClick={() => navigate('/apply')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Start a new application
        </button>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Progress</h2>
            <p className="text-gray-600">Application Number: <span className="font-semibold">{applicationNumber}</span></p>
            <p className="text-gray-600">Hospital: <span className="font-semibold">{applicationInfo.hospital_name}</span></p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshIcon className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-semibold text-primary-600">{progressData.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-primary-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressData.percentage}%` }}
            />
          </div>
        </div>

        {/* Status Timeline */}
        <div className="relative">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div key={step.status} className="flex items-center mb-8 last:mb-0">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? isCurrent 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {index < statusSteps.length - 1 && (
                    <div className={`absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h4 className={`font-medium ${
                    isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </h4>
                  {isCurrent && (
                    <p className="text-sm text-primary-600 mt-1">Current Stage</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Details */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${
                progressData.status === 'APPROVED' ? 'text-green-600' :
                progressData.status === 'REJECTED' ? 'text-red-600' :
                'text-primary-600'
              }`}>
                {progressData.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Submission Date:</span>
              <span className="font-medium">{formatDate(progressData.submissionDate)}</span>
            </div>
            {progressData.approvalDate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Approval Date:</span>
                <span className="font-medium">{formatDate(progressData.approvalDate)}</span>
              </div>
            )}
            {progressData.evaluationScore && (
              <div className="flex justify-between">
                <span className="text-gray-600">Evaluation Score:</span>
                <span className="font-medium">{progressData.evaluationScore.toFixed(2)}/10</span>
              </div>
            )}
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Onboarding Checklist</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {progressData.checklist && progressData.checklist.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={item.is_completed}
                  readOnly
                  className="rounded border-gray-300 text-primary-600"
                />
                <span className={`text-sm ${
                  item.is_completed ? 'text-gray-600 line-through' : 'text-gray-900'
                }`}>
                  {item.task_name}
                  {item.is_required && <span className="text-red-500 ml-1">*</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents Status</h3>
          <div className="space-y-2">
            {progressData.documents && progressData.documents.length > 0 ? (
              progressData.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {doc.document_type.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    doc.is_verified 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {doc.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No documents uploaded yet</p>
            )}
            <button
              onClick={() => navigate(`/upload-documents/${applicationInfo.id}`)}
              className="mt-4 w-full px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50"
            >
              Upload More Documents
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="space-y-3">
            {progressData.status === 'DOCUMENTS_PENDING' && (
              <button
                onClick={triggerEvaluation}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Trigger Auto-Evaluation
              </button>
            )}
            {progressData.status === 'APPROVED' && (
              <button
                onClick={() => navigate(`/contract/${applicationInfo.id}`)}
                className="w-full px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700"
              >
                Proceed to Contract
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationProgress;
