'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useMounted } from '@/hooks/useMounted';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { useToast } from '@/contexts/ToastContext';
import { teamService, Team } from '@/lib/teams';
import { TeamType, teamTypeService } from '@/lib/teamTypes';
import { teamImageService } from '@/lib/teamImageService';
import { MediaFile } from '@/lib/mediaService';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { CreateTeamModal } from '@/components/teams/CreateTeamModal';

function TeamsPageContent() {
   const router = useRouter();
   const searchParams = useSearchParams();
   const typeFilter = searchParams?.get('teamType') || null;

   const [teams, setTeams] = useState<Team[]>([]);
   const [teamTypes, setTeamTypes] = useState<TeamType[]>([]);
   const [loading, setLoading] = useState(true);
   const [createModalOpen, setCreateModalOpen] = useState(false);
   const [editModalOpen, setEditModalOpen] = useState(false);
   const [editingTeam, setEditingTeam] = useState<Team | null>(null);
   const [searchQuery, setSearchQuery] = useState('');
   const [showInactive, setShowInactive] = useState(true);
   const [deleteModalOpen, setDeleteModalOpen] = useState(false);
   const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [bulkDeleting, setBulkDeleting] = useState(false);
   const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
   const { user } = usePermissions();
   const { error: showErrorToast, success: showSuccessToast } = useToast();

   const loadTeams = useCallback(async () => {
      try {
         setLoading(true);
         const response = await teamService.getAllTeams();
         setTeams((response.data as Team[]) || []);
         setSelectedIds(new Set());
      } catch (error: unknown) {
         const errorMessage = error instanceof Error ? error.message : 'Failed to load teams';
         setTeams([]);
         if (errorMessage.includes('No hierarchy access found')) {
            showErrorToast('Access Denied', 'You do not have proper hierarchy access to view teams. Please contact your administrator.');
         } else {
            showErrorToast('Error Loading Teams', errorMessage);
         }
      } finally {
         setLoading(false);
      }
   }, [showErrorToast]);

   const loadTeamTypes = useCallback(async () => {
      if (!user?.id) { setTeamTypes([]); return; }
      try {
         const response = await teamTypeService.getUserTeamTypes(user.id, true, false);
         setTeamTypes(response.data || []);
      } catch {
         setTeamTypes([]);
      }
   }, [user?.id]);

   useEffect(() => {
      loadTeams();
      loadTeamTypes();
   }, [loadTeams, loadTeamTypes]);

   const getTeamTypeName = (typeName: string | undefined) => {
      if (!typeName) return 'Unclassed';
      const t = teamTypes.find((tt) => tt.name === typeName);
      return t?.name || typeName;
   };

   const getTeamTypeFilterName = (): string | null => {
      if (!typeFilter) return null;
      const t = teamTypes.find((tt) => tt._id === typeFilter || tt.name === typeFilter);
      return t?.name || typeFilter;
   };

   const applyImages = async (teamId: string, teamData: {
      name: string;
      bannerImage?: File | null;
      bannerMediaFile?: MediaFile | null;
      bannerAlt?: string;
      profileImage?: File | null;
      profileMediaFile?: MediaFile | null;
      profileAlt?: string;
   }) => {
      if (teamData.bannerImage) {
         await teamImageService.uploadBanner(teamId, teamData.bannerImage, teamData.bannerAlt || `${teamData.name} banner`);
      } else if (teamData.bannerMediaFile?._id) {
         await teamImageService.setBannerFromMediaFile(teamId, teamData.bannerMediaFile._id, teamData.bannerAlt || `${teamData.name} banner`);
      }
      if (teamData.profileImage) {
         await teamImageService.uploadProfilePhoto(teamId, teamData.profileImage, teamData.profileAlt || `${teamData.name} profile photo`);
      } else if (teamData.profileMediaFile?._id) {
         await teamImageService.setProfilePhotoFromMediaFile(teamId, teamData.profileMediaFile._id, teamData.profileAlt || `${teamData.name} profile photo`);
      }
   };

   const handleCreateTeam = async (teamData: {
      name: string; type: string; description?: string; location?: string; churchId?: string;
      bannerImage?: File | null; bannerMediaFile?: MediaFile | null; bannerAlt?: string;
      profileImage?: File | null; profileMediaFile?: MediaFile | null; profileAlt?: string;
   }) => {
      try {
         const response = await teamService.createTeam({
            name: teamData.name, type: teamData.type, description: teamData.description,
            location: teamData.location, churchId: teamData.churchId || '',
         });
         const createdTeam = response.data;
         try { await applyImages(createdTeam._id, teamData); }
         catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            showErrorToast('Warning', `Team inscribed, but image upload failed: ${msg}`);
         }
         showSuccessToast('Success', 'Team inscribed to the register.');
         loadTeams();
         setCreateModalOpen(false);
      } catch (error: unknown) {
         showErrorToast('Error', error instanceof Error ? error.message : 'Failed to create team');
      }
   };

   const handleUpdateTeam = async (teamData: {
      name: string; type: string; description?: string; location?: string; churchId?: string;
      bannerImage?: File | null; bannerMediaFile?: MediaFile | null; bannerAlt?: string;
      profileImage?: File | null; profileMediaFile?: MediaFile | null; profileAlt?: string;
   }) => {
      if (!editingTeam) return;
      try {
         await teamService.updateTeam(editingTeam._id, {
            name: teamData.name, type: teamData.type,
            description: teamData.description, location: teamData.location,
            ...(teamData.churchId ? { churchId: teamData.churchId } : {}),
         });
         try { await applyImages(editingTeam._id, teamData); }
         catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            showErrorToast('Warning', `Team updated, but image upload failed: ${msg}`);
         }
         showSuccessToast('Success', 'Team record amended.');
         loadTeams();
         setEditModalOpen(false);
         setEditingTeam(null);
      } catch (error: unknown) {
         showErrorToast('Error', error instanceof Error ? error.message : 'Failed to update team');
      }
   };

   const confirmDeleteTeam = async () => {
      if (!teamToDelete) return;
      try {
         await teamService.deleteTeam(teamToDelete._id);
         showSuccessToast('Team retired', `${teamToDelete.name} has been removed from the register.`);
         loadTeams();
         setDeleteModalOpen(false);
         setTeamToDelete(null);
      } catch (error: unknown) {
         showErrorToast('Error', error instanceof Error ? error.message : 'Failed to delete team');
      }
   };

   const toggleSelect = (id: string) => {
      setSelectedIds((prev) => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id); else next.add(id);
         return next;
      });
   };

   const toggleSelectAll = () => {
      if (selectedIds.size === filteredTeams.length) {
         setSelectedIds(new Set());
      } else {
         setSelectedIds(new Set(filteredTeams.map((t) => t._id)));
      }
   };

   const handleBulkDelete = async () => {
      setBulkDeleting(true);
      const ids = [...selectedIds];
      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (const id of ids) {
         try {
            await teamService.deleteTeam(id);
            results.success++;
         } catch (error) {
            results.failed++;
            results.errors.push(error instanceof Error ? error.message : `Failed to delete ${id}`);
         }
      }

      if (results.success > 0) {
         showSuccessToast('Bulk retirement complete', `${results.success} team(s) retired from the register.`);
      }
      if (results.failed > 0) {
         showErrorToast('Some removals failed', `${results.failed} could not be retired. ${results.errors[0] || ''}`);
      }

      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setBulkDeleting(false);
      loadTeams();
   };

   const filterTypeName = getTeamTypeFilterName();

   const filteredTeams = teams.filter((team) => {
      if (!showInactive && !team.isActive) return false;
      if (filterTypeName) {
         const teamTypeName = team.category || team.type;
         if (teamTypeName !== filterTypeName) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const teamTypeName = team.category || team.type;
      const churchName = typeof team.churchId === 'object' ? team.churchId?.name : undefined;
      const leaderName = typeof team.leaderId === 'object' ? team.leaderId?.name : undefined;
      return (
         team.name.toLowerCase().includes(q) ||
         (team.description?.toLowerCase().includes(q) ?? false) ||
         (team.location?.toLowerCase().includes(q) ?? false) ||
         (teamTypeName?.toLowerCase().includes(q) ?? false) ||
         (churchName?.toLowerCase().includes(q) ?? false) ||
         (leaderName?.toLowerCase().includes(q) ?? false)
      );
   });

   const totalMembers = filteredTeams.reduce((acc, t) => acc + (t.memberCount || 0), 0);

   return (
      <AdminLayout
         title="Teams"
         description="Manage teams across the hierarchy"
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
                     Seventh&#8209;day Adventist Church&nbsp;&middot;&nbsp;Muster
                  </p>
                  <h1 className="reg-title">
                     <span className="reg-word" style={{ animationDelay: '0.15s' }}>The</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.24s' }}>Register</span>
                     <br />
                     <span className="reg-word" style={{ animationDelay: '0.33s' }}>of</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.42s' }}>Teams</span>
                  </h1>
                  <p className="reg-subtitle">
                     A muster of the companies through which the work is done &mdash;
                     teams of ministry, service, and communications, gathered under the
                     stewardship of the churches.
                  </p>
                  {filterTypeName && (
                     <p className="reg-filter-chip">
                        <span>Filtered by kind:</span>
                        <em>{filterTypeName}</em>
                        <button
                           onClick={() => router.push('/teams')}
                           className="reg-filter-clear"
                           aria-label="Clear filter"
                        >&times;</button>
                     </p>
                  )}
               </div>

               <aside className="reg-mast-right">
                  <div className="reg-counter">
                     <div className="reg-counter-num">{String(filteredTeams.length).padStart(2, '0')}</div>
                     <div className="reg-counter-label">Companies on Muster</div>
                     <div className="reg-counter-rule" />
                     <div className="reg-counter-sub">
                        <span>{totalMembers}</span> members mustered
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
                        placeholder="Search teams by name, kind, church, or leader…"
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

               <PermissionGate permission="teams.create">
                  <button onClick={() => setCreateModalOpen(true)} className="reg-btn">
                     <span className="reg-btn-plus">+</span>
                     <span>Inscribe New Team</span>
                  </button>
               </PermissionGate>
            </div>

            {/* BULK */}
            {selectedIds.size > 0 && (
               <div className="reg-bulk">
                  <div className="reg-bulk-left">
                     <span className="reg-bulk-count">{selectedIds.size}</span>
                     <span className="reg-bulk-label">{selectedIds.size === 1 ? 'entry' : 'entries'} selected</span>
                     <button className="reg-bulk-clear" onClick={() => setSelectedIds(new Set())}>Clear</button>
                  </div>
                  <PermissionGate permission="teams.delete">
                     <button className="reg-bulk-delete" onClick={() => setShowBulkDeleteConfirm(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
                           <path d="M10 11v6M14 11v6" />
                        </svg>
                        <span>Retire Selected</span>
                     </button>
                  </PermissionGate>
               </div>
            )}

            {/* BODY */}
            {loading ? (
               <div className="reg-skel-table">
                  <div className="reg-skel-header">
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '8%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '24%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '16%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '14%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '14%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '10%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '10%' }} />
                  </div>
                  {[0, 1, 2, 3, 4].map((i) => (
                     <div key={i} className="reg-skel-row" style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="reg-skel-avatar reg-skel-avatar--sm" />
                        <div className="reg-skel-line" style={{ flex: 1.6 }} />
                        <div className="reg-skel-line" style={{ flex: 1.1 }} />
                        <div className="reg-skel-line" style={{ flex: 1 }} />
                        <div className="reg-skel-line" style={{ flex: 1 }} />
                        <div className="reg-skel-line" style={{ flex: 0.6 }} />
                        <div className="reg-skel-line" style={{ flex: 0.8 }} />
                     </div>
                  ))}
               </div>
            ) : filteredTeams.length === 0 ? (
               <div className="reg-empty">
                  <div className="reg-empty-seal">
                     <span className="reg-empty-glyph">&#10022;</span>
                  </div>
                  <h3 className="reg-empty-title">
                     {searchQuery || filterTypeName ? 'No company meets your search.' : 'The muster awaits its first team.'}
                  </h3>
                  <p className="reg-empty-body">
                     {searchQuery || filterTypeName
                        ? 'Amend your query, or broaden it to include dormant teams.'
                        : 'Begin by inscribing the first team to the register.'}
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
                                    checked={filteredTeams.length > 0 && selectedIds.size === filteredTeams.length}
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
                           <th className="reg-th">Company</th>
                           <th className="reg-th">Kind</th>
                           <th className="reg-th">Church</th>
                           <th className="reg-th">Leader</th>
                           <th className="reg-th reg-th--num">Members</th>
                           <th className="reg-th">Standing</th>
                           <th className="reg-th reg-th--actions" aria-label="Actions" />
                        </tr>
                     </thead>
                     <tbody>
                        {filteredTeams.map((team, i) => {
                           const teamTypeName = team.category || team.type;
                           const kind = getTeamTypeName(teamTypeName);
                           const churchName = typeof team.churchId === 'object' ? team.churchId?.name : undefined;
                           const leaderName = typeof team.leaderId === 'object' ? team.leaderId?.name : undefined;
                           const goto = () => {
                              if (deleteModalOpen || editModalOpen || createModalOpen || showBulkDeleteConfirm) return;
                              if (selectedIds.size > 0) { toggleSelect(team._id); return; }
                              router.push(`/teams/${team._id}`);
                           };
                           return (
                              <tr
                                 key={team._id}
                                 className="reg-tr"
                                 style={{ animationDelay: `${0.05 + i * 0.04}s` }}
                                 onClick={goto}
                              >
                                 <td className="reg-td reg-td--check" onClick={(e) => e.stopPropagation()}>
                                    <label className="reg-check" onClick={(e) => { e.preventDefault(); toggleSelect(team._id); }}>
                                       <input
                                          type="checkbox"
                                          checked={selectedIds.has(team._id)}
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
                                             {team.profilePhoto?.url ? (
                                                <Image
                                                   src={team.profilePhoto.url}
                                                   alt={team.profilePhoto.alt || team.name}
                                                   width={96}
                                                   height={96}
                                                   className="reg-avatar-img"
                                                />
                                             ) : (
                                                <div className="reg-avatar-fallback">
                                                   <span>{(team.name || 'T').charAt(0)}</span>
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                       <div className="reg-td-union-text">
                                          <div className="reg-td-name">{team.name}</div>
                                          {team.location && (
                                             <div className="reg-td-path">{team.location}</div>
                                          )}
                                       </div>
                                    </div>
                                 </td>

                                 <td className="reg-td reg-td--kind">
                                    <span className="reg-kind-chip">{kind}</span>
                                 </td>

                                 <td className="reg-td reg-td--parent">
                                    {churchName ? (
                                       <div className="reg-td-parent">{churchName}</div>
                                    ) : (
                                       <span className="reg-dash">&mdash;</span>
                                    )}
                                 </td>

                                 <td className="reg-td reg-td--leader">
                                    {leaderName ? (
                                       <div className="reg-td-leader">{leaderName}</div>
                                    ) : (
                                       <span className="reg-dash">unled</span>
                                    )}
                                 </td>

                                 <td className="reg-td reg-td--num">
                                    <div className="reg-td-num">{String(team.memberCount || 0).padStart(2, '0')}</div>
                                 </td>

                                 <td className="reg-td reg-td--state">
                                    <span className={`reg-state ${team.isActive ? 'on' : 'off'}`}>
                                       <span className="reg-state-dot" />
                                       {team.isActive ? 'In Standing' : 'Dormant'}
                                    </span>
                                 </td>

                                 <td className="reg-td reg-td--actions" onClick={(e) => e.stopPropagation()}>
                                    <RowActionsMenu actions={[
                                       { label: 'View Details', onClick: () => router.push(`/teams/${team._id}`) },
                                       { label: 'Edit', onClick: () => { setEditingTeam(team); setEditModalOpen(true); } },
                                       { label: 'Retire', onClick: () => { setTeamToDelete(team); setDeleteModalOpen(true); }, variant: 'danger' },
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

         <CreateTeamModal
            open={createModalOpen}
            onOpenChange={setCreateModalOpen}
            onSubmit={handleCreateTeam}
         />

         <CreateTeamModal
            open={editModalOpen}
            onOpenChange={(open) => {
               setEditModalOpen(open);
               if (!open) setEditingTeam(null);
            }}
            onSubmit={handleUpdateTeam}
            editTeam={editingTeam}
            mode="edit"
         />

         <BulkDeleteDialog
            isOpen={showBulkDeleteConfirm}
            count={selectedIds.size}
            loading={bulkDeleting}
            onCancel={() => setShowBulkDeleteConfirm(false)}
            onConfirm={handleBulkDelete}
         />

         <DeleteTeamDialog
            isOpen={deleteModalOpen}
            team={teamToDelete}
            onCancel={() => { setDeleteModalOpen(false); setTeamToDelete(null); }}
            onConfirm={confirmDeleteTeam}
         />
      </AdminLayout>
   );
}

export default function TeamsPage() {
   return (
      <Suspense fallback={<AdminLayout><div /></AdminLayout>}>
         <TeamsPageContent />
      </Suspense>
   );
}

function BulkDeleteDialog({
   isOpen, count, loading, onCancel, onConfirm,
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
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel(); };
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
            <button className="del-close" onClick={onCancel} disabled={loading} aria-label="Close"><span /><span /></button>
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
               <p className="del-kicker"><span className="del-kicker-rule" />Bulk Retirement</p>
               <h2 className="del-title">Retire <em>{count}</em> {count === 1 ? 'team' : 'teams'}?</h2>
               <p className="del-lede">
                  The selected companies shall be struck from the muster. Members
                  remain enrolled under the church and may be gathered anew.
               </p>
            </div>
            <div className="del-foot">
               <button type="button" onClick={onCancel} disabled={loading} className="del-btn del-btn--ghost">Cancel</button>
               <button type="button" onClick={onConfirm} disabled={loading} className="del-btn del-btn--danger">
                  {loading ? (
                     <><span className="del-spinner" /><span>Striking from record…</span></>
                  ) : (
                     <><span>Retire {count} {count === 1 ? 'Team' : 'Teams'}</span><span className="del-btn-arrow">&rarr;</span></>
                  )}
               </button>
            </div>
         </div>
         <DeleteDialogStyles />
      </div>,
      document.body
   );
}

function DeleteTeamDialog({
   isOpen, team, onCancel, onConfirm,
}: {
   isOpen: boolean;
   team: Team | null;
   onCancel: () => void;
   onConfirm: () => void | Promise<void>;
}) {
   const [loading, setLoading] = useState(false);
   const mounted = useMounted();

   useEffect(() => {
      if (!isOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel(); };
      window.addEventListener('keydown', onKey);
      return () => {
         document.body.style.overflow = prev;
         window.removeEventListener('keydown', onKey);
      };
   }, [isOpen, loading, onCancel]);

   if (!isOpen || !team || !mounted) return null;

   const memberCount = team.memberCount || 0;
   const handleConfirm = async () => {
      setLoading(true);
      try { await onConfirm(); } finally { setLoading(false); }
   };

   const notes = [
      { label: 'Members mustered',      hint: memberCount > 0 ? `${memberCount} of record` : 'none noted' },
      { label: 'Services rendered',     hint: 'to be reassigned' },
      { label: 'Banner &amp; profile',  hint: 'retained in archive' },
   ];

   return createPortal(
      <div className="del-overlay" onClick={() => !loading && onCancel()}>
         <div className="del-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="del-close" onClick={onCancel} disabled={loading} aria-label="Close"><span /><span /></button>
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
               <p className="del-kicker"><span className="del-kicker-rule" />Notice of Retirement</p>
               <h2 className="del-title">Retire <em>{team.name}</em> from the muster?</h2>
               <p className="del-lede">
                  The company shall be struck from the muster roll. Its record is retained
                  in the archive, and it may be re&#8209;gathered should the need arise.
               </p>
            </div>
            <div className="del-reqs">
               <div className="del-reqs-head">
                  <span className="del-reqs-num">I.</span>
                  <h3>Notes &amp; Attendant Matters</h3>
                  <span className="del-reqs-rule" />
               </div>
               <ul className="del-reqs-list">
                  {notes.map((n, i) => (
                     <li key={n.label} className="del-req neutral">
                        <span className="del-req-index">{String(i + 1).padStart(2, '0')}</span>
                        <span className="del-req-label" dangerouslySetInnerHTML={{ __html: n.label }} />
                        <span className="del-req-tail">
                           <span className="del-req-glyph">&middot;</span>
                           <span className="del-req-state">{n.hint}</span>
                        </span>
                     </li>
                  ))}
               </ul>
            </div>
            <div className="del-foot">
               <button type="button" onClick={onCancel} disabled={loading} className="del-btn del-btn--ghost">Cancel</button>
               <button type="button" onClick={handleConfirm} disabled={loading} className="del-btn del-btn--danger">
                  {loading ? (
                     <><span className="del-spinner" /><span>Striking from record…</span></>
                  ) : (
                     <><span>Retire Team</span><span className="del-btn-arrow">&rarr;</span></>
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
            --del-gold:   #a87f2b;
            --del-gold-d: #6b4f15;
            --del-rose:   #9b3b2a;
            --del-rose-d: #6e2418;
            --del-font:   var(--font-poppins), 'Poppins', system-ui, sans-serif;
         }
         .del-overlay {
            position: fixed; inset: 0;
            background: rgba(20, 18, 16, 0.55);
            backdrop-filter: blur(6px) saturate(1.1);
            -webkit-backdrop-filter: blur(6px) saturate(1.1);
            display: flex; align-items: center; justify-content: center;
            padding: 2rem 1rem; z-index: 100;
            animation: del-fade 0.4s ease-out both;
         }
         @keyframes del-fade { from { opacity: 0; } to { opacity: 1; } }
         .del-dialog {
            position: relative; width: 100%; max-width: 520px;
            max-height: calc(100vh - 4rem); overflow-y: auto;
            background: #fff; border: 1px solid rgba(168, 127, 43, 0.35);
            font-family: var(--del-font); color: var(--del-ink);
            padding: 2.4rem 2.4rem 2rem;
            box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 40px 80px -30px rgba(20, 18, 16, 0.5), 0 0 0 1px rgba(168, 127, 43, 0.12);
            animation: del-rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
         }
         .del-dialog::before { content: ''; position: absolute; inset: 8px; border: 1px solid rgba(168, 127, 43, 0.22); pointer-events: none; }
         @keyframes del-rise {
            from { opacity: 0; transform: translateY(18px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
         }
         .del-close {
            position: absolute; top: 1.1rem; right: 1.1rem;
            width: 28px; height: 28px; background: transparent;
            border: 1px solid rgba(20, 18, 16, 0.15);
            cursor: pointer;
            display: inline-flex; align-items: center; justify-content: center;
            transition: border-color 0.3s, background 0.3s, transform 0.3s;
            z-index: 2;
         }
         .del-close span { position: absolute; width: 12px; height: 1px; background: var(--del-ink-2); transition: background 0.3s; }
         .del-close span:first-child  { transform: rotate(45deg); }
         .del-close span:last-child   { transform: rotate(-45deg); }
         .del-close:hover:not(:disabled) {
            border-color: var(--del-rose);
            background: rgba(155, 59, 42, 0.06);
            transform: rotate(90deg);
         }
         .del-close:hover:not(:disabled) span { background: var(--del-rose); }
         .del-close:disabled { opacity: 0.4; cursor: not-allowed; }
         .del-head { text-align: center; padding: 0.3rem 0 1.6rem; }
         .del-seal { position: relative; width: 72px; height: 72px; margin: 0 auto 1.5rem; }
         .del-seal-ring {
            position: absolute; inset: -6px;
            border: 1px solid var(--del-rose); border-radius: 50%;
            opacity: 0.6;
            animation: del-rotate 18s linear infinite;
         }
         .del-seal-ring--2 {
            inset: -12px; border-style: dotted;
            border-color: var(--del-rose-d); opacity: 0.35;
            animation-duration: 36s; animation-direction: reverse;
         }
         .del-seal-inner {
            width: 100%; height: 100%;
            border: 1px solid var(--del-rose); border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: var(--del-rose);
            background: radial-gradient(circle, rgba(155, 59, 42, 0.1), transparent 65%), linear-gradient(180deg, #fff, #fbf7ef);
            box-shadow: 0 0 0 3px #fff, 0 0 0 4px rgba(155, 59, 42, 0.25);
         }
         @keyframes del-rotate { to { transform: rotate(360deg); } }
         .del-kicker {
            display: inline-flex; align-items: center; gap: 0.8rem;
            font-size: 0.6rem; font-weight: 500; letter-spacing: 0.3em;
            text-transform: uppercase; color: var(--del-rose); margin: 0 0 1rem;
         }
         .del-kicker-rule { display: inline-block; width: 28px; height: 1px; background: var(--del-rose); }
         .del-title {
            font-size: clamp(1.5rem, 3vw, 1.85rem);
            font-weight: 300; line-height: 1.25; letter-spacing: -0.015em;
            color: var(--del-ink); margin: 0 0 1rem;
         }
         .del-title em { font-style: italic; font-weight: 400; color: var(--del-gold-d); }
         .del-lede {
            font-size: 0.92rem; line-height: 1.6; color: var(--del-ink-2);
            font-weight: 300; max-width: 42ch; margin: 0 auto;
         }
         .del-reqs { border-top: 1px solid rgba(20, 18, 16, 0.1); padding-top: 1.4rem; margin-bottom: 1.8rem; }
         .del-reqs-head { display: flex; align-items: baseline; gap: 0.8rem; margin-bottom: 1rem; }
         .del-reqs-num { font-size: 0.9rem; font-weight: 400; font-style: italic; color: var(--del-gold); }
         .del-reqs-head h3 {
            font-size: 0.68rem; font-weight: 500; letter-spacing: 0.26em;
            text-transform: uppercase; color: var(--del-ink); margin: 0;
         }
         .del-reqs-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--del-gold-d), transparent); }
         .del-reqs-list { list-style: none; margin: 0; padding: 0; }
         .del-req {
            display: grid; grid-template-columns: 28px 1fr auto;
            align-items: baseline; gap: 0.8rem; padding: 0.7rem 0;
            border-bottom: 1px dotted rgba(20, 18, 16, 0.14);
         }
         .del-req:last-child { border-bottom: none; }
         .del-req-index {
            font-size: 0.65rem; letter-spacing: 0.1em; color: var(--del-ink-3);
            font-feature-settings: "tnum" 1, "lnum" 1;
         }
         .del-req-label { font-size: 0.92rem; color: var(--del-ink); font-weight: 400; }
         .del-req-tail { display: inline-flex; align-items: baseline; gap: 0.8rem; }
         .del-req-glyph { color: var(--del-ink-3); }
         .del-req-state {
            font-size: 0.6rem; letter-spacing: 0.22em; text-transform: uppercase;
            color: var(--del-ink-3); font-weight: 500;
         }
         .del-foot {
            display: flex; justify-content: flex-end; gap: 0.8rem;
            padding-top: 1.2rem; border-top: 1px solid rgba(20, 18, 16, 0.08);
         }
         .del-btn {
            display: inline-flex; align-items: center; gap: 0.6rem;
            padding: 0.8rem 1.5rem; font-family: inherit;
            font-size: 0.7rem; font-weight: 500; letter-spacing: 0.22em;
            text-transform: uppercase; cursor: pointer; background: transparent;
            border: 1px solid transparent; position: relative; overflow: hidden;
            transition: color 0.3s, letter-spacing 0.4s, border-color 0.3s;
         }
         .del-btn:disabled { cursor: not-allowed; opacity: 0.45; }
         .del-btn--ghost { color: var(--del-ink-2); border-color: rgba(20, 18, 16, 0.2); }
         .del-btn--ghost:hover:not(:disabled) {
            color: var(--del-ink); border-color: var(--del-ink);
            letter-spacing: 0.26em;
         }
         .del-btn--danger { color: var(--del-rose); border-color: var(--del-rose); }
         .del-btn--danger::before {
            content: ''; position: absolute; inset: 0;
            background: var(--del-rose); transform: translateY(100%);
            transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 0;
         }
         .del-btn--danger > * { position: relative; z-index: 1; }
         .del-btn--danger:hover:not(:disabled) { color: #fff; letter-spacing: 0.28em; }
         .del-btn--danger:hover:not(:disabled)::before { transform: translateY(0); }
         .del-btn-arrow { display: inline-block; transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
         .del-btn--danger:hover:not(:disabled) .del-btn-arrow { transform: translateX(4px); }
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
         .reg-decor { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
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
         .reg-root > *:not(.reg-decor) { position: relative; z-index: 1; }

         /* MASTHEAD */
         .reg-masthead {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 3rem; align-items: end;
            padding-bottom: 2.5rem;
            border-bottom: 1px solid rgba(20, 18, 16, 0.12);
            animation: reg-fade 1.2s ease-out both;
         }
         @media (max-width: 820px) { .reg-masthead { grid-template-columns: 1fr; gap: 2rem; } }
         @keyframes reg-fade {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
         }
         .reg-kicker {
            display: flex; align-items: center; gap: 0.9rem;
            font-size: 0.68rem; font-weight: 500; letter-spacing: 0.3em;
            text-transform: uppercase; color: var(--reg-gold); margin: 0 0 1.6rem;
         }
         .reg-kicker-rule { display: inline-block; width: 36px; height: 1px; background: var(--reg-gold); }
         .reg-title {
            font-family: var(--reg-font); font-weight: 300;
            font-size: clamp(3rem, 6.5vw, 5.6rem);
            line-height: 0.95; letter-spacing: -0.035em;
            margin: 0 0 1.6rem; color: var(--reg-ink);
         }
         .reg-word {
            display: inline-block; opacity: 0;
            animation: reg-rise 1.3s cubic-bezier(0.2, 0.8, 0.2, 1) both;
         }
         .reg-word--italic { font-style: italic; font-weight: 400; color: var(--reg-gold-l); }
         @keyframes reg-rise {
            from { opacity: 0; transform: translateY(28px); filter: blur(5px); }
            to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
         }
         .reg-subtitle {
            font-size: 1.05rem; font-weight: 300; line-height: 1.6;
            color: var(--reg-ink-2); max-width: 54ch; margin: 0;
            animation: reg-fade 1.4s ease-out 0.5s both;
         }
         .reg-filter-chip {
            display: inline-flex; align-items: center; gap: 0.7rem;
            margin: 1.3rem 0 0;
            padding: 0.5rem 0.6rem 0.5rem 0.9rem;
            border: 1px solid rgba(168, 127, 43, 0.35);
            background: linear-gradient(180deg, rgba(249, 245, 236, 0.8), rgba(255, 255, 255, 0.6));
            font-size: 0.72rem;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: var(--reg-ink-2);
            font-weight: 500;
            animation: reg-fade 0.5s ease-out both;
         }
         .reg-filter-chip em {
            font-family: inherit;
            font-style: italic;
            font-weight: 400;
            letter-spacing: 0.02em;
            text-transform: none;
            color: var(--reg-gold-d);
            font-size: 0.9rem;
         }
         .reg-filter-clear {
            background: transparent; border: none; font: inherit;
            color: var(--reg-gold); cursor: pointer;
            font-size: 1.1rem; line-height: 1;
            padding: 0 0.2rem;
            transition: color 0.3s;
         }
         .reg-filter-clear:hover { color: var(--reg-rose); }

         .reg-mast-right { animation: reg-fade 1.4s ease-out 0.3s both; }
         .reg-counter {
            border: 1px solid rgba(168, 127, 43, 0.3);
            padding: 1.8rem 2rem; text-align: right; min-width: 240px;
            position: relative;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(249, 245, 236, 0.3));
         }
         .reg-counter::before {
            content: ''; position: absolute; inset: 5px;
            border: 1px solid rgba(168, 127, 43, 0.12); pointer-events: none;
         }
         .reg-counter-num {
            font-size: clamp(3rem, 5vw, 4.2rem); font-weight: 200; line-height: 1;
            color: var(--reg-ink);
            font-feature-settings: "lnum" 1, "tnum" 1; letter-spacing: -0.03em;
         }
         .reg-counter-label {
            margin-top: 0.5rem; font-size: 0.62rem; letter-spacing: 0.28em;
            text-transform: uppercase; color: var(--reg-gold); font-weight: 500;
         }
         .reg-counter-rule { width: 32px; height: 1px; background: var(--reg-gold-d); margin: 0.9rem 0 0.9rem auto; }
         .reg-counter-sub { font-size: 0.8rem; color: var(--reg-ink-2); font-style: italic; font-weight: 300; }
         .reg-counter-sub span { font-style: normal; font-weight: 500; color: var(--reg-gold-l); }

         /* CONSOLE */
         .reg-console {
            display: flex; align-items: center; justify-content: space-between;
            gap: 2rem; flex-wrap: wrap;
            padding: 2rem 0 2.5rem;
            animation: reg-fade 1.4s ease-out 0.7s both;
         }
         .reg-console-left { display: flex; align-items: center; gap: 2rem; flex: 1; flex-wrap: wrap; }
         .reg-search { position: relative; min-width: 320px; flex: 1; max-width: 480px; }
         .reg-search-icon { position: absolute; left: 0; top: 50%; transform: translateY(-50%); color: var(--reg-gold); pointer-events: none; }
         .reg-search-input {
            width: 100%; background: transparent; border: none; outline: none;
            padding: 0.9rem 0 0.9rem 1.8rem; font-family: inherit;
            font-size: 0.95rem; font-weight: 300; color: var(--reg-ink);
            letter-spacing: 0.01em;
         }
         .reg-search-input::placeholder { color: var(--reg-ink-3); font-style: italic; font-weight: 300; }
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

         /* CHECK */
         .reg-th--check, .reg-td--check { width: 40px; padding-left: 0.8rem; padding-right: 0; }
         .reg-check { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; }
         .reg-check input { position: absolute; opacity: 0; pointer-events: none; }
         .reg-check-box {
            width: 18px; height: 18px;
            border: 1px solid rgba(20, 18, 16, 0.3);
            display: inline-flex; align-items: center; justify-content: center;
            transition: border-color 0.3s, background 0.3s;
         }
         .reg-check-box svg {
            width: 12px; height: 12px;
            opacity: 0; transform: scale(0.5);
            transition: opacity 0.2s, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
            color: #fff;
         }
         .reg-check input:checked + .reg-check-box {
            background: var(--reg-gold); border-color: var(--reg-gold);
         }
         .reg-check input:checked + .reg-check-box svg { opacity: 1; transform: scale(1); }
         .reg-check-box:hover { border-color: var(--reg-gold); }

         /* BULK */
         .reg-bulk {
            display: flex; align-items: center; justify-content: space-between;
            gap: 1rem; padding: 0.9rem 1.2rem; margin-bottom: 0.5rem;
            border: 1px solid rgba(168, 127, 43, 0.35);
            background: linear-gradient(180deg, rgba(249, 245, 236, 0.8), rgba(255, 255, 255, 0.6));
            animation: reg-fade 0.4s ease-out both;
         }
         .reg-bulk-left { display: flex; align-items: center; gap: 0.8rem; }
         .reg-bulk-count {
            font-size: 1.3rem; font-weight: 300; color: var(--reg-gold-d);
            font-feature-settings: "lnum" 1, "tnum" 1; line-height: 1;
         }
         .reg-bulk-label {
            font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase;
            color: var(--reg-ink-2); font-weight: 500;
         }
         .reg-bulk-clear {
            background: none; border: none; font-family: inherit;
            font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase;
            color: var(--reg-gold); font-weight: 500; cursor: pointer;
            padding: 0.3rem 0.6rem; border-left: 1px solid rgba(20, 18, 16, 0.15);
            transition: color 0.3s;
         }
         .reg-bulk-clear:hover { color: var(--reg-ink); }
         .reg-bulk-delete {
            display: inline-flex; align-items: center; gap: 0.6rem;
            background: transparent; color: var(--reg-rose);
            border: 1px solid var(--reg-rose);
            padding: 0.65rem 1.3rem; font-family: inherit;
            font-size: 0.68rem; font-weight: 500; letter-spacing: 0.2em;
            text-transform: uppercase; cursor: pointer; position: relative;
            overflow: hidden;
            transition: color 0.35s, letter-spacing 0.4s;
         }
         .reg-bulk-delete::before {
            content: ''; position: absolute; inset: 0;
            background: var(--reg-rose); transform: translateY(100%);
            transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 0;
         }
         .reg-bulk-delete > * { position: relative; z-index: 1; }
         .reg-bulk-delete:hover { color: #fff; letter-spacing: 0.26em; }
         .reg-bulk-delete:hover::before { transform: translateY(0); }

         /* TOGGLE */
         .reg-toggle { display: inline-flex; align-items: center; gap: 0.7rem; cursor: pointer; user-select: none; }
         .reg-toggle input { position: absolute; opacity: 0; pointer-events: none; }
         .reg-toggle-track {
            position: relative; width: 34px; height: 18px;
            border: 1px solid var(--reg-ink-3);
            border-radius: 999px; background: transparent;
            transition: border-color 0.3s, background 0.3s;
         }
         .reg-toggle-thumb {
            position: absolute; top: 1px; left: 1px;
            width: 14px; height: 14px; border-radius: 50%;
            background: var(--reg-ink-3);
            transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.3s;
         }
         .reg-toggle input:checked + .reg-toggle-track {
            border-color: var(--reg-gold); background: rgba(168, 127, 43, 0.08);
         }
         .reg-toggle input:checked + .reg-toggle-track .reg-toggle-thumb {
            transform: translateX(16px); background: var(--reg-gold);
         }
         .reg-toggle-label {
            font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase;
            color: var(--reg-ink-2); font-weight: 500;
         }

         /* BUTTON */
         .reg-btn {
            display: inline-flex; align-items: center; gap: 0.7rem;
            background: transparent; color: var(--reg-gold-l);
            border: 1px solid var(--reg-gold);
            padding: 0.85rem 1.6rem; font-family: inherit;
            font-size: 0.72rem; font-weight: 500; letter-spacing: 0.22em;
            text-transform: uppercase; cursor: pointer; position: relative;
            overflow: hidden;
            transition: color 0.35s, letter-spacing 0.4s;
         }
         .reg-btn::before {
            content: ''; position: absolute; inset: 0;
            background: var(--reg-gold); transform: translateY(100%);
            transition: transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 0;
         }
         .reg-btn > * { position: relative; z-index: 1; }
         .reg-btn:hover { color: #fff; letter-spacing: 0.28em; }
         .reg-btn:hover::before { transform: translateY(0); }
         .reg-btn-plus { font-size: 1.1rem; font-weight: 300; line-height: 0; }

         /* TABLE */
         .reg-table-wrap { overflow: visible; margin: 0 -0.5rem; padding: 0 0.5rem; }
         .reg-table {
            width: 100%; border-collapse: separate; border-spacing: 0;
            font-family: var(--reg-font); min-width: 1000px;
         }
         .reg-th {
            text-align: left; padding: 1.1rem 1.2rem;
            font-size: 0.6rem; font-weight: 500; letter-spacing: 0.26em;
            text-transform: uppercase; color: var(--reg-gold);
            border-top: 1px solid var(--reg-ink);
            border-bottom: 1px solid var(--reg-ink);
            background: transparent; white-space: nowrap;
         }
         .reg-th--no      { width: 56px; padding-left: 0.6rem; }
         .reg-th--num     { text-align: right; }
         .reg-th--actions { width: 48px; }
         .reg-tr {
            cursor: pointer; opacity: 0;
            animation: reg-row-in 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) both;
            transition: background 0.35s; position: relative;
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
            font-size: 0.92rem; color: var(--reg-ink); font-weight: 300;
            transition: border-color 0.3s;
         }
         .reg-tr:last-child .reg-td { border-bottom: 1px solid var(--reg-ink); }
         .reg-tr:hover .reg-td { border-bottom-color: rgba(168, 127, 43, 0.4); }
         .reg-td--no { padding-left: 0.6rem; width: 56px; }
         .reg-no {
            font-size: 0.72rem; font-weight: 400; letter-spacing: 0.1em;
            color: var(--reg-ink-3);
            font-feature-settings: "lnum" 1, "tnum" 1;
            transition: color 0.3s;
         }
         .reg-tr:hover .reg-no { color: var(--reg-gold); }

         .reg-td--union { min-width: 260px; }
         .reg-td-union { display: flex; align-items: center; gap: 1rem; }
         .reg-avatar { position: relative; }
         .reg-avatar--sm { width: 44px; height: 44px; flex-shrink: 0; }
         .reg-avatar--sm .reg-avatar-ring {
            inset: -3px; border: 1px solid var(--reg-gold);
            border-radius: 50%; position: absolute;
            opacity: 0.5; transition: opacity 0.4s, transform 0.6s;
         }
         .reg-avatar--sm .reg-avatar-inner {
            position: relative; width: 100%; height: 100%;
            border-radius: 50%; overflow: hidden;
            border: 1px solid var(--reg-gold); background: var(--reg-bed);
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
            font-size: 1rem; font-weight: 300; font-style: italic;
            color: var(--reg-gold-l);
            background:
               radial-gradient(circle at 40% 35%, rgba(168, 127, 43, 0.18), transparent 65%),
               linear-gradient(180deg, #fbf6ea, #efe5ce);
         }
         .reg-tr:hover .reg-avatar--sm .reg-avatar-ring { opacity: 1; transform: rotate(22deg); }
         .reg-tr:hover .reg-avatar--sm .reg-avatar-img {
            filter: sepia(0.05) saturate(1); transform: scale(1.06);
         }

         .reg-td-union-text { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
         .reg-td-name {
            font-size: 1rem; font-weight: 500; letter-spacing: -0.005em;
            color: var(--reg-ink); transition: color 0.3s;
         }
         .reg-tr:hover .reg-td-name { color: var(--reg-gold-d); }
         .reg-td-path {
            font-size: 0.7rem; color: var(--reg-ink-3); font-weight: 300;
            letter-spacing: 0.04em; font-style: italic;
         }

         /* KIND */
         .reg-td--kind { width: 160px; }
         .reg-kind-chip {
            display: inline-block;
            font-size: 0.6rem; letter-spacing: 0.22em; text-transform: uppercase;
            font-weight: 500; color: var(--reg-gold-d);
            border: 1px solid rgba(168, 127, 43, 0.4);
            background: rgba(168, 127, 43, 0.06);
            padding: 0.3rem 0.7rem;
         }

         /* PARENT */
         .reg-td--parent { min-width: 180px; }
         .reg-td-parent {
            font-size: 0.9rem; font-weight: 400;
            color: var(--reg-ink-2); font-style: italic;
            transition: color 0.3s;
         }
         .reg-tr:hover .reg-td-parent { color: var(--reg-gold-d); }

         /* LEADER */
         .reg-td--leader { min-width: 160px; }
         .reg-td-leader { color: var(--reg-ink); font-weight: 400; font-size: 0.9rem; }

         .reg-dash { color: var(--reg-ink-3); font-style: italic; }

         /* NUMBER */
         .reg-td--num { text-align: right; width: 110px; }
         .reg-td-num {
            font-size: 1.85rem; font-weight: 200; line-height: 1;
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
            font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase;
            color: var(--reg-ink-3); font-weight: 500;
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

         .reg-td--actions { width: 48px; text-align: right; padding-right: 0.4rem; }

         @media (max-width: 760px) { .reg-table-wrap { margin: 0 -1rem; padding: 0 1rem; } }

         /* SKELETON */
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
         .reg-skel-avatar--sm { width: 44px; height: 44px; }
         .reg-skel-avatar {
            border-radius: 50%; flex-shrink: 0;
            background: linear-gradient(90deg, #f2ecdf 0%, #faf5e8 50%, #f2ecdf 100%);
            background-size: 200% 100%;
            animation: reg-shimmer 2s ease-in-out infinite;
         }
         .reg-skel-line {
            height: 12px; border-radius: 2px;
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
         .reg-empty { text-align: center; padding: 5rem 1rem; max-width: 500px; margin: 0 auto; }
         .reg-empty-seal {
            width: 96px; height: 96px;
            border: 1px solid var(--reg-gold);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.8rem; position: relative;
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
            font-size: 1.7rem; font-weight: 300; font-style: italic;
            color: var(--reg-ink); margin: 0 0 0.8rem;
         }
         .reg-empty-body { color: var(--reg-ink-2); font-weight: 300; line-height: 1.6; }

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
