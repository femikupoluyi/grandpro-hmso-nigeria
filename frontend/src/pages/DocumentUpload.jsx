import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { onboardingAPI } from '../services/api';
import useApplicationStore from '../store/useApplicationStore';
import { 
  CloudUploadIcon, 
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon
} from '@heroicons/react/outline';

const DocumentUpload = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { addUploadedDocument } = useApplicationStore();
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [documentTypes, setDocumentTypes] = useState({});

  const requiredDocuments = [
    { type: 'CAC_CERTIFICATE', label: 'CAC Certificate', required: true },
    { type: 'TAX_CLEARANCE', label: 'Tax Clearance Certificate', required: true },
    { type: 'MEDICAL_LICENSE', label: 'Medical Practice License', required: true },
    { type: 'FACILITY_LICENSE', label: 'Facility License', required: true },
    { type: 'INSURANCE_CERTIFICATE', label: 'Insurance Certificate', required: false },
    { type: 'STAFF_LIST', label: 'Staff List', required: false },
    { type: 'EQUIPMENT_INVENTORY', label: 'Equipment Inventory', required: false },
    { type: 'FINANCIAL_STATEMENT', label: 'Financial Statement', required: false }
  ];

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error('Some files were rejected. Please check file type and size.');
      return;
    }

    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: 'OTHER',
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10485760 // 10MB
  });

  const assignDocumentType = (fileId, docType) => {
    setDocumentTypes(prev => ({
      ...prev,
      [fileId]: docType
    }));
    
    setUploadedFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, type: docType } : file
    ));
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    const newDocTypes = { ...documentTypes };
    delete newDocTypes[fileId];
    setDocumentTypes(newDocTypes);
  };

  const uploadDocuments = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    // Check if all files have document types assigned
    const filesWithoutType = uploadedFiles.filter(file => file.type === 'OTHER');
    if (filesWithoutType.length > 0) {
      toast.error('Please assign document types to all files');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      const types = [];

      uploadedFiles.forEach(fileData => {
        formData.append('documents', fileData.file);
        types.push(fileData.type);
      });

      formData.append('documentTypes', JSON.stringify(types));

      const response = await onboardingAPI.uploadDocuments(applicationId, formData);
      
      // Update file status
      setUploadedFiles(prev => prev.map(file => ({
        ...file,
        status: 'uploaded'
      })));

      // Store uploaded documents in global state
      response.documents.forEach(doc => {
        addUploadedDocument(doc);
      });

      toast.success('Documents uploaded successfully!');
      
      // Navigate to progress page after a short delay
      setTimeout(() => {
        navigate(`/progress/${applicationId}`);
      }, 2000);
    } catch (error) {
      toast.error(error.message || 'Failed to upload documents');
      setUploadedFiles(prev => prev.map(file => ({
        ...file,
        status: 'error'
      })));
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Documents</h2>
        
        {/* Required Documents List */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Required Documents</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {requiredDocuments.map(doc => (
              <div key={doc.type} className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  uploadedFiles.some(f => f.type === doc.type && f.status === 'uploaded')
                    ? 'bg-green-500'
                    : doc.required
                    ? 'bg-red-500'
                    : 'bg-gray-300'
                }`} />
                <span className={`text-sm ${
                  doc.required ? 'font-medium text-gray-900' : 'text-gray-600'
                }`}>
                  {doc.label} {doc.required && '*'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-lg text-primary-600">Drop the files here...</p>
          ) : (
            <>
              <p className="text-lg text-gray-700 mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
              </p>
            </>
          )}
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Selected Files</h3>
            <div className="space-y-3">
              {uploadedFiles.map(fileData => (
                <div
                  key={fileData.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    fileData.status === 'uploaded'
                      ? 'border-green-200 bg-green-50'
                      : fileData.status === 'error'
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <DocumentIcon className="h-8 w-8 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{fileData.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(fileData.size)}</p>
                    </div>
                    
                    {/* Document Type Selector */}
                    <select
                      value={fileData.type}
                      onChange={(e) => assignDocumentType(fileData.id, e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={fileData.status === 'uploaded' || uploading}
                    >
                      <option value="OTHER">Select document type</option>
                      {requiredDocuments.map(doc => (
                        <option key={doc.type} value={doc.type}>
                          {doc.label}
                        </option>
                      ))}
                    </select>
                    
                    {/* Status Icon */}
                    {fileData.status === 'uploaded' ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    ) : fileData.status === 'error' ? (
                      <XCircleIcon className="h-6 w-6 text-red-500" />
                    ) : (
                      <button
                        onClick={() => removeFile(fileData.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        disabled={uploading}
                      >
                        <TrashIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            disabled={uploading}
          >
            Back
          </button>
          
          <div className="space-x-4">
            <button
              onClick={() => navigate(`/progress/${applicationId}`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              Skip for Now
            </button>
            
            <button
              onClick={uploadDocuments}
              disabled={uploadedFiles.length === 0 || uploading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Documents'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
