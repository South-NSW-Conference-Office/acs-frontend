'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { Column, StatusBadge } from '@/components/DataTable';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import Button from '@/components/Button';
import RoleModal from '@/components/RoleModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { rbacService } from '@/lib/rbac';
import { Role } from '@/types/rbac';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheckIcon, 
  TrashIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const toast = useToast();
  const router = useRouter();
  const { user, hasPermission } = usePermissions();
  const isSuperAdmin = hasPermission('*');

  // Helper function to get user's hierarchy level based on their highest role
  const getUserHierarchyLevel = (): number => {
    if (isSuperAdmin) return 0; // Super admins can see all roles
    
    // Get the highest level (lowest number) from user's role assignments
    let highestLevel = 2; // Default to church level (most restrictive)
    
    if (user?.unionAssignments && user.unionAssignments.length > 0) {
      highestLevel = Math.min(highestLevel, 0); // Union level
    }
    if (user?.conferenceAssignments && user.conferenceAssignments.length > 0) {
      highestLevel = Math.min(highestLevel, 1); // Conference level
    }
    if (user?.churchAssignments && user.churchAssignments.length > 0) {
      highestLevel = Math.min(highestLevel, 2); // Church level
    }
    
    return highestLevel;
  };

  const getRoleHierarchyLevel = (roleLevel: string): number => {
    switch (roleLevel) {
      case 'union': return 0;      // Highest level
      case 'conference': return 1; // Middle level
      case 'church': return 2;     // Lowest level
      default: return 2;           // Default to most restrictive
    }
  };

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rbacService.getRoles(true); // Include system roles
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles', 'An unexpected error occurred');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDeleteRole = async (role: Role) => {
    try {
      await rbacService.deleteRole(role._id);
      setRoles(prev => prev.filter(r => r._id !== role._id));
      toast.success('Role deleted', `${role.displayName} has been successfully removed.`);
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role', 'An unexpected error occurred');
    } finally {
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
    }
  };

  const handleRoleSaved = (savedRole: Role, isEdit: boolean) => {
    if (isEdit) {
      // Update existing role in the list
      setRoles(prev => 
        prev.map(role => role._id === savedRole._id ? savedRole : role)
      );
      toast.success('Role updated', `${savedRole.displayName} has been successfully updated.`);
    } else {
      // Add new role to the list
      setRoles(prev => [...prev, savedRole]);
      toast.success('Role created', `${savedRole.displayName} has been successfully created.`);
    }
    
    // Close modals and clear state
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedRole(null);
  };

  const filteredRoles = roles.filter(role => {
    // First check search query
    const matchesSearch = (role.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.level || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Then check hierarchy level - users can only see roles at their level or below
    const userHierarchyLevel = getUserHierarchyLevel();
    const roleHierarchyLevel = getRoleHierarchyLevel(role.level || 'church');
    
    // Lower hierarchy numbers are higher privilege (0=union, 1=conference, 2=church)
    // Users can see roles at their level and below (higher hierarchy numbers)
    return roleHierarchyLevel >= userHierarchyLevel;
  });

  const getLevelColor = (level: string | undefined) => {
    switch (level) {
      case 'union':
        return { bg: 'bg-purple-100', text: 'text-purple-800' };
      case 'conference':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'church':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  // Define table columns
  const columns: Column<Role>[] = [
    {
      key: 'role',
      header: 'Role',
      accessor: (role) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <ShieldCheckIcon className="h-6 w-6 text-gray-600" />
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 flex items-center">
              <button
                onClick={() => router.push(`/roles/${role._id}/permissions`)}
                className="text-sm font-semibold text-gray-900 hover:text-gray-600 cursor-pointer transition-colors duration-200 focus:outline-none"
              >
                {role.displayName || role.name || 'Unnamed Role'}
              </button>
              {role.isSystem && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                  <LockClosedIcon className="w-3 h-3 mr-1" />
                  System
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">{role.name || '-'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'level',
      header: 'Level',
      accessor: (role) => {
        const level = role.level || 'unknown';
        const colors = getLevelColor(role.level);
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors.bg} ${colors.text}`}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </span>
        );
      }
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (role) => (
        <div className="text-sm text-gray-900 max-w-xs truncate" title={role.description || ''}>
          {role.description || '-'}
        </div>
      ),
      className: 'max-w-xs'
    },
    {
      key: 'permissions',
      header: 'Permissions',
      accessor: (role) => {
        const permissions = role.permissions || [];
        return (
          <div className="text-sm text-gray-900">
            <div className="flex flex-wrap gap-1">
              {permissions.slice(0, 3).map((perm, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {perm}
                </span>
              ))}
              {permissions.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                  +{permissions.length - 3} more
                </span>
              )}
              {permissions.length === 0 && (
                <span className="text-gray-500">No permissions</span>
              )}
            </div>
          </div>
        );
      },
      className: 'max-w-xs'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (role) => (
        <StatusBadge
          status={role.isActive !== false}
          trueLabel="Active"
          falseLabel="Inactive"
          trueColor="green"
          falseColor="red"
        />
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: (role) => (
        <span className="text-sm text-gray-500">
          {role.createdAt ? new Date(role.createdAt).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider',
      className: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium',
      accessor: (role) => (
        <RowActionsMenu actions={[
          { label: 'View Details', onClick: () => { setSelectedRole(role); setShowViewModal(true); } },
          { label: 'Edit', onClick: () => { setSelectedRole(role); setShowEditModal(true); } },
          { label: 'Delete', onClick: () => { setRoleToDelete(role); setShowDeleteConfirm(true); }, variant: 'danger' },
        ]} />
      )
    }
  ];

  return (
    <AdminLayout 
      title="Roles & Permissions" 
      description="Manage system roles and their permissions"
    >
      <div className="space-y-6">
        {/* Table with custom header */}
        <div className="overflow-hidden">
          {/* Custom header with search and button */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="max-w-xs">
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                />
              </div>
              <PermissionGate permission="roles.create">
                <Button onClick={() => setShowCreateModal(true)} className="whitespace-nowrap" size="sm">
                  Add Role
                </Button>
              </PermissionGate>
            </div>
          </div>
          
          {/* Table content */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-4 py-5 text-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <ShieldCheckIcon />
                </div>
                <p className="text-sm text-gray-500">No roles found</p>
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
                  {filteredRoles.map((role) => (
                    <tr key={role._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={column.className || 'px-6 py-4 whitespace-nowrap text-sm'}
                        >
                          {column.accessor(role)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create/Edit Role Modal */}
        <RoleModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          onSave={handleRoleSaved}
          role={showEditModal ? selectedRole : null}
        />

        {/* View Role Modal */}
        <RoleModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRole(null);
          }}
          onSave={handleRoleSaved}
          role={selectedRole}
          viewMode={true}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setRoleToDelete(null);
          }}
          onConfirm={() => roleToDelete && handleDeleteRole(roleToDelete)}
          title="Delete Role"
          message={`Are you sure you want to delete "${roleToDelete?.displayName}"? This action cannot be undone.`}
          confirmLabel="Delete Role"
          confirmButtonColor="red"
          icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        />
      </div>
    </AdminLayout>
  );
}

