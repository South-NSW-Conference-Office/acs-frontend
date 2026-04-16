'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMounted } from '@/hooks/useMounted';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import ConferenceModal from '@/components/ConferenceModal';
import { useToast } from '@/contexts/ToastContext';
import { ConferenceService, conferenceService } from '@/lib/conferenceService';
import { UnionService } from '@/lib/unionService';
import { ChurchService } from '@/lib/churchService';
import { Conference, Church } from '@/types/rbac';
import { Union } from '@/types/hierarchy';

interface ConferenceWithUnion extends Omit<Conference, 'unionId'> {
   unionId: Union | string;
}

export default function Conferences() {
   const [conferences, setConferences] = useState<ConferenceWithUnion[]>([]);
   const [unions, setUnions] = useState<Union[]>([]);
   const [conferenceChurches, setConferenceChurches] = useState<Record<string, Church[]>>({});
   const [loading, setLoading] = useState(true);
   const [selectedConference, setSelectedConference] = useState<ConferenceWithUnion | undefined>(undefined);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [conferenceToDelete, setConferenceToDelete] = useState<ConferenceWithUnion | undefined>(undefined);
   const [searchQuery, setSearchQuery] = useState('');
   const [showInactive, setShowInactive] = useState(true);
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [bulkDeleting, setBulkDeleting] = useState(false);
   const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
   const toast = useToast();

   const fetchConferences = useCallback(async () => {
      try {
         setLoading(true);
         const [conferencesResponse, unionsResponse] = await Promise.all([
            conferenceService.getConferences({ includeInactive: showInactive }),
            UnionService.getAllUnions({ isActive: true }),
         ]);

         if (conferencesResponse && conferencesResponse.success) {
            const confsData = conferencesResponse.data || [];
            const confsArray = (Array.isArray(confsData) ? confsData : []) as ConferenceWithUnion[];
            setConferences(confsArray);
            setUnions(unionsResponse?.data || []);

            try {
               const churchesResponse = await ChurchService.getAllChurches({
                  isActive: showInactive ? undefined : true,
                  limit: 1000,
               });

               if (churchesResponse.success && churchesResponse.data) {
                  const allChurches = churchesResponse.data as Church[];
                  const churchesData: Record<string, Church[]> = {};
                  confsArray.forEach((c) => { churchesData[c._id] = []; });
                  allChurches.forEach((church) => {
                     const conferenceId = typeof church.conferenceId === 'string'
                        ? church.conferenceId
                        : (church.conferenceId as unknown as { _id: string })?._id;
                     if (conferenceId && churchesData[conferenceId]) {
                        churchesData[conferenceId].push(church);
                     }
                  });
                  setConferenceChurches(churchesData);
               } else {
                  const emptyData: Record<string, Church[]> = {};
                  confsArray.forEach((c) => { emptyData[c._id] = []; });
                  setConferenceChurches(emptyData);
               }
            } catch (error) {
               console.error('Error fetching churches:', error);
               const emptyData: Record<string, Church[]> = {};
               confsArray.forEach((c) => { emptyData[c._id] = []; });
               setConferenceChurches(emptyData);
            }
         } else {
            setConferences([]);
            setConferenceChurches({});
         }
      } catch (error) {
         console.error('Error fetching conferences:', error);
         const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
         if (!errorMessage.toLowerCase().includes('fetch')) {
            toast.error('Failed to load conferences', errorMessage);
         }
         setConferences([]);
         setConferenceChurches({});
      } finally {
         setLoading(false);
      }
   }, [toast, showInactive]);

   useEffect(() => { fetchConferences(); }, [fetchConferences]);

   const handleDeleteConference = async (conference: ConferenceWithUnion) => {
      try {
         const response = await ConferenceService.hardDeleteConference(conference._id);
         if (response.success) {
            setConferences((prev) => prev.filter((c) => c._id !== conference._id));
            toast.success('Conference deleted', `${conference.name} has been permanently deleted.`);
         } else {
            toast.error('Failed to delete conference', response.message || 'Unknown error');
         }
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
         toast.error('Operation Failed', errorMessage);
      } finally {
         setShowDeleteConfirm(false);
         setConferenceToDelete(undefined);
      }
   };

   const getUnionName = (unionId: Union | string): string => {
      if (typeof unionId === 'object' && unionId !== null) return unionId.name;
      return unions.find((u) => u._id === unionId)?.name || 'Unknown Union';
   };

   const filteredConferences = (conferences || []).filter((conference) => {
      if (!conference) return false;
      if (!searchQuery.trim()) return true;
      const s = searchQuery.toLowerCase();
      return (
         conference.name?.toLowerCase().includes(s) ||
         conference.contact?.email?.toLowerCase().includes(s) ||
         conference.headquarters?.city?.toLowerCase().includes(s) ||
         conference.headquarters?.country?.toLowerCase().includes(s) ||
         conference.territory?.description?.toLowerCase().includes(s) ||
         getUnionName(conference.unionId).toLowerCase().includes(s)
      );
   });

   const toggleSelect = (id: string) => {
      setSelectedIds((prev) => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id); else next.add(id);
         return next;
      });
   };

   const toggleSelectAll = () => {
      if (selectedIds.size === filteredConferences.length) {
         setSelectedIds(new Set());
      } else {
         setSelectedIds(new Set(filteredConferences.map((c) => c._id)));
      }
   };

   const handleBulkDelete = async () => {
      setBulkDeleting(true);
      const ids = [...selectedIds];
      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (const id of ids) {
         try {
            const response = await ConferenceService.hardDeleteConference(id);
            if (response.success) {
               results.success++;
            } else {
               results.failed++;
               results.errors.push(response.message || `Failed to delete conference ${id}`);
            }
         } catch (error) {
            results.failed++;
            results.errors.push(error instanceof Error ? error.message : `Failed to delete conference ${id}`);
         }
      }

      if (results.success > 0) {
         setConferences((prev) => prev.filter((c) => !selectedIds.has(c._id) || results.errors.some((e) => e.includes(c._id))));
         toast.success('Bulk delete complete', `${results.success} conference(s) permanently deleted.`);
      }
      if (results.failed > 0) {
         toast.error('Some deletions failed', `${results.failed} conference(s) could not be deleted. ${results.errors[0]}`);
      }

      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setBulkDeleting(false);
      fetchConferences();
   };

   const handleConferenceSaved = (savedConference: ConferenceWithUnion, isEdit: boolean) => {
      if (isEdit) {
         setConferences((prev) => prev.map((c) => c._id === savedConference._id ? savedConference : c));
         toast.success('Conference updated', `${savedConference.name} has been successfully updated.`);
      } else {
         setConferences((prev) => [...prev, savedConference]);
         toast.success('Conference created', `${savedConference.name} has been successfully created.`);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedConference(undefined);
   };

   const totalChurches = Object.values(conferenceChurches).reduce((acc, arr) => acc + arr.length, 0);

   return (
      <AdminLayout
         title="Conferences"
         description="Manage conferences in the denominational hierarchy"
         hideTitle={true}
         hideHeader={true}
      >
         <RegisterStyles />

         <div className="reg-root">
            <div className="reg-decor" aria-hidden>
               <div className="reg-vignette" />
               <div className="reg-grain" />
               <div className="reg-glow" />
            </div>

            {/* MASTHEAD */}
            <header className="reg-masthead">
               <div className="reg-mast-left">
                  <p className="reg-kicker">
                     <span className="reg-kicker-rule" />
                     Seventh&#8209;day Adventist Church&nbsp;&middot;&nbsp;Hierarchy
                  </p>
                  <h1 className="reg-title">
                     <span className="reg-word" style={{ animationDelay: '0.15s' }}>The</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.24s' }}>Register</span>
                     <br />
                     <span className="reg-word" style={{ animationDelay: '0.33s' }}>of</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.42s' }}>Conferences</span>
                  </h1>
                  <p className="reg-subtitle">
                     An index of the regional bodies by which churches,
                     teams, and community services are stewarded within their unions.
                  </p>
               </div>

               <aside className="reg-mast-right">
                  <div className="reg-counter">
                     <div className="reg-counter-num">{String(filteredConferences.length).padStart(2, '0')}</div>
                     <div className="reg-counter-label">Entries on Record</div>
                     <div className="reg-counter-rule" />
                     <div className="reg-counter-sub">
                        <span>{totalChurches}</span> churches held
                     </div>
                  </div>
               </aside>
            </header>

            {/* CONSOLE */}
            <div className="reg-console">
               <div className="reg-console-left">
                  <div className="reg-search">
                     <span className="reg-search-icon" aria-hidden>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                           <circle cx="11" cy="11" r="7" />
                           <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                        </svg>
                     </span>
                     <input
                        type="text"
                        placeholder="Search the register by name, union, city, or correspondent…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="reg-search-input"
                     />
                     <span className="reg-search-underline" />
                  </div>

                  <label className="reg-toggle">
                     <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                     />
                     <span className="reg-toggle-track">
                        <span className="reg-toggle-thumb" />
                     </span>
                     <span className="reg-toggle-label">Show dormant</span>
                  </label>
               </div>

               <PermissionGate permission="conferences.create">
                  <button onClick={() => setShowCreateModal(true)} className="reg-btn">
                     <span className="reg-btn-plus">+</span>
                     <span>Inscribe New Conference</span>
                  </button>
               </PermissionGate>
            </div>

            {/* BULK BAR */}
            {selectedIds.size > 0 && (
               <div className="reg-bulk">
                  <div className="reg-bulk-left">
                     <span className="reg-bulk-count">{selectedIds.size}</span>
                     <span className="reg-bulk-label">
                        {selectedIds.size === 1 ? 'entry' : 'entries'} selected
                     </span>
                     <button className="reg-bulk-clear" onClick={() => setSelectedIds(new Set())}>
                        Clear
                     </button>
                  </div>
                  <PermissionGate permission="conferences.delete">
                     <button
                        className="reg-bulk-delete"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                     >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
                           <path d="M10 11v6M14 11v6" />
                        </svg>
                        <span>Delete Selected</span>
                     </button>
                  </PermissionGate>
               </div>
            )}

            {/* BODY */}
            {loading ? (
               <div className="reg-skel-table">
                  <div className="reg-skel-header">
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '8%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '22%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '14%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '14%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '18%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '10%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '10%' }} />
                  </div>
                  {[0, 1, 2, 3, 4].map((i) => (
                     <div key={i} className="reg-skel-row" style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="reg-skel-avatar reg-skel-avatar--sm" />
                        <div className="reg-skel-line" style={{ flex: 1.6 }} />
                        <div className="reg-skel-line" style={{ flex: 1 }} />
                        <div className="reg-skel-line" style={{ flex: 1 }} />
                        <div className="reg-skel-line" style={{ flex: 1.3 }} />
                        <div className="reg-skel-line" style={{ flex: 0.6 }} />
                        <div className="reg-skel-line" style={{ flex: 0.8 }} />
                     </div>
                  ))}
               </div>
            ) : filteredConferences.length === 0 ? (
               <div className="reg-empty">
                  <div className="reg-empty-seal">
                     <span className="reg-empty-glyph">&#10022;</span>
                  </div>
                  <h3 className="reg-empty-title">
                     {searchQuery ? 'No entry meets your search.' : 'The register awaits its first inscription.'}
                  </h3>
                  <p className="reg-empty-body">
                     {searchQuery
                        ? 'Amend your query, or broaden it to include inactive records.'
                        : 'Begin by inscribing the first conference to the register.'}
                  </p>
               </div>
            ) : (
               <div className="reg-table-wrap">
                  <table className="reg-table">
                     <thead>
                        <tr>
                           <th className="reg-th reg-th--check" onClick={(e) => e.stopPropagation()}>
                              <label className="reg-check" onClick={(e) => { e.preventDefault(); toggleSelectAll(); }}>
                                 <input
                                    type="checkbox"
                                    checked={filteredConferences.length > 0 && selectedIds.size === filteredConferences.length}
                                    readOnly
                                 />
                                 <span className="reg-check-box">
                                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                       <polyline points="2.5 6 5 8.5 9.5 3.5" />
                                    </svg>
                                 </span>
                              </label>
                           </th>
                           <th className="reg-th reg-th--no">№</th>
                           <th className="reg-th">Conference</th>
                           <th className="reg-th">Union</th>
                           <th className="reg-th">Seat</th>
                           <th className="reg-th">Correspondence</th>
                           <th className="reg-th reg-th--num">Churches</th>
                           <th className="reg-th">Standing</th>
                           <th className="reg-th reg-th--actions" aria-label="Actions" />
                        </tr>
                     </thead>
                     <tbody>
                        {filteredConferences.map((conference, i) => {
                           const count = (conferenceChurches[conference._id] || []).length;
                           const goto = () => {
                              if (showDeleteConfirm || showEditModal || showCreateModal || showBulkDeleteConfirm) return;
                              if (selectedIds.size > 0) { toggleSelect(conference._id); return; }
                              window.location.href = `/conferences/${conference._id}`;
                           };
                           return (
                              <tr
                                 key={conference._id}
                                 className="reg-tr"
                                 style={{ animationDelay: `${0.05 + i * 0.04}s` }}
                                 onClick={goto}
                              >
                                 <td className="reg-td reg-td--check" onClick={(e) => e.stopPropagation()}>
                                    <label className="reg-check" onClick={(e) => { e.preventDefault(); toggleSelect(conference._id); }}>
                                       <input
                                          type="checkbox"
                                          checked={selectedIds.has(conference._id)}
                                          readOnly
                                       />
                                       <span className="reg-check-box">
                                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                             <polyline points="2.5 6 5 8.5 9.5 3.5" />
                                          </svg>
                                       </span>
                                    </label>
                                 </td>
                                 <td className="reg-td reg-td--no">
                                    <span className="reg-no">{String(i + 1).padStart(2, '0')}</span>
                                 </td>

                                 <td className="reg-td reg-td--union">
                                    <div className="reg-td-union">
                                       <div className="reg-avatar reg-avatar--sm">
                                          <span className="reg-avatar-ring" />
                                          <div className="reg-avatar-inner">
                                             {conference.primaryImage?.url ? (
                                                <Image
                                                   src={conference.primaryImage.thumbnailUrl || conference.primaryImage.url}
                                                   alt={conference.primaryImage.alt || conference.name}
                                                   width={96}
                                                   height={96}
                                                   className="reg-avatar-img"
                                                />
                                             ) : (
                                                <div className="reg-avatar-fallback">
                                                   <span>{(conference.name || 'C').charAt(0)}</span>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                       <div className="reg-td-union-text">
                                          <div className="reg-td-name">{conference.name}</div>
                                          <div className="reg-td-path">{conference.hierarchyPath}</div>
                                       </div>
                                    </div>
                                 </td>

                                 <td className="reg-td reg-td--parent">
                                    <div className="reg-td-parent">{getUnionName(conference.unionId)}</div>
                                 </td>

                                 <td className="reg-td reg-td--seat">
                                    {(conference.headquarters?.city || conference.headquarters?.country) ? (
                                       <>
                                          <div className="reg-td-city">
                                             {[conference.headquarters?.city, conference.headquarters?.state].filter(Boolean).join(', ')}
                                          </div>
                                          <div className="reg-td-country">{conference.headquarters?.country}</div>
                                       </>
                                    ) : conference.territory?.description ? (
                                       <div className="reg-td-country">{conference.territory.description}</div>
                                    ) : (
                                       <span className="reg-dash">&mdash;</span>
                                    )}
                                 </td>

                                 <td className="reg-td reg-td--corr">
                                    {conference.contact?.email ? (
                                       <div className="reg-td-email">{conference.contact.email}</div>
                                    ) : (
                                       <span className="reg-dash">&mdash;</span>
                                    )}
                                    {conference.contact?.phone && (
                                       <div className="reg-td-phone">{conference.contact.phone}</div>
                                    )}
                                 </td>

                                 <td className="reg-td reg-td--num">
                                    <div className="reg-td-num">{String(count).padStart(2, '0')}</div>
                                 </td>

                                 <td className="reg-td reg-td--state">
                                    <span className={`reg-state ${conference.isActive ? 'on' : 'off'}`}>
                                       <span className="reg-state-dot" />
                                       {conference.isActive ? 'In Standing' : 'Dormant'}
                                    </span>
                                 </td>

                                 <td
                                    className="reg-td reg-td--actions"
                                    onClick={(e) => e.stopPropagation()}
                                 >
                                    <RowActionsMenu actions={[
                                       { label: 'Edit', onClick: () => { setSelectedConference(conference); setShowEditModal(true); } },
                                       { label: 'Delete', onClick: () => { setConferenceToDelete(conference); setShowDeleteConfirm(true); }, variant: 'danger' },
                                    ]} />
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            )}

            <footer className="reg-foot">
               <span className="reg-foot-rule" />
               <span className="reg-foot-glyph">&#10023;</span>
               <span className="reg-foot-rule" />
            </footer>
         </div>

         <ConferenceModal
            isOpen={showCreateModal || showEditModal}
            onClose={() => {
               setShowCreateModal(false);
               setShowEditModal(false);
               setSelectedConference(undefined);
            }}
            onSave={handleConferenceSaved}
            conference={showEditModal ? selectedConference : null}
            unions={unions}
         />

         <BulkDeleteDialog
            isOpen={showBulkDeleteConfirm}
            count={selectedIds.size}
            loading={bulkDeleting}
            onCancel={() => setShowBulkDeleteConfirm(false)}
            onConfirm={handleBulkDelete}
         />

         <DeleteConferenceDialog
            isOpen={showDeleteConfirm}
            conference={conferenceToDelete}
            churchCount={conferenceToDelete ? (conferenceChurches[conferenceToDelete._id]?.length || 0) : 0}
            onCancel={() => {
               setShowDeleteConfirm(false);
               setConferenceToDelete(undefined);
            }}
            onConfirm={() => conferenceToDelete && handleDeleteConference(conferenceToDelete)}
         />
      </AdminLayout>
   );
}

function BulkDeleteDialog({
   isOpen,
   count,
   loading,
   onCancel,
   onConfirm,
}: {
   isOpen: boolean;
   count: number;
   loading: boolean;
   onCancel: () => void;
   onConfirm: () => void | Promise<void>;
}) {
   const mounted = useMounted();

   useEffect(() => {
      if (!isOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape' && !loading) onCancel();
      };
      window.addEventListener('keydown', onKey);
      return () => {
         document.body.style.overflow = prev;
         window.removeEventListener('keydown', onKey);
      };
   }, [isOpen, loading, onCancel]);

   if (!isOpen || !mounted) return null;

   return createPortal(
      <div className="del-overlay" onClick={() => !loading && onCancel()}>
         <div className="del-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="del-close" onClick={onCancel} disabled={loading} aria-label="Close">
               <span /><span />
            </button>

            <div className="del-head">
               <div className="del-seal">
                  <span className="del-seal-ring" />
                  <span className="del-seal-ring del-seal-ring--2" />
                  <div className="del-seal-inner">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="22" height="22">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" strokeLinecap="round"/>
                     </svg>
                  </div>
               </div>

               <p className="del-kicker">
                  <span className="del-kicker-rule" />
                  Bulk Redaction
               </p>
               <h2 className="del-title">
                  Permanently delete <em>{count}</em> {count === 1 ? 'conference' : 'conferences'}?
               </h2>
               <p className="del-lede">
                  This action is permanent and irreversible. All selected entries shall be
                  removed entirely from the database. Conferences with subordinate entities
                  will be skipped.
               </p>
            </div>

            <div className="del-foot">
               <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="del-btn del-btn--ghost"
               >
                  Cancel
               </button>
               <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                  disabled={loading}
                  className="del-btn del-btn--danger"
               >
                  {loading ? (
                     <>
                        <span className="del-spinner" />
                        <span>Striking from record…</span>
                     </>
                  ) : (
                     <>
                        <span>Delete {count} {count === 1 ? 'Conference' : 'Conferences'}</span>
                        <span className="del-btn-arrow">&rarr;</span>
                     </>
                  )}
               </button>
            </div>
         </div>
         <DeleteDialogStyles />
      </div>,
      document.body
   );
}

function DeleteConferenceDialog({
   isOpen,
   conference,
   churchCount,
   onCancel,
   onConfirm,
}: {
   isOpen: boolean;
   conference: ConferenceWithUnion | undefined;
   churchCount: number;
   onCancel: () => void;
   onConfirm: () => void | Promise<void>;
}) {
   const [loading, setLoading] = useState(false);
   const canDelete = churchCount === 0;

   useEffect(() => {
      if (!isOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape' && !loading) onCancel();
      };
      window.addEventListener('keydown', onKey);
      return () => {
         document.body.style.overflow = prev;
         window.removeEventListener('keydown', onKey);
      };
   }, [isOpen, loading, onCancel]);

   const mounted = useMounted();

   if (!isOpen || !conference || !mounted) return null;

   const handleConfirm = async () => {
      if (!canDelete) return;
      setLoading(true);
      try { await onConfirm(); }
      finally { setLoading(false); }
   };

   const requirements = [
      { label: 'Churches',                  count: churchCount, ready: churchCount === 0 },
      { label: 'Teams beneath those',       count: null,        ready: null },
      { label: 'Services beneath those',    count: null,        ready: null },
   ];

   return createPortal(
      <div className="del-overlay" onClick={() => !loading && onCancel()}>
         <div className="del-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="del-close" onClick={onCancel} disabled={loading} aria-label="Close">
               <span />
               <span />
            </button>

            <div className="del-head">
               <div className="del-seal">
                  <span className="del-seal-ring" />
                  <span className="del-seal-ring del-seal-ring--2" />
                  <div className="del-seal-inner">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="22" height="22">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" strokeLinecap="round"/>
                     </svg>
                  </div>
               </div>

               <p className="del-kicker">
                  <span className="del-kicker-rule" />
                  Notice of Redaction
               </p>
               <h2 className="del-title">
                  Strike <em>{conference.name}</em> from the register?
               </h2>
               <p className="del-lede">
                  This action is permanent and irreversible. The entry shall be
                  removed entirely from the database. Before the deletion may
                  proceed, its subordinate entries must be cleared in order.
               </p>
            </div>

            <div className="del-reqs">
               <div className="del-reqs-head">
                  <span className="del-reqs-num">I.</span>
                  <h3>Hierarchical Requirements</h3>
                  <span className="del-reqs-rule" />
               </div>
               <ul className="del-reqs-list">
                  {requirements.map((r, i) => (
                     <li key={r.label} className={`del-req ${r.ready === false ? 'blocked' : r.ready ? 'ready' : 'neutral'}`}>
                        <span className="del-req-index">{String(i + 1).padStart(2, '0')}</span>
                        <span className="del-req-label">{r.label}</span>
                        <span className="del-req-tail">
                           {r.count !== null ? (
                              <span className="del-req-count">{r.count}</span>
                           ) : (
                              <span className="del-req-glyph">&middot;</span>
                           )}
                           <span className="del-req-state">
                              {r.ready === false ? 'to be cleared' : r.ready ? 'clear' : '—'}
                           </span>
                        </span>
                     </li>
                  ))}
               </ul>
               {!canDelete && (
                  <p className="del-reqs-warn">
                     <span className="del-reqs-warn-dot" />
                     There {churchCount === 1 ? 'is' : 'are'} <strong>{churchCount}</strong>
                     &nbsp;{churchCount === 1 ? 'church' : 'churches'} held by this conference.
                     They must be deleted first.
                  </p>
               )}
            </div>

            <div className="del-foot">
               <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="del-btn del-btn--ghost"
               >
                  Cancel
               </button>
               <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
                  disabled={loading || !canDelete}
                  className="del-btn del-btn--danger"
               >
                  {loading ? (
                     <>
                        <span className="del-spinner" />
                        <span>Striking from record…</span>
                     </>
                  ) : (
                     <>
                        <span>Delete Conference</span>
                        <span className="del-btn-arrow">&rarr;</span>
                     </>
                  )}
               </button>
            </div>
         </div>

         <DeleteDialogStyles />
      </div>,
      document.body
   );
}

function DeleteDialogStyles() {
   return (
      <style jsx global>{`
         :root {
            --del-ink:    #141210;
            --del-ink-2:  #555048;
            --del-ink-3:  #8a8276;
            --del-bed:    #f9f5ec;
            --del-gold:   #a87f2b;
            --del-gold-d: #6b4f15;
            --del-gold-l: #d4b26b;
            --del-rose:   #9b3b2a;
            --del-rose-d: #6e2418;
            --del-green:  #6b7d3a;
            --del-font:   var(--font-poppins), 'Poppins', system-ui, sans-serif;
         }

         .del-overlay {
            position: fixed; inset: 0;
            background: rgba(20, 18, 16, 0.55);
            backdrop-filter: blur(6px) saturate(1.1);
            -webkit-backdrop-filter: blur(6px) saturate(1.1);
            display: flex; align-items: center; justify-content: center;
            padding: 2rem 1rem;
            z-index: 100;
            animation: del-fade 0.4s ease-out both;
         }
         @keyframes del-fade {
            from { opacity: 0; }
            to   { opacity: 1; }
         }

         .del-dialog {
            position: relative;
            width: 100%;
            max-width: 520px;
            max-height: calc(100vh - 4rem);
            overflow-y: auto;
            background: #fff;
            border: 1px solid rgba(168, 127, 43, 0.35);
            font-family: var(--del-font);
            color: var(--del-ink);
            padding: 2.4rem 2.4rem 2rem;
            box-shadow:
               0 1px 0 rgba(255, 255, 255, 0.8) inset,
               0 40px 80px -30px rgba(20, 18, 16, 0.5),
               0 0 0 1px rgba(168, 127, 43, 0.12);
            animation: del-rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
         }
         .del-dialog::before {
            content: ''; position: absolute; inset: 8px;
            border: 1px solid rgba(168, 127, 43, 0.22);
            pointer-events: none;
         }
         @keyframes del-rise {
            from { opacity: 0; transform: translateY(18px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
         }

         .del-close {
            position: absolute;
            top: 1.1rem; right: 1.1rem;
            width: 28px; height: 28px;
            background: transparent;
            border: 1px solid rgba(20, 18, 16, 0.15);
            cursor: pointer;
            display: inline-flex; align-items: center; justify-content: center;
            transition: border-color 0.3s, background 0.3s, transform 0.3s;
            z-index: 2;
         }
         .del-close span {
            position: absolute;
            width: 12px; height: 1px;
            background: var(--del-ink-2);
            transition: background 0.3s;
         }
         .del-close span:first-child  { transform: rotate(45deg); }
         .del-close span:last-child   { transform: rotate(-45deg); }
         .del-close:hover:not(:disabled) {
            border-color: var(--del-rose);
            background: rgba(155, 59, 42, 0.06);
            transform: rotate(90deg);
         }
         .del-close:hover:not(:disabled) span { background: var(--del-rose); }
         .del-close:disabled { opacity: 0.4; cursor: not-allowed; }

         /* HEAD */
         .del-head {
            text-align: center;
            padding: 0.3rem 0 1.6rem;
         }
         .del-seal {
            position: relative;
            width: 72px; height: 72px;
            margin: 0 auto 1.5rem;
         }
         .del-seal-ring {
            position: absolute; inset: -6px;
            border: 1px solid var(--del-rose);
            border-radius: 50%;
            opacity: 0.6;
            animation: del-rotate 18s linear infinite;
         }
         .del-seal-ring--2 {
            inset: -12px;
            border-style: dotted;
            border-color: var(--del-rose-d);
            opacity: 0.35;
            animation-duration: 36s;
            animation-direction: reverse;
         }
         .del-seal-inner {
            width: 100%; height: 100%;
            border: 1px solid var(--del-rose);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: var(--del-rose);
            background:
               radial-gradient(circle, rgba(155, 59, 42, 0.1), transparent 65%),
               linear-gradient(180deg, #fff, #fbf7ef);
            box-shadow:
               0 0 0 3px #fff,
               0 0 0 4px rgba(155, 59, 42, 0.25);
         }
         @keyframes del-rotate { to { transform: rotate(360deg); } }

         .del-kicker {
            display: inline-flex; align-items: center; gap: 0.8rem;
            font-size: 0.6rem;
            font-weight: 500;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: var(--del-rose);
            margin: 0 0 1rem;
         }
         .del-kicker-rule {
            display: inline-block; width: 28px; height: 1px; background: var(--del-rose);
         }
         .del-title {
            font-size: clamp(1.5rem, 3vw, 1.85rem);
            font-weight: 300;
            line-height: 1.25;
            letter-spacing: -0.015em;
            color: var(--del-ink);
            margin: 0 0 1rem;
         }
         .del-title em {
            font-style: italic;
            font-weight: 400;
            color: var(--del-gold-d);
         }
         .del-lede {
            font-size: 0.92rem;
            line-height: 1.6;
            color: var(--del-ink-2);
            font-weight: 300;
            max-width: 42ch;
            margin: 0 auto;
         }

         /* REQS */
         .del-reqs {
            border-top: 1px solid rgba(20, 18, 16, 0.1);
            padding-top: 1.4rem;
            margin-bottom: 1.8rem;
         }
         .del-reqs-head {
            display: flex; align-items: baseline; gap: 0.8rem;
            margin-bottom: 1rem;
         }
         .del-reqs-num {
            font-size: 0.9rem;
            font-weight: 400;
            font-style: italic;
            color: var(--del-gold);
         }
         .del-reqs-head h3 {
            font-size: 0.68rem;
            font-weight: 500;
            letter-spacing: 0.26em;
            text-transform: uppercase;
            color: var(--del-ink);
            margin: 0;
         }
         .del-reqs-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--del-gold-d), transparent); }

         .del-reqs-list {
            list-style: none;
            margin: 0; padding: 0;
         }
         .del-req {
            display: grid;
            grid-template-columns: 28px 1fr auto;
            align-items: baseline;
            gap: 0.8rem;
            padding: 0.7rem 0;
            border-bottom: 1px dotted rgba(20, 18, 16, 0.14);
         }
         .del-req:last-child { border-bottom: none; }
         .del-req-index {
            font-size: 0.65rem;
            letter-spacing: 0.1em;
            color: var(--del-ink-3);
            font-feature-settings: "tnum" 1, "lnum" 1;
         }
         .del-req-label {
            font-size: 0.92rem;
            color: var(--del-ink);
            font-weight: 400;
         }
         .del-req-tail {
            display: inline-flex; align-items: baseline; gap: 0.8rem;
         }
         .del-req-count {
            font-size: 1.3rem;
            font-weight: 200;
            line-height: 1;
            color: var(--del-ink);
            font-feature-settings: "tnum" 1, "lnum" 1;
            letter-spacing: -0.02em;
         }
         .del-req-glyph { color: var(--del-ink-3); }
         .del-req-state {
            font-size: 0.6rem;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--del-ink-3);
            font-weight: 500;
         }
         .del-req.blocked .del-req-count { color: var(--del-rose); }
         .del-req.blocked .del-req-state { color: var(--del-rose); }
         .del-req.ready   .del-req-state { color: var(--del-green); }

         .del-reqs-warn {
            display: flex; align-items: center; gap: 0.7rem;
            margin: 1rem 0 0;
            padding: 0.8rem 1rem;
            background: rgba(155, 59, 42, 0.05);
            border-left: 2px solid var(--del-rose);
            font-size: 0.82rem;
            color: var(--del-rose-d);
            line-height: 1.5;
         }
         .del-reqs-warn strong { font-weight: 600; color: var(--del-rose); }
         .del-reqs-warn-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--del-rose);
            flex-shrink: 0;
            box-shadow: 0 0 0 3px rgba(155, 59, 42, 0.18);
            animation: del-pulse 2s ease-in-out infinite;
         }
         @keyframes del-pulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(155, 59, 42, 0.18); }
            50%      { box-shadow: 0 0 0 6px rgba(155, 59, 42, 0.05); }
         }

         /* FOOT */
         .del-foot {
            display: flex; justify-content: flex-end; gap: 0.8rem;
            padding-top: 1.2rem;
            border-top: 1px solid rgba(20, 18, 16, 0.08);
         }
         .del-btn {
            display: inline-flex; align-items: center; gap: 0.6rem;
            padding: 0.8rem 1.5rem;
            font-family: inherit;
            font-size: 0.7rem;
            font-weight: 500;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            cursor: pointer;
            background: transparent;
            border: 1px solid transparent;
            position: relative;
            overflow: hidden;
            transition: color 0.3s, letter-spacing 0.4s, border-color 0.3s;
         }
         .del-btn:disabled { cursor: not-allowed; opacity: 0.45; }

         .del-btn--ghost {
            color: var(--del-ink-2);
            border-color: rgba(20, 18, 16, 0.2);
         }
         .del-btn--ghost:hover:not(:disabled) {
            color: var(--del-ink);
            border-color: var(--del-ink);
            letter-spacing: 0.26em;
         }

         .del-btn--danger {
            color: var(--del-rose);
            border-color: var(--del-rose);
         }
         .del-btn--danger::before {
            content: ''; position: absolute; inset: 0;
            background: var(--del-rose);
            transform: translateY(100%);
            transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 0;
         }
         .del-btn--danger > * { position: relative; z-index: 1; }
         .del-btn--danger:hover:not(:disabled) {
            color: #fff;
            letter-spacing: 0.28em;
         }
         .del-btn--danger:hover:not(:disabled)::before {
            transform: translateY(0);
         }
         .del-btn-arrow {
            display: inline-block;
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
         }
         .del-btn--danger:hover:not(:disabled) .del-btn-arrow {
            transform: translateX(4px);
         }

         .del-spinner {
            width: 12px; height: 12px;
            border: 1px solid currentColor;
            border-top-color: transparent;
            border-radius: 50%;
            animation: del-rotate 1s linear infinite;
         }
      `}</style>
   );
}

function RegisterStyles() {
   return (
      <style jsx global>{`
         :root {
            --reg-bg:     #ffffff;
            --reg-bed:    #f9f5ec;
            --reg-ink:    #141210;
            --reg-ink-2:  #555048;
            --reg-ink-3:  #8a8276;
            --reg-gold:   #a87f2b;
            --reg-gold-d: #6b4f15;
            --reg-gold-l: #d4b26b;
            --reg-rose:   #b85a3a;
            --reg-green:  #6b7d3a;
            --reg-font:   var(--font-poppins), 'Poppins', system-ui, sans-serif;
         }

         .reg-root {
            position: relative;
            margin: -1.5rem;
            padding: 3rem clamp(1.5rem, 4vw, 4rem) 5rem;
            background: var(--reg-bg);
            color: var(--reg-ink);
            font-family: var(--reg-font);
            min-height: calc(100vh - 4rem);
         }
         .reg-decor {
            position: absolute; inset: 0;
            pointer-events: none;
            overflow: hidden;
            z-index: 0;
         }
         .reg-vignette {
            position: absolute; inset: 0;
            background:
               radial-gradient(ellipse 90% 70% at 50% -10%, rgba(168, 127, 43, 0.08), transparent 55%),
               radial-gradient(ellipse 70% 50% at 100% 100%, rgba(184, 90, 58, 0.04), transparent 60%);
         }
         .reg-grain {
            position: absolute; inset: 0;
            opacity: 0.5; mix-blend-mode: multiply;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.28 0 0 0 0 0.18 0 0 0 0.14 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
         }
         .reg-glow {
            position: absolute; top: -180px; left: 50%; transform: translateX(-50%);
            width: 820px; height: 820px;
            background: radial-gradient(circle, rgba(168, 127, 43, 0.09), transparent 55%);
            filter: blur(50px);
            animation: reg-breathe 14s ease-in-out infinite;
         }
         @keyframes reg-breathe {
            0%, 100% { opacity: 0.9; transform: translateX(-50%) scale(1); }
            50%      { opacity: 0.55; transform: translateX(-50%) scale(1.08); }
         }
         .reg-root > *:not(.reg-decor) {
            position: relative; z-index: 1;
         }

         /* MASTHEAD */
         .reg-masthead {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 3rem;
            align-items: end;
            padding-bottom: 2.5rem;
            border-bottom: 1px solid rgba(20, 18, 16, 0.12);
            animation: reg-fade 1.2s ease-out both;
         }
         @media (max-width: 820px) {
            .reg-masthead { grid-template-columns: 1fr; gap: 2rem; }
         }
         @keyframes reg-fade {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
         }

         .reg-kicker {
            display: flex; align-items: center; gap: 0.9rem;
            font-size: 0.68rem;
            font-weight: 500;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: var(--reg-gold);
            margin: 0 0 1.6rem;
         }
         .reg-kicker-rule {
            display: inline-block; width: 36px; height: 1px; background: var(--reg-gold);
         }

         .reg-title {
            font-family: var(--reg-font);
            font-weight: 300;
            font-size: clamp(3rem, 6.5vw, 5.6rem);
            line-height: 0.95;
            letter-spacing: -0.035em;
            margin: 0 0 1.6rem;
            color: var(--reg-ink);
         }
         .reg-word {
            display: inline-block;
            opacity: 0;
            animation: reg-rise 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
         }
         .reg-word--italic {
            font-style: italic;
            font-weight: 400;
            color: var(--reg-gold-l);
         }
         @keyframes reg-rise {
            from { opacity: 0; transform: translateY(28px); filter: blur(5px); }
            to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
         }

         .reg-subtitle {
            font-size: 1.05rem;
            font-weight: 300;
            line-height: 1.6;
            color: var(--reg-ink-2);
            max-width: 54ch;
            margin: 0;
            animation: reg-fade 1.4s ease-out 0.5s both;
         }

         .reg-mast-right {
            animation: reg-fade 1.4s ease-out 0.3s both;
         }
         .reg-counter {
            border: 1px solid rgba(168, 127, 43, 0.3);
            padding: 1.8rem 2rem;
            text-align: right;
            min-width: 240px;
            position: relative;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(249, 245, 236, 0.3));
         }
         .reg-counter::before {
            content: ''; position: absolute; inset: 5px;
            border: 1px solid rgba(168, 127, 43, 0.12);
            pointer-events: none;
         }
         .reg-counter-num {
            font-size: clamp(3rem, 5vw, 4.2rem);
            font-weight: 200;
            line-height: 1;
            color: var(--reg-ink);
            font-feature-settings: "lnum" 1, "tnum" 1;
            letter-spacing: -0.03em;
         }
         .reg-counter-label {
            margin-top: 0.5rem;
            font-size: 0.62rem;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: var(--reg-gold);
            font-weight: 500;
         }
         .reg-counter-rule {
            width: 32px; height: 1px; background: var(--reg-gold-d);
            margin: 0.9rem 0 0.9rem auto;
         }
         .reg-counter-sub {
            font-size: 0.8rem;
            color: var(--reg-ink-2);
            font-style: italic;
            font-weight: 300;
         }
         .reg-counter-sub span {
            font-style: normal;
            font-weight: 500;
            color: var(--reg-gold-l);
         }

         /* CONSOLE */
         .reg-console {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2rem;
            flex-wrap: wrap;
            padding: 2rem 0 2.5rem;
            animation: reg-fade 1.4s ease-out 0.7s both;
         }
         .reg-console-left {
            display: flex; align-items: center; gap: 2rem; flex: 1;
            flex-wrap: wrap;
         }

         .reg-search {
            position: relative;
            min-width: 320px;
            flex: 1; max-width: 480px;
         }
         .reg-search-icon {
            position: absolute; left: 0; top: 50%; transform: translateY(-50%);
            color: var(--reg-gold);
            pointer-events: none;
         }
         .reg-search-input {
            width: 100%;
            background: transparent;
            border: none;
            outline: none;
            padding: 0.9rem 0 0.9rem 1.8rem;
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 300;
            color: var(--reg-ink);
            letter-spacing: 0.01em;
         }
         .reg-search-input::placeholder {
            color: var(--reg-ink-3);
            font-style: italic;
            font-weight: 300;
         }
         .reg-search-underline {
            position: absolute; left: 0; right: 0; bottom: 0;
            height: 1px; background: rgba(20, 18, 16, 0.2);
         }
         .reg-search-underline::after {
            content: ''; position: absolute; left: 0; bottom: 0;
            width: 0; height: 1px; background: var(--reg-gold);
            transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
         }
         .reg-search:focus-within .reg-search-underline::after { width: 100%; }

         /* CHECKBOX */
         .reg-th--check,
         .reg-td--check {
            width: 40px;
            padding-left: 0.8rem;
            padding-right: 0;
         }
         .reg-check {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            user-select: none;
         }
         .reg-check input {
            position: absolute;
            opacity: 0;
            pointer-events: none;
         }
         .reg-check-box {
            width: 18px;
            height: 18px;
            border: 1px solid rgba(20, 18, 16, 0.3);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: border-color 0.3s, background 0.3s;
         }
         .reg-check-box svg {
            width: 12px;
            height: 12px;
            opacity: 0;
            transform: scale(0.5);
            transition: opacity 0.2s, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
            color: #fff;
         }
         .reg-check input:checked + .reg-check-box {
            background: var(--reg-gold);
            border-color: var(--reg-gold);
         }
         .reg-check input:checked + .reg-check-box svg {
            opacity: 1;
            transform: scale(1);
         }
         .reg-check-box:hover {
            border-color: var(--reg-gold);
         }

         /* BULK BAR */
         .reg-bulk {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 0.9rem 1.2rem;
            margin-bottom: 0.5rem;
            border: 1px solid rgba(168, 127, 43, 0.35);
            background: linear-gradient(180deg, rgba(249, 245, 236, 0.8), rgba(255, 255, 255, 0.6));
            animation: reg-fade 0.4s ease-out both;
         }
         .reg-bulk-left {
            display: flex;
            align-items: center;
            gap: 0.8rem;
         }
         .reg-bulk-count {
            font-size: 1.3rem;
            font-weight: 300;
            color: var(--reg-gold-d);
            font-feature-settings: "lnum" 1, "tnum" 1;
            line-height: 1;
         }
         .reg-bulk-label {
            font-size: 0.72rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--reg-ink-2);
            font-weight: 500;
         }
         .reg-bulk-clear {
            background: none;
            border: none;
            font-family: inherit;
            font-size: 0.72rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: var(--reg-gold);
            font-weight: 500;
            cursor: pointer;
            padding: 0.3rem 0.6rem;
            border-left: 1px solid rgba(20, 18, 16, 0.15);
            transition: color 0.3s;
         }
         .reg-bulk-clear:hover { color: var(--reg-ink); }
         .reg-bulk-delete {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            background: transparent;
            color: var(--reg-rose);
            border: 1px solid var(--reg-rose);
            padding: 0.65rem 1.3rem;
            font-family: inherit;
            font-size: 0.68rem;
            font-weight: 500;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: color 0.35s, letter-spacing 0.4s;
         }
         .reg-bulk-delete::before {
            content: '';
            position: absolute;
            inset: 0;
            background: var(--reg-rose);
            transform: translateY(100%);
            transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 0;
         }
         .reg-bulk-delete > * { position: relative; z-index: 1; }
         .reg-bulk-delete:hover {
            color: #fff;
            letter-spacing: 0.26em;
         }
         .reg-bulk-delete:hover::before { transform: translateY(0); }

         /* TOGGLE */
         .reg-toggle {
            display: inline-flex; align-items: center; gap: 0.7rem;
            cursor: pointer; user-select: none;
         }
         .reg-toggle input { position: absolute; opacity: 0; pointer-events: none; }
         .reg-toggle-track {
            position: relative;
            width: 34px; height: 18px;
            border: 1px solid var(--reg-ink-3);
            border-radius: 999px;
            background: transparent;
            transition: border-color 0.3s, background 0.3s;
         }
         .reg-toggle-thumb {
            position: absolute;
            top: 1px; left: 1px;
            width: 14px; height: 14px;
            border-radius: 50%;
            background: var(--reg-ink-3);
            transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.3s;
         }
         .reg-toggle input:checked + .reg-toggle-track {
            border-color: var(--reg-gold);
            background: rgba(168, 127, 43, 0.08);
         }
         .reg-toggle input:checked + .reg-toggle-track .reg-toggle-thumb {
            transform: translateX(16px);
            background: var(--reg-gold);
         }
         .reg-toggle-label {
            font-size: 0.72rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--reg-ink-2);
            font-weight: 500;
         }

         /* BUTTON */
         .reg-btn {
            display: inline-flex; align-items: center; gap: 0.7rem;
            background: transparent;
            color: var(--reg-gold-l);
            border: 1px solid var(--reg-gold);
            padding: 0.85rem 1.6rem;
            font-family: inherit;
            font-size: 0.72rem;
            font-weight: 500;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: color 0.35s, letter-spacing 0.4s;
         }
         .reg-btn::before {
            content: ''; position: absolute; inset: 0;
            background: var(--reg-gold);
            transform: translateY(100%);
            transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 0;
         }
         .reg-btn > * { position: relative; z-index: 1; }
         .reg-btn:hover { color: #fff; letter-spacing: 0.28em; }
         .reg-btn:hover::before { transform: translateY(0); }
         .reg-btn-plus {
            font-size: 1.1rem; font-weight: 300; line-height: 0;
         }

         /* TABLE */
         .reg-table-wrap {
            overflow: visible;
            margin: 0 -0.5rem;
            padding: 0 0.5rem;
         }
         .reg-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-family: var(--reg-font);
            min-width: 960px;
         }

         .reg-th {
            text-align: left;
            padding: 1.1rem 1.2rem;
            font-size: 0.6rem;
            font-weight: 500;
            letter-spacing: 0.26em;
            text-transform: uppercase;
            color: var(--reg-gold);
            border-top: 1px solid var(--reg-ink);
            border-bottom: 1px solid var(--reg-ink);
            background: transparent;
            white-space: nowrap;
         }
         .reg-th--no      { width: 56px; padding-left: 0.6rem; }
         .reg-th--num     { text-align: right; }
         .reg-th--actions { width: 48px; }

         .reg-tr {
            cursor: pointer;
            opacity: 0;
            animation: reg-row-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
            transition: background 0.35s;
            position: relative;
         }
         @keyframes reg-row-in {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
         }
         .reg-tr:hover { background: rgba(168, 127, 43, 0.045); }

         .reg-td {
            padding: 1.3rem 1.2rem;
            border-bottom: 1px dotted rgba(20, 18, 16, 0.14);
            vertical-align: middle;
            font-size: 0.92rem;
            color: var(--reg-ink);
            font-weight: 300;
            transition: border-color 0.3s;
         }
         .reg-tr:last-child .reg-td { border-bottom: 1px solid var(--reg-ink); }
         .reg-tr:hover .reg-td { border-bottom-color: rgba(168, 127, 43, 0.4); }

         /* NUMBER CELL */
         .reg-td--no { padding-left: 0.6rem; width: 56px; }
         .reg-no {
            font-size: 0.72rem;
            font-weight: 400;
            letter-spacing: 0.1em;
            color: var(--reg-ink-3);
            font-feature-settings: "lnum" 1, "tnum" 1;
            transition: color 0.3s;
         }
         .reg-tr:hover .reg-no { color: var(--reg-gold); }

         /* UNION CELL (entity cell — reused class name from register) */
         .reg-td--union { min-width: 280px; }
         .reg-td-union {
            display: flex; align-items: center; gap: 1rem;
         }
         .reg-avatar {
            position: relative;
         }
         .reg-avatar--sm {
            width: 44px; height: 44px; flex-shrink: 0;
         }
         .reg-avatar--sm .reg-avatar-ring {
            inset: -3px;
            border: 1px solid var(--reg-gold);
            border-radius: 50%;
            position: absolute;
            opacity: 0.5;
            transition: opacity 0.4s, transform 0.6s;
         }
         .reg-avatar--sm .reg-avatar-inner {
            position: relative;
            width: 100%; height: 100%;
            border-radius: 50%;
            overflow: hidden;
            border: 1px solid var(--reg-gold);
            background: var(--reg-bed);
            box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(168, 127, 43, 0.25);
         }
         .reg-avatar-img {
            width: 100%; height: 100%;
            object-fit: cover;
            filter: sepia(0.2) saturate(0.85);
            transition: filter 0.8s, transform 1.2s;
         }
         .reg-avatar-fallback {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem;
            font-weight: 300;
            font-style: italic;
            color: var(--reg-gold-l);
            background:
               radial-gradient(circle at 40% 35%, rgba(168, 127, 43, 0.18), transparent 65%),
               linear-gradient(180deg, #fbf6ea, #efe5ce);
         }
         .reg-tr:hover .reg-avatar--sm .reg-avatar-ring {
            opacity: 1;
            transform: rotate(22deg);
         }
         .reg-tr:hover .reg-avatar--sm .reg-avatar-img {
            filter: sepia(0.05) saturate(1);
            transform: scale(1.06);
         }

         .reg-td-union-text { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
         .reg-td-name {
            font-size: 1rem;
            font-weight: 500;
            letter-spacing: -0.005em;
            color: var(--reg-ink);
            transition: color 0.3s;
         }
         .reg-tr:hover .reg-td-name { color: var(--reg-gold-d); }
         .reg-td-path {
            font-size: 0.7rem;
            color: var(--reg-ink-3);
            font-weight: 300;
            letter-spacing: 0.04em;
            font-feature-settings: "tnum" 1;
            font-style: italic;
         }

         /* PARENT (union) CELL */
         .reg-td--parent { min-width: 180px; }
         .reg-td-parent {
            font-size: 0.9rem;
            font-weight: 400;
            color: var(--reg-ink-2);
            font-style: italic;
            letter-spacing: 0.005em;
            transition: color 0.3s;
         }
         .reg-tr:hover .reg-td-parent { color: var(--reg-gold-d); }

         /* SEAT */
         .reg-td-city    { color: var(--reg-ink); font-weight: 400; font-size: 0.92rem; }
         .reg-td-country { color: var(--reg-ink-2); font-style: italic; font-weight: 300; font-size: 0.82rem; margin-top: 0.15rem; }

         /* CORRESPONDENCE */
         .reg-td--corr { max-width: 260px; }
         .reg-td-email {
            color: var(--reg-ink);
            font-weight: 400;
            font-size: 0.88rem;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            max-width: 240px;
         }
         .reg-td-phone {
            color: var(--reg-ink-2);
            font-weight: 300;
            font-size: 0.8rem;
            margin-top: 0.15rem;
            font-feature-settings: "tnum" 1;
         }

         .reg-dash { color: var(--reg-ink-3); font-style: italic; }

         /* NUMBER */
         .reg-td--num { text-align: right; width: 130px; }
         .reg-td-num {
            font-size: 1.85rem;
            font-weight: 200;
            line-height: 1;
            color: var(--reg-ink);
            font-feature-settings: "lnum" 1, "tnum" 1;
            letter-spacing: -0.03em;
            transition: color 0.3s;
         }
         .reg-tr:hover .reg-td-num { color: var(--reg-gold-l); }

         /* STATE */
         .reg-td--state { width: 160px; }
         .reg-state {
            display: inline-flex; align-items: center; gap: 0.45rem;
            font-size: 0.62rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: var(--reg-ink-3);
            font-weight: 500;
         }
         .reg-state-dot {
            width: 5px; height: 5px; border-radius: 50%;
            background: var(--reg-ink-3);
         }
         .reg-state.on { color: var(--reg-green); }
         .reg-state.on .reg-state-dot {
            background: var(--reg-green);
            box-shadow: 0 0 8px rgba(107, 125, 58, 0.45);
            animation: reg-ember 2.6s ease-in-out infinite;
         }
         @keyframes reg-ember {
            0%, 100% { box-shadow: 0 0 8px rgba(107, 125, 58, 0.45); }
            50%      { box-shadow: 0 0 4px rgba(107, 125, 58, 0.18); }
         }

         /* ACTIONS */
         .reg-td--actions {
            width: 48px;
            text-align: right;
            padding-right: 0.4rem;
         }

         @media (max-width: 760px) {
            .reg-table-wrap { margin: 0 -1rem; padding: 0 1rem; }
         }

         /* SKELETON (table) */
         .reg-skel-table { padding-top: 0.5rem; }
         .reg-skel-header {
            display: flex; align-items: center; gap: 1.2rem;
            padding: 1.1rem 1.2rem;
            border-top: 1px solid var(--reg-ink);
            border-bottom: 1px solid var(--reg-ink);
            margin-bottom: 0.4rem;
         }
         .reg-skel-row {
            display: flex; align-items: center; gap: 1.2rem;
            padding: 1.3rem 1.2rem;
            border-bottom: 1px dotted rgba(20, 18, 16, 0.14);
            opacity: 0;
            animation: reg-fade 0.8s ease-out both;
         }
         .reg-skel-avatar--sm {
            width: 44px; height: 44px;
         }
         .reg-skel-avatar {
            border-radius: 50%;
            flex-shrink: 0;
            background: linear-gradient(90deg, #f2ecdf 0%, #faf5e8 50%, #f2ecdf 100%);
            background-size: 200% 100%;
            animation: reg-shimmer 2s ease-in-out infinite;
         }
         .reg-skel-line {
            height: 12px;
            border-radius: 2px;
            background: linear-gradient(90deg, #f2ecdf 0%, #faf5e8 50%, #f2ecdf 100%);
            background-size: 200% 100%;
            animation: reg-shimmer 2s ease-in-out infinite;
         }
         .reg-skel-line--head { height: 8px; }
         @keyframes reg-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
         }

         /* EMPTY */
         .reg-empty {
            text-align: center; padding: 5rem 1rem;
            max-width: 500px; margin: 0 auto;
         }
         .reg-empty-seal {
            width: 96px; height: 96px;
            border: 1px solid var(--reg-gold);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.8rem;
            position: relative;
            animation: reg-rotate 40s linear infinite;
         }
         .reg-empty-seal::before {
            content: ''; position: absolute; inset: -8px;
            border: 1px dotted var(--reg-gold-d); opacity: 0.4;
            border-radius: 50%;
         }
         .reg-empty-glyph {
            font-size: 1.8rem; color: var(--reg-gold);
            animation: reg-counter-rotate 40s linear infinite;
         }
         @keyframes reg-rotate         { to { transform: rotate(360deg); } }
         @keyframes reg-counter-rotate { to { transform: rotate(-360deg); } }
         .reg-empty-title {
            font-size: 1.7rem;
            font-weight: 300;
            font-style: italic;
            color: var(--reg-ink);
            margin: 0 0 0.8rem;
         }
         .reg-empty-body {
            color: var(--reg-ink-2);
            font-weight: 300;
            line-height: 1.6;
         }

         /* FOOT */
         .reg-foot {
            margin-top: 5rem;
            display: flex; align-items: center; justify-content: center; gap: 1.2rem;
         }
         .reg-foot-rule { width: 80px; height: 1px; background: var(--reg-gold-d); opacity: 0.5; }
         .reg-foot-glyph { color: var(--reg-gold); font-size: 1rem; }
      `}</style>
   );
}
