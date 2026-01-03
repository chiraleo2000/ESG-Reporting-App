import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { EmptyReports } from '@/components/ui/EmptyState';
import { Input, Select, Checkbox, Toggle } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';

// Mock data
const mockReports = [
  {
    id: '1',
    name: 'Annual Carbon Footprint Report 2024',
    type: 'GHG Inventory',
    project: 'Corporate HQ Carbon Footprint 2024',
    format: 'PDF',
    status: 'completed' as const,
    createdAt: '2024-03-15T10:30:00',
    completedAt: '2024-03-15T10:45:00',
    size: '2.4 MB',
    emissions: 6201,
    pages: 24,
  },
  {
    id: '2',
    name: 'Q1 Emissions Summary',
    type: 'Quarterly Report',
    project: 'Corporate HQ Carbon Footprint 2024',
    format: 'Excel',
    status: 'completed' as const,
    createdAt: '2024-04-01T09:00:00',
    completedAt: '2024-04-01T09:15:00',
    size: '856 KB',
    emissions: 1550,
    pages: 8,
  },
  {
    id: '3',
    name: 'Supply Chain Analysis Report',
    type: 'Scope 3 Report',
    project: 'Supply Chain Emissions Analysis',
    format: 'PDF',
    status: 'generating' as const,
    createdAt: '2024-04-10T14:20:00',
    completedAt: null,
    size: null,
    emissions: 5820,
    pages: null,
  },
  {
    id: '4',
    name: 'TCFD Climate Report',
    type: 'TCFD Disclosure',
    project: 'Corporate HQ Carbon Footprint 2024',
    format: 'PDF',
    status: 'pending' as const,
    createdAt: '2024-04-12T08:00:00',
    completedAt: null,
    size: null,
    emissions: 6201,
    pages: null,
  },
  {
    id: '5',
    name: 'CDP Climate Response 2024',
    type: 'CDP Submission',
    project: 'Corporate HQ Carbon Footprint 2024',
    format: 'XML',
    status: 'error' as const,
    createdAt: '2024-04-08T11:30:00',
    completedAt: null,
    size: null,
    emissions: 6201,
    pages: null,
  },
];

const reportTypes = [
  { id: 'ghg', name: 'GHG Inventory Report', icon: Leaf, description: 'Complete greenhouse gas emissions inventory' },
  { id: 'quarterly', name: 'Quarterly Summary', icon: FileSpreadsheet, description: 'Periodic emissions summary report' },
  { id: 'tcfd', name: 'TCFD Disclosure', icon: FileBadge, description: 'Task Force on Climate-related Financial Disclosures' },
  { id: 'cdp', name: 'CDP Climate', icon: FileText, description: 'Carbon Disclosure Project submission' },
  { id: 'scope3', name: 'Scope 3 Analysis', icon: Building2, description: 'Detailed supply chain emissions report' },
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

export const Reports: React.FC = () => {
  const [reports] = useState(mockReports);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const filteredReports = reports.filter((report) => {
    if (activeTab === 'all') return true;
    return report.status === activeTab;
  });

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF':
        return FileText;
      case 'Excel':
        return FileSpreadsheet;
      default:
        return FileText;
    }
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
            Generate and manage ESG reports and disclosures
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowGenerateModal(true)}>
          <Plus className="w-4 h-4" />
          Generate Report
        </Button>
      </motion.div>

      {/* Report Type Cards */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            const count = reports.filter((r) => r.type.toLowerCase().includes(type.id)).length;
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
                  <TabsTrigger value="all" variant="pills">All</TabsTrigger>
                  <TabsTrigger value="completed" variant="pills">Completed</TabsTrigger>
                  <TabsTrigger value="generating" variant="pills">In Progress</TabsTrigger>
                </TabsList>
              }
            />

            <TabsContent value={activeTab} forceMount className="mt-0">
              {filteredReports.length === 0 ? (
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
                              <span className="text-earth-300 dark:text-earth-600">•</span>
                              <span className="text-sm text-earth-500 dark:text-earth-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                              {report.size && (
                                <>
                                  <span className="text-earth-300 dark:text-earth-600">•</span>
                                  <span className="text-sm text-earth-500 dark:text-earth-400">
                                    {report.size}
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
                                />
                                <IconButton
                                  icon={<Download className="w-4 h-4" />}
                                  variant="ghost"
                                  size="sm"
                                />
                                <IconButton
                                  icon={<Send className="w-4 h-4" />}
                                  variant="ghost"
                                  size="sm"
                                />
                              </>
                            )}
                            <IconButton
                              icon={<MoreVertical className="w-4 h-4" />}
                              variant="ghost"
                              size="sm"
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
              options={[
                { value: '', label: 'Select project...' },
                { value: '1', label: 'Corporate HQ Carbon Footprint 2024' },
                { value: '2', label: 'Supply Chain Emissions Analysis' },
              ]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Date" type="date" />
              <Input label="End Date" type="date" />
            </div>

            <Select
              label="Output Format"
              options={[
                { value: 'pdf', label: 'PDF Document' },
                { value: 'excel', label: 'Excel Spreadsheet' },
                { value: 'csv', label: 'CSV Data' },
              ]}
            />

            {/* Report Options */}
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-3">
                Include Sections
              </label>
              <div className="space-y-2">
                <Checkbox label="Executive Summary" defaultChecked />
                <Checkbox label="Emissions Breakdown by Scope" defaultChecked />
                <Checkbox label="Category Analysis" defaultChecked />
                <Checkbox label="Trend Analysis & Charts" defaultChecked />
                <Checkbox label="Methodology Notes" />
                <Checkbox label="Data Tables (Appendix)" />
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
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowGenerateModal(false);
              setSelectedReportType(null);
            }}
            disabled={!selectedReportType}
          >
            <FileText className="w-4 h-4" />
            Generate Report
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
};

export default Reports;
