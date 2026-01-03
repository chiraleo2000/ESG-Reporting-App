import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Tabs Context
interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | null>(null);

const useTabsContext = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
};

// Tabs Root
interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={clsx('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
};

// Tabs List
interface TabsListProps {
  children: React.ReactNode;
  variant?: 'default' | 'pills' | 'underlined';
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  variant = 'default',
  className,
}) => {
  const variants = {
    default: 'bg-grass-100 dark:bg-earth-800 rounded-xl p-1',
    pills: 'gap-2',
    underlined: 'border-b border-grass-200 dark:border-earth-700 gap-0',
  };

  return (
    <div
      className={clsx(
        'flex items-center',
        variants[variant],
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
};

// Tabs Trigger
interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  variant?: 'default' | 'pills' | 'underlined';
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  variant = 'default',
  disabled = false,
  icon,
  className,
}) => {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = selectedValue === value;

  const baseStyles = 'relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grass-500';

  const variants = {
    default: clsx(
      'rounded-lg',
      isSelected
        ? 'bg-white dark:bg-earth-700 text-grass-700 dark:text-grass-400 shadow-sm'
        : 'text-earth-600 dark:text-earth-400 hover:text-earth-800 dark:hover:text-earth-200'
    ),
    pills: clsx(
      'rounded-full',
      isSelected
        ? 'bg-grass-500 text-white'
        : 'bg-grass-100 dark:bg-earth-700 text-earth-600 dark:text-earth-400 hover:bg-grass-200 dark:hover:bg-earth-600'
    ),
    underlined: clsx(
      'border-b-2 -mb-px rounded-none',
      isSelected
        ? 'border-grass-500 text-grass-700 dark:text-grass-400'
        : 'border-transparent text-earth-500 dark:text-earth-400 hover:text-earth-700 dark:hover:text-earth-300 hover:border-earth-300 dark:hover:border-earth-600'
    ),
  };

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={clsx(
        baseStyles,
        variants[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon}
      {children}
      {variant === 'default' && isSelected && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute inset-0 bg-white dark:bg-earth-700 rounded-lg shadow-sm -z-10"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        />
      )}
    </button>
  );
};

// Tabs Content
interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  forceMount?: boolean;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className,
  forceMount = false,
}) => {
  const { value: selectedValue } = useTabsContext();
  const isSelected = selectedValue === value;

  if (!forceMount && !isSelected) return null;

  return (
    <AnimatePresence mode="wait">
      {isSelected && (
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          role="tabpanel"
          className={clsx('mt-4 focus-visible:outline-none', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Tab Panel with Badge
interface TabWithBadgeProps {
  value: string;
  label: string;
  badge?: number | string;
  variant?: 'default' | 'pills' | 'underlined';
  icon?: React.ReactNode;
  className?: string;
}

export const TabWithBadge: React.FC<TabWithBadgeProps> = ({
  value,
  label,
  badge,
  variant = 'default',
  icon,
  className,
}) => {
  return (
    <TabsTrigger value={value} variant={variant} icon={icon} className={className}>
      {label}
      {badge !== undefined && (
        <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-grass-100 dark:bg-earth-600 text-grass-700 dark:text-grass-300">
          {badge}
        </span>
      )}
    </TabsTrigger>
  );
};
