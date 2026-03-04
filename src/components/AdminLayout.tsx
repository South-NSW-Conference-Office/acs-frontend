'use client';

import { useEffect, useMemo, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AuthService } from '../lib/auth';
import { usePermissions } from '../contexts/HierarchicalPermissionContext';
import Sidebar from './Sidebar';


interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  hideTitle?: boolean;
  hideHeader?: boolean;
}

export default function AdminLayout({ children, title, description, hideTitle, hideHeader }: AdminLayoutProps) {
  const router = useRouter();
  const { user: contextUser, loading: contextLoading } = usePermissions();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthenticated = useMemo(() => {
    if (contextLoading) return false;
    const token = AuthService.getToken();
    return !!(token && contextUser);
  }, [contextLoading, contextUser]);

  useEffect(() => {
    // Only check authentication after context has finished loading
    if (!contextLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [contextLoading, isAuthenticated, router]);

  // Show loading spinner while context is loading or auth state is not yet confirmed.
  // This prevents a brief flash of protected content before the redirect fires.
  if (contextLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FCFCFC' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!contextUser) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#FCFCFC' }}>
      {/* Sidebar - Hidden on small screens, collapsible on larger screens */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ease-in-out flex-shrink-0 hidden lg:block`}>
        <div className="fixed top-0 left-0 h-full bg-white shadow-lg z-30" 
             style={{ width: sidebarCollapsed ? '4rem' : '16rem' }}>
          <Sidebar collapsed={sidebarCollapsed} />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50">
            <Sidebar collapsed={false} onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        {!hideHeader && (
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center">
              {/* Mobile hamburger menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:hidden"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hidden lg:inline-flex"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <div className="ml-4">
                {!hideTitle && title && (
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                )}
                {!hideTitle && description && (
                  <p className="text-gray-600 text-sm mt-1">{description}</p>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{contextUser.name || 'User'}</p>
                <p className="text-xs text-gray-500">{contextUser.email}</p>
              </div>
              
              <button
                onClick={() => router.push('/profile')}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
                style={{ backgroundColor: '#454545' }}
                aria-label="Go to profile page"
                title="Go to profile"
              >
                {(() => {
                  let avatarUrl = '';
                  if (contextUser.avatar) {
                    if (typeof contextUser.avatar === 'object' && contextUser.avatar.url) {
                      avatarUrl = contextUser.avatar.url;
                    } else if (typeof contextUser.avatar === 'string' && contextUser.avatar.trim() !== "") {
                      avatarUrl = contextUser.avatar;
                    }
                  }
                  
                  return avatarUrl ? (
                    <Image 
                      src={avatarUrl} 
                      alt="Profile" 
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {contextUser.name ? contextUser.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  );
                })()}
              </button>
            </div>
          </header>
        )}

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}