import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * A searchable select. Typing filters the list; clearing the search (or never
 * typing) shows the full scrollable list, so the user can either search or just
 * scroll. Self-contained — no extra dependencies, styled to match ui/select.
 */
export const Combobox = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  disabled = false,
  className = '',
}: ComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus the search box once the panel is open (no state changes here).
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const openMenu = () => {
    setQuery('');
    const idx = options.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const commit = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) commit(opt.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className={`block truncate ${selected ? '' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg">
          <div className="flex items-center border-b border-gray-200 px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent px-2 text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <div ref={listRef} className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">{emptyText}</div>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlight;
                return (
                  <button
                    key={option.value}
                    type="button"
                    data-index={index}
                    onClick={() => commit(option.value)}
                    onMouseEnter={() => setHighlight(index)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm focus:outline-none ${
                      isHighlighted ? 'bg-gray-100' : ''
                    } ${isSelected ? 'font-medium' : ''}`}
                  >
                    <span className="block truncate">{option.label}</span>
                    {isSelected && <Check className="ml-2 h-4 w-4 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
