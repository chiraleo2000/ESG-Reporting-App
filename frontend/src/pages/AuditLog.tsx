import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Activity,
  Settings,
  Download,
  Eye,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Demo audit log data
const demoAuditLogs = [
  {
    id: '1',
    action: 'CREATE',
    entityType: 'activity',
    entityName: 'Natural Gas Combustion - Furnace',
    user: 'Admin User',
    userEmail: 'admin@esgdemo.com',
    projectName: 'Manufacturing Plant 2025',
    timestamp: '2025-12-29T14:30:00Z',
    details: { quantity: 125000, unit: 'm3', scope: 'scope1' },
    ipAddress: '192.168.1.100',
  },
  {
    id: '2',
    action: 'CALCULATE',
    entityType: 'project',
    entityName: 'Manufacturing Plant 2025',
    user: 'Admin User',
    userEmail: 'admin@esgdemo.com',
    projectName: 'Manufacturing Plant 2025',
    timestamp: '2025-12-29T14:25:00Z',
    details: { activitiesCalculated: 14, totalEmissions: 1250.45 },
    ipAddress: '192.168.1.100',
  },
  {
    id: '3',
    action: 'GENERATE_REPORT',
    entityType: 'report',
    entityName: 'EU CBAM Report - Q4 2025',
    user: 'Project Manager',
    userEmail: 'manager@esgdemo.com',
    projectName: 'Manufacturing Plant 2025',
    timestamp: '2025-12-28T16:45:00Z',
    details: { standard: 'eu_cbam', format: 'pdf' },
    ipAddress: '192.168.1.101',
  },
  {
    id: '4',
    action: 'SIGN',
    entityType: 'report',
    entityName: 'EU CBAM Report - Q4 2025',
    user: 'Admin User',
    userEmail: 'admin@esgdemo.com',
    projectName: 'Manufacturing Plant 2025',
    timestamp: '2025-12-28T10:30:00Z',
    details: { signatureType: 'approval', status: 'valid' },
    ipAddress: '192.168.1.100',
  },
  {
    id: '5',
    action: 'UPDATE',
    entityType: 'activity',
    entityName: 'Purchased Electricity - Grid',
    user: 'Project Manager',
    userEmail: 'manager@esgdemo.com',
    projectName: 'Manufacturing Plant 2025',
    timestamp: '2025-12-27T11:20:00Z',
    details: { field: 'quantity', oldValue: 2800000, newValue: 2850000 },
    ipAddress: '192.168.1.101',
  },
  {
    id: '6',
    action: 'LOGIN',
    entityType: 'user',
    entityName: 'Admin User',
    user: 'Admin User',
    userEmail: 'admin@esgdemo.com',
    projectName: null,
    timestamp: '2025-12-27T09:00:00Z',
    details: { method: 'password' },
    ipAddress: '192.168.1.100',
  },
  {
    id: '7',
    action: 'CREATE',
    entityType: 'project',
    entityName: 'Supply Chain Scope 3 Assessment',
    user: 'Admin User',
    userEmail: 'admin@esgdemo.com',
    projectName: 'Supply Chain Scope 3 Assessment',
    timestamp: '2025-12-26T15:30:00Z',
    details: { standards: ['eu_cbam', 'china_carbon_market'] },
    ipAddress: '192.168.1.100',
  },
  {
    id: '8',
    action: 'EXPORT',
    entityType: 'report',
    entityName: 'Thai-ESG Report 2025',
    user: 'Viewer User',
    userEmail: 'viewer@esgdemo.com',
    projectName: 'Manufacturing Plant 2025',
    timestamp: '2025-12-26T14:15:00Z',
    details: { format: 'pdf', fileSize: '2.4 MB' },
    ipAddress: '192.168.1.102',
  },
  {
    id: '9',
    action: 'DELETE',
    entityType: 'activity',
    entityName: 'Test Activity',
    user: 'Admin User',
    userEmail: 'admin@esgdemo.com',
    projectName: 'Office Operations Carbon Footprint',
    timestamp: '2025-12-25T10:45:00Z',
    details: { reason: 'Duplicate entry' },
    ipAddress: '192.168.1.100',
  },
  {
    id: '10',
    action: 'VERIFY',
    entityType: 'report',
    entityName: 'K-ESG Report 2025',
    user: 'External Auditor',
    userEmail: 'auditor@esgdemo.com',
    projectName: 'Office Operations Carbon Footprint',
    timestamp: '2025-12-24T16:00:00Z',
    details: { verificationStatus: 'passed', findings: 0 },
    ipAddress: '192.168.1.200',
  },
];

const actionIcons: Record<string, React.ElementType> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash,
  CALCULATE: Activity,
  GENERATE_REPORT: FileText,
  SIGN: CheckCircle,
  LOGIN: User,
  EXPORT: Download,
  VERIFY: CheckCircle,
};

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  CALCULATE: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  GENERATE_REPORT: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  SIGN: 'bg-grass-100 text-grass-600 dark:bg-grass-900/30 dark:text-grass-400',
  LOGIN: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  EXPORT: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  VERIFY: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export const AuditLog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filteredLogs = demoAuditLogs.filter((log) => {
    const matchesSearch = log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const uniqueActions = [...new Set(demoAuditLogs.map(l => l.action))];
  const uniqueEntities = [...new Set(demoAuditLogs.map(l => l.entityType))];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
            Audit Log
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Track all system activities and changes for compliance (7-year retention)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-grass-200 dark:bg-earth-600 flex items-center justify-center">
              <History className="w-5 h-5 text-grass-600 dark:text-grass-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Total Events</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{demoAuditLogs.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Created</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {demoAuditLogs.filter(l => l.action === 'CREATE').length}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Modified</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {demoAuditLogs.filter(l => l.action === 'UPDATE').length}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Reports Generated</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {demoAuditLogs.filter(l => l.action === 'GENERATE_REPORT').length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={item}>
        <Card variant="default" className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Actions' },
                ...uniqueActions.map(a => ({ value: a, label: a.replace('_', ' ') }))
              ]}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
            <Select
              options={[
                { value: 'all', label: 'All Entities' },
                ...uniqueEntities.map(e => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))
              ]}
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            />
          </div>
        </Card>
      </motion.div>

      {/* Audit Log Timeline */}
      <motion.div variants={item}>
        <Card variant="default">
          <CardHeader
            title="Activity Timeline"
            subtitle={`Showing ${filteredLogs.length} events`}
          />
          <div className="divide-y divide-grass-100 dark:divide-earth-700">
            {filteredLogs.map((log) => {
              const Icon = actionIcons[log.action] || Activity;
              const colorClass = actionColors[log.action] || 'bg-gray-100 text-gray-600';
              
              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-grass-50 dark:hover:bg-earth-800/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-earth-800 dark:text-earth-100">
                            <span className="capitalize">{log.action.toLowerCase().replace('_', ' ')}</span>
                            {' '}
                            <span className="text-earth-500">•</span>
                            {' '}
                            {log.entityName}
                          </p>
                          <p className="text-sm text-earth-500 dark:text-earth-400 mt-0.5">
                            by {log.user}
                            {log.projectName && ` • ${log.projectName}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-earth-600 dark:text-earth-400">
                            {formatDate(log.timestamp)}
                          </p>
                          <Badge variant="default" size="sm" className="mt-1">
                            {log.entityType}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {expandedLog === log.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 bg-grass-50 dark:bg-earth-800 rounded-xl"
                        >
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-earth-500 dark:text-earth-400">User Email</p>
                              <p className="font-mono text-earth-700 dark:text-earth-300">{log.userEmail}</p>
                            </div>
                            <div>
                              <p className="text-earth-500 dark:text-earth-400">IP Address</p>
                              <p className="font-mono text-earth-700 dark:text-earth-300">{log.ipAddress}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-earth-500 dark:text-earth-400 mb-2">Details</p>
                              <pre className="font-mono text-xs bg-earth-100 dark:bg-earth-900 p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-earth-400 transition-transform ${
                        expandedLog === log.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AuditLog;
