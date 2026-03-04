'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal, { ModalBody, ModalFooter } from './Modal';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { User, Role, HierarchicalEntity, HierarchicalAssignment } from '@/types/rbac';
import { rbacService } from '@/lib/rbac';
import { HierarchicalService } from '@/lib/hierarchicalService';
import { X, Plus, Loader2 } from 'lucide-react';

interface UserModalProps {
   isOpen: boolean;
   onClose: () => void;
   onSave: (savedUser: User, isEdit: boolean) => void;
   user?: User | null;
}

export default function UserModal({
   isOpen,
   onClose,
   onSave,
   user,
}: UserModalProps) {
   const [formData, setFormData] = useState({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      country: user?.country || '',
      verified: user?.verified || false,
   });
   const [loading, setLoading] = useState(false);
   const [roles, setRoles] = useState<Role[]>([]);
   const [entities, setEntities] = useState<HierarchicalEntity[]>([]);
   const [assignments, setAssignments] = useState<HierarchicalAssignment[]>([]);
   const [newAssignment, setNewAssignment] = useState({ entityId: '', roleId: '' });
   const toast = useToast();
   const { hasPermission } = usePermissions();

   const fetchRoles = useCallback(async () => {
      if (!isOpen) return; // Fetch for both new and existing users

      try {
         const systemRoles = await rbacService.getSystemRoles();

         // Validate role data structure
         if (Array.isArray(systemRoles)) {
            systemRoles.forEach((role, index) => {
               if (!role.level) {
                  console.warn(`UserModal: Role at index ${index} missing level`);
               }
               if (!role.displayName && !role.name) {
                  console.warn(`UserModal: Role at index ${index} missing displayName and name`);
               }
            });
         }

         setRoles(Array.isArray(systemRoles) ? systemRoles : []);
      } catch (error) {
         console.error('UserModal: Error fetching roles:', error);
         setRoles([]);
      }
   }, [isOpen]);

   const fetchHierarchicalEntities = useCallback(async () => {
      if (!isOpen) return; // Fetch for both new and existing users

      try {
         const entityData = await HierarchicalService.getAllUserEntities();

         // Add type field to each entity based on which collection it comes from
         const allEntities = [
            ...entityData.unions.map(union => ({ ...union, type: 'union' as const })),
            ...entityData.conferences.map(conference => ({ ...conference, type: 'conference' as const })),
            ...entityData.churches.map(church => ({ ...church, type: 'church' as const }))
         ];

         // Validate entity data structure
         allEntities.forEach((entity, index) => {
            if (!entity.type) {
               console.warn(`UserModal: Entity at index ${index} missing type`);
            }
            if (!entity.name) {
               console.warn(`UserModal: Entity at index ${index} missing name`);
            }
         });

         setEntities(Array.isArray(allEntities) ? allEntities : []);
      } catch (error) {
         console.error('UserModal: Error fetching entities:', error);
         setEntities([]);
      }
   }, [isOpen]);

   useEffect(() => {
      if (isOpen && hasPermission('users.assign_role')) {
         fetchRoles();
         fetchHierarchicalEntities();
      }
   }, [fetchRoles, fetchHierarchicalEntities, isOpen, hasPermission]);


   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate assignments
      if (hasPermission('users.assign_role')) {
         if (assignments.length === 0) {
            toast.error('Validation Error', 'At least one hierarchical entity assignment is required');
            return;
         }
         
         // Validate each assignment has valid entity and role
         for (const assignment of assignments) {
            const entityId = typeof assignment.entity === 'string' 
               ? assignment.entity 
               : assignment.entity?._id;
            const roleName = typeof assignment.role === 'string' 
               ? assignment.role 
               : assignment.role?.name;
            
            if (!entityId) {
               toast.error('Validation Error', 'All assignments must have a valid entity selected');
               return;
            }
            if (!roleName) {
               toast.error('Validation Error', 'All assignments must have a valid role selected');
               return;
            }
         }
      }

      try {
         setLoading(true);

         const userData: {
            name: string;
            email: string;
            phone?: string;
            address?: string;
            city?: string;
            state?: string;
            country?: string;
            verified: boolean;
            conferenceAssignments?: Array<{
               conference: string;
               role: string; // Role ObjectId
               assignedAt: string;
            }>;
            unionAssignments?: Array<{
               union: string;
               role: string; // Role ObjectId
               assignedAt: string;
            }>;
            churchAssignments?: Array<{
               church: string;
               role: string; // Role ObjectId
               assignedAt: string;
            }>;
            entityId?: string;
            role?: string;
            entityType?: string;
            conferenceId?: string;
            unionId?: string;
            churchId?: string;
         } = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
            city: formData.city || undefined,
            state: formData.state || undefined,
            country: formData.country || undefined,
            verified: formData.verified,
         };

         // Add assignments data - try legacy format that backend might expect
         if (assignments.length > 0) {
            const firstAssignment = assignments[0];
            const entityId = typeof firstAssignment.entity === 'string' 
               ? firstAssignment.entity 
               : firstAssignment.entity?._id;
            const roleId = typeof firstAssignment.role === 'string' 
               ? firstAssignment.role 
               : firstAssignment.role?._id;  // Use role ID, not name!
            const roleName = typeof firstAssignment.role === 'string' 
               ? firstAssignment.role 
               : (firstAssignment.role?.name || '');
            const entityType = typeof firstAssignment.entity === 'string' 
               ? entities.find(e => e._id === firstAssignment.entity)?.type
               : firstAssignment.entity?.type;
            
            // Backend expects role ID in assignments, not role name!
            if (entityType === 'conference') {
               userData.conferenceAssignments = [{
                  conference: entityId,
                  role: roleId,  // Use role ObjectId, not name!
                  assignedAt: new Date().toISOString()
               }];
               userData.conferenceId = entityId; // Primary assignment
            } else if (entityType === 'union') {
               userData.unionAssignments = [{
                  union: entityId,
                  role: roleId,  // Use role ObjectId, not name!
                  assignedAt: new Date().toISOString()
               }];
               userData.unionId = entityId;
            } else if (entityType === 'church') {
               userData.churchAssignments = [{
                  church: entityId,
                  role: roleId,  // Use role ObjectId, not name!
                  assignedAt: new Date().toISOString()
               }];
               userData.churchId = entityId;
            }
            
            // Keep backward compatibility fields
            userData.entityId = entityId;
            userData.role = roleName;
            userData.entityType = entityType;

            // Validate that we have the required data
            if (!userData.entityId) {
               console.error('UserModal: No entityId in final userData');
               throw new Error('Cannot create user: missing entity ID');
            }
            if (!userData.role) {
               console.error('UserModal: No role in final userData');
               throw new Error('Cannot create user: missing role');
            }
         }

         let response;
         if (user) {
            // Update existing user - handle multiple assignments
            
            // First, update basic user information
            const basicUserData = { ...userData };
            delete basicUserData.entityId;
            delete basicUserData.role;
            // Remove assignment-specific fields for basic user data
            
            response = await fetch(
               `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${user._id}`,
               {
                  method: 'PUT',
                  headers: {
                     'Content-Type': 'application/json',
                     Authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                  credentials: 'include',
                  body: JSON.stringify(basicUserData),
               }
            );

            if (!response.ok) {
               throw new Error('Failed to update user information');
            }

            // Handle role assignments - remove existing ones not in new list, add new ones
            if (user.hierarchicalAssignments && user.hierarchicalAssignments.length > 0) {
               // Remove assignments that are no longer in the list
               for (const existingAssignment of user.hierarchicalAssignments) {
                  const existingEntityId = typeof existingAssignment.entity === 'string' 
                     ? existingAssignment.entity 
                     : existingAssignment.entity._id;
                  
                  const stillAssigned = assignments.some(newAssignment => {
                     const newEntityId = typeof newAssignment.entity === 'string' 
                        ? newAssignment.entity 
                        : newAssignment.entity._id;
                     return newEntityId === existingEntityId;
                  });

                  if (!stillAssigned) {
                     await fetch(
                        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${user._id}/roles/${existingEntityId}`,
                        {
                           method: 'DELETE',
                           headers: {
                              Authorization: `Bearer ${localStorage.getItem('token')}`,
                           },
                           credentials: 'include',
                        }
                     );
                  }
               }
            }

            // Add new assignments
            for (const assignment of assignments) {
               const entityId = typeof assignment.entity === 'string' 
                  ? assignment.entity 
                  : assignment.entity._id;
               const roleName = typeof assignment.role === 'string' 
                  ? assignment.role 
                  : assignment.role.name;

               // Check if this assignment already exists
               const alreadyExists = user.hierarchicalAssignments?.some(existing => {
                  const existingEntityId = typeof existing.entity === 'string' 
                     ? existing.entity 
                     : existing.entity._id;
                  const existingRoleName = typeof existing.role === 'string' 
                     ? existing.role 
                     : existing.role.name;
                  return existingEntityId === entityId && existingRoleName === roleName;
               });

               if (!alreadyExists) {
                  await fetch(
                     `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${user._id}/roles`,
                     {
                        method: 'POST',
                        headers: {
                           'Content-Type': 'application/json',
                           Authorization: `Bearer ${localStorage.getItem('token')}`,
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                           entityId: entityId,
                           roleName: roleName,
                        }),
                     }
                  );
               }
            }
         } else {
            // Create new user with all assignments
            response = await fetch(
               `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users`,
               {
                  method: 'POST',
                  headers: {
                     'Content-Type': 'application/json',
                     Authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                  credentials: 'include',
                  body: JSON.stringify(userData),
               }
            );
         }

         if (response.ok) {
            let savedUser;
            
            if (user) {
               // For user updates, we need to fetch the updated user data since we made separate API calls
               const updatedUserResponse = await fetch(
                  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${user._id}`,
                  {
                     method: 'GET',
                     headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                     },
                     credentials: 'include',
                  }
               );
               
               if (updatedUserResponse.ok) {
                  savedUser = await updatedUserResponse.json();
               } else {
                  // Fallback to original user data if fetch fails
                  savedUser = user;
                  console.warn('Failed to fetch updated user data, using original');
               }
            } else {
               // For new users, use the response from the create endpoint
               savedUser = await response.json();
            }

            // Ensure both _id and id are present for compatibility
            if (savedUser._id && !savedUser.id) {
               savedUser.id = savedUser._id;
            } else if (savedUser.id && !savedUser._id) {
               savedUser._id = savedUser.id;
            }

            onSave(savedUser, !!user);
         } else {
            const errorText = await response.text();

            let error;
            try {
               error = JSON.parse(errorText);
            } catch {
               error = { message: errorText || 'Unknown error' };
            }

            toast.error(
               user ? 'Failed to update user' : 'Failed to create user',
               error.message ||
                  `HTTP ${response.status}: ${response.statusText}`
            );
         }
      } catch (error) {
         console.error('Error saving user:', error);
         toast.error(
            user ? 'Failed to update user' : 'Failed to create user',
            'An unexpected error occurred'
         );
      } finally {
         setLoading(false);
      }
   };

   // Helper functions for assignment management
   const getEntityName = useCallback((entity: string | HierarchicalEntity) => {
      if (typeof entity === 'object' && entity.name) {
         return `${entity.name} (${entity.type})`;
      }
      const entityObj = entities.find(e => e._id === entity);
      return entityObj ? `${entityObj.name} (${entityObj.type})` : 'Unknown Entity';
   }, [entities]);

   const getRoleName = useCallback((role: string | Role) => {
      if (typeof role === 'object' && role.displayName) {
         return role.displayName;
      }
      const roleObj = roles.find(r => r.name === role || r._id === role);
      return roleObj ? roleObj.displayName : 'Unknown Role';
   }, [roles]);

   const isEntityAssigned = useCallback((entityId: string) => {
      return assignments.some(assignment => {
         const assignedEntityId = typeof assignment.entity === 'string' 
            ? assignment.entity 
            : assignment.entity._id;
         return assignedEntityId === entityId;
      });
   }, [assignments]);

   const handleAddAssignment = () => {
      if (!newAssignment.entityId || !newAssignment.roleId) return;
      if (isEntityAssigned(newAssignment.entityId)) return;

      const entity = entities.find(ent => ent._id === newAssignment.entityId);
      const role = roles.find(r => r.name === newAssignment.roleId || r._id === newAssignment.roleId);
      
      if (!entity || !role) return;

      const newAssignmentObj: HierarchicalAssignment = {
         entity: entity,
         role: role,
         assignedAt: new Date().toISOString()
      };

      setAssignments(prev => [...prev, newAssignmentObj]);
      setNewAssignment({ entityId: '', roleId: '' });
   };

   const handleRemoveAssignment = (index: number) => {
      setAssignments(prev => prev.filter((_, i) => i !== index));
   };

   // Reset form when user changes or modal opens/closes
   React.useEffect(() => {
      if (isOpen) {
         setFormData({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            address: user?.address || '',
            city: user?.city || '',
            state: user?.state || '',
            country: user?.country || '',
            verified: user?.verified || false,
         });
         
         // Set assignments for editing
         if (user && user.hierarchicalAssignments && user.hierarchicalAssignments.length > 0) {
            setAssignments([...user.hierarchicalAssignments]);
         } else {
            setAssignments([]);
         }
         setNewAssignment({ entityId: '', roleId: '' });
      }
   }, [user, isOpen]);

   return (
      <Modal
         isOpen={isOpen}
         onClose={onClose}
         title={user ? 'Edit User' : 'Create User'}
         maxWidth="2xl"
         theme="orange"
      >
         <form onSubmit={handleSubmit}>
            <ModalBody className="space-y-6">
               {/* Basic Info */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-800">
                        Full Name *
                     </label>
                     <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                           setFormData((prev) => ({
                              ...prev,
                              name: e.target.value,
                           }))
                        }
                        required
                        className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-800">
                        Email Address *
                     </label>
                     <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                           setFormData((prev) => ({
                              ...prev,
                              email: e.target.value,
                           }))
                        }
                        required
                        className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-gray-800">
                     Phone Number
                  </label>
                  <input
                     type="tel"
                     value={formData.phone}
                     onChange={(e) =>
                        setFormData((prev) => ({
                           ...prev,
                           phone: e.target.value,
                        }))
                     }
                     className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
               </div>

               {/* Address Info */}
               <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-800">
                     Address Information
                  </h4>

                  <div>
                     <label className="block text-sm font-medium text-gray-800">
                        Street Address
                     </label>
                     <textarea
                        value={formData.address}
                        onChange={(e) =>
                           setFormData((prev) => ({
                              ...prev,
                              address: e.target.value,
                           }))
                        }
                        rows={2}
                        className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                     />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-800">
                           City
                        </label>
                        <input
                           type="text"
                           value={formData.city}
                           onChange={(e) =>
                              setFormData((prev) => ({
                                 ...prev,
                                 city: e.target.value,
                              }))
                           }
                           className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-800">
                           State/Province
                        </label>
                        <input
                           type="text"
                           value={formData.state}
                           onChange={(e) =>
                              setFormData((prev) => ({
                                 ...prev,
                                 state: e.target.value,
                              }))
                           }
                           className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-800">
                           Country
                        </label>
                        <input
                           type="text"
                           value={formData.country}
                           onChange={(e) =>
                              setFormData((prev) => ({
                                 ...prev,
                                 country: e.target.value,
                              }))
                           }
                           className="mt-1 block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                     </div>
                  </div>
               </div>

               {/* Status */}
               <div>
                  <label className="flex items-center">
                     <input
                        type="checkbox"
                        checked={formData.verified}
                        onChange={(e) =>
                           setFormData((prev) => ({
                              ...prev,
                              verified: e.target.checked,
                           }))
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                     />
                     <span className="ml-2 text-sm text-gray-800">
                        User is verified
                     </span>
                  </label>
               </div>

               {/* Entity Assignments - Show for users with permission */}
               {hasPermission('users.assign_role') && (
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-800">
                           Entity Assignments
                        </h4>
                        {assignments.length > 1 && (
                           <span className="text-xs text-gray-500">
                              {assignments.length} assignments
                           </span>
                        )}
                     </div>

                     {/* Existing Assignments */}
                     {assignments.length > 0 && (
                        <div className="space-y-2">
                           {assignments.map((assignment, index) => (
                              <div
                                 key={index}
                                 className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                              >
                                 <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-800">
                                       {getEntityName(assignment.entity)}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                       {getRoleName(assignment.role)}
                                    </div>
                                    {assignment.assignedAt && (
                                       <div className="text-xs text-gray-500 mt-1">
                                          Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                                       </div>
                                    )}
                                 </div>
                                 <button
                                    type="button"
                                    onClick={() => handleRemoveAssignment(index)}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Remove assignment"
                                 >
                                    <X className="h-4 w-4" />
                                 </button>
                              </div>
                           ))}
                        </div>
                     )}

                     {/* Add New Assignment */}
                     <div className="border border-dashed border-gray-300 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                           <div>
                              <label className="block text-sm font-medium text-gray-800 mb-1">
                                 Entity
                              </label>
                              <select
                                 value={newAssignment.entityId}
                                 onChange={(e) => setNewAssignment(prev => ({
                                    ...prev,
                                    entityId: e.target.value,
                                    roleId: '' // Reset role when entity changes
                                 }))}
                                 className="block w-full px-3 py-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                 <option value="">Select entity...</option>
                                 {entities
                                    .filter(entity => !isEntityAssigned(entity._id))
                                    .map((entity) => (
                                       <option key={entity._id} value={entity._id}>
                                          {entity.name} ({entity.type})
                                       </option>
                                    ))}
                              </select>
                           </div>

                           <div>
                              <label className="block text-sm font-medium text-gray-800 mb-1">
                                 Role
                              </label>
                              <select
                                 value={newAssignment.roleId}
                                 onChange={(e) => setNewAssignment(prev => ({
                                    ...prev,
                                    roleId: e.target.value
                                 }))}
                                 disabled={!newAssignment.entityId}
                                 className="block w-full px-3 py-2 text-sm rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                 <option value="">Select role...</option>
                                 {newAssignment.entityId && (() => {
                                    const selectedEntity = entities.find(entity => entity._id === newAssignment.entityId);

                                    const filteredRoles = roles.filter(role => {
                                       if (!selectedEntity) return false;
                                       
                                       // Ensure role has required properties
                                       if (!role.level) {
                                          return false;
                                       }
                                       
                                       // Apply same filtering logic as getFilteredRoles but for specific entity
                                       if (role.name === 'super_admin' && !hasPermission('*')) return false;
                                       
                                       // Match role level to entity type
                                       if (selectedEntity.type === 'church') {
                                          return role.level === 'church';
                                       } else if (selectedEntity.type === 'conference') {
                                          return role.level === 'conference' || role.level === 'union';
                                       } else if (selectedEntity.type === 'union') {
                                          return role.level === 'union';
                                       }

                                       return false;
                                    });

                                    return filteredRoles;
                                 })().map((role) => (
                                    <option key={role._id || role.name} value={role.name || role._id}>
                                       {role.displayName}
                                    </option>
                                 ))}
                              </select>
                           </div>
                        </div>

                        <div className="flex items-center justify-between">
                           <div className="text-xs text-gray-500">
                              {assignments.length === 0 ? 'Add at least one assignment' : 'Add additional assignments'}
                           </div>
                           <button
                              type="button"
                              onClick={handleAddAssignment}
                              disabled={
                                 !newAssignment.entityId || 
                                 !newAssignment.roleId ||
                                 isEntityAssigned(newAssignment.entityId)
                              }
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-[#F25F29] hover:bg-[#F23E16] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
                           >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Assignment
                           </button>
                        </div>

                        {newAssignment.entityId && isEntityAssigned(newAssignment.entityId) && (
                           <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                              <div className="text-yellow-800 text-xs">
                                 This entity is already assigned to the user
                              </div>
                           </div>
                        )}
                     </div>

                     {assignments.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                           No entity assignments yet. Add one above.
                        </div>
                     )}
                  </div>
               )}
            </ModalBody>

            <ModalFooter>
               <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-800 hover:text-gray-500"
               >
                  Cancel
               </button>
               <button
                  type="submit"
                  disabled={
                     loading ||
                     !formData.name ||
                     !formData.email ||
                     (hasPermission('users.assign_role') && assignments.length === 0)
                  }
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#F25F29] hover:bg-[#F23E16] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
               >
                  {loading ? (
                     <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        {user ? 'Updating...' : 'Creating...'}
                     </>
                  ) : (
                     <>{user ? 'Update' : 'Create'} User</>
                  )}
               </button>
            </ModalFooter>
         </form>
      </Modal>
   );
}
