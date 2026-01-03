import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 font-medium rounded-xl
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]
  `;

  const variants = {
    primary: 'bg-grass-500 text-white hover:bg-grass-600 focus:ring-grass-500 shadow-grass',
    secondary: 'bg-grass-100 text-grass-700 hover:bg-grass-200 focus:ring-grass-400 dark:bg-earth-700 dark:text-earth-200 dark:hover:bg-earth-600',
    outline: 'border-2 border-grass-500 text-grass-600 hover:bg-grass-50 focus:ring-grass-400 dark:text-grass-400 dark:hover:bg-grass-500/10',
    ghost: 'text-earth-600 hover:bg-earth-100 hover:text-earth-800 focus:ring-earth-400 dark:text-earth-400 dark:hover:bg-earth-700 dark:hover:text-earth-200',
    danger: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
};

// Icon Button
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'default' | 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  tooltip,
  className,
  ...props
}) => {
  const baseStyles = 'rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variants = {
    default: 'hover:bg-grass-100 dark:hover:bg-earth-700 text-earth-500 hover:text-grass-600 dark:text-earth-400 dark:hover:text-grass-400 focus:ring-grass-400',
    primary: 'bg-grass-500 text-white hover:bg-grass-600 focus:ring-grass-500',
    ghost: 'text-earth-500 hover:text-earth-700 dark:text-earth-400 dark:hover:text-earth-200 focus:ring-earth-400',
    outline: 'border-2 border-grass-300 text-grass-600 hover:bg-grass-50 dark:border-earth-600 dark:text-grass-400 dark:hover:bg-earth-700 focus:ring-grass-400',
  };

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2.5',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      title={tooltip}
      {...props}
    >
      <span className={iconSizes[size]}>{icon}</span>
    </button>
  );
};
