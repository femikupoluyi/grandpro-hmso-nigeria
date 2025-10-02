import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  Heart,
  Bed
} from 'lucide-react';
import RealTimeChart from './RealTimeChart';

const HospitalPerformanceCard = ({ hospital, expanded: initialExpanded = false, onAlert }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [selectedMetric, setSelectedMetric] = useState('occupancy');

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'alert':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getOccupancyColor = (occupancy) => {
    if (occupancy >= 95) return 'text-red-500';
    if (occupancy >= 85) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatCurrency = (amount) => {
    return `₦${(amount / 1000000).toFixed(2)}M`;
  };

  const getTrend = (current, average = 75) => {
    const diff = ((current - average) / average * 100).toFixed(1);
    return {
      value: diff,
      direction: current > average ? 'up' : 'down',
      color: current > average ? 'text-green-500' : 'text-red-500'
    };
  };

  const metrics = {
    occupancy: {
      label: 'Bed Occupancy',
      data: hospital.trends.occupancy,
      color: '#3B82F6',
      icon: Bed
    },
    revenue: {
      label: 'Revenue',
      data: hospital.trends.revenue.map(r => ({ ...r, value: r.value / 1000000 })),
      color: '#10B981',
      icon: DollarSign
    },
    patients: {
      label: 'New Patients',
      data: hospital.trends.patients,
      color: '#EF4444',
      icon: Heart
    },
    staff: {
      label: 'Staff Present',
      data: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        value: hospital.staffPresent + Math.floor((Math.random() - 0.5) * 10)
      })),
      color: '#8B5CF6',
      icon: Users
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(hospital.status)}`} />
            <div>
              <h3 className="font-semibold text-lg">{hospital.name}</h3>
              <p className="text-sm text-gray-400">{hospital.location}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {hospital.criticalAlerts > 0 && (
              <div className="flex items-center space-x-1 text-red-500">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-semibold">{hospital.criticalAlerts}</span>
              </div>
            )}
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <p className="text-sm text-gray-400">Occupancy</p>
            <p className={`text-2xl font-bold ${getOccupancyColor(hospital.occupancy)}`}>
              {hospital.occupancy}%
            </p>
            <div className={`flex items-center justify-center text-xs ${getTrend(hospital.occupancy).color}`}>
              {getTrend(hospital.occupancy).direction === 'up' ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              <span>{Math.abs(getTrend(hospital.occupancy).value)}%</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">New Patients</p>
            <p className="text-2xl font-bold">{hospital.newPatients}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">Revenue</p>
            <p className="text-2xl font-bold text-green-500">
              {formatCurrency(hospital.revenue)}
            </p>
            <p className="text-xs text-gray-500">Today</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">Staff</p>
            <p className="text-2xl font-bold">
              {hospital.staffPresent}/{hospital.totalStaff}
            </p>
            <p className="text-xs text-gray-500">
              {((hospital.staffPresent / hospital.totalStaff) * 100).toFixed(0)}% present
            </p>
          </div>
        </div>

        {/* Mini Chart */}
        <div className="mt-4">
          <RealTimeChart
            data={hospital.trends.occupancy.slice(-12)}
            type="line"
            height={60}
            color="#3B82F6"
            animate={false}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-700 p-4">
          {/* Metric Selector */}
          <div className="flex space-x-2 mb-4">
            {Object.entries(metrics).map(([key, metric]) => (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
                  selectedMetric === key
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <metric.icon className="w-4 h-4" />
                <span className="text-sm">{metric.label}</span>
              </button>
            ))}
          </div>

          {/* Selected Metric Chart */}
          <div className="bg-gray-900 rounded p-4">
            <h4 className="text-sm font-medium text-gray-400 mb-3">
              24-Hour {metrics[selectedMetric].label} Trend
            </h4>
            <RealTimeChart
              data={metrics[selectedMetric].data}
              type={selectedMetric === 'patients' ? 'bar' : 'line'}
              height={150}
              color={metrics[selectedMetric].color}
              showGrid={true}
            />
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-gray-900 rounded p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Staff Operations</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Doctors</span>
                  <span className="text-sm">
                    {Math.floor(hospital.staffPresent * 0.15)}/{Math.floor(hospital.totalStaff * 0.15)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Nurses</span>
                  <span className="text-sm">
                    {Math.floor(hospital.staffPresent * 0.45)}/{Math.floor(hospital.totalStaff * 0.45)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Support Staff</span>
                  <span className="text-sm">
                    {Math.floor(hospital.staffPresent * 0.4)}/{Math.floor(hospital.totalStaff * 0.4)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Department Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Emergency</span>
                  <span className="px-2 py-1 bg-green-900 text-green-400 text-xs rounded">
                    Operational
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">ICU</span>
                  <span className="px-2 py-1 bg-yellow-900 text-yellow-400 text-xs rounded">
                    High Load
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Surgery</span>
                  <span className="px-2 py-1 bg-green-900 text-green-400 text-xs rounded">
                    Available
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Inventory Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Critical Drugs</span>
                  <span className="text-sm text-green-400">Adequate</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Medical Supplies</span>
                  <span className="text-sm text-yellow-400">Low (2 items)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Equipment</span>
                  <span className="text-sm text-green-400">Functional</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Financial Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Cash Payments</span>
                  <span className="text-sm">{formatCurrency(hospital.revenue * 0.4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Insurance</span>
                  <span className="text-sm">{formatCurrency(hospital.revenue * 0.35)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">NHIS/HMO</span>
                  <span className="text-sm">{formatCurrency(hospital.revenue * 0.25)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-4">
            <button
              onClick={() => onAlert && onAlert(`Manual check requested for ${hospital.name}`)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
            >
              Request Check
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm">
              View Details
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm">
              Generate Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalPerformanceCard;
