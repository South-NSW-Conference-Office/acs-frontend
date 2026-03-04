'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { rbacService } from '@/lib/rbac';
import { User } from '@/types/rbac';
import {
   Column,
   ActionCell,
   IconButton,
   StatusBadge,
} from '@/components/DataTable';
import {
   UserIcon,
   PencilIcon,
   TrashIcon,
   EnvelopeIcon,
   EyeIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/Button';
import UserModal from '@/components/UserModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

export default function Users() {
   const router = useRouter();
   const [users, setUsers] = useState<User[]>([]);
   const [loading, setLoading] = useState(true);
   const [selectedUser, setSelectedUser] = useState<User | null>(null);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [userToDelete, setUserToDelete] = useState<User | null>(null);
   const [searchQuery, setSearchQuery] = useState('');
   const toast = useToast();
   const toastRef = useRef(toast);
   
   // Update toast ref when toast changes
   useEffect(() => {
      toastRef.current = toast;
   }, [toast]);

   const fetchUsers = useCallback(async () => {
      try {
         setLoading(true);
         const data = await rbacService.getUsers();

         // Define the API response type
         interface ApiUser {
            _id: string;
            name: string;
            email: string;
            verified?: boolean;
            phone?: string;
            address?: string;
            city?: string;
            state?: string;
            country?: string;
            createdAt?: string;
            updatedAt?: string;
         }

         // Map the simplified API response to the full User interface
         const mappedUsers = Array.isArray(data)
            ? data.map((user: ApiUser) => ({
                 ...user,
                 id: user._id, // Add id alias for _id
                 verified: user.verified ?? false, // Use actual value or default to false
                 createdAt: user.createdAt || new Date().toISOString(), // Default value for missing field
                 updatedAt: user.updatedAt || new Date().toISOString(), // Default value for missing field
              }))
            : [];

         setUsers(mappedUsers);
      } catch (error) {
         console.error('Error fetching users:', error);
         setUsers([]);
         // Show error without causing infinite loop - use ref to avoid dependency
         toastRef.current?.error('Failed to load users', 'Please try again later');
      } finally {
         setLoading(false);
      }
   }, []); // Remove toast dependency to prevent infinite loop

   useEffect(() => {
      fetchUsers();
   }, [fetchUsers]); // Include fetchUsers dependency

   const handleDeleteUser = async (user: User) => {
      try {
         const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${user._id}`,
            {
               method: 'DELETE',
               headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
               },
               credentials: 'include',
            }
         );

         if (response.ok) {
            setUsers((prev) => prev.filter((u) => u._id !== user._id));
            toast.success(
               'User deleted',
               `${user.name} has been successfully removed.`
            );
         } else {
            const error = await response.json();
            toast.error(
               'Failed to delete user',
               error.message || 'An unexpected error occurred'
            );
         }
      } catch (error) {
         console.error('Error deleting user:', error);
         toast.error('Failed to delete user', 'An unexpected error occurred');
      } finally {
         setShowDeleteConfirm(false);
         setUserToDelete(null);
      }
   };

   const handleResendVerification = async (user: User) => {
      if (user.verified) {
         toast.info(
            'User already verified',
            'This user has already verified their email address.'
         );
         return;
      }

      try {
         const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/resend-verification`,
            {
               method: 'POST',
               headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
               },
               credentials: 'include',
               body: JSON.stringify({ userId: user._id }),
            }
         );

         if (response.ok) {
            toast.success(
               'Verification email sent',
               `Verification email has been sent to ${user.email}`
            );
         } else {
            const error = await response.json();
            toast.error(
               'Failed to send verification email',
               error.message || 'An unexpected error occurred'
            );
         }
      } catch (error) {
         console.error('Error resending verification:', error);
         toast.error(
            'Failed to send verification email',
            'An unexpected error occurred'
         );
      }
   };

   const handleUserSaved = (savedUser: User, isEdit: boolean) => {
      if (isEdit) {
         // Update existing user in the list
         setUsers((prev) =>
            prev.map((user) => (user._id === savedUser._id ? savedUser : user))
         );
         toast.success(
            'User updated',
            `${savedUser.name || 'User'} has been successfully updated.`
         );
      } else {
         // Add new user to the list
         setUsers((prev) => [...prev, savedUser]);
         toast.success(
            'User created',
            `${savedUser.name || 'User'} has been successfully created.`
         );

         // Refresh the user list to ensure it's up to date
         setTimeout(() => {
            fetchUsers();
         }, 500);
      }

      // Close modals and clear state
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedUser(null);
   };

   const filteredUsers = users.filter(
      (user) =>
         (user.name &&
            user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (user.email &&
            user.email.toLowerCase().includes(searchQuery.toLowerCase()))
   );

   // Define table columns
   const columns: Column<User>[] = [
      {
         key: 'name',
         header: 'Name',
         accessor: (user) => (
            <div className="flex items-center">
               <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                     <UserIcon className="h-6 w-6 text-gray-600" />
                  </div>
               </div>
               <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">
                     {user.name || 'Unnamed User'}
                  </div>
               </div>
            </div>
         ),
      },
      {
         key: 'email',
         header: 'Email',
         accessor: (user) => (
            <div className="text-sm text-gray-900">{user.email || '-'}</div>
         ),
      },
      {
         key: 'phone',
         header: 'Phone',
         accessor: (user) => (
            <div className="text-sm text-gray-900">{user.phone || '-'}</div>
         ),
      },
      {
         key: 'address',
         header: 'Address',
         accessor: (user) => (
            <div className="text-sm text-gray-900">
               {user.address ? (
                  <div>
                     <div>{user.address}</div>
                     {(user.city || user.state || user.country) && (
                        <div className="text-gray-500">
                           {[user.city, user.state, user.country]
                              .filter(Boolean)
                              .join(', ')}
                        </div>
                     )}
                  </div>
               ) : (
                  '-'
               )}
            </div>
         ),
      },
      {
         key: 'verified',
         header: 'Verified',
         accessor: (user) => (
            <StatusBadge
               status={user.verified}
               trueLabel="Verified"
               falseLabel="Unverified"
               trueColor="green"
               falseColor="yellow"
            />
         ),
      },
      {
         key: 'roles',
         header: 'Roles',
         accessor: (user) => {
            const allAssignments = [
               ...(user.unionAssignments || []),
               ...(user.conferenceAssignments || []),
               ...(user.churchAssignments || [])
            ];
            
            return (
               <div className="flex flex-wrap gap-1">
                  {allAssignments.length > 0 ? (
                     allAssignments.map((assignment, index) => {
                        const roleDisplay = typeof assignment.role === 'object' 
                           ? (assignment.role.displayName || assignment.role.name || 'Unknown Role')
                           : (assignment.role || 'Unknown Role');
                        
                        return (
                           <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                           >
                              {String(roleDisplay)}
                           </span>
                        );
                     })
                  ) : (
                     <span className="text-sm text-gray-500">No roles</span>
                  )}
               </div>
            );
         },
         className: 'px-6 py-4',
      },
      {
         key: 'createdAt',
         header: 'Joined',
         accessor: (user) => (
            <span className="text-sm text-gray-500">
               {new Date(user.createdAt).toLocaleDateString()}
            </span>
         ),
      },
      {
         key: 'actions',
         header: 'Actions',
         headerClassName:
            'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider',
         className:
            'px-6 py-4 whitespace-nowrap text-right text-sm font-medium',
         accessor: (user) => (
            <ActionCell>
               <PermissionGate permission="users.read">
                  <IconButton
                     onClick={() => router.push(`/users/${user._id}`)}
                     title="View User Details"
                     icon={<EyeIcon className="h-5 w-5" />}
                     variant="default"
                  />
               </PermissionGate>

               {!user.verified && (
                  <PermissionGate permission="users.update">
                     <IconButton
                        onClick={() => handleResendVerification(user)}
                        title="Resend Verification Email"
                        icon={<EnvelopeIcon className="h-5 w-5" />}
                        variant="default"
                     />
                  </PermissionGate>
               )}

               <PermissionGate permission="users.update">
                  <IconButton
                     title="Edit User"
                     icon={<PencilIcon className="h-5 w-5" />}
                     onClick={() => {
                        setSelectedUser(user);
                        setShowEditModal(true);
                     }}
                  />
               </PermissionGate>

               <PermissionGate permission="users.delete">
                  <IconButton
                     title="Delete User"
                     icon={<TrashIcon className="h-5 w-5" />}
                     variant="danger"
                     onClick={() => {
                        setUserToDelete(user);
                        setShowDeleteConfirm(true);
                     }}
                  />
               </PermissionGate>
            </ActionCell>
         ),
      },
   ];

   return (
      <AdminLayout
         title="Users"
         description="Manage users and their role assignments"
      >
         <div className="space-y-6">
            {/* Table with custom header */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
               {/* Custom header with search and button */}
               <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-4">
                     <div className="max-w-xs">
                        <input
                           type="text"
                           placeholder="Search users..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                        />
                     </div>
                     <PermissionGate permission="users.create">
                        <Button
                           onClick={() => setShowCreateModal(true)}
                           className="whitespace-nowrap"
                           size="sm"
                        >
                           Add User
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
                  ) : filteredUsers.length === 0 ? (
                     <div className="px-4 py-8 text-center">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                           <UserIcon />
                        </div>
                        <p className="text-sm text-gray-500">No users found</p>
                     </div>
                  ) : (
                     <table className="min-w-full divide-y divide-gray-200">
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
                           {filteredUsers.map((user) => (
                              <tr key={user._id} className="hover:bg-gray-50">
                                 {columns.map((column) => (
                                    <td
                                       key={column.key}
                                       className={
                                          column.className ||
                                          'px-6 py-4 whitespace-nowrap text-sm'
                                       }
                                    >
                                       {column.accessor(user)}
                                    </td>
                                 ))}
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
            </div>

            {/* Create/Edit User Modal */}
            <UserModal
               isOpen={showCreateModal || showEditModal}
               onClose={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedUser(null);
               }}
               onSave={handleUserSaved}
               user={showEditModal ? selectedUser : null}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
               isOpen={showDeleteConfirm}
               onClose={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
               }}
               onConfirm={() => userToDelete && handleDeleteUser(userToDelete)}
               title="Delete User"
               message={`Are you sure you want to delete "${userToDelete?.name}"? This action cannot be undone.`}
               confirmLabel="Delete User"
               confirmButtonColor="red"
               icon={<TrashIcon className="h-6 w-6 text-red-600" />}
            />
         </div>
      </AdminLayout>
   );
}
