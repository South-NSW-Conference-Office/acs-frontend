'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthService } from '../lib/auth';
import SidebarItem from './SidebarItem';
import SidebarSectionHeader from './SidebarSectionHeader';
import { MenuIcon } from './MenuIcon';
import { useMenuAccess } from '@/hooks/useMenuAccess';
import { useHierarchicalPermissions } from '../contexts/HierarchicalPermissionContext';
import { MenuItem, MenuContext } from '@/types/menu';

interface SidebarProps {
  collapsed?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ collapsed = false, onClose }: SidebarProps) {
  const router = useRouter();
  const { teamRole, currentTeam, permissions, currentLevel, roleCategory } = useHierarchicalPermissions();
  const { sections, itemsBySection } = useMenuAccess();

  const menuContext: MenuContext = {
    teamRole,
    currentTeam,
    roleCategory,
    permissions,
    hierarchyLevel: currentLevel,
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('[Sidebar] Logout error:', error);
      router.push('/');
    }
  };

  const resolveHref = (item: MenuItem): string => {
    if (typeof item.href === 'function') {
      return item.href(menuContext);
    }
    return item.href;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">

      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-4 border-b border-gray-100 relative">
        <Image
          src="/logo.png"
          alt="Adventist Community Services Logo"
          width={collapsed ? 40 : 140}
          height={collapsed ? 40 : 140}
          className="object-contain rounded-xl"
        />
        {/* Mobile close */}
        {!collapsed && onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-[#667085] hover:bg-gray-100 rounded absolute right-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Team Context */}
      {currentTeam && !collapsed && (
        <div className="px-4 py-2.5 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider mb-0.5">Current Team</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#101828] truncate">{currentTeam.name}</p>
            {teamRole && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-[#F2F4F7] text-[#344054] rounded-md">
                {teamRole.charAt(0).toUpperCase() + teamRole.slice(1)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {sections.map((section, index) => {
          const sectionItems = itemsBySection[section.id];
          const isLastSection = index === sections.length - 1;

          return (
            <div key={section.id} className={isLastSection ? '' : ''}>
              {section.title && (
                <SidebarSectionHeader title={section.title} collapsed={collapsed} />
              )}
              <div className="space-y-0.5">
                {sectionItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    href={resolveHref(item)}
                    icon={<MenuIcon icon={item.icon} />}
                    label={item.label}
                    badge={item.badge}
                    collapsed={collapsed}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer — Logout */}
      <div className="border-t border-gray-100 px-3 py-3">
        <button
          onClick={() => { handleLogout(); if (onClose) onClose(); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#344054] hover:bg-[#F9FAFB] hover:text-[#101828] transition-colors duration-150 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <span className="flex-shrink-0 w-5 h-5 text-[#667085]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          {!collapsed && <span className="flex-1 text-left">Logout</span>}
        </button>
      </div>
    </div>
  );
}
