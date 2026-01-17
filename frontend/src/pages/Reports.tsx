import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Calendar,
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  FileBadge,
  Eye,
  Send,
  Trash2,
  MoreVertical,
  Plus,
  Settings,
  Leaf,
  Globe,
  Loader2,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { EmptyReports } from '@/components/ui/EmptyState';
import { Input, Select, Checkbox, Toggle } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import { projectsApi, reportsApi, calculationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// Reporting standards
const reportingStandards = [
  { id: 'eu_cbam', name: 'EU CBAM', description: 'European Union Carbon Border Adjustment Mechanism', region: 'Europe', color: 'blue' },
  { id: 'uk_cbam', name: 'UK CBAM', description: 'United Kingdom Carbon Border Adjustment Mechanism', region: 'United Kingdom', color: 'red' },
  { id: 'china_carbon_market', name: 'China Carbon Market', description: 'China National Carbon Trading Market', region: 'China', color: 'yellow' },
  { id: 'k_esg', name: 'K-ESG', description: 'Korea ESG Disclosure Standards', region: 'South Korea', color: 'green' },
  { id: 'maff_esg', name: 'MAFF ESG', description: 'Japan Ministry of Agriculture ESG Guidelines', region: 'Japan', color: 'purple' },
  { id: 'thai_esg', name: 'Thai ESG', description: 'Thailand ESG Reporting Standards', region: 'Thailand', color: 'orange' },
];

const reportTypes = [
  { id: 'ghg', name: 'GHG Inventory Report', icon: Leaf, description: 'Complete greenhouse gas emissions inventory' },
  { id: 'cfp', name: 'Carbon Footprint Product', icon: FileSpreadsheet, description: 'Product-level carbon footprint analysis' },
  { id: 'cfo', name: 'Carbon Footprint Organization', icon: Building2, description: 'Organization-level carbon footprint' },
  { id: 'scope3', name: 'Scope 3 Analysis', icon: Globe, description: 'Detailed supply chain emissions report' },
  { id: 'compliance', name: 'Compliance Report', icon: FileBadge, description: 'Standard-specific compliance report' },
];

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

type ReportStatus = 'completed' | 'generating' | 'pending' | 'error';

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  generating: { label: 'Generating', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  error: { label: 'Error', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
};

interface Report {
  id: string;
  name: string;
  type: string;
  standard?: string;
  projectId: string;
  projectName?: string;
  format: string;
  status: ReportStatus;
  createdAt: string;
  completedAt?: string;
  size?: string;
  emissions?: number;
  pages?: number;
}

interface Project {
  id: string;
  name: string;
  organization?: string;
}

export const Reports: React.FC = () => {
  const { user } = useAuthStore();

  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    standard: '',
    format: 'pdf',
    startDate: '',
    endDate: '',
    includeSections: {
      executiveSummary: true,
      scopeBreakdown: true,
      categoryAnalysis: true,
      trendAnalysis: true,
      methodology: false,
      dataTables: false,
    },
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const mapReportStatus = (status: string): ReportStatus => {
    switch (status?.toLowerCase()) {
      case 'generated':
      case 'signed':
      case 'completed':
        return 'completed';
      case 'generating':
      case 'processing':
        return 'generating';
      case 'draft':
      case 'pending':
        return 'pending';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'completed';
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load projects
      const projectsResponse = await projectsApi.getAll();
      if (projectsResponse.success && projectsResponse.data) {
        const projectList = projectsResponse.data as Project[];
        setProjects(projectList);

        // Load reports from all projects via backend API
        const allReports: Report[] = [];
        for (const project of projectList) {
          try {
            const reportsResponse = await reportsApi.getByProject(project.id);
            if (reportsResponse.success && reportsResponse.data) {
              const projectReports = (reportsResponse.data as any[]).map((r: any) => ({
                id: r.id,
                name: `${r.standard?.toUpperCase() || 'GHG'} Report - ${project.name}`,
                type: r.standard || 'GHG Inventory Report',
                standard: r.standard,
                projectId: project.id,
                projectName: project.name,
                format: r.format?.toUpperCase() || 'PDF',
                status: mapReportStatus(r.status),
                createdAt: r.createdAt,
                completedAt: r.signedAt,
                emissions: r.reportData?.totals?.total,
              }));
              allReports.push(...projectReports);
            }
          } catch (projErr) {
            console.warn(`Failed to load reports for project ${project.id}:`, projErr);
          }
        }
        setReports(allReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!formData.projectId || !selectedReportType) {
      setError('Please select a project and report type');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      // Get project details
      const project = projects.find(p => p.id === formData.projectId);

      // Generate report via API
      const response = await reportsApi.generate({
        projectId: formData.projectId,
        type: selectedReportType,
        standard: formData.standard || undefined,
        format: formData.format,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        options: formData.includeSections,
      });

      if (response.success && response.data) {
        const data = response.data as any;
        // Add new report to list
        const newReport: Report = {
          id: data.id || `report-${Date.now()}`,
          name: `${getReportTypeName(selectedReportType)} - ${project?.name || 'Project'}`,
          type: getReportTypeName(selectedReportType),
          standard: formData.standard,
          projectId: formData.projectId,
          projectName: project?.name,
          format: formData.format.toUpperCase(),
          status: mapReportStatus(data.status || 'completed'),
          createdAt: data.createdAt || new Date().toISOString(),
          completedAt: data.completedAt || new Date().toISOString(),
          emissions: data.totals?.total || 0,
        };

        // Add to reports list (will be refreshed from backend on next load)
        setReports(prev => [newReport, ...prev]);

        // Close modal and reset form
        setShowGenerateModal(false);
        setSelectedReportType(null);
        resetForm();
      } else {
        setError(response.error || 'Failed to generate report');
      }
    } catch (err) {
      setError('Failed to generate report');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (report: Report) => {
    try {
      const response = await reportsApi.download(report.id, report.format.toLowerCase());
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}.${report.format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await reportsApi.delete(reportId);
      if (response.success) {
        // Remove from local state
        setReports(prev => prev.filter(r => r.id !== reportId));
      } else {
        setError(response.error || 'Failed to delete report');
      }
    } catch (err) {
      // If API fails, still remove from local state for now
      setReports(prev => prev.filter(r => r.id !== reportId));
      console.error('Failed to delete report:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      standard: '',
      format: 'pdf',
      startDate: '',
      endDate: '',
      includeSections: {
        executiveSummary: true,
        scopeBreakdown: true,
        categoryAnalysis: true,
        trendAnalysis: true,
        methodology: false,
        dataTables: false,
      },
    });
  };

  const getReportTypeName = (typeId: string): string => {
    const type = reportTypes.find(t => t.id === typeId);
    return type?.name || 'Report';
  };

  const filteredReports = reports.filter((report) => {
    if (activeTab === 'all') return true;
    return report.status === activeTab;
  });

  const getFormatIcon = (format: string) => {
    switch (format.toUpperCase()) {
      case 'PDF':
        return FileText;
      case 'EXCEL':
      case 'XLSX':
        return FileSpreadsheet;
      default:
        return FileText;
    }
  };

  const reportCounts = {
    all: reports.length,
    completed: reports.filter(r => r.status === 'completed').length,
    generating: reports.filter(r => r.status === 'generating').length,
    pending: reports.filter(r => r.status === 'pending').length,
  };

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
            Reports
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Generate and manage ESG reports under international standards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <IconButton
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            variant="outline"
            onClick={loadData}
            disabled={loading}
          />
          <Button variant="primary" onClick={() => setShowGenerateModal(true)}>
            <Plus className="w-4 h-4" />
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

      {/* Reporting Standards */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold text-earth-800 dark:text-earth-100 mb-4">
          Supported Reporting Standards
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {reportingStandards.map((standard) => (
            <Card
              key={standard.id}
              variant="default"
              padding="sm"
              hover
              className="cursor-pointer"
              onClick={() => {
                setFormData(prev => ({ ...prev, standard: standard.id }));
                setSelectedReportType('compliance');
                setShowGenerateModal(true);
              }}
            >
              <div className="text-center py-2">
                <div className={`w-10 h-10 mx-auto rounded-xl bg-${standard.color}-100 dark:bg-${standard.color}-900/30 flex items-center justify-center mb-2`}>
                  <MapPin className={`w-5 h-5 text-${standard.color}-600`} />
                </div>
                <h3 className="font-medium text-earth-800 dark:text-earth-100 text-sm">
                  {standard.name}
                </h3>
                <p className="text-xs text-earth-500 dark:text-earth-400 mt-0.5">
                  {standard.region}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Report Type Cards */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold text-earth-800 dark:text-earth-100 mb-4">
          Report Types
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            const count = reports.filter((r) => r.type.toLowerCase().includes(type.name.toLowerCase().split(' ')[0])).length;
            return (
              <Card
                key={type.id}
                variant="default"
                padding="sm"
                hover
                className="cursor-pointer"
                onClick={() => {
                  setSelectedReportType(type.id);
                  setShowGenerateModal(true);
                }}
              >
                <div className="flex flex-col items-center text-center py-2">
                  <div className="w-12 h-12 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center mb-3">
                    <Icon className="w-6 h-6 text-grass-600 dark:text-grass-400" />
                  </div>
                  <h3 className="font-medium text-earth-800 dark:text-earth-100 text-sm">
                    {type.name}
                  </h3>
                  <p className="text-xs text-earth-500 dark:text-earth-400 mt-1">
                    {count} report{count !== 1 ? 's' : ''}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Reports List */}
      <motion.div variants={item}>
        <Card variant="default">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader
              title="Generated Reports"
              subtitle="View and download your reports"
              action={
                <TabsList variant="pills">
                  <TabsTrigger value="all" variant="pills">All ({reportCounts.all})</TabsTrigger>
                  <TabsTrigger value="completed" variant="pills">Completed ({reportCounts.completed})</TabsTrigger>
                  <TabsTrigger value="generating" variant="pills">In Progress ({reportCounts.generating})</TabsTrigger>
                </TabsList>
              }
            />

            <TabsContent value={activeTab} forceMount className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-grass-600" />
                  <span className="ml-2 text-earth-500">Loading reports...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <EmptyReports onGenerate={() => setShowGenerateModal(true)} />
              ) : (
                <div className="divide-y divide-grass-100 dark:divide-earth-700">
                  {filteredReports.map((report) => {
                    const status = statusConfig[report.status];
                    const StatusIcon = status.icon;
                    const FormatIcon = getFormatIcon(report.format);

                    return (
                      <div
                        key={report.id}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                            <FormatIcon className="w-6 h-6 text-grass-600 dark:text-grass-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-earth-800 dark:text-earth-100">
                              {report.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-earth-500 dark:text-earth-400">
                                {report.type}
                              </span>
                              {report.standard && (
                                <>
                                  <span className="text-earth-300 dark:text-earth-600">•</span>
                                  <Badge variant="default" size="sm">
                                    {reportingStandards.find(s => s.id === report.standard)?.name || report.standard}
                                  </Badge>
                                </>
                              )}
                              <span className="text-earth-300 dark:text-earth-600">•</span>
                              <span className="text-sm text-earth-500 dark:text-earth-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                              {report.emissions !== undefined && (
                                <>
                                  <span className="text-earth-300 dark:text-earth-600">•</span>
                                  <span className="text-sm font-medium text-grass-600">
                                    {(report.emissions / 1000).toFixed(2)} tCO₂e
                                  </span>
                                </>
                              )}
                            </div>
                            {report.status === 'generating' && (
                              <div className="mt-2 w-48">
                                <Progress value={65} size="sm" variant="grass" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </div>

                          <div className="flex items-center gap-1">
                            {report.status === 'completed' && (
                              <>
                                <IconButton
                                  icon={<Eye className="w-4 h-4" />}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {/* View report */}}
                                />
                                <IconButton
                                  icon={<Download className="w-4 h-4" />}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadReport(report)}
                                />
                              </>
                            )}
                            <IconButton
                              icon={<Trash2 className="w-4 h-4" />}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>

      {/* Generate Report Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setSelectedReportType(null);
          resetForm();
        }}
        title="Generate Report"
        size="lg"
      >
        <div className="space-y-6">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-3">
              Report Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedReportType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedReportType(type.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20'
                        : 'border-grass-200 dark:border-earth-700 hover:border-grass-300 dark:hover:border-earth-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-grass-500 text-white' : 'bg-grass-100 dark:bg-earth-700 text-grass-600 dark:text-grass-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-earth-800 dark:text-earth-100">
                        {type.name}
                      </h4>
                      <p className="text-xs text-earth-500 dark:text-earth-400 mt-0.5">
                        {type.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-4">
            <Select
              label="Project"
              required
              value={formData.projectId}
              onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
              options={[
                { value: '', label: 'Select project...' },
                ...projects.map(p => ({ value: p.id, label: p.name })),
              ]}
            />

            <Select
              label="Reporting Standard (Optional)"
              value={formData.standard}
              onChange={(e) => setFormData(prev => ({ ...prev, standard: e.target.value }))}
              options={[
                { value: '', label: 'Select standard...' },
                ...reportingStandards.map(s => ({ value: s.id, label: `${s.name} - ${s.description}` })),
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date (Optional)"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <Input
                label="End Date (Optional)"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <Select
              label="Output Format"
              value={formData.format}
              onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
              options={[
                { value: 'pdf', label: 'PDF Document' },
                { value: 'excel', label: 'Excel Spreadsheet' },
                { value: 'csv', label: 'CSV Data' },
                { value: 'json', label: 'JSON Data' },
              ]}
            />

            {/* Report Options */}
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-3">
                Include Sections
              </label>
              <div className="space-y-2">
                <Checkbox
                  label="Executive Summary"
                  checked={formData.includeSections.executiveSummary}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    includeSections: { ...prev.includeSections, executiveSummary: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Emissions Breakdown by Scope"
                  checked={formData.includeSections.scopeBreakdown}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    includeSections: { ...prev.includeSections, scopeBreakdown: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Category Analysis"
                  checked={formData.includeSections.categoryAnalysis}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    includeSections: { ...prev.includeSections, categoryAnalysis: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Trend Analysis & Charts"
                  checked={formData.includeSections.trendAnalysis}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    includeSections: { ...prev.includeSections, trendAnalysis: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Methodology Notes"
                  checked={formData.includeSections.methodology}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    includeSections: { ...prev.includeSections, methodology: e.target.checked }
                  }))}
                />
                <Checkbox
                  label="Data Tables (Appendix)"
                  checked={formData.includeSections.dataTables}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    includeSections: { ...prev.includeSections, dataTables: e.target.checked }
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowGenerateModal(false);
              setSelectedReportType(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerateReport}
            disabled={!selectedReportType || !formData.projectId || generating}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Generate Report
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
};

export default Reports;
