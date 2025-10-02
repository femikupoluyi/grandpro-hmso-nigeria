import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  CloudUploadIcon, 
  ChartBarIcon,
  DocumentCheckIcon,
  DesktopComputerIcon
} from '@heroicons/react/outline';

const Layout = ({ children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Apply', href: '/apply', icon: DocumentTextIcon },
    { name: 'Documents', href: '/upload-documents', icon: CloudUploadIcon },
    { name: 'Progress', href: '/progress', icon: ChartBarIcon },
    { name: 'Contract', href: '/contract', icon: DocumentCheckIcon },
    { name: 'Command Centre', href: '/command-centre', icon: DesktopComputerIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">G</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">GrandPro HMSO</h1>
                  <p className="text-xs text-gray-500">Hospital Management Platform</p>
                </div>
              </Link>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-1`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <span className="font-medium">🇳🇬 Nigeria</span> | 
                <span className="ml-1">NGN</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About GrandPro</h3>
              <p className="text-gray-300 text-sm">
                Leading hospital management platform in Nigeria, providing comprehensive solutions for healthcare institutions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/apply" className="text-gray-300 hover:text-white">Apply Now</Link></li>
                <li><Link to="/progress" className="text-gray-300 hover:text-white">Check Status</Link></li>
                <li><a href="#" className="text-gray-300 hover:text-white">Support</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>📧 info@grandprohmso.ng</li>
                <li>📞 +234 800 123 4567</li>
                <li>📍 Lagos, Nigeria</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Operating Hours</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>Monday - Friday: 9:00 AM - 6:00 PM</li>
                <li>Saturday: 10:00 AM - 2:00 PM</li>
                <li>Sunday: Closed</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
            <p>&copy; 2024 GrandPro HMSO. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
