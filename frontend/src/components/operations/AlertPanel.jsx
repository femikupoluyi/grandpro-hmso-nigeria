import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  Filter,
  X,
  Bell,
  Activity,
  Users,
  Package,
  DollarSign,
  Wrench
} from 'lucide-react';

const AlertPanel = ({ 
  alerts = [], 
  showFilters = false, 
  onResolve, 
  onAcknowledge, 
  onViewAll 
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-900/20 border-red-800';
      case 'warning':
        return 'text-yellow-500 bg-yellow-900/20 border-yellow-800';
      case 'info':
        return 'text-blue-500 bg-blue-900/20 border-blue-800';
      default:
        return 'text-gray-500 bg-gray-900/20 border-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'occupancy':
        return <Activity className="w-4 h-4" />;
      case 'staff':
        return <Users className="w-4 h-4" />;
      case 'inventory':
        return <Package className="w-4 h-4" />;
      case 'revenue':
        return <DollarSign className="w-4 h-4" />;
      case 'equipment':
        return <Wrench className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded">
            Active
          </span>
        );
      case 'acknowledged':
        return (
          <span className="px-2 py-1 bg-yellow-900/50 text-yellow-400 text-xs rounded">
            Acknowledged
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded">
            Resolved
          </span>
        );
      default:
        return null;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
    if (selectedType !== 'all' && alert.type !== selectedType) return false;
    if (selectedStatus !== 'all' && alert.status !== selectedStatus) return false;
    if (searchTerm && !alert.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !alert.hospital.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Group alerts by severity for summary
  const alertSummary = {
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    warning: alerts.filter(a => a.severity === 'warning' && a.status === 'active').length,
    info: alerts.filter(a => a.severity === 'info' && a.status === 'active').length
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Alert Filters
            </h3>
            
            {/* Alert Summary */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-500">{alertSummary.critical}</span>
                <span className="text-xs text-gray-400">Critical</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-500">{alertSummary.warning}</span>
                <span className="text-xs text-gray-400">Warning</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-500">{alertSummary.info}</span>
                <span className="text-xs text-gray-400">Info</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search alerts..."
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="all">All Types</option>
                <option value="occupancy">Occupancy</option>
                <option value="staff">Staff</option>
                <option value="inventory">Inventory</option>
                <option value="revenue">Revenue</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Alert List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-400">No alerts matching the current filters</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-gray-800 rounded-lg p-4 border ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 ${getSeverityColor(alert.severity).split(' ')[0]}`}>
                    {getSeverityIcon(alert.severity)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-semibold">{alert.hospital}</span>
                      <div className="flex items-center space-x-2 text-gray-400">
                        {getTypeIcon(alert.type)}
                        <span className="text-sm capitalize">{alert.type}</span>
                      </div>
                      {getStatusBadge(alert.status)}
                    </div>
                    
                    <p className="text-gray-300 mb-2">{alert.message}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(alert.timestamp)}</span>
                      </div>
                      
                      {alert.status === 'active' && (
                        <div className="flex items-center space-x-2">
                          {onAcknowledge && (
                            <button
                              onClick={() => onAcknowledge(alert.id)}
                              className="text-yellow-500 hover:text-yellow-400 transition-colors"
                            >
                              Acknowledge
                            </button>
                          )}
                          {onResolve && (
                            <button
                              onClick={() => onResolve(alert.id)}
                              className="text-green-500 hover:text-green-400 transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {alert.status === 'resolved' && (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View All Button */}
      {!showFilters && onViewAll && filteredAlerts.length > 0 && (
        <div className="text-center">
          <button
            onClick={onViewAll}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
          >
            View All Alerts
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertPanel;
