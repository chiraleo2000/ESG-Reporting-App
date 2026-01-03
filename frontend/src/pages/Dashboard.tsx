import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Badge, ScopeBadge, StatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Progress, CircularProgress } from '@/components/ui/Progress';
import { QuickCalculatorWidget, ScopeSummary } from '@/components/ui/EmissionCalculator';

// Mock data
const monthlyEmissions = [
  { month: 'Jan', scope1: 120, scope2: 180, scope3: 320, total: 620 },
  { month: 'Feb', scope1: 115, scope2: 175, scope3: 310, total: 600 },
  { month: 'Mar', scope1: 125, scope2: 190, scope3: 340, total: 655 },
  { month: 'Apr', scope1: 110, scope2: 165, scope3: 290, total: 565 },
  { month: 'May', scope1: 105, scope2: 155, scope3: 275, total: 535 },
  { month: 'Jun', scope1: 100, scope2: 150, scope3: 260, total: 510 },
  { month: 'Jul', scope1: 95, scope2: 145, scope3: 250, total: 490 },
  { month: 'Aug', scope1: 90, scope2: 140, scope3: 240, total: 470 },
  { month: 'Sep', scope1: 85, scope2: 135, scope3: 230, total: 450 },
  { month: 'Oct', scope1: 88, scope2: 138, scope3: 235, total: 461 },
  { month: 'Nov', scope1: 82, scope2: 130, scope3: 220, total: 432 },
  { month: 'Dec', scope1: 78, scope2: 125, scope3: 210, total: 413 },
];

const scopeBreakdown = [
  { name: 'Scope 1', value: 1193, color: '#16a34a', description: 'Direct emissions' },
  { name: 'Scope 2', value: 1828, color: '#22c55e', description: 'Indirect - Energy' },
  { name: 'Scope 3', value: 3180, color: '#86efac', description: 'Value chain' },
];

const categoryEmissions = [
  { category: 'Electricity', emissions: 1450, icon: Zap, trend: -8, color: '#fbbf24' },
  { category: 'Transportation', emissions: 890, icon: Truck, trend: -12, color: '#6b7280' },
  { category: 'Natural Gas', emissions: 520, icon: Factory, trend: -5, color: '#f97316' },
  { category: 'Business Travel', emissions: 340, icon: Building2, trend: -15, color: '#3b82f6' },
  { category: 'Waste', emissions: 180, icon: Trash2, trend: -3, color: '#d97706' },
  { category: 'Water', emissions: 90, icon: Droplets, trend: -2, color: '#06b6d4' },
];

const recentActivities = [
  { id: 1, type: 'Electricity', amount: '15,200 kWh', date: 'Today 2:30 PM', scope: 'scope2' as const, status: 'approved' as const, emissions: 6.08 },
  { id: 2, type: 'Fleet Fuel', amount: '2,500 L', date: 'Yesterday 4:15 PM', scope: 'scope1' as const, status: 'pending' as const, emissions: 5.75 },
  { id: 3, type: 'Business Flight', amount: '12,000 km', date: '2 days ago', scope: 'scope3' as const, status: 'submitted' as const, emissions: 2.16 },
  { id: 4, type: 'Waste Disposal', amount: '450 kg', date: '3 days ago', scope: 'scope3' as const, status: 'approved' as const, emissions: 0.32 },
  { id: 5, type: 'Natural Gas', amount: '850 m³', date: '4 days ago', scope: 'scope1' as const, status: 'approved' as const, emissions: 1.61 },
];

const notifications = [
  { id: 1, type: 'warning', message: 'Q4 report deadline in 5 days', time: '2h ago' },
  { id: 2, type: 'success', message: 'Scope 2 emissions reduced by 8%', time: '1d ago' },
  { id: 3, type: 'info', message: 'New emission factors available for 2024', time: '2d ago' },
];

const quickActions = [
  { id: 'add-activity', icon: Plus, label: 'Add Activity', color: 'bg-grass-500' },
  { id: 'generate-report', icon: FileText, label: 'Generate Report', color: 'bg-blue-500' },
  { id: 'view-analytics', icon: BarChart3, label: 'View Analytics', color: 'bg-purple-500' },
  { id: 'export-data', icon: Download, label: 'Export Data', color: 'bg-orange-500' },
];

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

export const Dashboard: React.FC = () => {
  const [isLive, setIsLive] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedYear, setSelectedYear] = useState('2024');
  const totalEmissions = scopeBreakdown.reduce((acc, s) => acc + s.value, 0);

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [isLive]);

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
            Real-time overview of your organization's carbon footprint
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
            icon={<RefreshCw className="w-4 h-4" />}
            variant="outline"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="animate-none hover:rotate-180 transition-transform duration-500"
          />

          <Button variant="primary">
            <Leaf className="w-4 h-4" />
            Generate Report
          </Button>
        </div>
      </motion.div>

      {/* Quick Action Buttons */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
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
            value={`${(totalEmissions / 1000).toFixed(1)}k`}
            unit="tCO₂e"
            change={-8.2}
            changeLabel="vs last year"
            icon={<Leaf className="w-6 h-6" />}
          />
          <div className="absolute top-0 right-0 w-20 h-20 bg-grass-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }}>
          <StatCard
            title="Scope 1 (Direct)"
            value={`${(scopeBreakdown[0].value / 1000).toFixed(2)}k`}
            unit="tCO₂e"
            change={-12.5}
            changeLabel="vs last year"
            icon={<Factory className="w-6 h-6" />}
          />
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }}>
          <StatCard
            title="Scope 2 (Energy)"
            value={`${(scopeBreakdown[1].value / 1000).toFixed(2)}k`}
            unit="tCO₂e"
            change={-6.8}
            changeLabel="vs last year"
            icon={<Zap className="w-6 h-6" />}
          />
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }}>
          <StatCard
            title="Scope 3 (Value Chain)"
            value={`${(scopeBreakdown[2].value / 1000).toFixed(2)}k`}
            unit="tCO₂e"
            change={-4.2}
            changeLabel="vs last year"
            icon={<Truck className="w-6 h-6" />}
          />
        </motion.div>
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
                    <Badge variant="grass">
                      <TrendingDown className="w-3 h-3" />
                      -8.2% YoY
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                      Details
                    </Button>
                  </div>
                }
              />
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyEmissions}>
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
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="w-4 h-4" />
                  </Button>
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {categoryEmissions.map((cat, index) => {
                  const Icon = cat.icon;
                  const maxEmissions = Math.max(...categoryEmissions.map((c) => c.emissions));
                  const percentage = (cat.emissions / maxEmissions) * 100;
                  
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
                              {cat.emissions.toLocaleString()} tCO₂e
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
                })}
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
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scopeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {scopeBreakdown.map((entry, index) => (
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
                              <p className="font-bold text-lg">{data.value.toLocaleString()} tCO₂e</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-3 mt-4">
                  {scopeBreakdown.map((scope) => (
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
                          {((scope.value / totalEmissions) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={item}>
            <Card variant="default">
              <CardHeader
                title="Notifications"
                subtitle="Recent updates"
                action={
                  <Badge variant="default">
                    {notifications.length} new
                  </Badge>
                }
              />
              <div className="mt-4 space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-earth-50 dark:bg-earth-800/50"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                        notif.type === 'success' ? 'bg-grass-100 text-grass-600' :
                        'bg-blue-100 text-blue-600'}`}
                    >
                      {notif.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                      {notif.type === 'success' && <CheckCircle className="w-4 h-4" />}
                      {notif.type === 'info' && <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-earth-700 dark:text-earth-200">{notif.message}</p>
                      <p className="text-xs text-earth-500 mt-1">{notif.time}</p>
                    </div>
                  </div>
                ))}
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
            subtitle="Latest recorded emissions data with real-time updates"
            action={
              <div className="flex items-center gap-2">
                <Badge variant="grass">
                  <Activity className="w-3 h-3" />
                  {recentActivities.length} entries
                </Badge>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            }
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-earth-200 dark:border-earth-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Activity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Emissions</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Scope</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-earth-600 dark:text-earth-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((activity, index) => (
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
                        <span className="font-medium text-earth-800 dark:text-earth-100">
                          {activity.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-earth-700 dark:text-earth-300">{activity.amount}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-grass-600 dark:text-grass-400">
                        {activity.emissions.toFixed(2)} tCO₂e
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <ScopeBadge scope={activity.scope} />
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={activity.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-earth-500 dark:text-earth-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{activity.date}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Reduction Target Progress */}
      <motion.div variants={item}>
        <Card variant="grass" className="overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center gap-8 p-6">
            <div className="flex-shrink-0">
              <CircularProgress
                value={5200}
                max={6200}
                size={180}
                strokeWidth={16}
                label="On Track"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-8 h-8 text-grass-600" />
                <div>
                  <h3 className="text-xl font-bold text-earth-800 dark:text-earth-100">
                    Net Zero 2050 Progress
                  </h3>
                  <p className="text-earth-600 dark:text-earth-400">
                    You're on track to meet your emission reduction targets
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { year: 2024, target: 5500, actual: 5200, label: 'Current Year' },
                  { year: 2025, target: 4500, actual: null, label: 'Next Year' },
                  { year: 2030, target: 2500, actual: null, label: 'Mid-term' },
                ].map((target) => (
                  <div key={target.year} className="p-4 rounded-xl bg-white/50 dark:bg-earth-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-earth-600 dark:text-earth-400">
                        {target.label}
                      </span>
                      <span className="text-lg font-bold text-earth-800 dark:text-earth-100">
                        {target.year}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-earth-500">
                        Target: {target.target.toLocaleString()} tCO₂e
                      </span>
                      {target.actual && (
                        <Badge variant="grass" size="sm">
                          <CheckCircle className="w-3 h-3" />
                          Achieved
                        </Badge>
                      )}
                    </div>
                    <Progress
                      value={target.actual || 0}
                      max={6200}
                      size="sm"
                      variant="grass"
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
