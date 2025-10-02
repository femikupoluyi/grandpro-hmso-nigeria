import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { onboardingAPI } from '../services/api';
import useApplicationStore from '../store/useApplicationStore';
import { 
  DocumentTextIcon,
  PencilIcon,
  CheckCircleIcon,
  DownloadIcon,
  PrinterIcon
} from '@heroicons/react/outline';

const ContractReview = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { setContractData, applicationId } = useApplicationStore();
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState({
    ownerName: '',
    ownerSignature: '',
    agreeToTerms: false
  });

  useEffect(() => {
    if (contractId === 'new' || !contract) {
      generateContract();
    }
  }, [contractId]);

  const generateContract = async () => {
    setLoading(true);
    try {
      const contractData = {
        contractType: 'STANDARD',
        monthlyFee: 50000, // NGN 50,000 default
        revenueSharePercentage: 5, // 5% revenue share
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      };

      const response = await onboardingAPI.generateContract(applicationId || contractId, contractData);
      setContract(response.contract);
      setContractData(response.contract);
    } catch (error) {
      toast.error(error.message || 'Failed to generate contract');
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async () => {
    if (!signatureData.ownerName || !signatureData.ownerSignature) {
      toast.error('Please provide your name and signature');
      return;
    }

    if (!signatureData.agreeToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setSigning(true);
    try {
      const signData = {
        signedByOwner: signatureData.ownerName,
        signedByGrandpro: 'GrandPro HMSO Admin',
        signature: signatureData.ownerSignature
      };

      await onboardingAPI.signContract(contract.id, signData);
      toast.success('Contract signed successfully!');
      
      // Navigate to progress page
      setTimeout(() => {
        navigate(`/progress/${contract.contractNumber}`);
      }, 2000);
    } catch (error) {
      toast.error(error.message || 'Failed to sign contract');
    } finally {
      setSigning(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-primary-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Generating contract...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No contract available.</p>
        <button
          onClick={() => navigate('/apply')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Start a new application
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Contract Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Contract</h2>
            <p className="text-gray-600">Contract Number: <span className="font-semibold">{contract.contractNumber}</span></p>
          </div>
          <div className="flex space-x-2">
            <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <PrinterIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              <DownloadIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Contract Content */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="prose max-w-none">
          <h3 className="text-xl font-bold mb-4">HOSPITAL MANAGEMENT SERVICE AGREEMENT</h3>
          
          <div className="mb-6">
            <p className="text-gray-700">
              This Service Agreement ("Agreement") is entered into on {format(new Date(), 'dd MMMM yyyy')} between:
            </p>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold">Party A: GrandPro HMSO</p>
              <p className="text-sm text-gray-600">
                Address: Victoria Island, Lagos, Nigeria<br />
                Registration: RC1234567<br />
                Email: legal@grandprohmso.ng
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold">Party B: {contract.content?.parties?.hospital}</p>
              <p className="text-sm text-gray-600">
                Owner: {contract.content?.parties?.owner}<br />
                Location: {contract.content?.location?.address}, {contract.content?.location?.lga}, {contract.content?.location?.state}<br />
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">1. SCOPE OF SERVICES</h4>
            <p className="text-gray-700 mb-3">
              GrandPro HMSO agrees to provide comprehensive hospital management services including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Electronic Medical Records (EMR) system</li>
              <li>Billing and revenue management</li>
              <li>Inventory management for drugs and equipment</li>
              <li>HR and staff rostering services</li>
              <li>Real-time analytics and reporting</li>
              <li>Integration with insurance providers (NHIS, HMO)</li>
              <li>24/7 technical support</li>
            </ul>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">2. PAYMENT TERMS</h4>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-gray-700">
                <span className="font-medium">Monthly Service Fee:</span> {formatCurrency(contract.content?.terms?.monthlyFee)}<br />
                <span className="font-medium">Revenue Share:</span> {contract.content?.terms?.revenueShare}% of monthly revenue<br />
                <span className="font-medium">Payment Due:</span> 5th of each month<br />
                <span className="font-medium">Contract Duration:</span> 12 months (renewable)
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">3. OBLIGATIONS OF PARTIES</h4>
            
            <p className="font-medium text-gray-800 mb-2">GrandPro HMSO shall:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
              <li>Provide uninterrupted access to the platform</li>
              <li>Ensure data security and compliance</li>
              <li>Provide training for hospital staff</li>
              <li>Perform regular system updates and maintenance</li>
            </ul>

            <p className="font-medium text-gray-800 mb-2">Hospital shall:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Pay service fees promptly</li>
              <li>Provide accurate and complete information</li>
              <li>Ensure staff participation in training</li>
              <li>Comply with platform usage policies</li>
            </ul>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">4. DATA PROTECTION</h4>
            <p className="text-gray-700">
              Both parties agree to comply with applicable data protection laws including patient confidentiality. 
              All patient data remains the property of the hospital and will be handled in accordance with 
              HIPAA/GDPR standards.
            </p>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">5. TERMINATION</h4>
            <p className="text-gray-700">
              Either party may terminate this agreement with 30 days written notice. Upon termination, 
              the hospital's data will be exported and provided in a standard format.
            </p>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">6. GOVERNING LAW</h4>
            <p className="text-gray-700">
              This Agreement shall be governed by the laws of the Federal Republic of Nigeria.
            </p>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-xl font-bold mb-6">Digital Signature</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name (as it appears on official documents)
            </label>
            <input
              type="text"
              value={signatureData.ownerName}
              onChange={(e) => setSignatureData({...signatureData, ownerName: e.target.value})}
              className="input-field"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Digital Signature (Type your name)
            </label>
            <input
              type="text"
              value={signatureData.ownerSignature}
              onChange={(e) => setSignatureData({...signatureData, ownerSignature: e.target.value})}
              className="input-field font-serif text-2xl"
              placeholder="Type your signature"
              style={{ fontFamily: 'cursive' }}
            />
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={signatureData.agreeToTerms}
              onChange={(e) => setSignatureData({...signatureData, agreeToTerms: e.target.checked})}
              className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="text-sm text-gray-700">
              I have read, understood, and agree to all the terms and conditions stated in this contract. 
              I understand that this digital signature is legally binding.
            </label>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            
            <button
              onClick={handleSignContract}
              disabled={signing || !signatureData.agreeToTerms}
              className="flex items-center px-6 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signing ? (
                'Signing...'
              ) : (
                <>
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Sign Contract
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractReview;
