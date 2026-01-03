import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'grass' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  removable = false,
  onRemove,
  className,
}) => {
  const variants = {
    default: 'bg-earth-100 text-earth-700 dark:bg-earth-700 dark:text-earth-300',
    grass: 'bg-grass-100 text-grass-700 dark:bg-grass-900/30 dark:text-grass-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
    error: 'bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400',
    info: 'bg-info-50 text-info-600 dark:bg-info-900/30 dark:text-info-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const dotColors = {
    default: 'bg-earth-500',
    grass: 'bg-grass-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-info-500',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 3l6 6m0-6l-6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
};

// Status Badge with icon
interface StatusBadgeProps {
  status: 'active' | 'draft' | 'archived' | 'pending' | 'approved' | 'submitted';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const configs = {
    active: { label: 'Active', variant: 'success' as const, dot: true },
    draft: { label: 'Draft', variant: 'default' as const, dot: true },
    archived: { label: 'Archived', variant: 'default' as const, dot: false },
    pending: { label: 'Pending', variant: 'warning' as const, dot: true },
    approved: { label: 'Approved', variant: 'success' as const, dot: false },
    submitted: { label: 'Submitted', variant: 'info' as const, dot: false },
  };

  const config = configs[status];

  return (
    <Badge variant={config.variant} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
};

// Scope Badge
interface ScopeBadgeProps {
  scope: 'scope1' | 'scope2' | 'scope3';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ScopeBadge: React.FC<ScopeBadgeProps> = ({ scope, size = 'md', className }) => {
  const configs = {
    scope1: { label: 'Scope 1', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    scope2: { label: 'Scope 2', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
    scope3: { label: 'Scope 3', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const config = configs[scope];

  return (
    <span className={clsx(
      'inline-flex items-center rounded-full font-medium',
      config.color,
      sizes[size],
      className
    )}>
      {config.label}
    </span>
  );
};
