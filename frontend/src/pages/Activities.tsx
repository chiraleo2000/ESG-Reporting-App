import React, { useState, useMemo, useCallback } from 'react';
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

// Activity categories with icons
const activityCategories = [
  { id: 'electricity', name: 'Electricity', icon: Zap, scope: 'scope2' },
  { id: 'natural_gas', name: 'Natural Gas', icon: Factory, scope: 'scope1' },
  { id: 'transport', name: 'Transportation', icon: Truck, scope: 'scope1' },
  { id: 'business_travel', name: 'Business Travel', icon: Plane, scope: 'scope3' },
  { id: 'water', name: 'Water', icon: Droplets, scope: 'scope3' },
  { id: 'waste', name: 'Waste', icon: Trash2, scope: 'scope3' },
];

// Mock activities data
const mockActivities = [
  {
    id: '1',
    type: 'electricity',
    description: 'Office electricity consumption - Q1',
    value: 15200,
    unit: 'kWh',
    scope: 'scope2' as const,
    date: '2024-03-31',
    status: 'approved' as const,
    emissions: 6.08,
    project: 'Corporate HQ Carbon Footprint 2024',
  },
  {
    id: '2',
    type: 'transport',
    description: 'Company fleet fuel consumption',
    value: 2500,
    unit: 'liters',
    scope: 'scope1' as const,
    date: '2024-03-28',
    status: 'approved' as const,
    emissions: 5.75,
    project: 'Corporate HQ Carbon Footprint 2024',
  },
  {
    id: '3',
    type: 'business_travel',
    description: 'Employee flights - International',
    value: 12000,
    unit: 'km',
    scope: 'scope3' as const,
    date: '2024-03-25',
    status: 'pending' as const,
    emissions: 2.16,
    project: 'Supply Chain Emissions Analysis',
  },
  {
    id: '4',
    type: 'natural_gas',
    description: 'Heating - Main Building',
    value: 850,
    unit: 'm³',
    scope: 'scope1' as const,
    date: '2024-03-20',
    status: 'approved' as const,
    emissions: 1.53,
    project: 'Corporate HQ Carbon Footprint 2024',
  },
  {
    id: '5',
    type: 'waste',
    description: 'Office waste disposal',
    value: 450,
    unit: 'kg',
    scope: 'scope3' as const,
    date: '2024-03-18',
    status: 'submitted' as const,
    emissions: 0.32,
    project: 'Corporate HQ Carbon Footprint 2024',
  },
  {
    id: '6',
    type: 'water',
    description: 'Water consumption - All facilities',
    value: 1200,
    unit: 'm³',
    scope: 'scope3' as const,
    date: '2024-03-15',
    status: 'draft' as const,
    emissions: 0.36,
    project: 'Manufacturing Plant Assessment',
  },
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

export const Activities: React.FC = () => {
  const [activities] = useState(mockActivities);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Real-time calculation state
  const [activityValue, setActivityValue] = useState('');
  const [activityType, setActivityType] = useState('electricity');
  const [calculatedEmissions, setCalculatedEmissions] = useState(0);

  // Real-time emission calculation
  const calculateEmissions = useCallback((value: string, type: string) => {
    const numValue = parseFloat(value) || 0;
    const category = activityCategories.find(c => c.id === type);
    const factor = category?.id === 'electricity' ? 0.4 :
                   category?.id === 'natural_gas' ? 1.89 :
                   category?.id === 'transport' ? 2.68 :
                   category?.id === 'business_travel' ? 0.255 :
                   category?.id === 'water' ? 0.344 :
                   category?.id === 'waste' ? 0.71 : 0;
    return numValue * factor / 1000; // Convert to tCO2e
  }, []);

  // Update emissions when value or type changes
  useMemo(() => {
    setCalculatedEmissions(calculateEmissions(activityValue, activityType));
  }, [activityValue, activityType, calculateEmissions]);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.project.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScope =
      selectedScope === 'all' || activity.scope === selectedScope;
    const matchesTab =
      activeTab === 'all' || activity.status === activeTab;
    return matchesSearch && matchesScope && matchesTab;
  });

  const getIcon = (type: string) => {
    const category = activityCategories.find((c) => c.id === type);
    return category ? category.icon : Leaf;
  };

  const statusCounts = {
    all: activities.length,
    draft: activities.filter((a) => a.status === 'draft').length,
    submitted: activities.filter((a) => a.status === 'submitted').length,
    pending: activities.filter((a) => a.status === 'pending').length,
    approved: activities.filter((a) => a.status === 'approved').length,
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
          <Button variant="outline" size="sm" onClick={() => setShowCalculatorModal(true)}>
            <Calculator className="w-4 h-4" />
            Calculator
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4" />
            Import Data
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add Activity
          </Button>
        </div>
      </motion.div>

      {/* Activity Type Quick Stats */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {activityCategories.map((category) => {
            const Icon = category.icon;
            const count = activities.filter((a) => a.type === category.id).length;
            return (
              <Card
                key={category.id}
                variant="default"
                padding="sm"
                hover
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-grass-600 dark:text-grass-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-earth-800 dark:text-earth-100">
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
                <TabWithBadge value="draft" label="Draft" badge={statusCounts.draft} />
                <TabWithBadge value="submitted" label="Submitted" badge={statusCounts.submitted} />
                <TabWithBadge value="pending" label="Pending" badge={statusCounts.pending} />
                <TabWithBadge value="approved" label="Approved" badge={statusCounts.approved} />
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
                    <Button variant="outline" size="sm">
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="w-3 h-3" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash className="w-3 h-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              {/* Table */}
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
                    <TableHead sortable>Project</TableHead>
                    <TableHead sortable>Value</TableHead>
                    <TableHead sortable>Scope</TableHead>
                    <TableHead sortable>Emissions</TableHead>
                    <TableHead sortable>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.length === 0 ? (
                    <TableEmpty
                      icon={<Leaf className="w-12 h-12" />}
                      title="No activities found"
                      description="Try adjusting your search or filters"
                      colSpan={9}
                    />
                  ) : (
                    filteredActivities.map((activity) => {
                      const Icon = getIcon(activity.type);
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
                                  {activity.description}
                                </p>
                                <p className="text-xs text-earth-500 capitalize">
                                  {activity.type.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-earth-600 dark:text-earth-400 line-clamp-1">
                              {activity.project}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-earth-800 dark:text-earth-100">
                              {activity.value.toLocaleString()}
                            </span>
                            <span className="text-sm text-earth-500 ml-1">
                              {activity.unit}
                            </span>
                          </TableCell>
                          <TableCell>
                            <ScopeBadge scope={activity.scope} />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-grass-600 dark:text-grass-400">
                              {activity.emissions.toFixed(2)}
                            </span>
                            <span className="text-xs text-earth-500 ml-1">
                              tCO₂e
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-earth-500">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(activity.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={activity.status} />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              icon={<MoreVertical className="w-4 h-4" />}
                              variant="ghost"
                              size="sm"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
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
        <form className="space-y-4">
          <Select
            label="Activity Type"
            required
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            options={[
              { value: '', label: 'Select activity type...' },
              ...activityCategories.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
          />
          <Select
            label="Project"
            required
            options={[
              { value: '', label: 'Select project...' },
              { value: '1', label: 'Corporate HQ Carbon Footprint 2024' },
              { value: '2', label: 'Supply Chain Emissions Analysis' },
              { value: '3', label: 'Manufacturing Plant Assessment' },
            ]}
          />
          <Input
            label="Description"
            placeholder="e.g., Monthly electricity consumption"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value"
              type="number"
              placeholder="0"
              required
              value={activityValue}
              onChange={(e) => setActivityValue(e.target.value)}
            />
            <Select
              label="Unit"
              required
              options={[
                { value: '', label: 'Select unit...' },
                { value: 'kWh', label: 'kWh' },
                { value: 'liters', label: 'Liters' },
                { value: 'm3', label: 'm³' },
                { value: 'kg', label: 'kg' },
                { value: 'km', label: 'km' },
                { value: 'miles', label: 'Miles' },
              ]}
            />
          </div>

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
              Calculation based on default emission factors. Final value may vary.
            </p>
          </motion.div>

          <Input label="Activity Date" type="date" required />
          
          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
              Supporting Documents (Optional)
            </label>
            <FileUpload
              accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
              maxSize={10}
              maxFiles={5}
              onUpload={async (files) => setUploadedFiles(files)}
            />
          </div>

          <Input
            label="Notes (Optional)"
            placeholder="Additional notes or references..."
          />
        </form>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(false)}>
            <Plus className="w-4 h-4" />
            Add Activity
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
                  Upload Excel (.xlsx, .xls) or CSV files. Download our template for the correct format.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
              </div>
            </div>
          </div>

          <FileUpload
            accept=".xlsx,.xls,.csv"
            maxSize={25}
            maxFiles={5}
            onUpload={async (files) => {
              console.log('Uploaded files:', files);
            }}
          />

          <div className="flex items-center gap-4 p-3 rounded-lg bg-earth-50 dark:bg-earth-800">
            <Checkbox />
            <div>
              <p className="text-sm font-medium text-earth-700 dark:text-earth-300">
                Auto-calculate emissions
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
          <Button variant="primary">
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
