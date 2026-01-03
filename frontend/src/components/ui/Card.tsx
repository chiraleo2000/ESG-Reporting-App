import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'grass' | 'bordered' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-300';
  
  const variants = {
    default: 'bg-white dark:bg-earth-800 shadow-card border border-grass-100 dark:border-earth-700',
    grass: 'bg-gradient-to-br from-grass-50 to-white border border-grass-200 dark:from-earth-800 dark:to-earth-700',
    bordered: 'bg-white dark:bg-earth-800 border-2 border-grass-200 dark:border-earth-600',
    glass: 'bg-white/80 dark:bg-earth-800/80 backdrop-blur-xl border border-white/20 dark:border-earth-700/20',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyles = hover ? 'hover:shadow-card-hover hover:border-grass-300 dark:hover:border-earth-500 cursor-pointer' : '';

  return (
    <div
      className={clsx(baseStyles, variants[variant], paddings[padding], hoverStyles, className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Card Header
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  className,
}) => {
  return (
    <div className={clsx('flex items-start justify-between mb-4', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-grass-100 dark:bg-earth-700 
                        flex items-center justify-center text-grass-600 dark:text-grass-400">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-earth-800 dark:text-earth-100">{title}</h3>
          {subtitle && (
            <p className="text-sm text-earth-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

// Stat Card
interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  trend,
  className,
}) => {
  const trendColors = {
    up: 'text-success-600 bg-success-50',
    down: 'text-error-600 bg-error-50',
    neutral: 'text-earth-600 bg-earth-100',
  };

  return (
    <Card className={clsx('relative overflow-hidden', className)}>
      {/* Background Decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-grass-100/50 dark:bg-grass-900/20" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-earth-500">{title}</span>
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-grass-100 dark:bg-earth-700 
                          flex items-center justify-center text-grass-600 dark:text-grass-400">
              {icon}
            </div>
          )}
        </div>
        
        <div className="text-3xl font-bold text-earth-800 dark:text-earth-100 mb-2">
          {value}{unit && <span className="text-lg font-normal text-earth-500 ml-1">{unit}</span>}
        </div>
        
        {(change !== undefined || changeLabel) && (
          <div className="flex items-center gap-2">
            {change !== undefined && (
              <span className={clsx(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                trendColors[trend || (change >= 0 ? 'up' : 'down')]
              )}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
            )}
            {changeLabel && (
              <span className="text-xs text-earth-500">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
