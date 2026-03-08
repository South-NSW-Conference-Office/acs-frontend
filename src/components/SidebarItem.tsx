'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface SidebarItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string | number;
  onClick?: () => void;
  collapsed?: boolean;
}

export default function SidebarItem({ href, icon, label, badge, onClick, collapsed = false }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 group ${
        isActive
          ? 'bg-[#F2F4F7] text-[#101828]'
          : 'text-[#344054] hover:bg-[#F9FAFB] hover:text-[#101828]'
      } ${collapsed ? 'justify-center px-2' : ''}`}
    >
      {/* Icon */}
      <span className={`flex-shrink-0 w-5 h-5 ${isActive ? 'text-[#344054]' : 'text-[#667085] group-hover:text-[#344054]'} transition-colors`}>
        {icon}
      </span>

      {/* Label + Badge */}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && (
            <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-md bg-[#344054] text-white">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
