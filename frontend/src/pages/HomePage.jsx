import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRightIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  GlobeIcon,
  LightningBoltIcon
} from '@heroicons/react/outline';

const HomePage = () => {
  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Secure & Compliant',
      description: 'HIPAA/GDPR compliant with end-to-end encryption for all sensitive data'
    },
    {
      icon: UserGroupIcon,
      title: 'Multi-Hospital Support',
      description: 'Manage multiple hospitals from a single centralized platform'
    },
    {
      icon: ChartBarIcon,
      title: 'Real-time Analytics',
      description: 'Monitor performance, patient flow, and revenue in real-time'
    },
    {
      icon: CogIcon,
      title: 'Automated Workflows',
      description: 'Streamline operations with intelligent automation'
    },
    {
      icon: GlobeIcon,
      title: 'Nigerian Context',
      description: 'Built specifically for Nigerian healthcare ecosystem'
    },
    {
      icon: LightningBoltIcon,
      title: 'Fast Onboarding',
      description: 'Get your hospital up and running in days, not months'
    }
  ];

  const stats = [
    { label: 'Hospitals Onboarded', value: '150+' },
    { label: 'Patients Served', value: '500K+' },
    { label: 'States Covered', value: '36' },
    { label: 'Uptime', value: '99.9%' }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-2xl p-12 mb-12">
        <div className="max-w-4xl">
          <h1 className="text-5xl font-bold mb-6">
            Welcome to GrandPro HMSO
          </h1>
          <p className="text-xl mb-8 text-primary-100">
            Transform your hospital operations with Nigeria's leading healthcare management platform. 
            Join the digital revolution in healthcare delivery.
          </p>
          <div className="flex space-x-4">
            <Link
              to="/apply"
              className="inline-flex items-center px-6 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
            >
              Start Application
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/progress"
              className="inline-flex items-center px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-900 transition-colors duration-200"
            >
              Check Application Status
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">{stat.value}</div>
            <div className="text-gray-600">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Why Choose GrandPro HMSO?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="ml-4 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Onboarding Process */}
      <section className="bg-gray-100 rounded-2xl p-8 mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Simple Onboarding Process
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Apply', desc: 'Submit your hospital application online' },
            { step: '2', title: 'Verify', desc: 'Upload required documents for verification' },
            { step: '3', title: 'Contract', desc: 'Review and sign digital contract' },
            { step: '4', title: 'Launch', desc: 'Get trained and go live' }
          ].map((item, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
              {index < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                  <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white rounded-2xl p-12 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Transform Your Hospital?
        </h2>
        <p className="text-xl mb-8 text-primary-100">
          Join hundreds of Nigerian hospitals already using GrandPro HMSO
        </p>
        <Link
          to="/apply"
          className="inline-flex items-center px-8 py-4 bg-white text-primary-700 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors duration-200"
        >
          Start Your Application Now
          <ArrowRightIcon className="ml-3 h-6 w-6" />
        </Link>
      </section>
    </div>
  );
};

export default HomePage;
