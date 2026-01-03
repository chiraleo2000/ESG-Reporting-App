import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'default' | 'grass';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  helperText,
  icon,
  iconPosition = 'left',
  variant = 'default',
  className,
  ...props
}, ref) => {
  const baseStyles = `
    w-full px-4 py-3 rounded-xl border bg-white text-earth-800 
    placeholder-earth-400 transition-all duration-200
    focus:outline-none focus:ring-2 focus:border-transparent
    dark:bg-earth-800 dark:text-earth-100 dark:placeholder-earth-500
  `;

  const variants = {
    default: 'border-earth-200 focus:ring-grass-500 dark:border-earth-600 dark:focus:ring-grass-400',
    grass: 'border-grass-200 focus:ring-grass-400 bg-grass-50/50 focus:bg-white dark:bg-earth-700/50',
  };

  const errorStyles = error ? 'border-error-500 focus:ring-error-500' : '';
  const iconPadding = icon ? (iconPosition === 'left' ? 'pl-11' : 'pr-11') : '';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className={clsx(
            'absolute top-1/2 -translate-y-1/2 text-earth-400',
            iconPosition === 'left' ? 'left-4' : 'right-4'
          )}>
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={clsx(baseStyles, variants[variant], errorStyles, iconPadding, className)}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-error-500">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-earth-500">{hint}</p>
      )}
      {helperText && !error && !hint && (
        <p className="mt-1.5 text-sm text-earth-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Select
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  placeholder,
  className,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'select',
          error && 'border-error-500 focus:ring-error-500',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-sm text-error-500">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  hint,
  className,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-earth-700 dark:text-earth-300 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={clsx(
          'input min-h-[120px] resize-y',
          error && 'border-error-500 focus:ring-error-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-error-500">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-earth-500">{hint}</p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Checkbox
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  className,
  ...props
}, ref) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          className={clsx(
            'w-5 h-5 rounded-md border-2 border-earth-300 text-grass-500',
            'focus:ring-2 focus:ring-grass-500 focus:ring-offset-2',
            'checked:bg-grass-500 checked:border-grass-500',
            'transition-colors cursor-pointer',
            className
          )}
          {...props}
        />
      </div>
      {label && (
        <span className="text-sm text-earth-700 dark:text-earth-300 group-hover:text-earth-800 dark:group-hover:text-earth-200">
          {label}
        </span>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

// Toggle/Switch
interface ToggleProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <label className={clsx(
      'flex items-center justify-between gap-4 cursor-pointer',
      disabled && 'opacity-50 cursor-not-allowed'
    )}>
      <div>
        {label && (
          <span className="text-sm font-medium text-earth-700 dark:text-earth-300">
            {label}
          </span>
        )}
        {description && (
          <p className="text-xs text-earth-500 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          checked ? 'bg-grass-500' : 'bg-earth-300 dark:bg-earth-600'
        )}
      >
        <span
          className={clsx(
            'absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </label>
  );
};
