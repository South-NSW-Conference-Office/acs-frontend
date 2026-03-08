'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuperAdminService } from '@/lib/superAdmin';
import { useToast } from '@/contexts/ToastContext';
import ConfirmationModal from '@/components/ConfirmationModal';

interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  avatar?: string;
  organizations: Array<{
    _id: string;
    name: string;
    type: 'union' | 'conference' | 'church';
    role: string;
  }>;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

interface EligibleUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  organizations: Array<{
    _id: string;
    name: string;
    type: 'union' | 'conference' | 'church';
    role: string;
  }>;
  verified: boolean;
}

// Helper function to format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(true);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([]);
  const [stats, setStats] = useState<{
    superAdminCount: number;
    totalUsers: number;
    verifiedUsers: number;
    percentageSuperAdmins: string;
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'eligible' | 'logs'>('current');
  const [auditLogs, setAuditLogs] = useState<Array<{
    _id: string;
    action: string;
    targetResource: string;
    targetId: string;
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    metadata: Record<string, unknown>;
    createdAt: string;
    statusCode: number;
  }>>([]);
  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    totalPages: 1
  });
  const { success, error } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, statsData] = await Promise.all([
        SuperAdminService.getUsers(),
        SuperAdminService.getStats()
      ]);
      
      setSuperAdmins(usersData.superAdmins);
      setEligibleUsers(usersData.eligibleUsers);
      setStats(statsData.stats);
    } catch (err) {
      console.error('Error fetching super admin data:', err);
      error('Failed to load super admin data');
    } finally {
      setLoading(false);
    }
  }, [error]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const data = await SuperAdminService.getAuditLogs(auditPagination.page);
      setAuditLogs(data.logs);
      setAuditPagination({
        page: data.pagination.page,
        totalPages: data.pagination.totalPages
      });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      error('Failed to load audit logs');
    }
  }, [auditPagination.page, error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchAuditLogs();
    }
  }, [activeTab, auditPagination.page, fetchAuditLogs]);

  const handleGrantSuperAdmin = async () => {
    if (!selectedUser) return;

    try {
      await SuperAdminService.grantSuperAdmin(selectedUser, reason);
      success('Super admin privileges granted successfully');
      setShowGrantModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Failed to grant super admin privileges');
    }
  };

  const handleRevokeSuperAdmin = async () => {
    if (!selectedUser) return;

    try {
      await SuperAdminService.revokeSuperAdmin(selectedUser, reason);
      success('Super admin privileges revoked successfully');
      setShowRevokeModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Failed to revoke super admin privileges');
    }
  };

  const filteredEligibleUsers = eligibleUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Super Admin Management</h2>
        <p className="mt-2 text-gray-600">
          Manage system-wide super administrator privileges
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-[#B95B09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Super Admins</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.superAdminCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-[#B95B09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-[#B95B09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Verified Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.verifiedUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-[#B95B09]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Percentage</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.percentageSuperAdmins}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('current')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'current'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Current Super Admins ({superAdmins.length})
            </button>
            <button
              onClick={() => setActiveTab('eligible')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'eligible'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Eligible Users ({eligibleUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Audit Logs
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Current Super Admins */}
          {activeTab === 'current' && (
            <div className="space-y-4">
              {superAdmins.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No super administrators found</p>
              ) : (
                superAdmins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{admin.name}</h4>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Granted</p>
                        <p className="text-sm text-gray-900">
                          {formatRelativeTime(new Date(admin.createdAt))}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(admin.id);
                          setShowRevokeModal(true);
                        }}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Eligible Users */}
          {activeTab === 'eligible' && (
            <div className="space-y-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {filteredEligibleUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No eligible users found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEligibleUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{user.name}</h4>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.organizations.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {user.organizations[0].name || 'Unknown Organization'}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(user.id);
                          setShowGrantModal(true);
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Grant Access
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audit Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {auditLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No audit logs found</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Performed By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Target User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {auditLogs.map((log) => (
                          <tr key={log._id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                log.action === 'grant_super_admin' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {log.action === 'grant_super_admin' ? 'Granted' : 'Revoked'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.userId?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(log.metadata?.targetUserEmail as string) || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatRelativeTime(new Date(log.createdAt))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {auditPagination.totalPages > 1 && (
                    <div className="flex justify-center mt-4 space-x-2">
                      <button
                        onClick={() => setAuditPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={auditPagination.page === 1}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        Page {auditPagination.page} of {auditPagination.totalPages}
                      </span>
                      <button
                        onClick={() => setAuditPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={auditPagination.page === auditPagination.totalPages}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Grant Modal */}
      <ConfirmationModal
        isOpen={showGrantModal}
        onClose={() => {
          setShowGrantModal(false);
          setSelectedUser(null);
          setReason('');
        }}
        onConfirm={handleGrantSuperAdmin}
        title="Grant Super Admin Privileges"
        message="This will grant full system access to the selected user. This action will be logged."
        confirmLabel="Grant Access"
        confirmButtonColor="blue"
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Provide a reason for granting super admin access..."
          />
        </div>
      </ConfirmationModal>

      {/* Revoke Modal */}
      <ConfirmationModal
        isOpen={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedUser(null);
          setReason('');
        }}
        onConfirm={handleRevokeSuperAdmin}
        title="Revoke Super Admin Privileges"
        message="This will remove all super admin privileges from the selected user. This action will be logged."
        confirmLabel="Revoke Access"
        confirmButtonColor="red"
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            rows={3}
            placeholder="Provide a reason for revoking super admin access..."
          />
        </div>
      </ConfirmationModal>
    </div>
  );
}