import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileSignature,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Lock,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAppStore } from '@/store/appStore';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Demo signatures data
const demoSignatures = [
  {
    id: '1',
    reportName: 'EU CBAM Report - Q4 2025',
    projectName: 'Manufacturing Plant 2025',
    standard: 'EU CBAM',
    signedBy: 'Admin User',
    signedAt: '2025-12-28T10:30:00Z',
    signatureType: 'approval',
    status: 'valid',
    hash: 'sha256:a7f3b2...d8e1',
  },
  {
    id: '2',
    reportName: 'Thai-ESG Report 2025',
    projectName: 'Manufacturing Plant 2025',
    standard: 'Thai-ESG',
    signedBy: 'Project Manager',
    signedAt: '2025-12-27T15:45:00Z',
    signatureType: 'submission',
    status: 'valid',
    hash: 'sha256:c9d4e5...f2a3',
  },
  {
    id: '3',
    reportName: 'K-ESG Report 2025',
    projectName: 'Office Operations Carbon Footprint',
    standard: 'K-ESG',
    signedBy: 'Admin User',
    signedAt: '2025-12-26T09:15:00Z',
    signatureType: 'approval',
    status: 'pending',
    hash: 'sha256:pending...',
  },
  {
    id: '4',
    reportName: 'MAFF ESG Report 2025',
    projectName: 'Office Operations Carbon Footprint',
    standard: 'MAFF ESG',
    signedBy: 'External Auditor',
    signedAt: '2025-12-25T14:20:00Z',
    signatureType: 'audit',
    status: 'valid',
    hash: 'sha256:b8e2f1...c4d5',
  },
];

// Demo pending documents
const pendingDocuments = [
  {
    id: '1',
    name: 'China Carbon Market Report - Q4 2025',
    project: 'Supply Chain Scope 3 Assessment',
    standard: 'China Carbon Market',
    createdAt: '2025-12-29T08:00:00Z',
    requiredSignatures: 2,
    currentSignatures: 0,
  },
  {
    id: '2',
    name: 'EU CBAM Quarterly Report',
    project: 'Supply Chain Scope 3 Assessment',
    standard: 'EU CBAM',
    createdAt: '2025-12-28T16:00:00Z',
    requiredSignatures: 2,
    currentSignatures: 1,
  },
];

export const Signatures: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'signed'>('all');
  const { user } = useAppStore();

  const filteredSignatures = demoSignatures.filter((s) => {
    const matchesSearch = s.reportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'pending') return matchesSearch && s.status === 'pending';
    if (activeTab === 'signed') return matchesSearch && s.status === 'valid';
    return matchesSearch;
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
            Digital Signatures
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Manage and verify document signatures for compliance reports
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-grass-200 dark:bg-earth-600 flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-grass-600 dark:text-grass-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Total Signatures</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">{demoSignatures.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Valid</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {demoSignatures.filter(s => s.status === 'valid').length}
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
              <p className="text-sm text-earth-500">Pending</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {pendingDocuments.length}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="grass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-earth-500">Your Signatures</p>
              <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                {demoSignatures.filter(s => s.signedBy === 'Admin User').length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Pending Documents */}
      {pendingDocuments.length > 0 && (
        <motion.div variants={item}>
          <Card variant="bordered" className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader
              title="Documents Pending Signature"
              subtitle={`${pendingDocuments.length} documents require your signature`}
              action={<Badge variant="warning">{pendingDocuments.length} Pending</Badge>}
            />
            <div className="space-y-3 mt-4">
              {pendingDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-earth-800 rounded-xl border border-grass-100 dark:border-earth-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-earth-800 dark:text-earth-100">{doc.name}</p>
                      <p className="text-sm text-earth-500 dark:text-earth-400">
                        {doc.project} • {doc.standard}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-earth-500">Signatures</p>
                      <p className="font-medium text-earth-800 dark:text-earth-100">
                        {doc.currentSignatures}/{doc.requiredSignatures}
                      </p>
                    </div>
                    <Button variant="primary" size="sm">
                      <FileSignature className="w-4 h-4 mr-2" />
                      Sign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Search and Filters */}
      <motion.div variants={item}>
        <Card variant="default" className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search signatures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('all')}
              >
                All
              </Button>
              <Button
                variant={activeTab === 'signed' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('signed')}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Signed
              </Button>
              <Button
                variant={activeTab === 'pending' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('pending')}
              >
                <Clock className="w-4 h-4 mr-1" />
                Pending
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Signatures Table */}
      <motion.div variants={item}>
        <Card variant="default">
          <CardHeader
            title="Signature History"
            subtitle={`${filteredSignatures.length} signatures`}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-grass-100 dark:border-earth-700">
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Document</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Standard</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Signed By</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Type</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Date</th>
                  <th className="text-left p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Status</th>
                  <th className="text-right p-3 text-sm font-medium text-earth-600 dark:text-earth-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSignatures.map((sig) => (
                  <tr
                    key={sig.id}
                    className="border-b border-grass-50 dark:border-earth-800 hover:bg-grass-50 dark:hover:bg-earth-800/50 transition-colors"
                  >
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-earth-800 dark:text-earth-100">{sig.reportName}</p>
                        <p className="text-sm text-earth-500 dark:text-earth-400">{sig.projectName}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="default" size="sm">{sig.standard}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-grass-200 flex items-center justify-center">
                          <User className="w-3 h-3 text-grass-600" />
                        </div>
                        <span className="text-earth-700 dark:text-earth-300">{sig.signedBy}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={sig.signatureType === 'audit' ? 'grass' : sig.signatureType === 'submission' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {sig.signatureType}
                      </Badge>
                    </td>
                    <td className="p-3 text-earth-600 dark:text-earth-400 text-sm">
                      {formatDate(sig.signedAt)}
                    </td>
                    <td className="p-3">
                      {sig.status === 'valid' ? (
                        <Badge variant="grass" size="sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
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
    </motion.div>
  );
};

export default Signatures;
