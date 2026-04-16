'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

const DROPDOWN_HEIGHT = 200; // conservative estimate in px

export function RowActionsMenu({ actions }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < DROPDOWN_HEIGHT;
    setPos({
      top: openUpward ? rect.top : rect.bottom + 4,
      left: rect.right,
      openUpward,
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Close on scroll/resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) updatePosition();
    setOpen((o) => !o);
  };

  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
        title="Actions"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-44 rounded-lg bg-white shadow-lg ring-1 ring-black/5"
          style={{
            top: pos.openUpward ? undefined : pos.top,
            bottom: pos.openUpward ? window.innerHeight - pos.top : undefined,
            left: pos.left - 176, // w-44 = 11rem = 176px, align right edge to button
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col py-1">
            {visible.map((action, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!action.disabled) { action.onClick(); setOpen(false); }
                }}
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
        </div>,
        document.body
      )}
    </>
  );
}
