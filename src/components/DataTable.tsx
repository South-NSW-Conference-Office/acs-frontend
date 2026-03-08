'use client';

import { ReactNode } from 'react';
import { TableSearchBar } from './SearchBar';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface TableAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  show?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: TableAction[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
}

export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions = [],
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon
}: DataTableProps<T>) {
  const visibleActions = actions.filter(action => action.show !== false);

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* Table Header with Search and Actions */}
      {(onSearchChange || visibleActions.length > 0) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            {onSearchChange ? (
              <TableSearchBar
                value={searchValue}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            ) : (
              <div />
            )}
            
            {visibleActions.length > 0 && (
              <div className="flex items-center gap-2">
                {visibleActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className="inline-flex items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Table Content */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="px-4 py-5 text-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-8 text-center">
            {emptyIcon && (
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                {emptyIcon}
              </div>
            )}
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={
                      column.headerClassName ||
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
                    }
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={keyExtractor(item)} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={column.className || 'px-6 py-4 whitespace-nowrap text-sm'}
                    >
                      {column.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Helper component for action cells
export function ActionCell({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end space-x-2">
      {children}
    </div>
  );
}

// Helper component for icon buttons in action cells
interface IconButtonProps {
  onClick: () => void;
  title?: string;
  icon: ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export function IconButton({ onClick, title, icon, variant = 'default', disabled = false }: IconButtonProps) {
  const variantClasses = {
    default: 'text-gray-400 hover:text-gray-600',
    danger: 'text-gray-400 hover:text-red-600'
  };

  return (
    <button
      onClick={onClick}
      className={variantClasses[variant]}
      title={title}
      disabled={disabled}
    >
      {icon}
    </button>
  );
}

// Helper component for status badges
interface StatusBadgeProps {
  status: boolean;
  trueLabel: string;
  falseLabel: string;
  trueColor?: 'green' | 'blue' | 'purple';
  falseColor?: 'yellow' | 'red' | 'gray';
}

export function StatusBadge({ 
  status, 
  trueLabel, 
  falseLabel, 
  trueColor = 'green',
  falseColor = 'yellow' 
}: StatusBadgeProps) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status ? colors[trueColor] : colors[falseColor]}`}>
      {status ? trueLabel : falseLabel}
    </span>
  );
}