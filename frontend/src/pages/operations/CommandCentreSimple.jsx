import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  DollarSign, 
  TrendingUp,
  Building2,
  RefreshCw,
  Settings,
  Monitor,
  Heart,
  Clock
} from 'lucide-react';

const CommandCentreSimple = () => {
  const [selectedView, setSelectedView] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [hospitals] = useState([
    {
      id: 1,
      name: 'Lagos General Hospital',
      location: 'Lagos Island',
      status: 'operational',
      occupancy: 87,
      newPatients: 42,
      revenue: 3250000,
      staffPresent: 145,
      totalStaff: 160,
      criticalAlerts: 2
    },
    {
      id: 2,
      name: 'Abuja Central Medical Centre',
      location: 'Garki District',
      status: 'operational',
      occupancy: 72,
      newPatients: 38,
      revenue: 2890000,
      staffPresent: 98,
      totalStaff: 110,
      criticalAlerts: 0
    },
    {
      id: 3,
      name: 'Port Harcourt Specialist Hospital',
      location: 'Old GRA',
      status: 'alert',
      occupancy: 95,
      newPatients: 58,
      revenue: 4120000,
      staffPresent: 110,
      totalStaff: 130,
      criticalAlerts: 3
    },
    {
      id: 4,
      name: 'Kano Teaching Hospital',
      location: 'Nassarawa',
      status: 'operational',
      occupancy: 68,
      newPatients: 35,
      revenue: 2450000,
      staffPresent: 85,
      totalStaff: 95,
      criticalAlerts: 1
    }
  ]);

  const [alerts] = useState([
    {
      id: 1,
      severity: 'critical',
      type: 'occupancy',
      hospital: 'Port Harcourt Specialist Hospital',
      message: 'Bed occupancy at 95% - Critical threshold exceeded',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      status: 'active'
    },
    {
      id: 2,
      severity: 'warning',
      type: 'inventory',
      hospital: 'Lagos General Hospital',
      message: 'Paracetamol stock below minimum threshold (85 units remaining)',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      status: 'active'
    }
  ]);

  const aggregateMetrics = {
    totalPatients: hospitals.reduce((sum, h) => sum + h.newPatients, 0),
    totalRevenue: hospitals.reduce((sum, h) => sum + h.revenue, 0),
    avgOccupancy: (hospitals.reduce((sum, h) => sum + h.occupancy, 0) / hospitals.length).toFixed(1),
    staffAttendance: ((hospitals.reduce((sum, h) => sum + h.staffPresent, 0) / 
                      hospitals.reduce((sum, h) => sum + h.totalStaff, 0)) * 100).toFixed(1),
    criticalAlerts: hospitals.reduce((sum, h) => sum + h.criticalAlerts, 0)
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Monitor className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold">GrandPro HMSO Command Centre</h1>
                <p className="text-sm text-gray-400">Real-time Operations Monitoring</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                Last updated: {formatTime(lastUpdated)}
              </div>
              
              <button 
                onClick={() => setLastUpdated(new Date())}
                className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-6 mt-4">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'hospitals', label: 'Hospitals', icon: Building2 },
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
                  selectedView === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'alerts' && aggregateMetrics.criticalAlerts > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-600 text-xs rounded-full">
                    {aggregateMetrics.criticalAlerts}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Heart className="w-8 h-8 text-red-500" />
                  <span className="text-2xl font-bold">{aggregateMetrics.totalPatients}</span>
                </div>
                <p className="text-gray-400 text-sm">New Patients Today</p>
                <div className="mt-2 text-green-500 text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+12% from yesterday</span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="w-8 h-8 text-blue-500" />
                  <span className="text-2xl font-bold">{aggregateMetrics.avgOccupancy}%</span>
                </div>
                <p className="text-gray-400 text-sm">Average Bed Occupancy</p>
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        aggregateMetrics.avgOccupancy > 90 ? 'bg-red-500' : 
                        aggregateMetrics.avgOccupancy > 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${aggregateMetrics.avgOccupancy}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 text-green-500" />
                  <span className="text-2xl font-bold">
                    {formatCurrency(aggregateMetrics.totalRevenue).split('NGN')[1]}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">Total Revenue Today</p>
                <div className="mt-2 text-green-500 text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>On track for monthly target</span>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-purple-500" />
                  <span className="text-2xl font-bold">{aggregateMetrics.staffAttendance}%</span>
                </div>
                <p className="text-gray-400 text-sm">Staff Attendance</p>
                <div className="mt-2 text-gray-400 text-sm">
                  438 / 495 present
                </div>
              </div>
            </div>

            {/* Hospital Status Grid */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Hospital Performance</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hospitals.map(hospital => (
                  <div key={hospital.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{hospital.name}</h3>
                        <p className="text-sm text-gray-400">{hospital.location}</p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        hospital.status === 'operational' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Occupancy</p>
                        <p className={`font-semibold ${
                          hospital.occupancy > 90 ? 'text-red-500' : 
                          hospital.occupancy > 75 ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {hospital.occupancy}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Patients</p>
                        <p className="font-semibold">{hospital.newPatients}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Revenue</p>
                        <p className="font-semibold text-green-500">
                          ₦{(hospital.revenue / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Staff</p>
                        <p className="font-semibold">
                          {hospital.staffPresent}/{hospital.totalStaff}
                        </p>
                      </div>
                    </div>

                    {hospital.criticalAlerts > 0 && (
                      <div className="mt-3 flex items-center text-red-500 text-sm">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        <span>{hospital.criticalAlerts} critical alerts</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Alerts */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className={`bg-gray-800 rounded-lg p-4 border ${
                    alert.severity === 'critical' ? 'border-red-800' : 'border-yellow-800'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertTriangle className={`w-5 h-5 ${
                            alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                          }`} />
                          <span className="font-semibold">{alert.hospital}</span>
                        </div>
                        <p className="text-gray-300">{alert.message}</p>
                        <p className="text-sm text-gray-400 mt-2">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {Math.floor((Date.now() - alert.timestamp) / 60000)} minutes ago
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600">
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedView === 'hospitals' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hospitals.map(hospital => (
              <div key={hospital.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{hospital.name}</h3>
                    <p className="text-gray-400">{hospital.location}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm ${
                    hospital.status === 'operational' 
                      ? 'bg-green-900 text-green-400' 
                      : 'bg-red-900 text-red-400'
                  }`}>
                    {hospital.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Bed Occupancy</span>
                    <div className="flex items-center">
                      <span className={`font-semibold mr-3 ${
                        hospital.occupancy > 90 ? 'text-red-500' : 
                        hospital.occupancy > 75 ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {hospital.occupancy}%
                      </span>
                      <div className="w-32 bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            hospital.occupancy > 90 ? 'bg-red-500' : 
                            hospital.occupancy > 75 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${hospital.occupancy}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">New Patients Today</span>
                    <span className="font-semibold">{hospital.newPatients}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Daily Revenue</span>
                    <span className="font-semibold text-green-500">
                      {formatCurrency(hospital.revenue)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Staff Attendance</span>
                    <span className="font-semibold">
                      {hospital.staffPresent}/{hospital.totalStaff} 
                      <span className="text-gray-400 ml-2">
                        ({((hospital.staffPresent / hospital.totalStaff) * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </div>

                  {hospital.criticalAlerts > 0 && (
                    <div className="pt-3 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-red-500 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {hospital.criticalAlerts} Critical Alerts
                        </span>
                        <button className="text-sm text-blue-500 hover:text-blue-400">
                          View Details →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedView === 'alerts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Active Alerts</h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
                  All
                </button>
                <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700">
                  Critical
                </button>
                <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700">
                  Warning
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {alerts.map(alert => (
                <div key={alert.id} className={`bg-gray-800 rounded-lg p-4 border ${
                  alert.severity === 'critical' ? 'border-red-800' : 'border-yellow-800'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <AlertTriangle className={`w-5 h-5 ${
                          alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                        <span className={`px-2 py-1 rounded text-xs ${
                          alert.severity === 'critical' 
                            ? 'bg-red-900 text-red-400' 
                            : 'bg-yellow-900 text-yellow-400'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="font-semibold">{alert.hospital}</span>
                      </div>
                      <p className="text-gray-300 mb-2">{alert.message}</p>
                      <p className="text-sm text-gray-400">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {Math.floor((Date.now() - alert.timestamp) / 60000)} minutes ago
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-yellow-600 rounded text-sm hover:bg-yellow-700">
                        Acknowledge
                      </button>
                      <button className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700">
                        Resolve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CommandCentreSimple;
