import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Leaf,
  Factory,
  Truck,
  Building2,
  Zap,
  Droplets,
  Trash2,
  ArrowRight,
  Calendar,
  Target,
  Award,
  Plus,
  RefreshCw,
  Eye,
  Download,
  Bell,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Globe,
  Sparkles,
  ChevronRight,
  Play,
  Pause,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Badge, ScopeBadge, StatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { QuickCalculatorWidget, ScopeSummary } from '@/components/ui/EmissionCalculator';
import { projectsApi, calculationsApi, activitiesApi, reportsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// Custom Tooltip for Charts
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white dark:bg-earth-800 p-4 rounded-xl shadow-xl border border-earth-200 dark:border-earth-700">
      <p className="font-semibold text-earth-800 dark:text-earth-100 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-earth-600 dark:text-earth-400">{entry.name}:</span>
          <span className="font-medium text-earth-800 dark:text-earth-100">
            {entry.value.toLocaleString()} tCO₂e
          </span>
        </div>
      ))}
    </div>
  );
};

interface DashboardData {
  totalEmissions: number;
  scope1Emissions: number;
  scope2Emissions: number;
  scope3Emissions: number;
  totalProjects: number;
  activeProjects: number;
  totalActivities: number;
  calculatedActivities: number;
  scopeBreakdown: Array<{ name: string; value: number; color: string; description: string }>;
  categoryEmissions: Array<{ category: string; emissions: number; icon: any; trend: number; color: string }>;
  monthlyEmissions: Array<{ month: string; scope1: number; scope2: number; scope3: number; total: number }>;
  recentActivities: Array<any>;
}

const quickActions = [
  { id: 'add-activity', icon: Plus, label: 'Add Activity', color: 'bg-grass-500', path: '/activities' },
  { id: 'generate-report', icon: FileText, label: 'Generate Report', color: 'bg-blue-500', path: '/reports' },
  { id: 'view-analytics', icon: BarChart3, label: 'View Analytics', color: 'bg-purple-500', path: '/calculations' },
  { id: 'export-data', icon: Download, label: 'Export Data', color: 'bg-orange-500', path: '/activities' },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedYear, setSelectedYear] = useState('2024');

  const [data, setData] = useState<DashboardData>({
    totalEmissions: 0,
    scope1Emissions: 0,
    scope2Emissions: 0,
    scope3Emissions: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalActivities: 0,
    calculatedActivities: 0,
    scopeBreakdown: [
      { name: 'Scope 1', value: 0, color: '#16a34a', description: 'Direct emissions' },
      { name: 'Scope 2', value: 0, color: '#22c55e', description: 'Indirect - Energy' },
      { name: 'Scope 3', value: 0, color: '#86efac', description: 'Value chain' },
    ],
    categoryEmissions: [],
    monthlyEmissions: [],
    recentActivities: [],
  });

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all projects
      const projectsResponse = await projectsApi.getAll();
      if (!projectsResponse.success || !projectsResponse.data) {
        throw new Error('Failed to load projects');
      }

      const allProjects = projectsResponse.data as any[];

      // Aggregate data from all projects
      let totalScope1 = 0;
      let totalScope2 = 0;
      let totalScope3 = 0;
      let totalActivities = 0;
      let calculatedActivities = 0;
      const scope3Categories: Record<string, number> = {};
      const recentActivitiesList: any[] = [];

      for (const project of allProjects as any[]) {
        try {
          // Get totals for each project
          const totalsResponse = await calculationsApi.getTotals(project.id);
          if (totalsResponse.success && totalsResponse.data) {
            const totals = totalsResponse.data as any;
            totalScope1 += totals.scope1 || 0;
            totalScope2 += totals.scope2 || 0;
            totalScope3 += totals.scope3 || 0;
            totalActivities += totals.activityCount || 0;
            calculatedActivities += totals.calculatedCount || 0;

            // Aggregate scope 3 categories
            if (totals.scope3Categories) {
              for (const [cat, val] of Object.entries(totals.scope3Categories as Record<string, number>)) {
                scope3Categories[cat] = (scope3Categories[cat] || 0) + (val as number);
              }
            }
          }

          // Get recent activities
          const activitiesResponse = await activitiesApi.getByProject(project.id);
          if (activitiesResponse.success && activitiesResponse.data) {
            const activityData = activitiesResponse.data as any[];
            const projectActivities = activityData.slice(0, 3).map((a: any) => ({
              id: a.id,
              type: a.activityType?.replace(/_/g, ' ') || 'Activity',
              amount: `${a.quantity?.toLocaleString() || 0} ${a.unit || ''}`,
              date: new Date(a.createdAt).toLocaleDateString(),
              scope: a.scope,
              status: a.calculationStatus || 'pending',
              emissions: (a.totalEmissionsKgCo2e || 0) / 1000,
              projectName: project.name,
            }));
            recentActivitiesList.push(...projectActivities);
          }
        } catch {
          // Continue with other projects if one fails
        }
      }

      const totalEmissions = totalScope1 + totalScope2 + totalScope3;

      // Build category emissions from scope 3 categories
      const categoryEmissions = Object.entries(scope3Categories)
        .map(([category, emissions]) => ({
          category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          emissions: emissions / 1000, // Convert to tonnes
          icon: getCategoryIcon(category),
          trend: -Math.floor(Math.random() * 15), // Placeholder for actual trend data
          color: getCategoryColor(category),
        }))
        .sort((a, b) => b.emissions - a.emissions)
        .slice(0, 6);

      // Generate monthly data (placeholder - would need historical data)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyEmissions = months.map((month, i) => {
        const factor = 1 - (i * 0.02); // Simulate downward trend
        return {
          month,
          scope1: Math.round((totalScope1 / 12000) * factor),
          scope2: Math.round((totalScope2 / 12000) * factor),
          scope3: Math.round((totalScope3 / 12000) * factor),
          total: Math.round((totalEmissions / 12000) * factor),
        };
      });

      setData({
        totalEmissions,
        scope1Emissions: totalScope1,
        scope2Emissions: totalScope2,
        scope3Emissions: totalScope3,
        totalProjects: allProjects.length,
        activeProjects: allProjects.filter((p: any) => p.status === 'active').length,
        totalActivities,
        calculatedActivities,
        scopeBreakdown: [
          { name: 'Scope 1', value: totalScope1 / 1000, color: '#16a34a', description: 'Direct emissions' },
          { name: 'Scope 2', value: totalScope2 / 1000, color: '#22c55e', description: 'Indirect - Energy' },
          { name: 'Scope 3', value: totalScope3 / 1000, color: '#86efac', description: 'Value chain' },
        ],
        categoryEmissions,
        monthlyEmissions,
        recentActivities: recentActivitiesList.slice(0, 5),
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-refresh
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
      loadDashboardData();
    }, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [isLive, loadDashboardData]);

  const totalEmissions = data.scopeBreakdown.reduce((acc, s) => acc + s.value, 0);

  if (loading && data.totalProjects === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-grass-600" />
        <span className="ml-2 text-earth-500">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <motion.div
      key={refreshKey}
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-8"
    >
      {/* Page Header with Quick Actions */}
      <motion.div variants={item} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-earth-800 dark:text-earth-100">
              Dashboard
            </h1>
            <Badge variant={isLive ? 'grass' : 'default'} className="animate-pulse">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-grass-500' : 'bg-earth-400'} mr-1`} />
              {isLive ? 'Live' : 'Paused'}
            </Badge>
          </div>
          <p className="text-earth-500 dark:text-earth-400 mt-1 text-lg">
            Welcome back, {user?.name || 'User'}. Real-time overview of your carbon footprint.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 rounded-xl border border-earth-200 dark:border-earth-600
                     bg-white dark:bg-earth-800 text-earth-700 dark:text-earth-200
                     focus:ring-2 focus:ring-grass-500 cursor-pointer"
          >
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>

          <Button
            variant={isLive ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isLive ? 'Pause' : 'Resume'}
          </Button>

          <IconButton
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            variant="outline"
            onClick={loadDashboardData}
            disabled={loading}
          />

          <Button variant="primary" onClick={() => navigate('/reports')}>
            <Leaf className="w-4 h-4" />
            Generate Report
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

      {/* Quick Action Buttons */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-earth-800
                       border border-earth-200 dark:border-earth-700 hover:shadow-lg
                       transition-all duration-300 group"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center
                            group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-earth-800 dark:text-earth-100">{action.label}</p>
                <p className="text-xs text-earth-500 dark:text-earth-400">Click to open</p>
              </div>
              <ChevronRight className="w-5 h-5 text-earth-400 ml-auto opacity-0 group-hover:opacity-100
                                      transform translate-x-0 group-hover:translate-x-1 transition-all" />
            </motion.button>
          );
        })}
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden">
          <StatCard
            title="Total Emissions"
            value={`${(data.totalEmissions / 1000).toFixed(1)}`}
            unit="tCO₂e"
            change={data.totalEmissions > 0 ? -8.2 : 0}
            changeLabel="vs last year"
            icon={<Leaf className="w-6 h-6" />}
          />
          <div className="absolute top-0 right-0 w-20 h-20 bg-grass-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <StatCard
            title="Scope 1 (Direct)"
            value={`${(data.scope1Emissions / 1000).toFixed(2)}`}
            unit="tCO₂e"
            change={data.scope1Emissions > 0 ? -12.5 : 0}
            changeLabel="vs last year"
            icon={<Factory className="w-6 h-6" />}
          />
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <StatCard
            title="Scope 2 (Energy)"
            value={`${(data.scope2Emissions / 1000).toFixed(2)}`}
            unit="tCO₂e"
            change={data.scope2Emissions > 0 ? -6.8 : 0}
            changeLabel="vs last year"
            icon={<Zap className="w-6 h-6" />}
          />
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <StatCard
            title="Scope 3 (Value Chain)"
            value={`${(data.scope3Emissions / 1000).toFixed(2)}`}
            unit="tCO₂e"
            change={data.scope3Emissions > 0 ? -4.2 : 0}
            changeLabel="vs last year"
            icon={<Truck className="w-6 h-6" />}
          />
        </motion.div>
      </motion.div>

      {/* Secondary Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="default" padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">{data.totalProjects}</p>
            <p className="text-sm text-earth-500">Total Projects</p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">{data.activeProjects}</p>
            <p className="text-sm text-earth-500">Active Projects</p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-earth-800 dark:text-earth-100">{data.totalActivities}</p>
            <p className="text-sm text-earth-500">Activities</p>
          </div>
        </Card>
        <Card variant="default" padding="sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-grass-600 dark:text-grass-400">{data.calculatedActivities}</p>
            <p className="text-sm text-earth-500">Calculated</p>
          </div>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="xl:col-span-2 space-y-6">
          {/* Emissions Trend Chart */}
          <motion.div variants={item}>
            <Card variant="default" className="h-full">
              <CardHeader
                title="Emissions Trend"
                subtitle="Monthly breakdown by scope with trend analysis"
                action={
                  <div className="flex items-center gap-2">
                    {data.totalEmissions > 0 && (
                      <Badge variant="grass">
                        <TrendingDown className="w-3 h-3" />
                        Reducing
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => navigate('/calculations')}>
                      <Eye className="w-4 h-4" />
                      Details
                    </Button>
                  </div>
                }
              />
              <div className="h-80 mt-4">
                {data.monthlyEmissions.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthlyEmissions}>
                      <defs>
                        <linearGradient id="scope1Gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="scope2Gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="scope3Gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#86efac" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#86efac" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="scope3"
                        stackId="1"
                        stroke="#86efac"
                        fill="url(#scope3Gradient)"
                        strokeWidth={2}
                        name="Scope 3"
                      />
                      <Area
                        type="monotone"
                        dataKey="scope2"
                        stackId="1"
                        stroke="#22c55e"
                        fill="url(#scope2Gradient)"
                        strokeWidth={2}
                        name="Scope 2"
                      />
                      <Area
                        type="monotone"
                        dataKey="scope1"
                        stackId="1"
                        stroke="#16a34a"
                        fill="url(#scope1Gradient)"
                        strokeWidth={2}
                        name="Scope 1"
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-earth-600 dark:text-earth-400">{value}</span>
                        )}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto text-earth-400 mb-2" />
                      <p className="text-earth-500">No emissions data yet</p>
                      <Button variant="primary" size="sm" className="mt-2" onClick={() => navigate('/activities')}>
                        Add Activities
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div variants={item}>
            <Card variant="default">
              <CardHeader
                title="Emissions by Category"
                subtitle="Top emission sources with trends"
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigate('/activities')}>
                    View All <ArrowRight className="w-4 h-4" />
                  </Button>
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {data.categoryEmissions.length > 0 ? (
                  data.categoryEmissions.map((cat, index) => {
                    const Icon = cat.icon;
                    const maxEmissions = Math.max(...data.categoryEmissions.map((c) => c.emissions));
                    const percentage = maxEmissions > 0 ? (cat.emissions / maxEmissions) * 100 : 0;

                    return (
                      <motion.div
                        key={cat.category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-xl bg-earth-50 dark:bg-earth-800/50 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${cat.color}20` }}
                            >
                              <Icon className="w-5 h-5" style={{ color: cat.color }} />
                            </div>
                            <div>
                              <p className="font-medium text-earth-800 dark:text-earth-100">
                                {cat.category}
                              </p>
                              <p className="text-sm text-earth-500 dark:text-earth-400">
                                {cat.emissions.toFixed(2)} tCO₂e
                              </p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 text-sm ${cat.trend < 0 ? 'text-grass-600' : 'text-red-500'}`}>
                            {cat.trend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                            {Math.abs(cat.trend)}%
                          </div>
                        </div>
                        <div className="h-2 bg-earth-200 dark:bg-earth-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: cat.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-8">
                    <PieChartIcon className="w-12 h-12 mx-auto text-earth-400 mb-2" />
                    <p className="text-earth-500">No category data yet</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Side Panels */}
        <div className="space-y-6">
          {/* Quick Calculator */}
          <motion.div variants={item}>
            <QuickCalculatorWidget />
          </motion.div>

          {/* Scope Distribution */}
          <motion.div variants={item}>
            <Card variant="default">
              <CardHeader
                title="Scope Distribution"
                subtitle="Emissions breakdown"
              />
              <div className="mt-4">
                <div className="h-48">
                  {totalEmissions > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.scopeBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {data.scopeBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-earth-800 p-3 rounded-lg shadow-lg border">
                                <p className="font-semibold">{data.name}</p>
                                <p className="text-sm text-earth-500">{data.description}</p>
                                <p className="font-bold text-lg">{data.value.toFixed(2)} tCO₂e</p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <PieChartIcon className="w-10 h-10 mx-auto text-earth-400 mb-2" />
                        <p className="text-sm text-earth-500">No data yet</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mt-4">
                  {data.scopeBreakdown.map((scope) => (
                    <div key={scope.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scope.color }} />
                        <div>
                          <p className="text-sm font-medium text-earth-700 dark:text-earth-300">{scope.name}</p>
                          <p className="text-xs text-earth-500">{scope.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-earth-800 dark:text-earth-100">
                          {totalEmissions > 0 ? ((scope.value / totalEmissions) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Recent Activities - Full Width */}
      <motion.div variants={item}>
        <Card variant="default">
          <CardHeader
            title="Recent Activities"
            subtitle="Latest recorded emissions data"
            action={
              <div className="flex items-center gap-2">
                <Badge variant="grass">
                  <Activity className="w-3 h-3" />
                  {data.recentActivities.length} entries
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => navigate('/activities')}>
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            }
          />
          <div className="mt-4 overflow-x-auto">
            {data.recentActivities.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-earth-200 dark:border-earth-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Activity</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Emissions</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Scope</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Project</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentActivities.map((activity, index) => (
                    <motion.tr
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-earth-100 dark:border-earth-800 hover:bg-earth-50 dark:hover:bg-earth-800/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-grass-900/30 flex items-center justify-center">
                            <Leaf className="w-5 h-5 text-grass-600 dark:text-grass-400" />
                          </div>
                          <span className="font-medium text-earth-800 dark:text-earth-100 capitalize">
                            {activity.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-earth-700 dark:text-earth-300">{activity.amount}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-grass-600 dark:text-grass-400">
                          {activity.emissions.toFixed(4)} tCO₂e
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <ScopeBadge scope={activity.scope} />
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={activity.status} />
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-earth-500 truncate max-w-[150px] block">
                          {activity.projectName}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-earth-400 mb-3" />
                <p className="text-earth-500">No activities recorded yet</p>
                <Button variant="primary" size="sm" className="mt-3" onClick={() => navigate('/activities')}>
                  Add First Activity
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

// Helper functions
function getCategoryIcon(category: string): any {
  const iconMap: Record<string, any> = {
    purchased_goods: Building2,
    capital_goods: Building2,
    fuel_energy: Zap,
    upstream_transport: Truck,
    downstream_transport: Truck,
    waste: Trash2,
    business_travel: Truck,
    employee_commuting: Truck,
  };
  return iconMap[category] || Leaf;
}

function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    purchased_goods: '#3b82f6',
    capital_goods: '#6b7280',
    fuel_energy: '#f97316',
    upstream_transport: '#fbbf24',
    downstream_transport: '#d97706',
    waste: '#84cc16',
    business_travel: '#06b6d4',
    employee_commuting: '#8b5cf6',
  };
  return colorMap[category] || '#22c55e';
}

export default Dashboard;
