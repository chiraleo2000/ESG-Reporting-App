import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Zap,
  Truck,
  Factory,
  Droplets,
  Trash2,
  Plane,
  Building2,
  Leaf,
  Calendar,
  MoreVertical,
  Edit,
  Copy,
  Trash,
  Calculator,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Input, Select, Checkbox } from '@/components/ui/Input';
import { Badge, ScopeBadge, StatusBadge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { EmptyActivities } from '@/components/ui/EmptyState';
import { FileUpload, FilePreviewList } from '@/components/ui/FileUpload';
import { EmissionCalculator } from '@/components/ui/EmissionCalculator';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table';
import { Tabs, TabsList, TabsTrigger, TabsContent, TabWithBadge } from '@/components/ui/Tabs';
import { activitiesApi, projectsApi, calculationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// Activity categories with icons
const activityCategories = [
  { id: 'stationary_combustion', name: 'Stationary Combustion', icon: Factory, scope: 'scope1' },
  { id: 'mobile_combustion', name: 'Mobile Combustion', icon: Truck, scope: 'scope1' },
  { id: 'purchased_electricity', name: 'Purchased Electricity', icon: Zap, scope: 'scope2' },
  { id: 'purchased_heat_steam', name: 'Purchased Heat/Steam', icon: Factory, scope: 'scope2' },
  { id: 'business_travel', name: 'Business Travel', icon: Plane, scope: 'scope3' },
  { id: 'employee_commuting', name: 'Employee Commuting', icon: Building2, scope: 'scope3' },
  { id: 'upstream_transport', name: 'Upstream Transport', icon: Truck, scope: 'scope3' },
  { id: 'downstream_transport', name: 'Downstream Transport', icon: Truck, scope: 'scope3' },
  { id: 'waste', name: 'Waste Generated', icon: Trash2, scope: 'scope3' },
  { id: 'purchased_goods', name: 'Purchased Goods', icon: Building2, scope: 'scope3' },
  { id: 'fuel_energy', name: 'Fuel & Energy', icon: Droplets, scope: 'scope3' },
  { id: 'process_emissions', name: 'Process Emissions', icon: Factory, scope: 'scope1' },
  { id: 'fugitive_emissions', name: 'Fugitive Emissions', icon: Droplets, scope: 'scope1' },
  { id: 'use_of_products', name: 'Use of Sold Products', icon: Building2, scope: 'scope3' },
];

// Scope 3 categories mapping
const scope3Categories = [
  { value: 'purchased_goods', label: 'Cat 1: Purchased Goods & Services' },
  { value: 'capital_goods', label: 'Cat 2: Capital Goods' },
  { value: 'fuel_energy', label: 'Cat 3: Fuel & Energy Activities' },
  { value: 'upstream_transport', label: 'Cat 4: Upstream Transportation' },
  { value: 'waste', label: 'Cat 5: Waste Generated' },
  { value: 'business_travel', label: 'Cat 6: Business Travel' },
  { value: 'employee_commuting', label: 'Cat 7: Employee Commuting' },
  { value: 'upstream_leased', label: 'Cat 8: Upstream Leased Assets' },
  { value: 'downstream_transport', label: 'Cat 9: Downstream Transportation' },
  { value: 'processing', label: 'Cat 10: Processing of Sold Products' },
  { value: 'use_of_products', label: 'Cat 11: Use of Sold Products' },
  { value: 'end_of_life', label: 'Cat 12: End-of-Life Treatment' },
  { value: 'downstream_leased', label: 'Cat 13: Downstream Leased Assets' },
  { value: 'franchises', label: 'Cat 14: Franchises' },
];

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

interface Activity {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  scope: 'scope1' | 'scope2' | 'scope3';
  scope3Category?: string;
  activityType: string;
  quantity: number;
  unit: string;
  source?: string;
  tierLevel?: string;
  tierDirection?: string;
  dataSource?: string;
  dataQualityScore?: string;
  calculationStatus: string;
  totalEmissionsKgCo2e?: number;
  emissionFactorUsed?: any;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  organization?: string;
}

export const Activities: React.FC = () => {
  // State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scope: 'scope1' as 'scope1' | 'scope2' | 'scope3',
    scope3Category: '',
    activityType: 'stationary_combustion',
    quantity: '',
    unit: 'kWh',
    source: '',
    tierLevel: 'tier1',
    dataSource: '',
    dataQualityScore: '',
    notes: '',
  });

  // Real-time calculation state
  const [calculatedEmissions, setCalculatedEmissions] = useState(0);

  // Get auth state
  const { token } = useAuthStore();

  // Emission factors for real-time calculation preview
  const emissionFactors: Record<string, Record<string, number>> = {
    stationary_combustion: { 'kWh': 0.184, 'l': 2.68, 'm3': 2.02, 'kg': 2.42 },
    mobile_combustion: { 'l': 2.31, 'km': 0.17 },
    purchased_electricity: { 'kWh': 0.42, 'MWh': 420 },
    purchased_heat_steam: { 'kWh': 0.18, 'MWh': 180 },
    business_travel: { 'km': 0.195, 'miles': 0.314 },
    employee_commuting: { 'km': 0.17, 'miles': 0.274 },
    waste: { 'kg': 0.58, 'tonnes': 580 },
    upstream_transport: { 'tonne_km': 0.1 },
    downstream_transport: { 'tonne_km': 0.1 },
    purchased_goods: { 'kg': 2.0, 'USD': 0.5 },
    fuel_energy: { 'kWh': 0.03 },
    process_emissions: { 'tonne': 525 },
    fugitive_emissions: { 'kg': 2088 },
    use_of_products: { 'kWh': 0.42 },
  };

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load activities when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadActivities();
    }
  }, [selectedProjectId]);

  // Real-time emission calculation
  useEffect(() => {
    const numValue = parseFloat(formData.quantity) || 0;
    const activityFactors = emissionFactors[formData.activityType] || {};
    const factor = activityFactors[formData.unit] || 0;
    setCalculatedEmissions(numValue * factor / 1000); // Convert to tCO2e
  }, [formData.quantity, formData.activityType, formData.unit]);

  const loadProjects = async () => {
    try {
      const response = await projectsApi.getAll();
      if (response.success && response.data) {
        const projectData = response.data as Project[];
        setProjects(projectData);
        // Auto-select first project if available
        if (projectData.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectData[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadActivities = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await activitiesApi.getByProject(selectedProjectId);
      if (response.success && response.data) {
        setActivities(response.data as Activity[]);
      } else {
        setError(response.error || 'Failed to load activities');
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = async () => {
    if (!selectedProjectId) {
      setError('Please select a project first');
      return;
    }

    if (!formData.name || !formData.quantity || !formData.unit) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        scope: formData.scope,
        scope3Category: formData.scope === 'scope3' ? formData.scope3Category : undefined,
        activityType: formData.activityType,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        source: formData.source || undefined,
        tierLevel: formData.tierLevel,
        dataSource: formData.dataSource || undefined,
        dataQualityScore: formData.dataQualityScore || undefined,
      };

      const response = await activitiesApi.createForProject(selectedProjectId, payload);

      if (response.success) {
        // Reset form and close modal
        setFormData({
          name: '',
          description: '',
          scope: 'scope1',
          scope3Category: '',
          activityType: 'stationary_combustion',
          quantity: '',
          unit: 'kWh',
          source: '',
          tierLevel: 'tier1',
          dataSource: '',
          dataQualityScore: '',
          notes: '',
        });
        setShowAddModal(false);
        // Reload activities
        await loadActivities();
      } else {
        setError(response.error || 'Failed to create activity');
      }
    } catch (err) {
      setError('Failed to create activity');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateActivity = async () => {
    if (!editingActivity) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        scope: formData.scope,
        scope3Category: formData.scope === 'scope3' ? formData.scope3Category : undefined,
        activityType: formData.activityType,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        source: formData.source || undefined,
        tierLevel: formData.tierLevel,
        dataSource: formData.dataSource || undefined,
        dataQualityScore: formData.dataQualityScore || undefined,
      };

      const response = await activitiesApi.update(editingActivity.id, payload);

      if (response.success) {
        setShowEditModal(false);
        setEditingActivity(null);
        await loadActivities();
      } else {
        setError(response.error || 'Failed to update activity');
      }
    } catch (err) {
      setError('Failed to update activity');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      const response = await activitiesApi.delete(activityId);
      if (response.success) {
        await loadActivities();
      } else {
        setError(response.error || 'Failed to delete activity');
      }
    } catch (err) {
      setError('Failed to delete activity');
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedActivities.length} activities?`)) return;

    try {
      for (const id of selectedActivities) {
        await activitiesApi.delete(id);
      }
      setSelectedActivities([]);
      await loadActivities();
    } catch (err) {
      setError('Failed to delete some activities');
      console.error(err);
    }
  };

  const handleCalculateAll = async () => {
    if (!selectedProjectId) return;

    setSaving(true);
    try {
      const response = await calculationsApi.calculateAll(selectedProjectId);
      if (response.success) {
        await loadActivities();
      } else {
        setError(response.error || 'Failed to calculate emissions');
      }
    } catch (err) {
      setError('Failed to calculate emissions');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: string = 'csv') => {
    if (!selectedProjectId) return;

    try {
      const response = await activitiesApi.export(selectedProjectId, format);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activities-${selectedProjectId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('Failed to export activities');
      console.error(err);
    }
  };

  const openEditModal = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      description: activity.description || '',
      scope: activity.scope,
      scope3Category: activity.scope3Category || '',
      activityType: activity.activityType,
      quantity: activity.quantity.toString(),
      unit: activity.unit,
      source: activity.source || '',
      tierLevel: activity.tierLevel || 'tier1',
      dataSource: activity.dataSource || '',
      dataQualityScore: activity.dataQualityScore || '',
      notes: '',
    });
    setShowEditModal(true);
  };

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.description && activity.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesScope =
      selectedScope === 'all' || activity.scope === selectedScope;
    const matchesTab =
      activeTab === 'all' || activity.calculationStatus === activeTab;
    return matchesSearch && matchesScope && matchesTab;
  });

  const getIcon = (type: string) => {
    const category = activityCategories.find((c) => c.id === type);
    return category ? category.icon : Leaf;
  };

  const statusCounts = {
    all: activities.length,
    pending: activities.filter((a) => a.calculationStatus === 'pending').length,
    calculated: activities.filter((a) => a.calculationStatus === 'calculated').length,
    error: activities.filter((a) => a.calculationStatus === 'error').length,
  };

  const toggleSelectAll = () => {
    if (selectedActivities.length === filteredActivities.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities(filteredActivities.map((a) => a.id));
    }
  };

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Calculate totals
  const totalEmissions = activities.reduce((sum, a) => sum + (a.totalEmissionsKgCo2e || 0), 0);
  const calculatedCount = activities.filter(a => a.calculationStatus === 'calculated').length;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-earth-800 dark:text-earth-100">
            Activities
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Track and manage emission-generating activities with real-time calculations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <Select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            options={[
              { value: '', label: 'Select project...' },
              ...projects.map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={() => setShowCalculatorModal(true)}>
            <Calculator className="w-4 h-4" />
            Calculator
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4" />
            Import Data
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)} disabled={!selectedProjectId}>
            <Plus className="w-4 h-4" />
            Add Activity
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
      {selectedProjectId && (
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="default" padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-grass-600 dark:text-grass-400" />
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
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Factory className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-earth-500 dark:text-earth-400">Total Activities</p>
                <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{activities.length}</p>
              </div>
            </div>
          </Card>
          <Card variant="default" padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-earth-500 dark:text-earth-400">Calculated</p>
                <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{calculatedCount}</p>
              </div>
            </div>
          </Card>
          <Card variant="default" padding="sm">
            <Button
              variant="primary"
              className="w-full h-full"
              onClick={handleCalculateAll}
              disabled={saving || activities.length === 0}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Calculate All Emissions
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Activity Type Quick Stats */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {activityCategories.slice(0, 7).map((category) => {
            const Icon = category.icon;
            const count = activities.filter((a) => a.activityType === category.id).length;
            return (
              <Card
                key={category.id}
                variant="default"
                padding="sm"
                hover
                className="cursor-pointer"
                onClick={() => setFormData(prev => ({ ...prev, activityType: category.id, scope: category.scope as any }))}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-grass-600 dark:text-grass-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-earth-800 dark:text-earth-100 truncate">
                      {category.name}
                    </p>
                    <p className="text-xs text-earth-500 dark:text-earth-400">
                      {count} {count === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Filters & Table */}
      <motion.div variants={item}>
        <Card variant="default">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <TabsList variant="default">
                <TabWithBadge value="all" label="All" badge={statusCounts.all} />
                <TabWithBadge value="pending" label="Pending" badge={statusCounts.pending} />
                <TabWithBadge value="calculated" label="Calculated" badge={statusCounts.calculated} />
                <TabWithBadge value="error" label="Errors" badge={statusCounts.error} />
              </TabsList>

              <div className="flex items-center gap-3">
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                  className="w-64"
                />
                <Select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Scopes' },
                    { value: 'scope1', label: 'Scope 1' },
                    { value: 'scope2', label: 'Scope 2' },
                    { value: 'scope3', label: 'Scope 3' },
                  ]}
                  className="w-36"
                />
                <IconButton
                  icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                  variant="outline"
                  onClick={loadActivities}
                  disabled={loading}
                />
              </div>
            </div>

            <TabsContent value={activeTab} forceMount>
              {/* Bulk Actions */}
              {selectedActivities.length > 0 && (
                <div className="flex items-center gap-4 p-3 mb-4 bg-grass-50 dark:bg-earth-800 rounded-xl">
                  <span className="text-sm text-earth-600 dark:text-earth-300">
                    {selectedActivities.length} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-red-600" onClick={handleBulkDelete}>
                      <Trash className="w-3 h-3" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-grass-600" />
                  <span className="ml-2 text-earth-500">Loading activities...</span>
                </div>
              ) : !selectedProjectId ? (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto text-earth-400 mb-4" />
                  <h3 className="text-lg font-medium text-earth-700 dark:text-earth-300 mb-2">
                    Select a Project
                  </h3>
                  <p className="text-earth-500">Choose a project to view and manage activities</p>
                </div>
              ) : (
                /* Table */
                <Table variant="default">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedActivities.length === filteredActivities.length &&
                            filteredActivities.length > 0
                          }
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead sortable>Activity</TableHead>
                      <TableHead sortable>Type</TableHead>
                      <TableHead sortable>Value</TableHead>
                      <TableHead sortable>Scope</TableHead>
                      <TableHead sortable>Emissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.length === 0 ? (
                      <TableEmpty
                        icon={<Leaf className="w-12 h-12" />}
                        title="No activities found"
                        description={activities.length === 0 ? "Add your first activity to start tracking emissions" : "Try adjusting your search or filters"}
                        colSpan={8}
                      />
                    ) : (
                      filteredActivities.map((activity) => {
                        const Icon = getIcon(activity.activityType);
                        return (
                          <TableRow key={activity.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedActivities.includes(activity.id)}
                                onChange={() => toggleActivity(activity.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                                  <Icon className="w-4 h-4 text-grass-600 dark:text-grass-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-earth-800 dark:text-earth-100">
                                    {activity.name}
                                  </p>
                                  {activity.description && (
                                    <p className="text-xs text-earth-500 line-clamp-1">
                                      {activity.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-earth-600 dark:text-earth-400 capitalize">
                                {activity.activityType.replace(/_/g, ' ')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-earth-800 dark:text-earth-100">
                                {activity.quantity.toLocaleString()}
                              </span>
                              <span className="text-sm text-earth-500 ml-1">
                                {activity.unit}
                              </span>
                            </TableCell>
                            <TableCell>
                              <ScopeBadge scope={activity.scope} />
                            </TableCell>
                            <TableCell>
                              {activity.totalEmissionsKgCo2e ? (
                                <>
                                  <span className="font-medium text-grass-600 dark:text-grass-400">
                                    {(activity.totalEmissionsKgCo2e / 1000).toFixed(4)}
                                  </span>
                                  <span className="text-xs text-earth-500 ml-1">
                                    tCO₂e
                                  </span>
                                </>
                              ) : (
                                <span className="text-earth-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  activity.calculationStatus === 'calculated' ? 'grass' :
                                  activity.calculationStatus === 'error' ? 'error' : 'default'
                                }
                              >
                                {activity.calculationStatus === 'calculated' && <CheckCircle className="w-3 h-3" />}
                                {activity.calculationStatus === 'pending' && <Clock className="w-3 h-3" />}
                                {activity.calculationStatus === 'error' && <AlertCircle className="w-3 h-3" />}
                                {activity.calculationStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <IconButton
                                  icon={<Edit className="w-4 h-4" />}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditModal(activity)}
                                />
                                <IconButton
                                  icon={<Trash2 className="w-4 h-4" />}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteActivity(activity.id)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>

      {/* Add Activity Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Activity"
        size="lg"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateActivity(); }}>
          <Input
            label="Activity Name"
            placeholder="e.g., Office electricity consumption"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Description"
            placeholder="Additional details about this activity"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Scope"
              required
              value={formData.scope}
              onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value as any }))}
              options={[
                { value: 'scope1', label: 'Scope 1 - Direct Emissions' },
                { value: 'scope2', label: 'Scope 2 - Energy Indirect' },
                { value: 'scope3', label: 'Scope 3 - Other Indirect' },
              ]}
            />
            {formData.scope === 'scope3' && (
              <Select
                label="Scope 3 Category"
                required
                value={formData.scope3Category}
                onChange={(e) => setFormData(prev => ({ ...prev, scope3Category: e.target.value }))}
                options={[
                  { value: '', label: 'Select category...' },
                  ...scope3Categories,
                ]}
              />
            )}
          </div>
          <Select
            label="Activity Type"
            required
            value={formData.activityType}
            onChange={(e) => setFormData(prev => ({ ...prev, activityType: e.target.value }))}
            options={activityCategories
              .filter(c => c.scope === formData.scope || formData.scope === 'scope3')
              .map((c) => ({
                value: c.id,
                label: c.name,
              }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              step="any"
              placeholder="0"
              required
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            />
            <Select
              label="Unit"
              required
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              options={[
                { value: 'kWh', label: 'kWh (Electricity)' },
                { value: 'MWh', label: 'MWh (Electricity)' },
                { value: 'l', label: 'Liters (Fuel)' },
                { value: 'm3', label: 'm³ (Natural Gas)' },
                { value: 'kg', label: 'kg (Mass)' },
                { value: 'tonnes', label: 'Tonnes (Mass)' },
                { value: 'km', label: 'km (Distance)' },
                { value: 'miles', label: 'Miles (Distance)' },
                { value: 'tonne_km', label: 'Tonne-km (Freight)' },
                { value: 'USD', label: 'USD (Spend)' },
                { value: 'EUR', label: 'EUR (Spend)' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Calculation Tier"
              value={formData.tierLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, tierLevel: e.target.value }))}
              options={[
                { value: 'tier1', label: 'Tier 1 - Default Factors' },
                { value: 'tier2', label: 'Tier 2 - Country Specific' },
                { value: 'tier3', label: 'Tier 3 - Facility Specific' },
              ]}
            />
            <Select
              label="Data Quality"
              value={formData.dataQualityScore}
              onChange={(e) => setFormData(prev => ({ ...prev, dataQualityScore: e.target.value }))}
              options={[
                { value: '', label: 'Select quality...' },
                { value: 'high', label: 'High - Measured Data' },
                { value: 'medium', label: 'Medium - Invoiced Data' },
                { value: 'low', label: 'Low - Estimated Data' },
              ]}
            />
          </div>
          <Input
            label="Data Source"
            placeholder="e.g., Utility invoice, meter reading"
            value={formData.dataSource}
            onChange={(e) => setFormData(prev => ({ ...prev, dataSource: e.target.value }))}
          />

          {/* Real-time Emissions Preview */}
          <motion.div
            className="p-4 rounded-xl bg-gradient-to-r from-grass-50 to-meadow-50 dark:from-grass-900/20 dark:to-meadow-900/20 border border-grass-200 dark:border-grass-800"
            animate={{ scale: calculatedEmissions > 0 ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-grass-600" />
                <span className="text-sm font-medium text-earth-700 dark:text-earth-300">
                  Estimated Emissions
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-grass-600 dark:text-grass-400">
                  {calculatedEmissions.toFixed(4)}
                </span>
                <span className="text-sm text-earth-500 ml-1">tCO₂e</span>
              </div>
            </div>
            <p className="text-xs text-earth-500 mt-2">
              Preview based on default emission factors. Actual calculation may vary.
            </p>
          </motion.div>
        </form>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateActivity} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Activity
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Activity Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingActivity(null); }}
        title="Edit Activity"
        size="lg"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUpdateActivity(); }}>
          <Input
            label="Activity Name"
            placeholder="e.g., Office electricity consumption"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            label="Description"
            placeholder="Additional details about this activity"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Scope"
              required
              value={formData.scope}
              onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value as any }))}
              options={[
                { value: 'scope1', label: 'Scope 1 - Direct Emissions' },
                { value: 'scope2', label: 'Scope 2 - Energy Indirect' },
                { value: 'scope3', label: 'Scope 3 - Other Indirect' },
              ]}
            />
            {formData.scope === 'scope3' && (
              <Select
                label="Scope 3 Category"
                required
                value={formData.scope3Category}
                onChange={(e) => setFormData(prev => ({ ...prev, scope3Category: e.target.value }))}
                options={[
                  { value: '', label: 'Select category...' },
                  ...scope3Categories,
                ]}
              />
            )}
          </div>
          <Select
            label="Activity Type"
            required
            value={formData.activityType}
            onChange={(e) => setFormData(prev => ({ ...prev, activityType: e.target.value }))}
            options={activityCategories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              step="any"
              placeholder="0"
              required
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            />
            <Select
              label="Unit"
              required
              value={formData.unit}
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
              options={[
                { value: 'kWh', label: 'kWh (Electricity)' },
                { value: 'MWh', label: 'MWh (Electricity)' },
                { value: 'l', label: 'Liters (Fuel)' },
                { value: 'm3', label: 'm³ (Natural Gas)' },
                { value: 'kg', label: 'kg (Mass)' },
                { value: 'tonnes', label: 'Tonnes (Mass)' },
                { value: 'km', label: 'km (Distance)' },
                { value: 'miles', label: 'Miles (Distance)' },
                { value: 'tonne_km', label: 'Tonne-km (Freight)' },
                { value: 'USD', label: 'USD (Spend)' },
                { value: 'EUR', label: 'EUR (Spend)' },
              ]}
            />
          </div>
        </form>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingActivity(null); }}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateActivity} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>

      {/* File Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Import Activity Data"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Supported Formats
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Upload Excel (.xlsx, .xls) or CSV files with activity data.
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Required columns: name, scope, activity_type, quantity, unit
                </p>
              </div>
            </div>
          </div>

          <FileUpload
            accept=".xlsx,.xls,.csv"
            maxSize={25}
            maxFiles={1}
            onUpload={async (files) => {
              setUploadedFiles(files);
              // TODO: Implement file parsing and bulk create
              console.log('Uploaded files:', files);
            }}
          />

          <div className="flex items-center gap-4 p-3 rounded-lg bg-earth-50 dark:bg-earth-800">
            <Checkbox />
            <div>
              <p className="text-sm font-medium text-earth-700 dark:text-earth-300">
                Auto-calculate emissions after import
              </p>
              <p className="text-xs text-earth-500">
                Automatically apply emission factors based on activity type
              </p>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowUploadModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={uploadedFiles.length === 0}>
            <Upload className="w-4 h-4" />
            Import Data
          </Button>
        </ModalFooter>
      </Modal>

      {/* Calculator Modal */}
      <Modal
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
        title="Emission Calculator"
        size="xl"
      >
        <EmissionCalculator
          onCalculate={(result) => {
            console.log('Calculation result:', result);
          }}
        />
      </Modal>
    </motion.div>
  );
};

export default Activities;
