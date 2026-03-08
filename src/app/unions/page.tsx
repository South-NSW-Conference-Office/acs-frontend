'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { Column, StatusBadge } from '@/components/DataTable';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import Button from '@/components/Button';
import UnionModal from '@/components/UnionModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { UnionService } from '@/lib/unionService';
import { conferenceService } from '@/lib/conferenceService';
import { Union } from '@/types/hierarchy';
import { Conference } from '@/types/rbac';
import {
   BuildingOfficeIcon,
   BuildingOffice2Icon,
   TrashIcon,
   MapPinIcon,
   PhoneIcon,
   EnvelopeIcon,
} from '@heroicons/react/24/outline';

export default function Unions() {
   const [unions, setUnions] = useState<Union[]>([]);
   const [unionConferences, setUnionConferences] = useState<Record<string, Conference[]>>({});
   const [loading, setLoading] = useState(true);
   const [selectedUnion, setSelectedUnion] = useState<Union | undefined>(
      undefined
   );
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [unionToDelete, setUnionToDelete] = useState<Union | undefined>(
      undefined
   );
   const [searchQuery, setSearchQuery] = useState('');
   const [showInactive, setShowInactive] = useState(false);
   const toast = useToast();

   const fetchUnions = useCallback(async () => {
      try {
         setLoading(true);
         const response = await UnionService.getAllUnions({
            isActive: showInactive ? false : true
         });

         if (response && response.success) {
            // Handle successful response with data
            const unions = response.data || [];
            const unionsArray = Array.isArray(unions) ? unions : [];
            setUnions(unionsArray);
            
            // Fetch all conferences and group them by union
            try {
               const conferencesResponse = await conferenceService.getConferences({ includeInactive: showInactive });
               
               if (conferencesResponse.success && conferencesResponse.data) {
                  const allConferences = conferencesResponse.data as Conference[];
                  
                  // Group conferences by union ID
                  const conferencesData: Record<string, Conference[]> = {};
                  
                  // Initialize empty arrays for all unions
                  unionsArray.forEach(union => {
                     conferencesData[union._id] = [];
                  });
                  
                  // Group conferences by their union ID
                  allConferences.forEach(conference => {
                     const unionId = typeof conference.unionId === 'string' 
                        ? conference.unionId 
                        : (conference.unionId as { _id: string })?._id;
                     
                     if (unionId && conferencesData[unionId]) {
                        conferencesData[unionId].push(conference);
                     }
                  });
                  
                  setUnionConferences(conferencesData);
               } else {
                  const emptyData: Record<string, Conference[]> = {};
                  unionsArray.forEach(union => {
                     emptyData[union._id] = [];
                  });
                  setUnionConferences(emptyData);
               }
            } catch (error) {
               console.error('Error fetching conferences:', error);
               const emptyData: Record<string, Conference[]> = {};
               unionsArray.forEach(union => {
                  emptyData[union._id] = [];
               });
               setUnionConferences(emptyData);
            }
         } else if (response && response.success === false) {
            // Handle API error response
            console.error('API error fetching unions:', response.message);
            const errorMsg = response.message || 'Failed to fetch unions';
            if (!errorMsg.toLowerCase().includes('no unions found')) {
               toast.error('Failed to load unions', errorMsg);
            }
            setUnions([]);
            setUnionConferences({});
         } else {
            // Handle unexpected response format
            console.error('Unexpected response format:', response);
            setUnions([]);
            setUnionConferences({});
         }
      } catch (error) {
         console.error('Error fetching unions:', error);
         const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
         // Only show toast error if it's not a network/timeout issue
         if (!errorMessage.toLowerCase().includes('fetch')) {
            toast.error('Failed to load unions', errorMessage);
         }
         setUnions([]);
         setUnionConferences({});
      } finally {
         setLoading(false);
      }
   }, [toast, showInactive]);

   useEffect(() => {
      fetchUnions();
   }, [fetchUnions]);

   const handleDeleteUnion = async (union: Union) => {
      try {
         const response = await UnionService.deleteUnion(
            union._id
         );

         if (response.success) {
            setUnions((prev) =>
               prev.filter((u) => u._id !== union._id)
            );
            
            // Simple success message for deletion
            toast.success(
               'Union deleted',
               `${union.name} has been successfully deleted.`
            );
         } else {
            // Handle specific violation messages - show actual backend error
            const errorMessage = response.message || 'Failed to delete union';
            
            // Parse error message for blocking/prevention scenarios
            if (errorMessage.toLowerCase().includes('conferences still exist') ||
                errorMessage.toLowerCase().includes('churches still exist') ||
                errorMessage.toLowerCase().includes('teams still exist') ||
                errorMessage.toLowerCase().includes('services still exist')) {
               
               // Extract entity information for helpful guidance
               let guidance = 'Please delete all subordinate entities first.';
               
               if (errorMessage.toLowerCase().includes('conferences')) {
                  guidance = 'Navigate to Conferences and delete all conferences in this union first.';
               } else if (errorMessage.toLowerCase().includes('churches')) {
                  guidance = 'Navigate to Churches and delete all churches in this union first.';
               } else if (errorMessage.toLowerCase().includes('teams')) {
                  guidance = 'Navigate to Teams and delete all teams in this union first.';
               } else if (errorMessage.toLowerCase().includes('services')) {
                  guidance = 'Navigate to Services and delete all services in this union first.';
               }
               
               toast.error(
                  'Cannot Delete Union',
                  `${errorMessage}\n\n${guidance}`
               );
            } else if (errorMessage.toLowerCase().includes('permission') || 
                      errorMessage.toLowerCase().includes('authorized') ||
                      errorMessage.toLowerCase().includes('forbidden')) {
               toast.error(
                  'Permission Denied',
                  errorMessage
               );
            } else if (errorMessage.toLowerCase().includes('not found')) {
               toast.error(
                  'Union Not Found',
                  errorMessage
               );
            } else if (errorMessage.toLowerCase().includes('validation') ||
                      errorMessage.toLowerCase().includes('invalid')) {
               toast.error(
                  'Validation Error',
                  errorMessage
               );
            } else {
               // Show the actual backend error message
               toast.error('Failed to delete union', errorMessage);
            }
         }
      } catch (error) {
         console.error('Error deleting union:', error);
         const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
         
         // Show the actual error message from backend
         if (errorMessage.toLowerCase().includes('network') || 
             errorMessage.toLowerCase().includes('fetch')) {
            toast.error(
               'Network Error',
               'Unable to connect to server. Please check your internet connection and try again.'
            );
         } else if (errorMessage.toLowerCase().includes('hierarchy') || 
                   errorMessage.toLowerCase().includes('cascade')) {
            toast.error(
               'Hierarchy Error',
               errorMessage
            );
         } else if (errorMessage.toLowerCase().includes('permission') || 
                   errorMessage.toLowerCase().includes('unauthorized') ||
                   errorMessage.toLowerCase().includes('forbidden')) {
            toast.error(
               'Permission Denied',
               errorMessage
            );
         } else if (errorMessage.toLowerCase().includes('not found')) {
            toast.error(
               'Union Not Found',
               errorMessage
            );
         } else if (errorMessage.toLowerCase().includes('validation') ||
                   errorMessage.toLowerCase().includes('invalid')) {
            toast.error(
               'Validation Error', 
               errorMessage
            );
         } else if (errorMessage.toLowerCase().includes('timeout')) {
            toast.error(
               'Request Timeout',
               'The operation took too long to complete. Please try again.'
            );
         } else {
            // Show the actual backend error message
            toast.error(
               'Operation Failed',
               errorMessage
            );
         }
      } finally {
         setShowDeleteConfirm(false);
         setUnionToDelete(undefined);
      }
   };

   const handleUnionSaved = (
      savedUnion: Union,
      isEdit: boolean
   ) => {
      if (isEdit) {
         // Update existing union in the list
         setUnions((prev) =>
            prev.map((union) =>
               union._id === savedUnion._id ? savedUnion : union
            )
         );
         toast.success(
            'Union updated',
            `${savedUnion.name} has been successfully updated.`
         );
      } else {
         // Add new union to the list
         setUnions((prev) => [...prev, savedUnion]);
         toast.success(
            'Union created',
            `${savedUnion.name} has been successfully created.`
         );
      }

      // Close modals and clear state
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedUnion(undefined);
   };

   // Removed quick setup functionality for unions page

   const filteredUnions = (unions || []).filter(
      (union) => {
         if (!union) return false;
         
         const searchLower = searchQuery.toLowerCase();
         
         // If no search query, return all unions
         if (!searchQuery.trim()) return true;
         
         // Check basic fields
         if (union.name?.toLowerCase().includes(searchLower)) {
            return true;
         }
         
         // Check contact email with null safety
         if (union.contact?.email?.toLowerCase().includes(searchLower)) {
            return true;
         }
         
         
         return false;
      }
   );


   // Define table columns
   const columns: Column<Union>[] = [
      {
         key: 'name',
         header: 'Union',
         accessor: (union) => (
            <div className="flex items-center">
               <div className="shrink-0 h-12 w-12">
                  {union.primaryImage?.url ? (
                     <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                        <Image
                           src={union.primaryImage.thumbnailUrl || union.primaryImage.url}
                           alt={union.primaryImage.alt || union.name}
                           width={96}
                           height={96}
                           className="h-full w-full object-cover"
                           style={{ imageRendering: 'auto' }}
                           priority={false}
                           quality={95}
                           onError={() => {
                              console.warn(`Failed to load image for union: ${union.name}`);
                           }}
                        />
                     </div>
                  ) : (
                     <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm">
                        <BuildingOfficeIcon className="h-7 w-7 text-white" />
                     </div>
                  )}
               </div>
               <div className="ml-4">
                  <button
                     onClick={() => window.location.href = `/unions/${union._id}`}
                     className="text-sm font-semibold text-gray-900 hover:text-gray-600 text-left cursor-pointer transition-colors duration-200"
                  >
                     {union.name}
                  </button>
               </div>
            </div>
         ),
      },
      {
         key: 'contact',
         header: 'Contact',
         accessor: (union) => (
            <div className="text-sm text-gray-900">
               {union.contact?.email && (
                  <div className="flex items-center mb-1">
                     <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                     {union.contact.email}
                  </div>
               )}
               {union.contact?.phone && (
                  <div className="flex items-center">
                     <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                     {union.contact.phone}
                  </div>
               )}
            </div>
         ),
      },
      {
         key: 'headquarters',
         header: 'Headquarters',
         accessor: (union) => (
            <div className="text-sm text-gray-900">
               {union.headquarters?.city || union.headquarters?.country ? (
                  <div className="flex items-start">
                     <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 mt-1 shrink-0" />
                     <div>
                        {union.headquarters?.city && (
                           <div>{union.headquarters.city}</div>
                        )}
                        {union.headquarters?.country && (
                           <div className="text-gray-500">{union.headquarters.country}</div>
                        )}
                     </div>
                  </div>
               ) : (
                  '-'
               )}
            </div>
         ),
         className: 'max-w-xs',
      },
      {
         key: 'conferences',
         header: 'Conferences',
         accessor: (union) => {
            const conferences = unionConferences[union._id] || [];
            const conferenceCount = conferences.length;
            return (
               <span className="text-sm text-gray-900">
                  <div className="flex items-center">
                     <BuildingOffice2Icon className="h-4 w-4 text-gray-400 mr-2" />
                     <div>
                        <div className="font-medium">{conferenceCount}</div>
                        <div className="text-xs text-gray-500">
                           {conferenceCount === 1 ? 'conference' : 'conferences'}
                        </div>
                     </div>
                  </div>
               </span>
            );
         },
         className: 'px-6 py-4 whitespace-nowrap text-sm max-w-xs',
      },
      {
         key: 'status',
         header: 'Status',
         accessor: (union) => (
            <StatusBadge
               status={union.isActive}
               trueLabel="Active"
               falseLabel="Inactive"
               trueColor="green"
               falseColor="red"
            />
         ),
      },
      {
         key: 'actions',
         header: 'Actions',
         headerClassName:
            'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider',
         className:
            'px-6 py-4 whitespace-nowrap text-right text-sm font-medium',
         accessor: (union) => (
            <RowActionsMenu actions={[
               { label: 'Edit', onClick: () => { setSelectedUnion(union); setShowEditModal(true); } },
               { label: 'Delete', onClick: () => { setUnionToDelete(union); setShowDeleteConfirm(true); }, variant: 'danger' },
            ]} />
         ),
      },
   ];

   return (
      <AdminLayout
         title="Unions"
         description="Manage unions in the denominational hierarchy"
      >
         <div className="space-y-6">
            {/* Table with custom header */}
            <div className="overflow-hidden">
               {/* Custom header with search and button */}
               <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="max-w-xs">
                           <input
                              type="text"
                              placeholder="Search unions..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                           />
                        </div>
                        <div className="flex items-center">
                           <label className="inline-flex items-center">
                              <input
                                 type="checkbox"
                                 checked={showInactive}
                                 onChange={(e) => setShowInactive(e.target.checked)}
                                 className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                              />
                              <span className="ml-2 text-sm text-gray-700">Show inactive</span>
                           </label>
                        </div>
                     </div>
                     <PermissionGate permission="unions.create">
                        <Button
                           onClick={() => setShowCreateModal(true)}
                           className="whitespace-nowrap bg-orange-600 hover:bg-orange-700 text-white"
                           size="sm"
                        >
                           Add Union
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
                  ) : filteredUnions.length === 0 ? (
                     <div className="px-4 py-8 text-center">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                           <BuildingOfficeIcon />
                        </div>
                        <p className="text-sm text-gray-500">
                           No unions found
                        </p>
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
                           {filteredUnions.map((item) => (
                              <tr key={item?._id || Math.random()} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                                 {columns.map((column) => (
                                    <td
                                       key={column.key}
                                       className={
                                          column.className ||
                                          'px-6 py-4 whitespace-nowrap text-sm'
                                       }
                                    >
                                       {item ? column.accessor(item) : '-'}
                                    </td>
                                 ))}
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
            </div>

            {/* Create/Edit Modal */}
            <UnionModal
               isOpen={showCreateModal || showEditModal}
               onClose={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedUnion(undefined);
               }}
               onSave={handleUnionSaved}
               union={showEditModal ? selectedUnion : null}
            />

            {/* Quick Setup Modal removed for unions page */}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
               isOpen={showDeleteConfirm}
               onClose={() => {
                  setShowDeleteConfirm(false);
                  setUnionToDelete(undefined);
               }}
               onConfirm={() =>
                  unionToDelete && handleDeleteUnion(unionToDelete)
               }
               title="Delete Union"
               message={`Are you sure you want to delete "${unionToDelete?.name}"?`}
               confirmLabel="Delete Union"
               confirmButtonColor="orange"
               theme="orange"
               icon={<TrashIcon className="h-6 w-6 text-red-600" />}
            >
               {unionToDelete && (
                  <div className="mt-4 p-4 bg-white/20 border border-white/30 rounded-md backdrop-blur-sm">
                     <div className="flex items-start">
                        <div className="flex-shrink-0">
                           <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                           </svg>
                        </div>
                        <div className="ml-3">
                           <h3 className="text-sm font-medium text-white">
                              Hierarchical Deletion Requirements
                           </h3>
                           <div className="mt-2 text-sm text-orange-100">
                              <p className="mb-2">To delete this union, you must first:</p>
                              <ul className="list-disc list-inside space-y-1">
                                 <li>Delete all <strong className="text-white">{unionConferences[unionToDelete._id]?.length || 0} conferences</strong> in this union</li>
                                 <li>Delete all churches in those conferences</li>
                                 <li>Delete all teams in those churches</li>
                                 <li>Delete all services in those teams</li>
                              </ul>
                              <p className="mt-3 font-medium text-white">Bottom-up deletion ensures data integrity.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
            </ConfirmationModal>
         </div>
      </AdminLayout>
   );
}
