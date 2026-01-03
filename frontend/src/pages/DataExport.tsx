import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  CheckCircle,
  Clock,
  Trash,
  Eye,
  RefreshCw,
  Calendar,
  Filter,
  FolderDown,
  Archive,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, Checkbox } from '@/components/ui/Input';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Export options
const exportOptions = [
  {
    id: 'activities',
    name: 'Activities Data',
    description: 'All emission activities with calculations',
    formats: ['xlsx', 'csv', 'json'],
    icon: FileSpreadsheet,
  },
  {
    id: 'reports',
    name: 'Generated Reports',
    description: 'Download compliance reports in various formats',
    formats: ['pdf', 'xlsx', 'docx'],
    icon: FileText,
  },
  {
    id: 'emission_factors',
    name: 'Emission Factors',
    description: 'Export emission factors database',
    formats: ['xlsx', 'csv'],
    icon: File,
  },
  {
    id: 'audit_logs',
    name: 'Audit Logs',
    description: 'Complete audit trail for compliance',
    formats: ['xlsx', 'csv', 'pdf'],
    icon: Archive,
  },
];

// Export history
const exportHistory = [
  {
    id: '1',
    fileName: 'Manufacturing_Plant_2025_EU_CBAM_Report.pdf',
    type: 'report',
    format: 'pdf',
    project: 'Manufacturing Plant 2025',
    size: '2.4 MB',
    exportedAt: '2025-12-28T16:30:00Z',
    exportedBy: 'Admin User',
    status: 'completed',
  },
  {
    id: '2',
    fileName: 'activities_export_2025-12-27.xlsx',
    type: 'activities',
    format: 'xlsx',
    project: 'All Projects',
    size: '856 KB',
    exportedAt: '2025-12-27T14:15:00Z',
    exportedBy: 'Project Manager',
    status: 'completed',
  },
  {
    id: '3',
    fileName: 'emission_factors_database.csv',
    type: 'emission_factors',
    format: 'csv',
    project: 'Global',
    size: '124 KB',
    exportedAt: '2025-12-26T11:00:00Z',
    exportedBy: 'Admin User',
    status: 'completed',
  },
  {
    id: '4',
    fileName: 'audit_log_2025_q4.xlsx',
    type: 'audit_logs',
    format: 'xlsx',
    project: 'All Projects',
    size: '1.2 MB',
    exportedAt: '2025-12-25T09:30:00Z',
    exportedBy: 'External Auditor',
    status: 'completed',
  },
  {
    id: '5',
    fileName: 'bulk_reports_archive.zip',
    type: 'report',
    format: 'zip',
    project: 'Manufacturing Plant 2025',
    size: '8.7 MB',
    exportedAt: '2025-12-29T10:00:00Z',
    exportedBy: 'Admin User',
    status: 'processing',
  },
];

export const DataExport: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('xlsx');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const toggleType = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (format: string) => {
    if (format === 'pdf') return FileText;
    if (format === 'xlsx' || format === 'csv') return FileSpreadsheet;
    return File;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
          Export Center
        </h1>
        <p className="text-earth-500 dark:text-earth-400 mt-1">
          Export reports, data, and audit logs in various formats
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-grass-200 dark:bg-earth-600 flex items-center justify-center">
              <FolderDown className="w-5 h-5 text-grass-600 dark:text-grass-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Total Exports</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{exportHistory.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Reports</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {exportHistory.filter(e => e.type === 'report').length}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Data Exports</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {exportHistory.filter(e => e.type === 'activities').length}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Processing</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {exportHistory.filter(e => e.status === 'processing').length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Export Options */}
      <motion.div variants={item}>
        <Card variant="default">
          <CardHeader
            title="Create New Export"
            subtitle="Select data types and format for export"
          />
          <div className="space-y-6 mt-4">
            {/* Project Selection */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                  Project
                </label>
                <Select
                  options={[
                    { value: 'all', label: 'All Projects' },
                    { value: 'proj1', label: 'Manufacturing Plant 2025' },
                    { value: 'proj2', label: 'Office Operations Carbon Footprint' },
                    { value: 'proj3', label: 'Supply Chain Scope 3 Assessment' },
                  ]}
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-2">
                  Format
                </label>
                <Select
                  options={[
                    { value: 'xlsx', label: 'Excel (.xlsx)' },
                    { value: 'csv', label: 'CSV (.csv)' },
                    { value: 'pdf', label: 'PDF (.pdf)' },
                    { value: 'json', label: 'JSON (.json)' },
                  ]}
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                />
              </div>
            </div>

            {/* Data Type Selection */}
            <div>
              <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-3">
                Select Data to Export
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedTypes.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      onClick={() => toggleType(option.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20'
                          : 'border-grass-100 dark:border-earth-700 hover:border-grass-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-grass-500 text-white' : 'bg-grass-100 dark:bg-earth-700 text-grass-600 dark:text-grass-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-earth-800 dark:text-earth-100">{option.name}</p>
                          <p className="text-sm text-earth-500 dark:text-earth-400 mt-0.5">
                            {option.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {option.formats.map(fmt => (
                              <Badge key={fmt} variant="default" size="sm">.{fmt}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-grass-500 bg-grass-500' : 'border-earth-300 dark:border-earth-600'
                        }`}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" disabled={selectedTypes.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export Selected Data
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Export History */}
      <motion.div variants={item}>
        <Card variant="default">
          <CardHeader
            title="Export History"
            subtitle="Download previous exports"
            action={
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-grass-100 dark:border-earth-700">
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">File</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Type</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Project</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Size</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Date</th>
                  <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exportHistory.map((exp) => {
                  const FileIcon = getFileIcon(exp.format);
                  return (
                    <tr
                      key={exp.id}
                      className="border-b border-grass-50 dark:border-earth-800 hover:bg-grass-50 dark:hover:bg-earth-800/50 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FileIcon className="w-4 h-4 text-earth-400" />
                          <span className="font-medium text-earth-800 dark:text-earth-100">{exp.fileName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="default" size="sm">{exp.type.replace('_', ' ')}</Badge>
                      </td>
                      <td className="p-3 text-earth-600 dark:text-earth-300">{exp.project}</td>
                      <td className="p-3 text-earth-600 dark:text-earth-300">{exp.size}</td>
                      <td className="p-3">
                        {exp.status === 'completed' ? (
                          <Badge variant="grass" size="sm">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            <Clock className="w-3 h-3 mr-1 animate-spin" />
                            Processing
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-sm text-earth-500 dark:text-earth-400">
                        {formatDate(exp.exportedAt)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" disabled={exp.status !== 'completed'}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DataExport;
