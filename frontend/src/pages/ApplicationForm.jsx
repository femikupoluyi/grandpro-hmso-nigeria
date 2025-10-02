import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { onboardingAPI } from '../services/api';
import useApplicationStore from '../store/useApplicationStore';
import { nigerianStates, getLGAsByState } from '../data/nigerianStates';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckIcon 
} from '@heroicons/react/outline';

// Validation schemas for each step
const step1Schema = yup.object({
  hospitalName: yup.string().required('Hospital name is required'),
  hospitalType: yup.string().required('Hospital type is required'),
  bedCapacity: yup.number().min(1, 'Bed capacity must be at least 1').required('Bed capacity is required'),
  yearEstablished: yup.number().min(1900).max(new Date().getFullYear()).required('Year established is required'),
  registrationNumber: yup.string().required('Registration number is required'),
  taxId: yup.string().required('Tax ID is required'),
});

const step2Schema = yup.object({
  state: yup.string().required('State is required'),
  lga: yup.string().required('LGA is required'),
  city: yup.string().required('City is required'),
  address: yup.string().required('Address is required'),
  postalCode: yup.string(),
  phonePrimary: yup.string()
    .matches(/^\+234\d{10}$/, 'Phone must be in format +234XXXXXXXXXX')
    .required('Primary phone is required'),
  phoneSecondary: yup.string()
    .matches(/^\+234\d{10}$|^$/, 'Phone must be in format +234XXXXXXXXXX'),
  email: yup.string().email('Invalid email').required('Email is required'),
  website: yup.string().url('Invalid URL format'),
});

const step3Schema = yup.object({
  ownerFirstName: yup.string().required('First name is required'),
  ownerLastName: yup.string().required('Last name is required'),
  ownerMiddleName: yup.string(),
  ownerTitle: yup.string(),
  ownerNin: yup.string().length(11, 'NIN must be 11 digits'),
  ownerPhone: yup.string()
    .matches(/^\+234\d{10}$/, 'Phone must be in format +234XXXXXXXXXX')
    .required('Owner phone is required'),
  ownerEmail: yup.string().email('Invalid email').required('Owner email is required'),
});

const ApplicationForm = () => {
  const navigate = useNavigate();
  const { setApplicationData, setApplicationInfo } = useApplicationStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedState, setSelectedState] = useState('');
  const [lgas, setLgas] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { number: 1, title: 'Hospital Information', schema: step1Schema },
    { number: 2, title: 'Location & Contact', schema: step2Schema },
    { number: 3, title: 'Owner Information', schema: step3Schema },
    { number: 4, title: 'Services & Facilities', schema: null },
    { number: 5, title: 'Financial Information', schema: null },
  ];

  const currentSchema = steps[currentStep - 1].schema || yup.object({});

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(currentSchema),
    mode: 'onChange'
  });

  const watchState = watch('state');

  React.useEffect(() => {
    if (watchState) {
      const stateLgas = getLGAsByState(watchState);
      setLgas(stateLgas);
      setSelectedState(watchState);
    }
  }, [watchState]);

  const nextStep = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data) => {
    if (currentStep < steps.length) {
      nextStep();
      return;
    }

    setIsSubmitting(true);
    try {
      // Format phone numbers
      if (data.phonePrimary && !data.phonePrimary.startsWith('+234')) {
        data.phonePrimary = '+234' + data.phonePrimary.replace(/^0/, '');
      }
      if (data.phoneSecondary && !data.phoneSecondary.startsWith('+234')) {
        data.phoneSecondary = '+234' + data.phoneSecondary.replace(/^0/, '');
      }
      if (data.ownerPhone && !data.ownerPhone.startsWith('+234')) {
        data.ownerPhone = '+234' + data.ownerPhone.replace(/^0/, '');
      }

      const response = await onboardingAPI.submitApplication(data);
      
      setApplicationData(data);
      setApplicationInfo({
        applicationNumber: response.applicationNumber,
        applicationId: response.applicationId,
        status: 'SUBMITTED'
      });

      toast.success('Application submitted successfully!');
      navigate(`/upload-documents/${response.applicationId}`);
    } catch (error) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hospitalTypes = [
    'General Hospital',
    'Specialist Hospital',
    'Teaching Hospital',
    'Private Clinic',
    'Medical Centre',
    'Diagnostic Centre',
    'Maternity Home',
    'Nursing Home'
  ];

  const services = [
    'Emergency Services',
    'Outpatient Services',
    'Inpatient Services',
    'Surgery',
    'Maternity Services',
    'Pediatrics',
    'Internal Medicine',
    'Radiology',
    'Laboratory Services',
    'Pharmacy',
    'Dental Services',
    'Ophthalmology',
    'Orthopedics',
    'Cardiology',
    'Neurology',
    'Oncology'
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  currentStep > step.number 
                    ? 'bg-green-500 text-white' 
                    : currentStep === step.number 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {currentStep > step.number ? (
                    <CheckIcon className="w-6 h-6" />
                  ) : (
                    step.number
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-20 h-1 mx-2 ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            {steps[currentStep - 1].title}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Hospital Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Name *
                </label>
                <input
                  {...register('hospitalName')}
                  className="input-field"
                  placeholder="Enter hospital name"
                />
                {errors.hospitalName && (
                  <p className="mt-1 text-sm text-red-600">{errors.hospitalName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Type *
                </label>
                <select {...register('hospitalType')} className="input-field">
                  <option value="">Select hospital type</option>
                  {hospitalTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.hospitalType && (
                  <p className="mt-1 text-sm text-red-600">{errors.hospitalType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bed Capacity *
                  </label>
                  <input
                    type="number"
                    {...register('bedCapacity', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="Number of beds"
                  />
                  {errors.bedCapacity && (
                    <p className="mt-1 text-sm text-red-600">{errors.bedCapacity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Established *
                  </label>
                  <input
                    type="number"
                    {...register('yearEstablished', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="YYYY"
                  />
                  {errors.yearEstablished && (
                    <p className="mt-1 text-sm text-red-600">{errors.yearEstablished.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CAC Registration Number *
                  </label>
                  <input
                    {...register('registrationNumber')}
                    className="input-field"
                    placeholder="RC/BN Number"
                  />
                  {errors.registrationNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.registrationNumber.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID (TIN) *
                  </label>
                  <input
                    {...register('taxId')}
                    className="input-field"
                    placeholder="Tax Identification Number"
                  />
                  {errors.taxId && (
                    <p className="mt-1 text-sm text-red-600">{errors.taxId.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location & Contact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select {...register('state')} className="input-field">
                    <option value="">Select state</option>
                    {nigerianStates.map(state => (
                      <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local Government Area *
                  </label>
                  <select {...register('lga')} className="input-field" disabled={!selectedState}>
                    <option value="">Select LGA</option>
                    {lgas.map(lga => (
                      <option key={lga} value={lga}>{lga}</option>
                    ))}
                  </select>
                  {errors.lga && (
                    <p className="mt-1 text-sm text-red-600">{errors.lga.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    {...register('city')}
                    className="input-field"
                    placeholder="Enter city"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    {...register('postalCode')}
                    className="input-field"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <textarea
                  {...register('address')}
                  className="input-field"
                  rows="3"
                  placeholder="Enter full address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Phone *
                  </label>
                  <input
                    {...register('phonePrimary')}
                    className="input-field"
                    placeholder="+234XXXXXXXXXX"
                  />
                  {errors.phonePrimary && (
                    <p className="mt-1 text-sm text-red-600">{errors.phonePrimary.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Phone
                  </label>
                  <input
                    {...register('phoneSecondary')}
                    className="input-field"
                    placeholder="+234XXXXXXXXXX"
                  />
                  {errors.phoneSecondary && (
                    <p className="mt-1 text-sm text-red-600">{errors.phoneSecondary.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="input-field"
                    placeholder="hospital@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    {...register('website')}
                    className="input-field"
                    placeholder="https://www.example.com"
                  />
                  {errors.website && (
                    <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Owner Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <select {...register('ownerTitle')} className="input-field">
                    <option value="">Select</option>
                    <option value="Dr">Dr</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Prof">Prof</option>
                    <option value="Chief">Chief</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    {...register('ownerFirstName')}
                    className="input-field"
                    placeholder="First name"
                  />
                  {errors.ownerFirstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.ownerFirstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    {...register('ownerMiddleName')}
                    className="input-field"
                    placeholder="Middle name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  {...register('ownerLastName')}
                  className="input-field"
                  placeholder="Last name"
                />
                {errors.ownerLastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.ownerLastName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  National Identification Number (NIN)
                </label>
                <input
                  {...register('ownerNin')}
                  className="input-field"
                  placeholder="11 digit NIN"
                  maxLength="11"
                />
                {errors.ownerNin && (
                  <p className="mt-1 text-sm text-red-600">{errors.ownerNin.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Phone *
                  </label>
                  <input
                    {...register('ownerPhone')}
                    className="input-field"
                    placeholder="+234XXXXXXXXXX"
                  />
                  {errors.ownerPhone && (
                    <p className="mt-1 text-sm text-red-600">{errors.ownerPhone.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    {...register('ownerEmail')}
                    className="input-field"
                    placeholder="owner@example.com"
                  />
                  {errors.ownerEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.ownerEmail.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Services & Facilities */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Services Offered (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {services.map(service => (
                    <label key={service} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={service}
                        {...register('servicesOffered')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Available Facilities
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('hasEmergencyUnit')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Emergency Unit</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('hasIcu')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Intensive Care Unit (ICU)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('hasLaboratory')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Laboratory</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('hasPharmacy')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Pharmacy</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('hasRadiology')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Radiology/X-Ray</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specializations (comma-separated)
                </label>
                <textarea
                  {...register('specializations')}
                  className="input-field"
                  rows="3"
                  placeholder="e.g., Cardiology, Neurology, Orthopedics"
                />
              </div>
            </div>
          )}

          {/* Step 5: Financial Information */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Revenue (NGN)
                </label>
                <input
                  type="number"
                  {...register('annualRevenueNaira', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="Annual revenue in Naira"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Staff
                  </label>
                  <input
                    type="number"
                    {...register('numberOfStaff', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="Total number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Doctors
                  </label>
                  <input
                    type="number"
                    {...register('numberOfDoctors', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="Doctors count"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Nurses
                  </label>
                  <input
                    type="number"
                    {...register('numberOfNurses', { valueAsNumber: true })}
                    className="input-field"
                    placeholder="Nurses count"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Insurance Acceptance
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('acceptsNhis')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">National Health Insurance Scheme (NHIS)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register('acceptsHmo')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Health Maintenance Organizations (HMO)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50"
              >
                <ChevronLeftIcon className="h-5 w-5 mr-2" />
                Previous
              </button>
            )}
            
            <div className="ml-auto">
              {currentStep < steps.length ? (
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-6 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;
