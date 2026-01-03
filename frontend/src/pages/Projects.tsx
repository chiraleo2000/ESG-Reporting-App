import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Building2,
  Calendar,
  Users,
  Leaf,
  Edit,
  Trash2,
  Archive,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { EmptyProjects } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';

// Mock data
const mockProjects = [
  {
    id: '1',
    name: 'Corporate HQ Carbon Footprint 2024',
    organization: 'Acme Corporation',
    status: 'active' as const,
    description: 'Annual carbon footprint assessment for headquarters operations',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    activities: 45,
    emissions: 2450,
    progress: 75,
    team: ['JD', 'AB', 'CS'],
  },
  {
    id: '2',
    name: 'Supply Chain Emissions Analysis',
    organization: 'Acme Corporation',
    status: 'active' as const,
    description: 'Scope 3 emissions tracking across supply chain partners',
    startDate: '2024-03-01',
    endDate: '2024-09-30',
    activities: 128,
    emissions: 5820,
    progress: 60,
    team: ['JD', 'MK'],
  },
  {
    id: '3',
    name: 'Manufacturing Plant Assessment',
    organization: 'Acme Manufacturing',
    status: 'draft' as const,
    description: 'GHG inventory for manufacturing facilities',
    startDate: '2024-06-01',
    endDate: '2024-12-31',
    activities: 12,
    emissions: 890,
    progress: 15,
    team: ['CS'],
  },
  {
    id: '4',
    name: 'Fleet Electrification Impact Study',
    organization: 'Acme Logistics',
    status: 'pending' as const,
    description: 'Analysis of emission reductions from vehicle fleet electrification',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    activities: 0,
    emissions: 0,
    progress: 0,
    team: ['AB', 'MK', 'JD'],
  },
  {
    id: '5',
    name: 'FY2023 Carbon Report',
    organization: 'Acme Corporation',
    status: 'archived' as const,
    description: 'Completed annual carbon footprint report for fiscal year 2023',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    activities: 156,
    emissions: 6200,
    progress: 100,
    team: ['JD', 'AB'],
  },
];

// Animation variants
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

interface Project {
  id: string;
  name: string;
  organization: string;
  status: 'active' | 'draft' | 'archived' | 'pending';
  description: string;
  startDate: string;
  endDate: string;
  activities: number;
  emissions: number;
  progress: number;
  team: string[];
}

export const Projects: React.FC = () => {
  const [projects] = useState<Project[]>(mockProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.organization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    draft: projects.filter((p) => p.status === 'draft').length,
    pending: projects.filter((p) => p.status === 'pending').length,
    archived: projects.filter((p) => p.status === 'archived').length,
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
            Projects
          </h1>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Manage your ESG reporting projects and assessments
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={item}>
        <Card variant="default" padding="sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filterStatus === status
                      ? 'bg-grass-500 text-white'
                      : 'bg-grass-100 dark:bg-earth-700 text-earth-600 dark:text-earth-300 hover:bg-grass-200 dark:hover:bg-earth-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                </button>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <motion.div variants={item}>
          <EmptyProjects onAdd={() => setShowCreateModal(true)} />
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                variants={item}
                layout
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card
                  variant="default"
                  hover
                  className="cursor-pointer h-full"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-grass-600 dark:text-grass-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-earth-800 dark:text-earth-100 line-clamp-1">
                          {project.name}
                        </h3>
                        <p className="text-sm text-earth-500 dark:text-earth-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {project.organization}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  <p className="text-sm text-earth-600 dark:text-earth-400 line-clamp-2 mb-4">
                    {project.description}
                  </p>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-earth-500 dark:text-earth-400">Progress</span>
                      <span className="font-medium text-earth-700 dark:text-earth-300">
                        {project.progress}%
                      </span>
                    </div>
                    <Progress value={project.progress} size="sm" variant="grass" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-grass-50 dark:bg-earth-700/50 rounded-lg p-3">
                      <p className="text-xs text-earth-500 dark:text-earth-400 mb-1">
                        Activities
                      </p>
                      <p className="text-lg font-semibold text-earth-800 dark:text-earth-100">
                        {project.activities}
                      </p>
                    </div>
                    <div className="bg-grass-50 dark:bg-earth-700/50 rounded-lg p-3">
                      <p className="text-xs text-earth-500 dark:text-earth-400 mb-1">
                        Emissions
                      </p>
                      <p className="text-lg font-semibold text-earth-800 dark:text-earth-100">
                        {project.emissions.toLocaleString()}
                        <span className="text-xs font-normal text-earth-500 ml-1">
                          tCO₂e
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-grass-100 dark:border-earth-700">
                    <div className="flex items-center gap-2 text-sm text-earth-500 dark:text-earth-400">
                      <Calendar className="w-4 h-4" />
                      {new Date(project.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' - '}
                      {new Date(project.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="flex -space-x-2">
                      {project.team.slice(0, 3).map((initials, idx) => (
                        <div
                          key={idx}
                          className="w-7 h-7 rounded-full bg-grass-500 text-white text-xs font-medium flex items-center justify-center ring-2 ring-white dark:ring-earth-800"
                        >
                          {initials}
                        </div>
                      ))}
                      {project.team.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-earth-200 dark:bg-earth-600 text-earth-600 dark:text-earth-300 text-xs font-medium flex items-center justify-center ring-2 ring-white dark:ring-earth-800">
                          +{project.team.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        size="lg"
      >
        <form className="space-y-4">
          <Input
            label="Project Name"
            placeholder="e.g., Carbon Footprint Assessment 2024"
            required
          />
          <Input
            label="Organization"
            placeholder="e.g., Acme Corporation"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" required />
            <Input label="End Date" type="date" required />
          </div>
          <Input
            label="Description"
            placeholder="Brief description of the project..."
          />
        </form>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(false)}>
            <CheckCircle className="w-4 h-4" />
            Create Project
          </Button>
        </ModalFooter>
      </Modal>

      {/* Project Details Modal */}
      <Modal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        title={selectedProject?.name || ''}
        size="xl"
      >
        {selectedProject && (
          <div className="space-y-6">
            {/* Status & Actions */}
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedProject.status} />
              <div className="flex items-center gap-2">
                <IconButton icon={<Edit className="w-4 h-4" />} variant="ghost" />
                <IconButton icon={<Archive className="w-4 h-4" />} variant="ghost" />
                <IconButton icon={<Trash2 className="w-4 h-4" />} variant="ghost" />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-earth-500 dark:text-earth-400 mb-1">
                  Organization
                </h4>
                <p className="text-earth-800 dark:text-earth-100">
                  {selectedProject.organization}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-earth-500 dark:text-earth-400 mb-1">
                  Description
                </h4>
                <p className="text-earth-800 dark:text-earth-100">
                  {selectedProject.description}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-earth-500 dark:text-earth-400 mb-1">
                    Reporting Period
                  </h4>
                  <p className="text-earth-800 dark:text-earth-100">
                    {new Date(selectedProject.startDate).toLocaleDateString()} -{' '}
                    {new Date(selectedProject.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-earth-500 dark:text-earth-400 mb-1">
                    Team Members
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {selectedProject.team.map((initials, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full bg-grass-500 text-white text-xs font-medium flex items-center justify-center ring-2 ring-white dark:ring-earth-800"
                        >
                          {initials}
                        </div>
                      ))}
                    </div>
                    <span className="text-sm text-earth-500">
                      {selectedProject.team.length} members
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div>
              <h4 className="text-sm font-medium text-earth-500 dark:text-earth-400 mb-3">
                Progress
              </h4>
              <Progress
                value={selectedProject.progress}
                showLabel
                label="Completion"
                variant="gradient"
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <Card variant="grass" padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-grass-200 dark:bg-earth-600 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-grass-700 dark:text-grass-300" />
                  </div>
                  <div>
                    <p className="text-sm text-earth-500 dark:text-earth-400">
                      Activities
                    </p>
                    <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                      {selectedProject.activities}
                    </p>
                  </div>
                </div>
              </Card>
              <Card variant="grass" padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-grass-200 dark:bg-earth-600 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-grass-700 dark:text-grass-300" />
                  </div>
                  <div>
                    <p className="text-sm text-earth-500 dark:text-earth-400">
                      Emissions
                    </p>
                    <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                      {selectedProject.emissions.toLocaleString()}
                      <span className="text-xs font-normal ml-1">tCO₂e</span>
                    </p>
                  </div>
                </div>
              </Card>
              <Card variant="grass" padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-grass-200 dark:bg-earth-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-grass-700 dark:text-grass-300" />
                  </div>
                  <div>
                    <p className="text-sm text-earth-500 dark:text-earth-400">
                      Team Size
                    </p>
                    <p className="text-xl font-bold text-earth-800 dark:text-earth-100">
                      {selectedProject.team.length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setSelectedProject(null)}>
            Close
          </Button>
          <Button variant="primary">
            <ExternalLink className="w-4 h-4" />
            Open Project
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
};

export default Projects;
