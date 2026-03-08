'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { StatusBadge } from '@/components/DataTable';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import Button from '@/components/Button';
import ChurchModal from '@/components/ChurchModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useToast } from '@/contexts/ToastContext';
import { ChurchService } from '@/lib/churchService';
import { Church } from '@/types/hierarchy';
import { ChurchPagination } from '@/types/hierarchy';
import {
   MapPinIcon,
   PhoneIcon,
   EnvelopeIcon,
   UserGroupIcon,
   UserIcon,
   ChevronLeftIcon,
   ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { TrashIcon } from '@heroicons/react/24/outline';

const PAGE_LIMIT = 25;

export default function Churches() {
   const [churches, setChurches] = useState<Church[]>([]);
   const [pagination, setPagination] = useState<ChurchPagination>({
      page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1,
   });
   const [page, setPage] = useState(1);
   const [search, setSearch] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [showInactive, setShowInactive] = useState(false);
   const [loading, setLoading] = useState(true);
   const [selectedChurch, setSelectedChurch] = useState<Church | undefined>(undefined);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [churchToDelete, setChurchToDelete] = useState<Church | undefined>(undefined);
   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const toast = useToast();

   // Debounce search — resets to page 1
   useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
         setDebouncedSearch(search);
         setPage(1);
      }, 350);
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
   }, [search]);

   // Reset to page 1 when showInactive toggles
   useEffect(() => { setPage(1); }, [showInactive]);

   const fetchChurches = useCallback(async () => {
      try {
         setLoading(true);
         const response = await ChurchService.getAllChurches({
            isActive: showInactive ? undefined : true,
            search: debouncedSearch || undefined,
            page,
            limit: PAGE_LIMIT,
         });

         if (response?.success) {
            setChurches(response.data ?? []);
            if (response.pagination) setPagination(response.pagination);
         } else {
            const msg = response?.message || 'Failed to fetch churches';
            if (!msg.toLowerCase().includes('no churches found')) {
               toast.error('Failed to load churches', msg);
            }
            setChurches([]);
         }
      } catch (error) {
         console.error('Error fetching churches:', error);
         const msg = error instanceof Error ? error.message : 'Unexpected error';
         if (!msg.toLowerCase().includes('fetch')) {
            toast.error('Failed to load churches', msg);
         }
         setChurches([]);
      } finally {
         setLoading(false);
      }
   }, [toast, showInactive, debouncedSearch, page]);

   useEffect(() => { fetchChurches(); }, [fetchChurches]);

   const handleDeleteChurch = async (church: Church) => {
      try {
         const response = await ChurchService.deleteChurch(church._id);
         if (response.success) {
            toast.success('Church deleted', `${church.name} has been successfully removed.`);
            fetchChurches();
         } else {
            toast.error('Failed to delete church', response.message);
         }
      } catch (error) {
         const msg = error instanceof Error ? error.message : 'Unexpected error';
         toast.error('Failed to delete church', msg);
      } finally {
         setShowDeleteConfirm(false);
         setChurchToDelete(undefined);
      }
   };

   const handleChurchSaved = async (savedChurch: Church, isEdit: boolean) => {
      let completeChurch = savedChurch;
      if (!savedChurch.primaryImage && savedChurch._id) {
         try {
            const r = await ChurchService.getChurchById(savedChurch._id);
            if (r.success && r.data) completeChurch = r.data;
         } catch { /* ignore */ }
      }
      toast.success(
         isEdit ? 'Church updated' : 'Church created',
         `${completeChurch.name} has been successfully ${isEdit ? 'updated' : 'created'}.`
      );
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedChurch(undefined);
      fetchChurches();
   };

   // ── Pagination helpers ────────────────────────────────────────────────────
   const rangeStart = Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total);
   const rangeEnd   = Math.min(pagination.page * pagination.limit, pagination.total);

   const pageNumbers = Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
      .reduce<(number | '...')[]>((acc, p, idx, arr) => {
         if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
            acc.push('...');
         }
         acc.push(p);
         return acc;
      }, []);

   return (
      <AdminLayout title="Churches" description="Manage churches in the denominational hierarchy">
         <div className="space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">

               {/* Header — search + filters */}
               <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="max-w-xs">
                           <input
                              type="text"
                              placeholder="Search churches..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="block w-full px-4 py-2 rounded-md border border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
                           />
                        </div>
                        <label className="inline-flex items-center">
                           <input
                              type="checkbox"
                              checked={showInactive}
                              onChange={(e) => setShowInactive(e.target.checked)}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-200"
                           />
                           <span className="ml-2 text-sm text-gray-700">Show inactive</span>
                        </label>
                     </div>
                     <PermissionGate permission="churches.create">
                        <Button
                           onClick={() => setShowCreateModal(true)}
                           className="whitespace-nowrap bg-orange-600 hover:bg-orange-700 text-white"
                           size="sm"
                        >
                           Add Church
                        </Button>
                     </PermissionGate>
                  </div>
               </div>

               {/* Table */}
               <div className="overflow-x-auto">
                  {loading ? (
                     <div className="px-4 py-10 text-center text-gray-500 text-sm">Loading…</div>
                  ) : churches.length === 0 ? (
                     <div className="px-4 py-12 text-center">
                        <p className="text-sm text-gray-500">No churches found</p>
                     </div>
                  ) : (
                     <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                        <thead className="bg-gray-50">
                           <tr>
                              {['Church', 'Conference', 'Location', 'Teams', 'Pastor', 'Contact', 'Status', 'Actions'].map((h) => (
                                 <th key={h} scope="col"
                                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                                    {h}
                                 </th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {churches.map((church) => {
                              const conferenceName =
                                 (church as Church & { conference?: { name?: string } }).conference?.name ||
                                 'Unknown Conference';

                              const pastor = church.leadership?.associatePastors?.[0];

                              return (
                                 <tr key={church._id} className="transition-all duration-500 ease-out hover:scale-[1.01] hover:shadow-md hover:bg-gray-50 hover:z-10 relative">
                                    {/* Church */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       <button
                                          onClick={() => window.location.href = `/churches/${church._id}`}
                                          className="text-sm font-semibold text-gray-900 hover:text-gray-600 text-left transition-colors duration-200 cursor-pointer"
                                       >
                                          {church.name}
                                       </button>
                                       {church.code && <div className="text-xs text-gray-500">Code: {church.code}</div>}
                                    </td>

                                    {/* Conference */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs">
                                       {conferenceName}
                                    </td>

                                    {/* Location */}
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                       {church.location?.address?.city ? (
                                          <div className="flex items-center gap-1.5">
                                             <MapPinIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                             <span>{church.location.address.city}</span>
                                          </div>
                                       ) : '–'}
                                    </td>

                                    {/* Teams */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs">
                                       <div className="flex items-center gap-2">
                                          <UserGroupIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                          <span className="font-medium">{(church as Church & { stats?: { teamCount?: number } }).stats?.teamCount ?? 0}</span>
                                       </div>
                                    </td>

                                    {/* Pastor */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                       {pastor?.name ? (
                                          <div className="flex items-center">
                                             <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                                             {pastor.name}
                                          </div>
                                       ) : <span className="text-gray-400">–</span>}
                                    </td>

                                    {/* Contact */}
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                       {pastor?.email && (
                                          <div className="flex items-center mb-1">
                                             <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                                             {pastor.email}
                                          </div>
                                       )}
                                       {pastor?.phone && (
                                          <div className="flex items-center">
                                             <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                                             {pastor.phone}
                                          </div>
                                       )}
                                       {!pastor?.email && !pastor?.phone && <span className="text-gray-400">–</span>}
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                       <StatusBadge status={church.isActive} trueLabel="Active" falseLabel="Inactive" trueColor="green" falseColor="red" />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                       <RowActionsMenu actions={[
                                          { label: 'Edit', onClick: () => { setSelectedChurch(church); setShowEditModal(true); } },
                                          { label: 'Delete', onClick: () => { setChurchToDelete(church); setShowDeleteConfirm(true); }, variant: 'danger' },
                                       ]} />
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  )}
               </div>

               {/* Pagination footer */}
               {pagination.total > 0 && (
                  <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between bg-white">
                     <span className="text-sm text-gray-500">
                        {rangeStart}–{rangeEnd} of {pagination.total} churches
                     </span>
                     <div className="flex items-center gap-1">
                        <button
                           onClick={() => setPage((p) => Math.max(1, p - 1))}
                           disabled={page <= 1}
                           className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                           <ChevronLeftIcon className="h-4 w-4" />
                        </button>

                        {pageNumbers.map((p, i) =>
                           p === '...' ? (
                              <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                           ) : (
                              <button
                                 key={p}
                                 onClick={() => setPage(p as number)}
                                 className={`min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors ${
                                    p === page
                                       ? 'bg-orange-600 text-white'
                                       : 'text-gray-600 hover:bg-gray-100'
                                 }`}
                              >
                                 {p}
                              </button>
                           )
                        )}

                        <button
                           onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                           disabled={page >= pagination.totalPages}
                           className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                           <ChevronRightIcon className="h-4 w-4" />
                        </button>
                     </div>
                  </div>
               )}
            </div>

            <ChurchModal
               isOpen={showCreateModal || showEditModal}
               onClose={() => { setShowCreateModal(false); setShowEditModal(false); setSelectedChurch(undefined); }}
               onSave={handleChurchSaved}
               church={showEditModal ? selectedChurch : null}
            />

            <ConfirmationModal
               isOpen={showDeleteConfirm}
               onClose={() => { setShowDeleteConfirm(false); setChurchToDelete(undefined); }}
               onConfirm={() => churchToDelete && handleDeleteChurch(churchToDelete)}
               title="Delete Church"
               message={`Are you sure you want to delete "${churchToDelete?.name}"? This action cannot be undone.`}
               confirmLabel="Delete Church"
               confirmButtonColor="red"
               icon={<TrashIcon className="h-6 w-6 text-red-600" />}
            />
         </div>
      </AdminLayout>
   );
}
