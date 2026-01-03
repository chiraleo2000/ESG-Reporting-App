import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Leaf,
  Building,
  Factory,
  Truck,
  Zap,
  Calendar,
  ArrowRight,
  Download,
  RefreshCw,
  Info,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Brain,
  Globe,
  Award,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Demo analytics data
const emissionsByScope = {
  scope1: { value: 485.2, change: -5.2, label: 'Scope 1 (Direct)' },
  scope2: { value: 1302.8, change: -12.5, label: 'Scope 2 (Energy)' },
  scope3: { value: 2156.4, change: +3.1, label: 'Scope 3 (Value Chain)' },
};

const monthlyTrend = [
  { month: 'Jul', scope1: 42, scope2: 115, scope3: 185, total: 342 },
  { month: 'Aug', scope1: 45, scope2: 112, scope3: 190, total: 347 },
  { month: 'Sep', scope1: 41, scope2: 108, scope3: 175, total: 324 },
  { month: 'Oct', scope1: 39, scope2: 105, scope3: 180, total: 324 },
  { month: 'Nov', scope1: 38, scope2: 102, scope3: 172, total: 312 },
  { month: 'Dec', scope1: 36, scope2: 98, scope3: 168, total: 302 },
];

const topEmissionSources = [
  { name: 'Purchased Electricity', emissions: 1302.8, scope: 'Scope 2', icon: Zap, percentage: 33, color: 'bg-blue-500' },
  { name: 'Raw Material Transport', emissions: 856.2, scope: 'Scope 3', icon: Truck, percentage: 22, color: 'bg-amber-500' },
  { name: 'Steel Procurement', emissions: 645.5, scope: 'Scope 3', icon: Building, percentage: 16, color: 'bg-orange-500' },
  { name: 'Natural Gas - Furnace', emissions: 252.5, scope: 'Scope 1', icon: Factory, percentage: 6, color: 'bg-emerald-500' },
  { name: 'Business Travel', emissions: 245.8, scope: 'Scope 3', icon: Truck, percentage: 6, color: 'bg-purple-500' },
];

const reductionTargets = [
  { year: 2025, target: 3944, actual: 3944.4, status: 'on-track', progress: 100 },
  { year: 2026, target: 3550, actual: null, status: 'upcoming', progress: 0 },
  { year: 2030, target: 2366, actual: null, status: 'upcoming', progress: 0 },
  { year: 2050, target: 0, actual: null, status: 'net-zero', progress: 0 },
];

const benchmarks = [
  { category: 'Manufacturing (Asia)', avgEmissions: 4500, yourEmissions: 3944, percentile: 75, trend: 'improving' },
  { category: 'Industry Peers', avgEmissions: 4200, yourEmissions: 3944, percentile: 68, trend: 'stable' },
  { category: 'Global Best Practice', avgEmissions: 2500, yourEmissions: 3944, percentile: 35, trend: 'improving' },
  { category: 'Science-Based Target', avgEmissions: 3000, yourEmissions: 3944, percentile: 45, trend: 'needs attention' },
];

const aiInsights = [
  {
    id: 1,
    type: 'opportunity',
    priority: 'high',
    title: 'Scope 2 Reduction Opportunity',
    description: 'Switching to 50% renewable electricity could reduce emissions by 651 tCO2e annually. ROI estimated at 2.5 years with current energy prices.',
    impact: '-16.5%',
    confidence: 92,
    actions: ['Get quotes from renewable providers', 'Evaluate PPA options', 'Calculate TCO comparison'],
  },
  {
    id: 2,
    type: 'warning',
    priority: 'medium',
    title: 'Scope 3 Emissions Increasing',
    description: 'Upstream transport emissions increased by 3.1% this quarter due to supply chain changes. Consider evaluating new logistics partners.',
    impact: '+3.1%',
    confidence: 87,
    actions: ['Review transport mode efficiency', 'Evaluate local suppliers', 'Optimize shipping routes'],
  },
  {
    id: 3,
    type: 'success',
    priority: 'low',
    title: 'Efficiency Gains Detected',
    description: 'Natural gas consumption reduced by 8% through furnace optimization. This pattern suggests further savings possible.',
    impact: '-8%',
    confidence: 95,
    actions: ['Document optimization process', 'Apply to other equipment', 'Monitor for sustained savings'],
  },
  {
    id: 4,
    type: 'opportunity',
    priority: 'high',
    title: 'Carbon Credit Opportunity',
    description: 'Based on your reduction trajectory, you may qualify for carbon credit generation. Estimated value: $12,000-15,000 annually.',
    impact: '+$15K',
    confidence: 78,
    actions: ['Verify certification requirements', 'Register with carbon registry', 'Engage verification body'],
  },
];

const yearlyComparison = [
  { year: 2023, scope1: 520, scope2: 1450, scope3: 2300, total: 4270 },
  { year: 2024, scope1: 502, scope2: 1380, scope3: 2200, total: 4082 },
  { year: 2025, scope1: 485, scope2: 1303, scope3: 2156, total: 3944 },
];

export const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'benchmarks' | 'insights'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('6m');
  const [selectedProject, setSelectedProject] = useState('all');

  const totalEmissions = Object.values(emissionsByScope).reduce((sum, s) => sum + s.value, 0);
  const maxMonthlyTotal = Math.max(...monthlyTrend.map(m => m.total));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
            Analytics
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Comprehensive view of your emissions performance and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            options={[
              { value: '3m', label: 'Last 3 months' },
              { value: '6m', label: 'Last 6 months' },
              { value: '1y', label: 'Last year' },
              { value: 'all', label: 'All time' },
            ]}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          />
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={item}>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeTab === 'overview' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === 'trends' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('trends')}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Trends
          </Button>
          <Button
            variant={activeTab === 'benchmarks' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('benchmarks')}
          >
            <Award className="w-4 h-4 mr-2" />
            Benchmarks
          </Button>
          <Button
            variant={activeTab === 'insights' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('insights')}
          >
            <Brain className="w-4 h-4 mr-2" />
            AI Insights
          </Button>
        </div>
      </motion.div>

      {/* ==================== OVERVIEW TAB ==================== */}
      {activeTab === 'overview' && (
        <motion.div variants={item} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card variant="default" className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-earth-500 dark:text-earth-400">Total Emissions</p>
                  <p className="text-2xl font-bold text-earth-800 dark:text-earth-100 mt-1">
                    {totalEmissions.toFixed(1)}
                  </p>
                  <p className="text-xs text-earth-400">tCO2e</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-grass-100 dark:bg-grass-900/30 flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-grass-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600">-4.8%</span>
                <span className="text-earth-400 ml-1">vs last period</span>
              </div>
            </Card>

            {Object.entries(emissionsByScope).map(([key, scope]) => (
              <Card key={key} variant="default" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-earth-500 dark:text-earth-400">{scope.label}</p>
                    <p className="text-2xl font-bold text-earth-800 dark:text-earth-100 mt-1">
                      {scope.value.toFixed(1)}
                    </p>
                    <p className="text-xs text-earth-400">tCO2e</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    key === 'scope1' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    key === 'scope2' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    {key === 'scope1' ? <Factory className="w-6 h-6 text-emerald-600" /> :
                     key === 'scope2' ? <Zap className="w-6 h-6 text-blue-600" /> :
                     <Truck className="w-6 h-6 text-amber-600" />}
                  </div>
                </div>
                <div className="mt-3 flex items-center text-sm">
                  {scope.change < 0 ? (
                    <>
                      <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-green-600">{scope.change}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                      <span className="text-red-600">+{scope.change}%</span>
                    </>
                  )}
                  <span className="text-earth-400 ml-1">vs last period</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Emissions by Scope Chart */}
          <Card variant="default">
            <CardHeader
              title="Emissions Distribution by Scope"
              subtitle="Current period breakdown"
            />
            <div className="mt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-8 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${(emissionsByScope.scope1.value / totalEmissions) * 100}%` }} />
                  <div className="bg-blue-500 h-full" style={{ width: `${(emissionsByScope.scope2.value / totalEmissions) * 100}%` }} />
                  <div className="bg-amber-500 h-full" style={{ width: `${(emissionsByScope.scope3.value / totalEmissions) * 100}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-earth-800 dark:text-earth-100">Scope 1</p>
                    <p className="text-xs text-earth-500">{((emissionsByScope.scope1.value / totalEmissions) * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-earth-800 dark:text-earth-100">Scope 2</p>
                    <p className="text-xs text-earth-500">{((emissionsByScope.scope2.value / totalEmissions) * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-earth-800 dark:text-earth-100">Scope 3</p>
                    <p className="text-xs text-earth-500">{((emissionsByScope.scope3.value / totalEmissions) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Top Emission Sources */}
          <Card variant="default">
            <CardHeader
              title="Top Emission Sources"
              subtitle="Largest contributors to your carbon footprint"
            />
            <div className="space-y-4 mt-4">
              {topEmissionSources.map((source, idx) => {
                const Icon = source.icon;
                return (
                  <div key={idx} className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${source.color.replace('bg-', 'bg-').replace('-500', '-100')} dark:bg-opacity-30 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${source.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-earth-800 dark:text-earth-100">{source.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={source.scope === 'Scope 1' ? 'success' : source.scope === 'Scope 2' ? 'info' : 'warning'} size="sm">
                            {source.scope}
                          </Badge>
                          <span className="font-mono text-sm text-grass-600 dark:text-grass-400">
                            {source.emissions.toLocaleString()} tCO2e
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-grass-100 dark:bg-earth-700 rounded-full overflow-hidden">
                        <div className={`h-full ${source.color} rounded-full`} style={{ width: `${source.percentage}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Reduction Targets */}
          <Card variant="default">
            <CardHeader
              title="Emission Reduction Targets"
              subtitle="Progress towards your climate commitments"
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {reductionTargets.map((target) => (
                <div
                  key={target.year}
                  className={`p-4 rounded-xl border-2 ${
                    target.status === 'on-track' ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700' :
                    target.status === 'net-zero' ? 'border-grass-300 bg-grass-50 dark:bg-grass-900/20 dark:border-grass-700' :
                    'border-grass-200 dark:border-earth-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-earth-800 dark:text-earth-100">{target.year}</span>
                    {target.status === 'on-track' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {target.status === 'net-zero' && <Leaf className="w-5 h-5 text-grass-500" />}
                  </div>
                  <p className="text-sm text-earth-500 dark:text-earth-400">Target</p>
                  <p className="font-mono font-bold text-lg text-earth-800 dark:text-earth-100">
                    {target.target.toLocaleString()} tCO2e
                  </p>
                  {target.actual !== null && (
                    <p className="text-sm text-green-600 mt-1">
                      Actual: {target.actual.toLocaleString()} tCO2e
                    </p>
                  )}
                  <Badge 
                    variant={target.status === 'on-track' ? 'success' : target.status === 'net-zero' ? 'grass' : 'default'} 
                    size="sm" 
                    className="mt-2"
                  >
                    {target.status === 'on-track' ? 'On Track' : target.status === 'net-zero' ? 'Net Zero Goal' : 'Upcoming'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ==================== TRENDS TAB ==================== */}
      {activeTab === 'trends' && (
        <motion.div variants={item} className="space-y-6">
          {/* Monthly Trend Chart */}
          <Card variant="default">
            <CardHeader
              title="Monthly Emission Trends"
              subtitle="Track your emissions over time"
            />
            <div className="mt-6">
              <div className="flex items-end gap-2 h-64">
                {monthlyTrend.map((month, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: `${(month.total / maxMonthlyTotal) * 100}%` }}>
                      <div className="bg-amber-500 rounded-t" style={{ height: `${(month.scope3 / month.total) * 100}%` }} />
                      <div className="bg-blue-500" style={{ height: `${(month.scope2 / month.total) * 100}%` }} />
                      <div className="bg-emerald-500 rounded-b" style={{ height: `${(month.scope1 / month.total) * 100}%` }} />
                    </div>
                    <p className="text-xs text-earth-500 mt-2">{month.month}</p>
                    <p className="text-xs font-mono text-earth-600 dark:text-earth-400">{month.total}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-grass-100 dark:border-earth-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500" />
                  <span className="text-sm text-earth-600 dark:text-earth-400">Scope 1</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500" />
                  <span className="text-sm text-earth-600 dark:text-earth-400">Scope 2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-500" />
                  <span className="text-sm text-earth-600 dark:text-earth-400">Scope 3</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Year over Year Comparison */}
          <Card variant="default">
            <CardHeader
              title="Year-over-Year Comparison"
              subtitle="Annual emission changes"
            />
            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-grass-100 dark:border-earth-700">
                    <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Year</th>
                    <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Scope 1</th>
                    <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Scope 2</th>
                    <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Scope 3</th>
                    <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Total</th>
                    <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyComparison.map((year, idx) => {
                    const prevYear = yearlyComparison[idx - 1];
                    const change = prevYear ? ((year.total - prevYear.total) / prevYear.total * 100).toFixed(1) : null;
                    return (
                      <tr key={year.year} className="border-b border-grass-50 dark:border-earth-800">
                        <td className="p-3 font-bold text-earth-800 dark:text-earth-100">{year.year}</td>
                        <td className="p-3 text-right font-mono text-earth-600 dark:text-earth-300">{year.scope1.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-earth-600 dark:text-earth-300">{year.scope2.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-earth-600 dark:text-earth-300">{year.scope3.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-grass-600 dark:text-grass-400">{year.total.toLocaleString()}</td>
                        <td className="p-3 text-right">
                          {change !== null && (
                            <span className={parseFloat(change) < 0 ? 'text-green-600' : 'text-red-600'}>
                              {parseFloat(change) < 0 ? '' : '+'}{change}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Trend Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="grass" className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <TrendingDown className="w-6 h-6 text-green-600" />
                <h4 className="font-semibold text-earth-800 dark:text-earth-100">Best Improvement</h4>
              </div>
              <p className="text-2xl font-bold text-green-600">-12.5%</p>
              <p className="text-sm text-earth-500">Scope 2 emissions reduced significantly through energy efficiency</p>
            </Card>
            <Card variant="grass" className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Target className="w-6 h-6 text-grass-600" />
                <h4 className="font-semibold text-earth-800 dark:text-earth-100">Target Progress</h4>
              </div>
              <p className="text-2xl font-bold text-grass-600">100%</p>
              <p className="text-sm text-earth-500">2025 reduction target achieved</p>
            </Card>
            <Card variant="default" className="p-4 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <h4 className="font-semibold text-earth-800 dark:text-earth-100">Attention Needed</h4>
              </div>
              <p className="text-2xl font-bold text-amber-600">+3.1%</p>
              <p className="text-sm text-earth-500">Scope 3 emissions increased this quarter</p>
            </Card>
          </div>
        </motion.div>
      )}

      {/* ==================== BENCHMARKS TAB ==================== */}
      {activeTab === 'benchmarks' && (
        <motion.div variants={item} className="space-y-6">
          <Card variant="default">
            <CardHeader
              title="Industry Benchmarking"
              subtitle="Compare your performance against industry standards"
            />
            <div className="space-y-6 mt-4">
              {benchmarks.map((benchmark, idx) => (
                <div key={idx} className="p-4 bg-grass-50 dark:bg-earth-800 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-grass-600" />
                      <h4 className="font-medium text-earth-800 dark:text-earth-100">{benchmark.category}</h4>
                    </div>
                    <Badge 
                      variant={benchmark.trend === 'improving' ? 'success' : benchmark.trend === 'stable' ? 'default' : 'warning'}
                      size="sm"
                    >
                      {benchmark.trend}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-earth-500">Industry Average</p>
                      <p className="font-mono font-bold text-earth-600 dark:text-earth-300">{benchmark.avgEmissions.toLocaleString()} tCO2e</p>
                    </div>
                    <div>
                      <p className="text-xs text-earth-500">Your Emissions</p>
                      <p className="font-mono font-bold text-grass-600 dark:text-grass-400">{benchmark.yourEmissions.toLocaleString()} tCO2e</p>
                    </div>
                    <div>
                      <p className="text-xs text-earth-500">Percentile Rank</p>
                      <p className="font-mono font-bold text-earth-800 dark:text-earth-100">{benchmark.percentile}th</p>
                    </div>
                  </div>
                  <div className="relative h-4 bg-gray-200 dark:bg-earth-700 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 w-full" />
                    <div 
                      className="absolute inset-y-0 w-1 bg-grass-800 dark:bg-white"
                      style={{ left: `${benchmark.percentile}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-earth-500 mt-1">
                    <span>Best</span>
                    <span>Average</span>
                    <span>Worst</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Benchmark Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="grass">
              <CardHeader
                title="Your Ranking"
                subtitle="Overall industry position"
              />
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-grass-200 dark:bg-grass-900/40 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-12 h-12 text-grass-600" />
                  </div>
                  <p className="text-4xl font-bold text-earth-800 dark:text-earth-100">Top 25%</p>
                  <p className="text-earth-500 dark:text-earth-400 mt-2">
                    Better than 75% of industry peers
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="default">
              <CardHeader
                title="Improvement Opportunities"
                subtitle="Areas to focus for better benchmarking"
              />
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3 p-3 bg-grass-50 dark:bg-earth-800 rounded-lg">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-earth-800 dark:text-earth-100">Renewable Energy</p>
                    <p className="text-sm text-earth-500">Increase to 50% for top 10% ranking</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-grass-50 dark:bg-earth-800 rounded-lg">
                  <Truck className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-earth-800 dark:text-earth-100">Supply Chain</p>
                    <p className="text-sm text-earth-500">Optimize logistics for 15% reduction</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-grass-50 dark:bg-earth-800 rounded-lg">
                  <Factory className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="font-medium text-earth-800 dark:text-earth-100">Process Efficiency</p>
                    <p className="text-sm text-earth-500">Target 5% more fuel reduction</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* ==================== AI INSIGHTS TAB ==================== */}
      {activeTab === 'insights' && (
        <motion.div variants={item} className="space-y-6">
          <Card variant="grass">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-grass-200 dark:bg-earth-700 flex items-center justify-center">
                <Brain className="w-6 h-6 text-grass-600" />
              </div>
              <div>
                <h3 className="font-semibold text-earth-800 dark:text-earth-100">AI-Powered Insights</h3>
                <p className="text-sm text-earth-600 dark:text-earth-400">
                  Analyzing your emission data to provide actionable recommendations
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Analysis
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            {aiInsights.map((insight) => (
              <Card key={insight.id} variant="default">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    insight.type === 'opportunity' ? 'bg-grass-100 dark:bg-grass-900/30' :
                    insight.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {insight.type === 'opportunity' ? <Lightbulb className="w-5 h-5 text-grass-600" /> :
                     insight.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
                     <CheckCircle className="w-5 h-5 text-green-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-earth-800 dark:text-earth-100">{insight.title}</h4>
                      <Badge 
                        variant={insight.priority === 'high' ? 'error' : insight.priority === 'medium' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {insight.priority} priority
                      </Badge>
                    </div>
                    <p className="text-earth-600 dark:text-earth-300 mb-3">{insight.description}</p>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-earth-500">Impact:</span>
                        <span className={`font-bold ${
                          insight.impact.startsWith('-') ? 'text-green-600' :
                          insight.impact.startsWith('+$') ? 'text-grass-600' :
                          'text-amber-600'
                        }`}>{insight.impact}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-earth-500">Confidence:</span>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-2 bg-grass-100 dark:bg-earth-700 rounded-full overflow-hidden">
                            <div className="h-full bg-grass-500 rounded-full" style={{ width: `${insight.confidence}%` }} />
                          </div>
                          <span className="text-xs text-earth-500">{insight.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-grass-50 dark:bg-earth-800 rounded-lg">
                      <p className="text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">Recommended Actions:</p>
                      <ul className="space-y-1">
                        {insight.actions.map((action, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-earth-600 dark:text-earth-400">
                            <ArrowRight className="w-4 h-4 text-grass-500" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* AI Summary */}
          <Card variant="default" className="border-grass-300 dark:border-grass-700">
            <CardHeader
              title="AI Summary"
              subtitle="Key takeaways from your emission data"
            />
            <div className="mt-4 p-4 bg-grass-50 dark:bg-earth-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-grass-600 shrink-0 mt-0.5" />
                <div className="text-sm text-earth-600 dark:text-earth-300 space-y-2">
                  <p>
                    <strong>Overall Performance:</strong> Your emissions are trending downward with a 4.8% reduction compared to the previous period. 
                    You're currently performing better than 75% of industry peers.
                  </p>
                  <p>
                    <strong>Key Focus Area:</strong> Scope 2 emissions represent your largest reduction opportunity. 
                    Transitioning to renewable energy could yield the highest impact on your carbon footprint.
                  </p>
                  <p>
                    <strong>Watch Point:</strong> Scope 3 emissions are increasing. Consider reviewing your supply chain 
                    and transportation partners to identify optimization opportunities.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Analytics;
