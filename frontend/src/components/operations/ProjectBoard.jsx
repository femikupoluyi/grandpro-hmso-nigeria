import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  DollarSign,
  Clock,
  Flag,
  Building2,
  Wrench,
  Monitor,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  MoreVertical,
  ChevronRight,
  List,
  Grid3x3
} from 'lucide-react';

const ProjectBoard = ({ projects = [], onUpdateProject, onAddProject }) => {
  const [viewMode, setViewMode] = useState('board'); // board or list
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    type: 'expansion',
    hospital: '',
    priority: 'medium',
    status: 'planning',
    budget: 0,
    startDate: '',
    endDate: ''
  });

  const statuses = [
    { id: 'planning', label: 'Planning', color: 'bg-blue-500' },
    { id: 'active', label: 'Active', color: 'bg-green-500' },
    { id: 'on_hold', label: 'On Hold', color: 'bg-yellow-500' },
    { id: 'completed', label: 'Completed', color: 'bg-gray-500' }
  ];

  const priorities = [
    { id: 'critical', label: 'Critical', color: 'text-red-500' },
    { id: 'high', label: 'High', color: 'text-orange-500' },
    { id: 'medium', label: 'Medium', color: 'text-yellow-500' },
    { id: 'low', label: 'Low', color: 'text-green-500' }
  ];

  const projectTypes = [
    { id: 'expansion', label: 'Expansion', icon: TrendingUp },
    { id: 'renovation', label: 'Renovation', icon: Wrench },
    { id: 'it_upgrade', label: 'IT Upgrade', icon: Monitor },
    { id: 'equipment', label: 'Equipment', icon: Building2 }
  ];

  const getTypeIcon = (type) => {
    const projectType = projectTypes.find(t => t.id === type);
    return projectType ? projectType.icon : Building2;
  };

  const getPriorityColor = (priority) => {
    const p = priorities.find(pr => pr.id === priority);
    return p ? p.color : 'text-gray-500';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getBudgetStatus = (spent, budget) => {
    const percentage = (spent / budget) * 100;
    if (percentage > 90) return { color: 'text-red-500', label: 'Over Budget Risk' };
    if (percentage > 75) return { color: 'text-yellow-500', label: 'Budget Warning' };
    return { color: 'text-green-500', label: 'On Track' };
  };

  const calculateDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    if (filterStatus !== 'all' && project.status !== filterStatus) return false;
    if (filterPriority !== 'all' && project.priority !== filterPriority) return false;
    return true;
  });

  // Group projects by status for board view
  const projectsByStatus = statuses.reduce((acc, status) => {
    acc[status.id] = filteredProjects.filter(p => p.status === status.id);
    return acc;
  }, {});

  const handleAddProject = () => {
    if (newProject.title && newProject.hospital && newProject.budget) {
      onAddProject(newProject);
      setNewProject({
        title: '',
        description: '',
        type: 'expansion',
        hospital: '',
        priority: 'medium',
        status: 'planning',
        budget: 0,
        startDate: '',
        endDate: ''
      });
      setShowAddModal(false);
    }
  };

  const ProjectCard = ({ project, compact = false }) => {
    const Icon = getTypeIcon(project.type);
    const daysRemaining = calculateDaysRemaining(project.endDate);
    const budgetStatus = getBudgetStatus(project.spent, project.budget);

    return (
      <div 
        className={`bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer ${
          compact ? '' : 'space-y-3'
        }`}
        onClick={() => !compact && setSelectedProject(project)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start space-x-2">
            <Icon className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <h4 className="font-semibold text-sm">{project.title}</h4>
              <p className="text-xs text-gray-400">{project.hospital}</p>
            </div>
          </div>
          <Flag className={`w-4 h-4 ${getPriorityColor(project.priority)}`} />
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${getProgressColor(project.progress)}`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Budget */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Budget</span>
          <span className={budgetStatus.color}>
            {formatCurrency(project.spent)} / {formatCurrency(project.budget)}
          </span>
        </div>

        {/* Timeline */}
        {daysRemaining !== null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Timeline</span>
            <span className={daysRemaining < 0 ? 'text-red-500' : 
              daysRemaining < 30 ? 'text-yellow-500' : 'text-gray-300'}>
              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` :
               daysRemaining === 0 ? 'Due today' :
               `${daysRemaining} days remaining`}
            </span>
          </div>
        )}

        {/* Actions */}
        {!compact && (
          <div className="flex space-x-2 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newStatus = project.status === 'active' ? 'on_hold' : 
                                 project.status === 'on_hold' ? 'active' : 
                                 project.status;
                onUpdateProject(project.id, { status: newStatus });
              }}
              className="flex-1 px-2 py-1 bg-gray-700 text-xs rounded hover:bg-gray-600 transition-colors"
            >
              {project.status === 'active' ? 'Pause' : 
               project.status === 'on_hold' ? 'Resume' : 
               'Update'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProject(project);
              }}
              className="px-2 py-1 bg-gray-700 text-xs rounded hover:bg-gray-600 transition-colors"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Project Management</h2>
          
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-700 rounded">
              <button
                onClick={() => setViewMode('board')}
                className={`p-2 ${viewMode === 'board' ? 'bg-blue-600' : ''} rounded-l transition-colors`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600' : ''} rounded-r transition-colors`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Add Project Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1 bg-gray-700 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1 bg-gray-700 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            {priorities.map(priority => (
              <option key={priority.id} value={priority.id}>{priority.label}</option>
            ))}
          </select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">{projects.length}</p>
            <p className="text-xs text-gray-400">Total Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">
              {projects.filter(p => p.status === 'active').length}
            </p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-500">
              {projects.filter(p => p.priority === 'critical' || p.priority === 'high').length}
            </p>
            <p className="text-xs text-gray-400">High Priority</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {formatCurrency(projects.reduce((sum, p) => sum + p.budget, 0))}
            </p>
            <p className="text-xs text-gray-400">Total Budget</p>
          </div>
        </div>
      </div>

      {/* Projects Display */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {statuses.map(status => (
            <div key={status.id} className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${status.color}`} />
                  <span>{status.label}</span>
                </h3>
                <span className="text-sm text-gray-400">
                  {projectsByStatus[status.id].length}
                </span>
              </div>
              
              <div className="space-y-3">
                {projectsByStatus[status.id].map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>

              {projectsByStatus[status.id].length === 0 && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 border-dashed text-center text-gray-500">
                  No projects
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Hospital
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Timeline
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredProjects.map(project => {
                const Icon = getTypeIcon(project.type);
                const daysRemaining = calculateDaysRemaining(project.endDate);
                const budgetStatus = getBudgetStatus(project.spent, project.budget);

                return (
                  <tr key={project.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">{project.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {project.hospital}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        statuses.find(s => s.id === project.status).color
                      } bg-opacity-20`}>
                        {statuses.find(s => s.id === project.status).label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${getPriorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{project.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProgressColor(project.progress)}`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm">{formatCurrency(project.spent)}</div>
                        <div className="text-xs text-gray-400">
                          of {formatCurrency(project.budget)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {daysRemaining !== null ? (
                        <span className={daysRemaining < 0 ? 'text-red-500' : 
                          daysRemaining < 30 ? 'text-yellow-500' : 'text-gray-300'}>
                          {daysRemaining < 0 ? 'Overdue' :
                           daysRemaining === 0 ? 'Due today' :
                           `${daysRemaining} days`}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedProject(project)}
                        className="text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Add New Project</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Project Title</label>
                <input
                  type="text"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type</label>
                  <select
                    value={newProject.type}
                    onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {projectTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Priority</label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  >
                    {priorities.map(priority => (
                      <option key={priority.id} value={priority.id}>{priority.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Hospital</label>
                <input
                  type="text"
                  value={newProject.hospital}
                  onChange={(e) => setNewProject({ ...newProject, hospital: e.target.value })}
                  placeholder="e.g., Lagos General Hospital"
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Budget (₦)</label>
                <input
                  type="number"
                  value={newProject.budget}
                  onChange={(e) => setNewProject({ ...newProject, budget: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProject}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">{selectedProject.title}</h3>
                <p className="text-gray-400">{selectedProject.hospital}</p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Project Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded p-4">
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <p className="font-semibold">
                    {statuses.find(s => s.id === selectedProject.status).label}
                  </p>
                </div>
                <div className="bg-gray-900 rounded p-4">
                  <p className="text-sm text-gray-400 mb-1">Priority</p>
                  <p className={`font-semibold ${getPriorityColor(selectedProject.priority)}`}>
                    {selectedProject.priority}
                  </p>
                </div>
                <div className="bg-gray-900 rounded p-4">
                  <p className="text-sm text-gray-400 mb-1">Type</p>
                  <p className="font-semibold">
                    {projectTypes.find(t => t.id === selectedProject.type).label}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedProject.description && (
                <div className="bg-gray-900 rounded p-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Description</h4>
                  <p className="text-gray-300">{selectedProject.description}</p>
                </div>
              )}

              {/* Progress */}
              <div className="bg-gray-900 rounded p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Progress</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Overall Progress</span>
                    <span className="font-semibold">{selectedProject.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${getProgressColor(selectedProject.progress)}`}
                      style={{ width: `${selectedProject.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="bg-gray-900 rounded p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Budget</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Budget</p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(selectedProject.budget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Spent</p>
                    <p className="text-xl font-semibold text-yellow-500">
                      {formatCurrency(selectedProject.spent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-xl font-semibold text-green-500">
                      {formatCurrency(selectedProject.budget - selectedProject.spent)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-gray-900 rounded p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Timeline</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-semibold">{formatDate(selectedProject.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-semibold">{formatDate(selectedProject.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Days Remaining</p>
                    <p className={`font-semibold ${
                      calculateDaysRemaining(selectedProject.endDate) < 30 
                        ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {calculateDaysRemaining(selectedProject.endDate) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    const newStatus = selectedProject.status === 'active' ? 'on_hold' : 
                                     selectedProject.status === 'on_hold' ? 'active' : 
                                     selectedProject.status;
                    onUpdateProject(selectedProject.id, { status: newStatus });
                    setSelectedProject(null);
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  {selectedProject.status === 'active' ? 'Pause Project' : 
                   selectedProject.status === 'on_hold' ? 'Resume Project' : 
                   'Update Status'}
                </button>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBoard;
