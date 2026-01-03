import React from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// Table Root
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered';
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: '',
      striped: '[&_tbody_tr:nth-child(even)]:bg-grass-50/50 dark:[&_tbody_tr:nth-child(even)]:bg-earth-800/50',
      bordered: '[&_th]:border [&_td]:border border-grass-200 dark:border-earth-700',
    };

    return (
      <div className="w-full overflow-auto rounded-xl border border-grass-200 dark:border-earth-700">
        <table
          ref={ref}
          className={clsx(
            'w-full caption-bottom text-sm',
            variants[variant],
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Table.displayName = 'Table';

// Table Header
export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={clsx(
      'bg-grass-50 dark:bg-earth-800/80 [&_tr]:border-b border-grass-200 dark:border-earth-700',
      className
    )}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

// Table Body
export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={clsx(
      '[&_tr:last-child]:border-0 bg-white dark:bg-earth-900',
      className
    )}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

// Table Row
export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={clsx(
      'border-b border-grass-100 dark:border-earth-800 transition-colors',
      'hover:bg-grass-50/50 dark:hover:bg-earth-800/50',
      'data-[state=selected]:bg-grass-100 dark:data-[state=selected]:bg-earth-700',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

// Table Head Cell
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sortDirection, onSort, ...props }, ref) => {
    const SortIcon = sortDirection === 'asc' 
      ? ChevronUp 
      : sortDirection === 'desc' 
      ? ChevronDown 
      : ChevronsUpDown;

    return (
      <th
        ref={ref}
        className={clsx(
          'h-12 px-4 text-left align-middle font-semibold',
          'text-earth-700 dark:text-earth-300',
          sortable && 'cursor-pointer select-none hover:bg-grass-100 dark:hover:bg-earth-700',
          className
        )}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        <div className="flex items-center gap-2">
          {children}
          {sortable && (
            <SortIcon className={clsx(
              'w-4 h-4',
              sortDirection ? 'text-grass-600' : 'text-earth-400'
            )} />
          )}
        </div>
      </th>
    );
  }
);
TableHead.displayName = 'TableHead';

// Table Cell
export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={clsx(
      'px-4 py-3 align-middle text-earth-700 dark:text-earth-300',
      className
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

// Table Caption
export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={clsx(
      'mt-4 text-sm text-earth-500 dark:text-earth-400',
      className
    )}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

// Table Footer
export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={clsx(
      'border-t border-grass-200 dark:border-earth-700',
      'bg-grass-50/50 dark:bg-earth-800/50 font-medium',
      className
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

// Empty State for Table
interface TableEmptyProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  colSpan?: number;
}

export const TableEmpty: React.FC<TableEmptyProps> = ({
  icon,
  title = 'No data found',
  description = 'There are no items to display.',
  action,
  colSpan = 5,
}) => {
  return (
    <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-48">
        <div className="flex flex-col items-center justify-center text-center py-8">
          {icon && (
            <div className="w-12 h-12 mb-4 text-earth-300 dark:text-earth-600">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-medium text-earth-700 dark:text-earth-300 mb-1">
            {title}
          </h3>
          <p className="text-sm text-earth-500 dark:text-earth-400 mb-4">
            {description}
          </p>
          {action}
        </div>
      </TableCell>
    </TableRow>
  );
};
