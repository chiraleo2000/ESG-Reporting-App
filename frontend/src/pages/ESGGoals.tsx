import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Leaf,
  Zap,
  Droplets,
  Recycle,
  Globe,
  DollarSign,
  Calendar,
  Award,
  X,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { goalsApi, projectsApi } from '@/lib/api';

interface ESGGoal {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
  targetType: string;
  scope: string;
  baselineValue: number;
  baselineYear: number;
  targetValue: number;
  targetYear: number;
  targetUnit: string;
  currentValue: number;
  progressPercentage: number;
  estimatedCost: number | null;
  actualCost: number | null;
  costCurrency: string;
  estimatedSavings: number | null;
  actualSavings: number | null;
  status: string;
  priority: string;
  assignedToName: string | null;
  alignedStandards: string[];
  sbtiAligned: boolean;
  parisAligned: boolean;
  milestones: any[];
  notes: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoalsSummary {
  overall: {
    totalGoals: number;
    averageProgress: number;
    achieved: number;
    onTrack: number;
    atRisk: number;
    behind: number;
    sbtiAligned: number;
    parisAligned: number;
  };
  byCategory: { category: string; count: number; avgProgress: number }[];
  byScope: { scope: string; count: number; avgProgress: number }[];
}

const CATEGORIES = [
  { value: 'emission_reduction', label: 'Emission Reduction', icon: TrendingDown, color: 'text-green-500' },
  { value: 'energy_efficiency', label: 'Energy Efficiency', icon: Zap, color: 'text-yellow-500' },
  { value: 'renewable_energy', label: 'Renewable Energy', icon: Globe, color: 'text-blue-500' },
  { value: 'waste_reduction', label: 'Waste Reduction', icon: Recycle, color: 'text-orange-500' },
  { value: 'water_conservation', label: 'Water Conservation', icon: Droplets, color: 'text-cyan-500' },
  { value: 'carbon_neutrality', label: 'Carbon Neutrality', icon: Leaf, color: 'text-emerald-500' },
  { value: 'scope_specific', label: 'Scope-Specific', icon: Target, color: 'text-purple-500' },
  { value: 'custom', label: 'Custom', icon: Award, color: 'text-gray-500' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: Edit3 },
  active: { label: 'Active', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Target },
  on_track: { label: 'On Track', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  at_risk: { label: 'At Risk', color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: AlertTriangle },
  behind: { label: 'Behind', color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: AlertCircle },
  achieved: { label: 'Achieved', color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: X },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-gray-300 dark:border-gray-600',
  medium: 'border-yellow-400 dark:border-yellow-600',
  high: 'border-orange-400 dark:border-orange-600',
  critical: 'border-red-400 dark:border-red-600',
};

export const ESGGoals: React.FC = () => {
  const { projects } = useAppStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [goals, setGoals] = useState<ESGGoal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ESGGoal | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [projectList, setProjectList] = useState<any[]>([]);

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await projectsApi.getAll() as any;
        if (res.success && res.data) {
          const data = Array.isArray(res.data) ? res.data : (res.data.projects || []);
          setProjectList(data);
          if (data.length > 0 && !selectedProjectId) {
            setSelectedProjectId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
        if (projects.length > 0 && !selectedProjectId) {
          setProjectList(projects);
          setSelectedProjectId(projects[0].id);
        }
      }
    }
    loadProjects();
  }, []);

  // Load goals when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadGoals();
      loadSummary();
    }
  }, [selectedProjectId, filterStatus, filterCategory]);

  async function loadGoals() {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const res = await goalsApi.getAll(selectedProjectId, params) as any;
      if (res.success) {
        setGoals(res.data?.goals || res.data || []);
      }
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const res = await goalsApi.getSummary(selectedProjectId) as any;
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }

  async function handleBulkProgress() {
    try {
      await goalsApi.bulkUpdateProgress(selectedProjectId);
      await loadGoals();
      await loadSummary();
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  }

  async function handleDeleteGoal(goalId: string) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await goalsApi.delete(selectedProjectId, goalId);
      await loadGoals();
      await loadSummary();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  }

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    if (pct >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-earth-800 dark:text-earth-100 flex items-center gap-3">
            <Target className="w-8 h-8 text-green-500" />
            ESG Goals & Targets
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Set, track, and manage your sustainability targets aligned with global standards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkProgress}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 
                     text-earth-600 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-earth-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Update Progress
          </button>
          <button
            onClick={() => { setEditingGoal(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>
      </div>

      {/* Project Selector & Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-800 
                   text-earth-700 dark:text-earth-200 font-medium"
        >
          {projectList.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-800 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="on_track">On Track</option>
          <option value="at_risk">At Risk</option>
          <option value="behind">Behind</option>
          <option value="achieved">Achieved</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-800 text-sm"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-earth-800 rounded-xl p-5 border border-earth-200 dark:border-earth-700 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-earth-500 dark:text-earth-400">Total Goals</span>
            </div>
            <p className="text-3xl font-bold text-earth-800 dark:text-earth-100">{summary.overall.totalGoals}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-green-500">{summary.overall.achieved} achieved</span>
              <span className="text-earth-400">·</span>
              <span className="text-blue-500">{summary.overall.onTrack} on track</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-earth-800 rounded-xl p-5 border border-earth-200 dark:border-earth-700 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              <span className="text-sm text-earth-500 dark:text-earth-400">Avg Progress</span>
            </div>
            <p className="text-3xl font-bold text-earth-800 dark:text-earth-100">{summary.overall.averageProgress}%</p>
            <div className="mt-2 w-full bg-earth-100 dark:bg-earth-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(summary.overall.averageProgress)}`}
                style={{ width: `${Math.min(100, summary.overall.averageProgress)}%` }}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-earth-800 rounded-xl p-5 border border-earth-200 dark:border-earth-700 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-earth-500 dark:text-earth-400">Needs Attention</span>
            </div>
            <p className="text-3xl font-bold text-earth-800 dark:text-earth-100">
              {summary.overall.atRisk + summary.overall.behind}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-yellow-500">{summary.overall.atRisk} at risk</span>
              <span className="text-earth-400">·</span>
              <span className="text-red-500">{summary.overall.behind} behind</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-earth-800 rounded-xl p-5 border border-earth-200 dark:border-earth-700 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-earth-500 dark:text-earth-400">Aligned</span>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">{summary.overall.sbtiAligned}</p>
                <p className="text-xs text-earth-400">SBTi</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">{summary.overall.parisAligned}</p>
                <p className="text-xs text-earth-400">Paris</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Goals List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-earth-400 animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-white dark:bg-earth-800 rounded-xl border border-earth-200 dark:border-earth-700"
        >
          <Target className="w-16 h-16 text-earth-300 dark:text-earth-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-earth-700 dark:text-earth-200 mb-2">No ESG Goals Yet</h3>
          <p className="text-earth-500 dark:text-earth-400 mb-4">
            Start by creating your first sustainability target
          </p>
          <button
            onClick={() => { setEditingGoal(null); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Goal
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal, index) => {
            const statusConf = STATUS_CONFIG[goal.status] || STATUS_CONFIG.active;
            const StatusIcon = statusConf.icon;
            const categoryConf = CATEGORIES.find((c) => c.value === goal.category);
            const CategoryIcon = categoryConf?.icon || Target;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white dark:bg-earth-800 rounded-xl border-l-4 ${PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS.medium} 
                           border border-earth-200 dark:border-earth-700 p-5 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CategoryIcon className={`w-5 h-5 ${categoryConf?.color || 'text-gray-500'}`} />
                      <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100">{goal.name}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConf.bgColor} ${statusConf.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConf.label}
                      </span>
                      {goal.sbtiAligned && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                          SBTi
                        </span>
                      )}
                      {goal.parisAligned && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          Paris
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-earth-500 dark:text-earth-400 mb-3">{goal.description}</p>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-earth-600 dark:text-earth-300">
                          {goal.currentValue.toFixed(1)} / {goal.targetValue.toFixed(1)} {goal.targetUnit}
                        </span>
                        <span className="font-semibold text-earth-800 dark:text-earth-100">
                          {goal.progressPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-earth-100 dark:bg-earth-700 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, goal.progressPercentage)}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          className={`h-3 rounded-full ${getProgressColor(goal.progressPercentage)}`}
                        />
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-earth-500 dark:text-earth-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {goal.baselineYear} → {goal.targetYear}
                      </span>
                      <span>Scope: {goal.scope}</span>
                      <span>Type: {goal.targetType}</span>
                      {goal.estimatedCost && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {goal.costCurrency} {goal.estimatedCost.toLocaleString()}
                        </span>
                      )}
                      {goal.assignedToName && (
                        <span>Assigned: {goal.assignedToName}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => { setEditingGoal(goal); setShowCreateModal(true); }}
                      className="p-2 rounded-lg hover:bg-earth-100 dark:hover:bg-earth-700 text-earth-500 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-earth-500 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <GoalFormModal
            projectId={selectedProjectId}
            goal={editingGoal}
            onClose={() => { setShowCreateModal(false); setEditingGoal(null); }}
            onSaved={() => { setShowCreateModal(false); setEditingGoal(null); loadGoals(); loadSummary(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Goal Form Modal Component
const GoalFormModal: React.FC<{
  projectId: string;
  goal: ESGGoal | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ projectId, goal, onClose, onSaved }) => {
  const isEditing = !!goal;
  const [form, setForm] = useState({
    name: goal?.name || '',
    description: goal?.description || '',
    category: goal?.category || 'emission_reduction',
    targetType: goal?.targetType || 'absolute',
    scope: goal?.scope || 'all',
    baselineValue: goal?.baselineValue?.toString() || '0',
    baselineYear: goal?.baselineYear?.toString() || new Date().getFullYear().toString(),
    targetValue: goal?.targetValue?.toString() || '0',
    targetYear: goal?.targetYear?.toString() || (new Date().getFullYear() + 5).toString(),
    targetUnit: goal?.targetUnit || 'tCO2e',
    estimatedCost: goal?.estimatedCost?.toString() || '',
    costCurrency: goal?.costCurrency || 'USD',
    estimatedSavings: goal?.estimatedSavings?.toString() || '',
    priority: goal?.priority || 'medium',
    sbtiAligned: goal?.sbtiAligned || false,
    parisAligned: goal?.parisAligned || false,
    notes: goal?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        baselineValue: Number.parseFloat(form.baselineValue) || 0,
        baselineYear: Number.parseInt(form.baselineYear, 10),
        targetValue: Number.parseFloat(form.targetValue) || 0,
        targetYear: Number.parseInt(form.targetYear, 10),
        estimatedCost: form.estimatedCost ? Number.parseFloat(form.estimatedCost) : null,
        estimatedSavings: form.estimatedSavings ? Number.parseFloat(form.estimatedSavings) : null,
      };

      if (isEditing) {
        await goalsApi.update(projectId, goal!.id, data);
      } else {
        await goalsApi.create(projectId, data);
      }
      onSaved();
    } catch (err) {
      console.error('Failed to save goal:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-earth-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-earth-800 px-6 py-4 border-b border-earth-200 dark:border-earth-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-earth-800 dark:text-earth-100">
            {isEditing ? 'Edit ESG Goal' : 'Create New ESG Goal'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-earth-100 dark:hover:bg-earth-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name & Description */}
          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Goal Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Reduce Scope 1 emissions by 30%"
              className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700 
                       text-earth-800 dark:text-earth-100 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700 
                       text-earth-800 dark:text-earth-100 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Category & Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              >
                <option value="all">All Scopes</option>
                <option value="scope1">Scope 1</option>
                <option value="scope2">Scope 2</option>
                <option value="scope3">Scope 3</option>
              </select>
            </div>
          </div>

          {/* Target Type & Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Target Type</label>
              <select
                value={form.targetType}
                onChange={(e) => setForm({ ...form, targetType: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              >
                <option value="absolute">Absolute (tCO2e)</option>
                <option value="percentage">Percentage Reduction</option>
                <option value="intensity">Intensity (per unit)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Target Unit</label>
              <input
                type="text"
                value={form.targetUnit}
                onChange={(e) => setForm({ ...form, targetUnit: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              />
            </div>
          </div>

          {/* Baseline & Target Values */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Baseline Value</label>
              <input
                type="number"
                step="any"
                value={form.baselineValue}
                onChange={(e) => setForm({ ...form, baselineValue: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Target Value</label>
              <input
                type="number"
                step="any"
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              />
            </div>
          </div>

          {/* Years */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Baseline Year *</label>
              <input
                type="number"
                required
                value={form.baselineYear}
                onChange={(e) => setForm({ ...form, baselineYear: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Target Year *</label>
              <input
                type="number"
                required
                value={form.targetYear}
                onChange={(e) => setForm({ ...form, targetYear: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              />
            </div>
          </div>

          {/* Financial */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Est. Cost</label>
              <input
                type="number"
                step="any"
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Est. Savings</label>
              <input
                type="number"
                step="any"
                value={form.estimatedSavings}
                onChange={(e) => setForm({ ...form, estimatedSavings: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Currency</label>
              <select
                value={form.costCurrency}
                onChange={(e) => setForm({ ...form, costCurrency: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="THB">THB</option>
                <option value="JPY">JPY</option>
                <option value="CNY">CNY</option>
                <option value="KRW">KRW</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Priority & Alignment */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sbtiAligned}
                  onChange={(e) => setForm({ ...form, sbtiAligned: e.target.checked })}
                  className="w-4 h-4 rounded text-green-500 focus:ring-green-500"
                />
                <span className="text-sm text-earth-600 dark:text-earth-300">SBTi Aligned</span>
              </label>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.parisAligned}
                  onChange={(e) => setForm({ ...form, parisAligned: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-earth-600 dark:text-earth-300">Paris Aligned</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 bg-white dark:bg-earth-700 
                       text-earth-800 dark:text-earth-100 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-earth-200 dark:border-earth-600 text-earth-600 dark:text-earth-300 hover:bg-earth-50 dark:hover:bg-earth-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
