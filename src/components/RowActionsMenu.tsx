'use client';

import { useState, useRef, useEffect } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

export interface RowAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  hidden?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

interface RowActionsMenuProps {
  actions: RowAction[];
}

export function RowActionsMenu({ actions }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
        title="Actions"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-44 rounded-lg bg-white shadow-lg ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col py-1">
            {visible.map((action, i) => (
              <button
                key={i}
                onClick={() => { if (!action.disabled) { action.onClick(); setOpen(false); } }}
                disabled={action.disabled}
                title={action.disabled ? action.disabledReason : undefined}
                className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-100 ${
                  action.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : action.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
