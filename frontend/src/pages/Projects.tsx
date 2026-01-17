import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Building2,
  Calendar,
  Users,
  Leaf,
  Edit,
  Trash2,
  Archive,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Globe,
  Factory,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { EmptyProjects } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { projectsApi, calculationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface Project {
  id: string;
  name: string;
  description?: string;
  organization?: string;
  industry?: string;
  country?: string;
  region?: string;
  baselineYear: number;
  reportingYear: number;
  status: 'active' | 'draft' | 'archived';
  standards?: string[];
  createdAt: string;
  updatedAt: string;
  activityCount?: number;
  totalEmissions?: number;
  progress?: number;
}

const industryOptions = [
  { value: '', label: 'Select industry...' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'transportation', label: 'Transportation & Logistics' },
  { value: 'construction', label: 'Construction' },
  { value: 'technology', label: 'Technology' },
  { value: 'financial', label: 'Financial Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail & Consumer Goods' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'mining', label: 'Mining & Metals' },
  { value: 'chemical', label: 'Chemicals & Petrochemicals' },
  { value: 'other', label: 'Other' },
];

const countryOptions = [
  { value: '', label: 'Select country...' },
  { value: 'Thailand', label: 'Thailand' },
  { value: 'Japan', label: 'Japan' },
  { value: 'South Korea', label: 'South Korea' },
  { value: 'China', label: 'China' },
  { value: 'Germany', label: 'Germany' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'United States', label: 'United States' },
  { value: 'France', label: 'France' },
  { value: 'Other', label: 'Other' },
];

const standardsOptions = [
  { value: 'eu_cbam', label: 'EU CBAM' },
  { value: 'uk_cbam', label: 'UK CBAM' },
  { value: 'china_carbon_market', label: 'China Carbon Market' },
  { value: 'k_esg', label: 'Korea K-ESG' },
  { value: 'maff_esg', label: 'Japan MAFF ESG' },
  { value: 'thai_esg', label: 'Thai ESG' },
];

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    organization: '',
    industry: '',
    country: '',
    region: '',
    baselineYear: new Date().getFullYear() - 1,
    reportingYear: new Date().getFullYear(),
    standards: [] as string[],
  });

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await projectsApi.getAll();
      if (response.success && response.data) {
        const projectList = response.data as any[];
        // Enhance projects with additional data
        const enhancedProjects = await Promise.all(
          projectList.map(async (project: any) => {
            // Try to get totals for each project
            try {
              const totalsResponse = await calculationsApi.getTotals(project.id);
              if (totalsResponse.success && totalsResponse.data) {
                const totals = totalsResponse.data as any;
                return {
                  ...project,
                  activityCount: totals.activityCount || 0,
                  totalEmissions: totals.total || 0,
                  progress: calculateProgress(project, totals),
                };
              }
            } catch {
              // Ignore errors for individual project totals
            }
            return {
              ...project,
              activityCount: 0,
              totalEmissions: 0,
              progress: 0,
            };
          })
        );
        setProjects(enhancedProjects);
      } else {
        setError(response.error || 'Failed to load projects');
      }
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (project: any, totals: any) => {
    // Simple progress calculation based on activities and calculations
    if (!totals.activityCount || totals.activityCount === 0) return 0;
    const calculatedCount = totals.calculatedCount || 0;
    return Math.round((calculatedCount / totals.activityCount) * 100);
  };

  const handleCreateProject = async () => {
    if (!formData.name || !formData.baselineYear || !formData.reportingYear) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await projectsApi.create(formData);
      if (response.success) {
        resetForm();
        setShowCreateModal(false);
        await loadProjects();
      } else {
        setError(response.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    setSaving(true);
    setError(null);

    try {
      const response = await projectsApi.update(selectedProject.id, formData);
      if (response.success) {
        setShowEditModal(false);
        setSelectedProject(null);
        resetForm();
        await loadProjects();
      } else {
        setError(response.error || 'Failed to update project');
      }
    } catch (err) {
      setError('Failed to update project');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    setSaving(true);
    setError(null);

    try {
      const response = await projectsApi.delete(selectedProject.id);
      if (response.success) {
        setShowDeleteModal(false);
        setSelectedProject(null);
        await loadProjects();
      } else {
        setError(response.error || 'Failed to delete project');
      }
    } catch (err) {
      setError('Failed to delete project');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveProject = async (project: Project) => {
    try {
      const response = await projectsApi.update(project.id, {
        status: project.status === 'archived' ? 'active' : 'archived'
      });
      if (response.success) {
        await loadProjects();
      }
    } catch (err) {
      setError('Failed to update project status');
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      organization: project.organization || '',
      industry: project.industry || '',
      country: project.country || '',
      region: project.region || '',
      baselineYear: project.baselineYear,
      reportingYear: project.reportingYear,
      standards: project.standards || [],
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (project: Project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      organization: '',
      industry: '',
      country: '',
      region: '',
      baselineYear: new Date().getFullYear() - 1,
      reportingYear: new Date().getFullYear(),
      standards: [],
    });
  };

  const openProjectDetails = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.organization && project.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    draft: projects.filter((p) => p.status === 'draft').length,
    archived: projects.filter((p) => p.status === 'archived').length,
  };

  const totalEmissions = projects.reduce((sum, p) => sum + (p.totalEmissions || 0), 0);
  const totalActivities = projects.reduce((sum, p) => sum + (p.activityCount || 0), 0);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
            Projects
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Manage your ESG reporting projects and assessments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <IconButton
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            variant="outline"
            onClick={loadProjects}
            disabled={loading}
          />
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div variants={item} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
          </div>
        </motion.div>
      )}

      {/* Summary Stats */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-grass-600 dark:text-grass-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500 dark:text-earth-400">Total Projects</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{projects.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Factory className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500 dark:text-earth-400">Total Activities</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{totalActivities}</p>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500 dark:text-earth-400">Total Emissions</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {(totalEmissions / 1000).toFixed(2)} <span className="text-sm font-normal">tCO₂e</span>
              </p>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500 dark:text-earth-400">Active Projects</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{statusCounts.active}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={item}>
        <Card variant="default" padding="sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filterStatus === status
                      ? 'bg-grass-500 text-white'
                      : 'bg-grass-100 dark:bg-earth-700 text-earth-600 dark:text-earth-300 hover:bg-grass-200 dark:hover:bg-earth-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                </button>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Loading State */}
      {loading ? (
        <motion.div variants={item} className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-grass-600" />
          <span className="ml-2 text-earth-500">Loading projects...</span>
        </motion.div>
      ) : filteredProjects.length === 0 ? (
        <motion.div variants={item}>
          <EmptyProjects onAdd={() => setShowCreateModal(true)} />
        </motion.div>
      ) : (
        /* Projects Grid */
        <motion.div
          variants={container}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                variants={item}
                layout
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card
                  variant="default"
                  hover
                  className="cursor-pointer h-full"
                  onClick={() => openProjectDetails(project)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-grass-600 dark:text-grass-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-earth-800 dark:text-earth-100 line-clamp-1">
                          {project.name}
                        </h3>
                        {project.organization && (
                          <p className="text-sm text-earth-500 dark:text-earth-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {project.organization}
                          </p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  {project.description && (
                    <p className="text-sm text-earth-600 dark:text-earth-400 line-clamp-2 mb-4">
                      {project.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-earth-500 dark:text-earth-400">Progress</span>
                      <span className="font-medium text-earth-700 dark:text-earth-300">
                        {project.progress || 0}%
                      </span>
                    </div>
                    <Progress value={project.progress || 0} size="sm" variant="grass" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-grass-50 dark:bg-earth-700/50 rounded-lg p-3">
                      <p className="text-xs text-earth-500 dark:text-earth-400 mb-1">
                        Activities
                      </p>
                      <p className="text-lg font-semibold text-earth-800 dark:text-earth-100">
                        {project.activityCount || 0}
                      </p>
                    </div>
                    <div className="bg-grass-50 dark:bg-earth-700/50 rounded-lg p-3">
                      <p className="text-xs text-earth-500 dark:text-earth-400 mb-1">
                        Emissions
                      </p>
                      <p className="text-lg font-semibold text-earth-800 dark:text-earth-100">
                        {((project.totalEmissions || 0) / 1000).toFixed(2)}
                        <span className="text-xs font-normal text-earth-500 ml-1">
                          tCO₂e
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-grass-100 dark:border-earth-700">
                    <div className="flex items-center gap-2 text-sm text-earth-500 dark:text-earth-400">
                      <Calendar className="w-4 h-4" />
                      {project.baselineYear} - {project.reportingYear}
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        icon={<Edit className="w-4 h-4" />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(project);
                        }}
                      />
                      <IconButton
                        icon={<Archive className="w-4 h-4" />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveProject(project);
                        }}
                      />
                      <IconButton
                        icon={<Trash2 className="w-4 h-4" />}
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(project);
                        }}
                      />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Create New Project"
        size="lg"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }}>
          <Input
            label="Project Name"
            placeholder="e.g., Carbon Footprint Assessment 2024"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Organization"
            placeholder="e.g., Acme Corporation"
            value={formData.organization}
            onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
          />
          <Input
            label="Description"
            placeholder="Brief description of the project..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Industry"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              options={industryOptions}
            />
            <Select
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              options={countryOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Baseline Year"
              type="number"
              required
              value={formData.baselineYear}
              onChange={(e) => setFormData(prev => ({ ...prev, baselineYear: parseInt(e.target.value) }))}
              min={2000}
              max={2100}
            />
            <Input
              label="Reporting Year"
              type="number"
              required
              value={formData.reportingYear}
              onChange={(e) => setFormData(prev => ({ ...prev, reportingYear: parseInt(e.target.value) }))}
              min={2000}
              max={2100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
              Reporting Standards
            </label>
            <div className="grid grid-cols-2 gap-2">
              {standardsOptions.map((standard) => (
                <label
                  key={standard.value}
                  className="flex items-center gap-2 p-2 rounded-lg bg-grass-50 dark:bg-earth-800 cursor-pointer hover:bg-grass-100 dark:hover:bg-earth-700"
                >
                  <input
                    type="checkbox"
                    checked={formData.standards.includes(standard.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, standards: [...prev.standards, standard.value] }));
                      } else {
                        setFormData(prev => ({ ...prev, standards: prev.standards.filter(s => s !== standard.value) }));
                      }
                    }}
                    className="rounded border-earth-300 text-grass-600 focus:ring-grass-500"
                  />
                  <span className="text-sm text-earth-700 dark:text-earth-300">{standard.label}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setShowCreateModal(false); resetForm(); }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateProject} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Create Project
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedProject(null); resetForm(); }}
        title="Edit Project"
        size="lg"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpdateProject(); }}>
          <Input
            label="Project Name"
            placeholder="e.g., Carbon Footprint Assessment 2024"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Organization"
            placeholder="e.g., Acme Corporation"
            value={formData.organization}
            onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
          />
          <Input
            label="Description"
            placeholder="Brief description of the project..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Industry"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              options={industryOptions}
            />
            <Select
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              options={countryOptions}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Baseline Year"
              type="number"
              required
              value={formData.baselineYear}
              onChange={(e) => setFormData(prev => ({ ...prev, baselineYear: parseInt(e.target.value) }))}
              min={2000}
              max={2100}
            />
            <Input
              label="Reporting Year"
              type="number"
              required
              value={formData.reportingYear}
              onChange={(e) => setFormData(prev => ({ ...prev, reportingYear: parseInt(e.target.value) }))}
              min={2000}
              max={2100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
              Reporting Standards
            </label>
            <div className="grid grid-cols-2 gap-2">
              {standardsOptions.map((standard) => (
                <label
                  key={standard.value}
                  className="flex items-center gap-2 p-2 rounded-lg bg-grass-50 dark:bg-earth-800 cursor-pointer hover:bg-grass-100 dark:hover:bg-earth-700"
                >
                  <input
                    type="checkbox"
                    checked={formData.standards.includes(standard.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, standards: [...prev.standards, standard.value] }));
                      } else {
                        setFormData(prev => ({ ...prev, standards: prev.standards.filter(s => s !== standard.value) }));
                      }
                    }}
                    className="rounded border-earth-300 text-grass-600 focus:ring-grass-500"
                  />
                  <span className="text-sm text-earth-700 dark:text-earth-300">{standard.label}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setShowEditModal(false); setSelectedProject(null); resetForm(); }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateProject} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedProject(null); }}
        title="Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  Warning: This action cannot be undone
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  Deleting this project will also delete all associated activities, calculations, and reports.
                </p>
              </div>
            </div>
          </div>
          {selectedProject && (
            <p className="text-earth-600 dark:text-earth-400">
              Are you sure you want to delete <strong>{selectedProject.name}</strong>?
            </p>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setShowDeleteModal(false); setSelectedProject(null); }}>
            Cancel
          </Button>
          <Button variant="primary" className="bg-red-600 hover:bg-red-700" onClick={handleDeleteProject} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Project
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
};

export default Projects;
