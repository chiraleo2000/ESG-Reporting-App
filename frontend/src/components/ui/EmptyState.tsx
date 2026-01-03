import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { 
  Leaf, 
  FileText, 
  FolderOpen, 
  Calculator, 
  Users,
  AlertCircle,
  Search,
  Inbox,
  Plus
} from 'lucide-react';
import { Button } from './Button';

// Empty State
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  variant?: 'default' | 'grass' | 'minimal';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}) => {
  const variants = {
    default: 'bg-white dark:bg-earth-900 border border-grass-200 dark:border-earth-700',
    grass: 'bg-gradient-to-br from-grass-50 to-meadow-50 dark:from-earth-800 dark:to-earth-900 border border-grass-200 dark:border-earth-700',
    minimal: 'bg-transparent',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-6 rounded-2xl text-center',
        variants[variant],
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-full bg-grass-100 dark:bg-earth-700 text-grass-600 dark:text-grass-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-earth-500 dark:text-earth-400 max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.icon || <Plus className="w-4 h-4" />}
          {action.label}
        </Button>
      )}
    </motion.div>
  );
};

// Pre-built empty states for common scenarios
export const EmptyProjects: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon={<FolderOpen className="w-8 h-8" />}
    title="No projects yet"
    description="Create your first ESG project to start tracking your organization's environmental impact."
    variant="grass"
    action={onAdd ? { label: 'Create Project', onClick: onAdd } : undefined}
  />
);

export const EmptyActivities: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => (
  <EmptyState
    icon={<Leaf className="w-8 h-8" />}
    title="No activities recorded"
    description="Add activities like energy usage, transportation, or waste to calculate your carbon footprint."
    variant="grass"
    action={onAdd ? { label: 'Add Activity', onClick: onAdd } : undefined}
  />
);

export const EmptyReports: React.FC<{ onGenerate?: () => void }> = ({ onGenerate }) => (
  <EmptyState
    icon={<FileText className="w-8 h-8" />}
    title="No reports generated"
    description="Generate comprehensive ESG reports based on your data to share with stakeholders."
    variant="grass"
    action={onGenerate ? { label: 'Generate Report', onClick: onGenerate } : undefined}
  />
);

export const EmptyCalculations: React.FC<{ onCalculate?: () => void }> = ({ onCalculate }) => (
  <EmptyState
    icon={<Calculator className="w-8 h-8" />}
    title="No calculations yet"
    description="Run GHG calculations on your activities to quantify your carbon emissions."
    variant="grass"
    action={onCalculate ? { label: 'Run Calculation', onClick: onCalculate } : undefined}
  />
);

export const EmptyTeam: React.FC<{ onInvite?: () => void }> = ({ onInvite }) => (
  <EmptyState
    icon={<Users className="w-8 h-8" />}
    title="No team members"
    description="Invite team members to collaborate on your ESG reporting and sustainability initiatives."
    variant="grass"
    action={onInvite ? { label: 'Invite Member', onClick: onInvite } : undefined}
  />
);

export const EmptySearch: React.FC<{ query?: string }> = ({ query }) => (
  <EmptyState
    icon={<Search className="w-8 h-8" />}
    title="No results found"
    description={query 
      ? `We couldn't find any results for "${query}". Try adjusting your search terms.`
      : "Try adjusting your search or filter criteria."
    }
    variant="minimal"
  />
);

export const EmptyInbox: React.FC = () => (
  <EmptyState
    icon={<Inbox className="w-8 h-8" />}
    title="All caught up!"
    description="You have no new notifications at the moment."
    variant="minimal"
  />
);

// Error State
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content. Please try again.',
  onRetry,
  className,
}) => (
  <EmptyState
    icon={<AlertCircle className="w-8 h-8 text-red-500" />}
    title={title}
    description={description}
    variant="default"
    action={onRetry ? { 
      label: 'Try Again', 
      onClick: onRetry,
    } : undefined}
    className={className}
  />
);

// Placeholder Cards for Loading
export const PlaceholderCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx(
    'bg-white dark:bg-earth-800 rounded-2xl border border-grass-200 dark:border-earth-700 p-6',
    'animate-pulse',
    className
  )}>
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-grass-100 dark:bg-earth-700" />
      <div className="flex-1 space-y-3">
        <div className="h-4 bg-grass-100 dark:bg-earth-700 rounded w-1/3" />
        <div className="h-3 bg-grass-100 dark:bg-earth-700 rounded w-2/3" />
      </div>
    </div>
    <div className="mt-6 space-y-2">
      <div className="h-3 bg-grass-100 dark:bg-earth-700 rounded" />
      <div className="h-3 bg-grass-100 dark:bg-earth-700 rounded w-4/5" />
    </div>
  </div>
);

export const PlaceholderList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-earth-800 rounded-xl border border-grass-200 dark:border-earth-700 p-4 animate-pulse"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-grass-100 dark:bg-earth-700" />
          <div className="flex-1">
            <div className="h-4 bg-grass-100 dark:bg-earth-700 rounded w-1/4 mb-2" />
            <div className="h-3 bg-grass-100 dark:bg-earth-700 rounded w-1/2" />
          </div>
          <div className="h-8 w-20 bg-grass-100 dark:bg-earth-700 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
);
