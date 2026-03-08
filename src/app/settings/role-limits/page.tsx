'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { useAuth } from '../../../contexts/HierarchicalPermissionContext';
import { useRouter } from 'next/navigation';

interface RoleLimit {
  role: string;
  displayName: string;
  currentLimit: number;
  currentCount: number;
  description: string;
  isSystem: boolean;
}

export default function RoleLimits() {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [roleLimits, setRoleLimits] = useState<RoleLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission('*')) {
      router.push('/settings');
      return;
    }
    
    fetchRoleLimits();
  }, [hasPermission, router]);

  const fetchRoleLimits = async () => {
    try {
      const response = await fetch('/api/admin/role-limits');
      if (!response.ok) throw new Error('Failed to fetch role limits');
      
      const data = await response.json();
      setRoleLimits(data);
    } catch (error) {
      setError('Failed to load role limits');
      console.error('Error fetching role limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRoleLimit = async (role: string, newLimit: number) => {
    if (newLimit < 1) {
      setError('Role limits must be at least 1');
      return;
    }

    const roleData = roleLimits.find(r => r.role === role);
    if (roleData && newLimit < roleData.currentCount) {
      setError(`Cannot set limit below current count (${roleData.currentCount})`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/role-limits', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          maxUsers: newLimit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update role limit');
      }

      setSuccess('Role limit updated successfully');
      fetchRoleLimits();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error updating role limit:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLimitChange = (role: string, value: string) => {
    const newLimit = parseInt(value);
    if (!isNaN(newLimit)) {
      setRoleLimits(prev => 
        prev.map(r => r.role === role ? { ...r, currentLimit: newLimit } : r)
      );
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.round((current / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-600 dark:text-red-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (!hasPermission('*')) {
    return null;
  }

  if (loading) {
    return (
      <AdminLayout title="Role & Access Limits" description="Configure maximum account limits for each role">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Role & Access Limits" description="Configure maximum account limits for each role">
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Critical System Configuration
              </h3>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                Changes to role limits affect system security and access control. Ensure limits are appropriate for your organization&apos;s size and security requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4">
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Role Limits Table */}
        <div className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Role Account Limits
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configure the maximum number of accounts allowed for each role type
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Current Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Account Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {roleLimits.map((roleLimit) => {
                  const usagePercentage = getUsagePercentage(roleLimit.currentCount, roleLimit.currentLimit);
                  const usageColor = getUsageColor(usagePercentage);
                  
                  return (
                    <tr key={roleLimit.role} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="flex items-center">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              {roleLimit.displayName}
                            </h4>
                            {roleLimit.isSystem && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Critical
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {roleLimit.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {roleLimit.currentCount} / {roleLimit.currentLimit}
                          </div>
                          <div className={`ml-2 text-sm font-medium ${usageColor}`}>
                            ({usagePercentage}%)
                          </div>
                        </div>
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${usagePercentage >= 80 ? 'bg-red-500' : usagePercentage >= 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="1"
                          value={roleLimit.currentLimit}
                          onChange={(e) => handleLimitChange(roleLimit.role, e.target.value)}
                          className="block w-20 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          disabled={saving}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => updateRoleLimit(roleLimit.role, roleLimit.currentLimit)}
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                        >
                          {saving ? 'Saving...' : 'Update'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Important Notes
              </h3>
              <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                <li>You cannot set a limit below the current number of active accounts</li>
                <li>Super Admin limits are critical for system security - set conservatively</li>
                <li>Changes take effect immediately and apply system-wide</li>
                <li>Warning notifications are sent when usage reaches 80% of the limit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}