import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Trash,
  Eye,
  RefreshCw,
  HelpCircle,
  File,
  FolderUp,
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

// Demo import history
const importHistory = [
  {
    id: '1',
    fileName: 'manufacturing_activities_2025.xlsx',
    type: 'activities',
    project: 'Manufacturing Plant 2025',
    status: 'completed',
    recordsImported: 14,
    recordsFailed: 0,
    importedAt: '2025-12-28T10:30:00Z',
    importedBy: 'Admin User',
  },
  {
    id: '2',
    fileName: 'office_electricity_bills.csv',
    type: 'activities',
    project: 'Office Operations Carbon Footprint',
    status: 'completed',
    recordsImported: 12,
    recordsFailed: 1,
    importedAt: '2025-12-27T15:45:00Z',
    importedBy: 'Project Manager',
  },
  {
    id: '3',
    fileName: 'emission_factors_custom.xlsx',
    type: 'emission_factors',
    project: 'Global',
    status: 'failed',
    recordsImported: 0,
    recordsFailed: 25,
    importedAt: '2025-12-26T09:15:00Z',
    importedBy: 'Admin User',
    error: 'Invalid column format',
  },
  {
    id: '4',
    fileName: 'fleet_fuel_records.csv',
    type: 'activities',
    project: 'Manufacturing Plant 2025',
    status: 'processing',
    recordsImported: 0,
    recordsFailed: 0,
    importedAt: '2025-12-29T14:00:00Z',
    importedBy: 'Admin User',
  },
];

// Import templates
const templates = [
  { name: 'Activities Import Template', description: 'Import activities data with scope, quantity, and emission factors', format: 'xlsx' },
  { name: 'Emission Factors Template', description: 'Import custom emission factors', format: 'xlsx' },
  { name: 'Bulk Activities (CSV)', description: 'Simple CSV format for quick data entry', format: 'csv' },
  { name: 'GHG Inventory Template', description: 'Full GHG inventory with all scopes', format: 'xlsx' },
];

export const DataImport: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
          Data Import
        </h1>
        <p className="text-earth-500 dark:text-earth-400 mt-1">
          Import activities, emission factors, and other data from external sources
        </p>
      </motion.div>

      {/* Upload Area */}
      <motion.div variants={item}>
        <Card variant="default">
          <CardHeader
            title="Upload Files"
            subtitle="Drag and drop files or click to browse"
            action={
              <Select
                options={[
                  { value: '', label: 'Select Project' },
                  { value: 'proj1', label: 'Manufacturing Plant 2025' },
                  { value: 'proj2', label: 'Office Operations Carbon Footprint' },
                  { value: 'proj3', label: 'Supply Chain Scope 3 Assessment' },
                ]}
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              />
            }
          />
          <div
            className={`mt-4 border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-grass-500 bg-grass-50 dark:bg-grass-900/20'
                : 'border-grass-200 dark:border-earth-700 hover:border-grass-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              // Handle file drop
            }}
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-grass-100 dark:bg-earth-700 flex items-center justify-center mb-4">
              <FolderUp className="w-8 h-8 text-grass-600 dark:text-grass-400" />
            </div>
            <p className="text-earth-800 dark:text-earth-100 font-medium mb-2">
              Drop your files here, or{' '}
              <button className="text-grass-600 dark:text-grass-400 hover:underline">
                browse
              </button>
            </p>
            <p className="text-sm text-earth-500 dark:text-earth-400">
              Supports: .xlsx, .xls, .csv (max 10MB)
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Templates */}
      <motion.div variants={item}>
        <Card variant="grass">
          <CardHeader
            title="Download Templates"
            subtitle="Use these templates to ensure correct data format"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {templates.map((template, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-white dark:bg-earth-800 rounded-xl border border-grass-100 dark:border-earth-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                    {template.format === 'xlsx' ? (
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    ) : (
                      <FileText className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-earth-800 dark:text-earth-100">{template.name}</p>
                    <p className="text-sm text-earth-500 dark:text-earth-400">{template.description}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Import History */}
      <motion.div variants={item}>
        <Card variant="default">
          <CardHeader
            title="Import History"
            subtitle="Recent file imports and their status"
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
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Status</th>
                  <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Records</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Date</th>
                  <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((imp) => (
                  <tr
                    key={imp.id}
                    className="border-b border-grass-50 dark:border-earth-800 hover:bg-grass-50 dark:hover:bg-earth-800/50 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4 text-earth-400" />
                        <span className="font-medium text-earth-800 dark:text-earth-100">{imp.fileName}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="default" size="sm">{imp.type.replace('_', ' ')}</Badge>
                    </td>
                    <td className="p-3 text-earth-600 dark:text-earth-300">{imp.project}</td>
                    <td className="p-3">
                      {imp.status === 'completed' && (
                        <Badge variant="grass" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                      {imp.status === 'failed' && (
                        <Badge variant="error" size="sm">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      {imp.status === 'processing' && (
                        <Badge variant="warning" size="sm">
                          <Clock className="w-3 h-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-green-600">{imp.recordsImported}</span>
                      {imp.recordsFailed > 0 && (
                        <span className="text-red-500 ml-2">/ {imp.recordsFailed} failed</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-earth-500 dark:text-earth-400">
                      {formatDate(imp.importedAt)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Help Section */}
      <motion.div variants={item}>
        <Card variant="default" className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-earth-800 dark:text-earth-100">Import Tips</h3>
              <ul className="mt-2 space-y-1 text-sm text-earth-600 dark:text-earth-400">
                <li>• Download and use the templates to ensure correct column formatting</li>
                <li>• Activity data should include scope (1, 2, or 3), quantity, and unit</li>
                <li>• For large datasets, consider splitting into multiple smaller files</li>
                <li>• Date formats should be YYYY-MM-DD</li>
                <li>• Numeric values should not include thousand separators</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DataImport;
