import React, { useState, useEffect, useCallback } from 'react';
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
  Bell,
  Calendar,
  Package,
  Heart,
  Clock,
  AlertCircle
} from 'lucide-react';
import RealTimeChart from '../../components/operations/RealTimeChart';
import HospitalPerformanceCard from '../../components/operations/HospitalPerformanceCard';
import AlertPanel from '../../components/operations/AlertPanel';
import ProjectBoard from '../../components/operations/ProjectBoard';

const CommandCentre = () => {
  const [selectedView, setSelectedView] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [hospitals, setHospitals] = useState([]);
  const [aggregateMetrics, setAggregateMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Nigerian hospital sample data
  const sampleHospitals = [
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
      criticalAlerts: 2,
      trends: {
        occupancy: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 75 + Math.random() * 20
        })),
        revenue: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 2800000 + Math.random() * 500000
        })),
        patients: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 30 + Math.floor(Math.random() * 20)
        }))
      }
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
      criticalAlerts: 0,
      trends: {
        occupancy: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 65 + Math.random() * 15
        })),
        revenue: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 2500000 + Math.random() * 400000
        })),
        patients: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 25 + Math.floor(Math.random() * 20)
        }))
      }
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
      criticalAlerts: 3,
      trends: {
        occupancy: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 88 + Math.random() * 10
        })),
        revenue: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 3800000 + Math.random() * 400000
        })),
        patients: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 45 + Math.floor(Math.random() * 20)
        }))
      }
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
      criticalAlerts: 1,
      trends: {
        occupancy: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 60 + Math.random() * 15
        })),
        revenue: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 2000000 + Math.random() * 500000
        })),
        patients: Array.from({length: 24}, (_, i) => ({
          hour: i,
          value: 28 + Math.floor(Math.random() * 15)
        }))
      }
    }
  ];

  // Sample alerts
  const sampleAlerts = [
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
    },
    {
      id: 3,
      severity: 'critical',
      type: 'staff',
      hospital: 'Port Harcourt Specialist Hospital',
      message: 'Emergency department understaffed - 3 nurses short',
      timestamp: new Date(Date.now() - 20 * 60 * 1000),
      status: 'active'
    },
    {
      id: 4,
      severity: 'info',
      type: 'revenue',
      hospital: 'Abuja Central Medical Centre',
      message: 'Daily revenue target achieved (₦2.89M)',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'resolved'
    },
    {
      id: 5,
      severity: 'warning',
      type: 'equipment',
      hospital: 'Kano Teaching Hospital',
      message: 'X-Ray machine scheduled maintenance due in 2 days',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      status: 'acknowledged'
    }
  ];

  // Sample projects
  const sampleProjects = [
    {
      id: 1,
      title: 'Lagos General Hospital ICU Expansion',
      type: 'expansion',
      status: 'active',
      priority: 'high',
      progress: 65,
      startDate: '2024-09-01',
      endDate: '2024-12-31',
      budget: 150000000,
      spent: 97500000,
      hospital: 'Lagos General Hospital',
      description: 'Adding 20 new ICU beds with modern equipment'
    },
    {
      id: 2,
      title: 'EMR System Upgrade - All Hospitals',
      type: 'it_upgrade',
      status: 'planning',
      priority: 'critical',
      progress: 25,
      startDate: '2024-10-15',
      endDate: '2025-01-15',
      budget: 50000000,
      spent: 12500000,
      hospital: 'All Hospitals',
      description: 'Upgrading to latest EMR version with AI capabilities'
    },
    {
      id: 3,
      title: 'Port Harcourt Emergency Wing Renovation',
      type: 'renovation',
      status: 'active',
      priority: 'medium',
      progress: 40,
      startDate: '2024-08-15',
      endDate: '2024-11-30',
      budget: 75000000,
      spent: 30000000,
      hospital: 'Port Harcourt Specialist Hospital',
      description: 'Complete renovation of emergency department'
    }
  ];

  // Calculate aggregate metrics
  const calculateAggregates = useCallback(() => {
    const totals = hospitals.reduce((acc, hospital) => {
      acc.totalPatients += hospital.newPatients;
      acc.totalRevenue += hospital.revenue;
      acc.totalStaff += hospital.totalStaff;
      acc.presentStaff += hospital.staffPresent;
      acc.totalBeds += 100; // Assuming 100 beds per hospital
      acc.occupiedBeds += Math.floor(100 * hospital.occupancy / 100);
      acc.criticalAlerts += hospital.criticalAlerts;
      return acc;
    }, {
      totalPatients: 0,
      totalRevenue: 0,
      totalStaff: 0,
      presentStaff: 0,
      totalBeds: 0,
      occupiedBeds: 0,
      criticalAlerts: 0
    });

    setAggregateMetrics({
      ...totals,
      avgOccupancy: hospitals.length ? 
        (totals.occupiedBeds / totals.totalBeds * 100).toFixed(1) : 0,
      staffAttendance: hospitals.length ? 
        (totals.presentStaff / totals.totalStaff * 100).toFixed(1) : 0,
      activeHospitals: hospitals.filter(h => h.status === 'operational').length,
      totalHospitals: hospitals.length
    });
  }, [hospitals]);

  // Initialize data
  useEffect(() => {
    setHospitals(sampleHospitals);
    setAlerts(sampleAlerts);
    setProjects(sampleProjects);
    setLoading(false);
  }, []);

  // Calculate aggregates when hospitals change
  useEffect(() => {
    if (hospitals.length > 0) {
      calculateAggregates();
    }
  }, [hospitals, calculateAggregates]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate data refresh
      const updatedHospitals = hospitals.map(hospital => ({
        ...hospital,
        occupancy: Math.min(100, Math.max(50, hospital.occupancy + (Math.random() - 0.5) * 5)),
        newPatients: Math.max(0, hospital.newPatients + Math.floor((Math.random() - 0.5) * 10)),
        revenue: hospital.revenue + (Math.random() - 0.5) * 100000,
        staffPresent: Math.min(hospital.totalStaff, 
          Math.max(hospital.totalStaff * 0.7, hospital.staffPresent + Math.floor((Math.random() - 0.5) * 5)))
      }));
      
      setHospitals(updatedHospitals);
      setLastUpdated(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, hospitals]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Command Centre...</p>
        </div>
      </div>
    );
  }

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
              
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Auto-refresh</span>
                </label>
                
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="bg-gray-700 rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                )}
              </div>

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
              { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
              { id: 'projects', label: 'Projects', icon: Calendar }
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
        {/* Overview View */}
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
                  {aggregateMetrics.presentStaff} / {aggregateMetrics.totalStaff} present
                </div>
              </div>
            </div>

            {/* Hospital Status Grid */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Hospital Performance</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {hospitals.map(hospital => (
                  <HospitalPerformanceCard
                    key={hospital.id}
                    hospital={hospital}
                    onAlert={(message) => {
                      const newAlert = {
                        id: Date.now(),
                        severity: 'info',
                        type: 'manual',
                        hospital: hospital.name,
                        message,
                        timestamp: new Date(),
                        status: 'active'
                      };
                      setAlerts([newAlert, ...alerts]);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Recent Alerts */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
              <AlertPanel 
                alerts={alerts.filter(a => a.status === 'active').slice(0, 5)}
                onResolve={(alertId) => {
                  setAlerts(alerts.map(a => 
                    a.id === alertId ? { ...a, status: 'resolved' } : a
                  ));
                }}
                onViewAll={() => setSelectedView('alerts')}
              />
            </div>
          </div>
        )}

        {/* Hospitals View */}
        {selectedView === 'hospitals' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hospitals.map(hospital => (
              <HospitalPerformanceCard
                key={hospital.id}
                hospital={hospital}
                expanded={true}
                onAlert={(message) => {
                  const newAlert = {
                    id: Date.now(),
                    severity: 'info',
                    type: 'manual',
                    hospital: hospital.name,
                    message,
                    timestamp: new Date(),
                    status: 'active'
                  };
                  setAlerts([newAlert, ...alerts]);
                }}
              />
            ))}
          </div>
        )}

        {/* Alerts View */}
        {selectedView === 'alerts' && (
          <AlertPanel 
            alerts={alerts}
            showFilters={true}
            onResolve={(alertId) => {
              setAlerts(alerts.map(a => 
                a.id === alertId ? { ...a, status: 'resolved' } : a
              ));
            }}
            onAcknowledge={(alertId) => {
              setAlerts(alerts.map(a => 
                a.id === alertId ? { ...a, status: 'acknowledged' } : a
              ));
            }}
          />
        )}

        {/* Projects View */}
        {selectedView === 'projects' && (
          <ProjectBoard 
            projects={projects}
            onUpdateProject={(projectId, updates) => {
              setProjects(projects.map(p => 
                p.id === projectId ? { ...p, ...updates } : p
              ));
            }}
            onAddProject={(newProject) => {
              setProjects([...projects, { 
                ...newProject, 
                id: Date.now(),
                progress: 0,
                spent: 0
              }]);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default CommandCentre;
