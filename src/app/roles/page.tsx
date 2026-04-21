'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import RoleModal from '@/components/RoleModal';
import RegisterStyles from '@/components/register/RegisterStyles';
import DeleteDialogStyles from '@/components/register/DeleteDialogStyles';
import { useMounted } from '@/hooks/useMounted';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { rbacService } from '@/lib/rbac';
import { Role } from '@/types/rbac';

type LevelKey = 'union' | 'conference' | 'church' | 'unknown';

const LEVEL_ORDER: Record<string, number> = {
   union: 0,
   conference: 1,
   church: 2,
};

function levelLabel(level?: string): string {
   if (!level) return 'Unranked';
   return level.charAt(0).toUpperCase() + level.slice(1);
}

function getLevelKey(level?: string): LevelKey {
   if (level === 'union' || level === 'conference' || level === 'church') return level;
   return 'unknown';
}

export default function Roles() {
   const router = useRouter();
   const toast = useToast();
   const { user, hasPermission } = usePermissions();
   const isSuperAdmin = hasPermission('*');

   const [roles, setRoles] = useState<Role[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [levelFilter, setLevelFilter] = useState<'all' | 'union' | 'conference' | 'church'>('all');
   const [standingFilter, setStandingFilter] = useState<'all' | 'active' | 'inactive'>('all');
   const [selectedRole, setSelectedRole] = useState<Role | null>(null);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [showViewModal, setShowViewModal] = useState(false);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [bulkDeleting, setBulkDeleting] = useState(false);
   const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

   const getUserHierarchyLevel = useCallback((): number => {
      if (isSuperAdmin) return 0;
      let highest = 2;
      if (user?.unionAssignments && user.unionAssignments.length > 0) highest = Math.min(highest, 0);
      if (user?.conferenceAssignments && user.conferenceAssignments.length > 0) highest = Math.min(highest, 1);
      if (user?.churchAssignments && user.churchAssignments.length > 0) highest = Math.min(highest, 2);
      return highest;
   }, [isSuperAdmin, user]);

   const fetchRoles = useCallback(async () => {
      try {
         setLoading(true);
         const data = await rbacService.getRoles(true);
         setRoles(data);
         setSelectedIds(new Set());
      } catch (error) {
         console.error('Error fetching roles:', error);
         toast.error('Failed to load offices', error instanceof Error ? error.message : 'An unexpected error occurred');
         setRoles([]);
      } finally {
         setLoading(false);
      }
   }, [toast]);

   useEffect(() => { fetchRoles(); }, [fetchRoles]);

   const handleDeleteRole = async () => {
      if (!roleToDelete) return;
      try {
         await rbacService.deleteRole(roleToDelete._id);
         setRoles((prev) => prev.filter((r) => r._id !== roleToDelete._id));
         toast.success('Office dissolved', `${roleToDelete.displayName || roleToDelete.name} has been struck from the register.`);
      } catch (error) {
         toast.error('Failed to dissolve office', error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
         setShowDeleteConfirm(false);
         setRoleToDelete(null);
      }
   };

   const handleRoleSaved = (savedRole: Role, isEdit: boolean) => {
      if (isEdit) {
         setRoles((prev) => prev.map((r) => (r._id === savedRole._id ? savedRole : r)));
         toast.success('Office updated', `${savedRole.displayName || savedRole.name} has been amended.`);
      } else {
         setRoles((prev) => [...prev, savedRole]);
         toast.success('Office established', `${savedRole.displayName || savedRole.name} has been added to the register.`);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setShowViewModal(false);
      setSelectedRole(null);
   };

   const toggleSelect = (id: string) => {
      setSelectedIds((prev) => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id); else next.add(id);
         return next;
      });
   };

   const toggleSelectAll = () => {
      if (selectedIds.size === filteredRoles.length) {
         setSelectedIds(new Set());
      } else {
         setSelectedIds(new Set(filteredRoles.filter((r) => !r.isSystem).map((r) => r._id)));
      }
   };

   const handleBulkDelete = async () => {
      setBulkDeleting(true);
      const ids = [...selectedIds];
      const results = { success: 0, failed: 0, errors: [] as string[] };
      for (const id of ids) {
         try {
            await rbacService.deleteRole(id);
            results.success++;
         } catch (err) {
            results.failed++;
            results.errors.push(err instanceof Error ? err.message : `Failed ${id}`);
         }
      }
      if (results.success > 0) toast.success(`${results.success} office(s) dissolved.`);
      if (results.failed > 0) toast.error(`${results.failed} could not be dissolved. ${results.errors[0] || ''}`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setBulkDeleting(false);
      fetchRoles();
   };

   const filteredRoles = roles.filter((r) => {
      const userLevel = getUserHierarchyLevel();
      const roleLevel = LEVEL_ORDER[r.level || 'church'] ?? 2;
      if (roleLevel < userLevel) return false;

      if (levelFilter !== 'all' && r.level !== levelFilter) return false;

      const isActive = r.isActive !== false;
      if (standingFilter === 'active' && !isActive) return false;
      if (standingFilter === 'inactive' && isActive) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
         (r.displayName || '').toLowerCase().includes(q) ||
         (r.name || '').toLowerCase().includes(q) ||
         (r.description || '').toLowerCase().includes(q) ||
         (r.level || '').toLowerCase().includes(q)
      );
   });

   const activeCount = roles.filter((r) => r.isActive !== false).length;
   const systemCount = roles.filter((r) => r.isSystem).length;

   return (
      <AdminLayout title="Roles & Permissions" description="Manage system roles and their permissions" hideTitle={true} hideHeader={true}>
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
                     Seventh&#8209;day Adventist Church&nbsp;&middot;&nbsp;Offices
                  </p>
                  <h1 className="reg-title">
                     <span className="reg-word" style={{ animationDelay: '0.15s' }}>The</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.24s' }}>Register</span>
                     <br />
                     <span className="reg-word" style={{ animationDelay: '0.33s' }}>of</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.42s' }}>Offices</span>
                  </h1>
                  <p className="reg-subtitle">
                     The ordained offices of the church&apos;s administration &mdash;
                     their levels, mandates, and appointed permissions set down in order.
                  </p>
               </div>

               <aside className="reg-mast-right">
                  <div className="reg-counter">
                     <div className="reg-counter-num">{String(filteredRoles.length).padStart(2, '0')}</div>
                     <div className="reg-counter-label">Offices on Record</div>
                     <div className="reg-counter-rule" />
                     <div className="reg-counter-sub">
                        <span>{activeCount}</span> active
                        {systemCount > 0 && <> &middot; <span>{systemCount}</span> system</>}
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
                        placeholder="Search by name, level, or mandate…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="reg-search-input"
                     />
                     <span className="reg-search-underline" />
                  </div>

                  <div className="reg-filter">
                     <label className="reg-filter-label" htmlFor="filter-level">Level</label>
                     <select
                        id="filter-level"
                        className="reg-filter-select"
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value as typeof levelFilter)}
                     >
                        <option value="all">All</option>
                        <option value="union">Union</option>
                        <option value="conference">Conference</option>
                        <option value="church">Church</option>
                     </select>
                  </div>

                  <div className="reg-filter">
                     <label className="reg-filter-label" htmlFor="filter-standing">Standing</label>
                     <select
                        id="filter-standing"
                        className="reg-filter-select"
                        value={standingFilter}
                        onChange={(e) => setStandingFilter(e.target.value as typeof standingFilter)}
                     >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                     </select>
                  </div>
               </div>

               <PermissionGate permission="roles.create">
                  <button onClick={() => setShowCreateModal(true)} className="reg-btn">
                     <span className="reg-btn-plus">+</span>
                     <span>Establish New Office</span>
                  </button>
               </PermissionGate>
            </div>

            {/* BULK */}
            {selectedIds.size > 0 && (
               <div className="reg-bulk">
                  <div className="reg-bulk-left">
                     <span className="reg-bulk-count">{selectedIds.size}</span>
                     <span className="reg-bulk-label">{selectedIds.size === 1 ? 'office' : 'offices'} selected</span>
                     <button className="reg-bulk-clear" onClick={() => setSelectedIds(new Set())}>Clear</button>
                  </div>
                  <PermissionGate permission="roles.delete">
                     <button className="reg-bulk-delete" onClick={() => setShowBulkDeleteConfirm(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
                           <path d="M10 11v6M14 11v6" />
                        </svg>
                        <span>Dissolve Selected</span>
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
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '14%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '22%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '18%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '10%' }} />
                  </div>
                  {[0, 1, 2, 3, 4].map((i) => (
                     <div key={i} className="reg-skel-row" style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="reg-skel-avatar reg-skel-avatar--round" />
                        <div className="reg-skel-line" style={{ flex: 1.6 }} />
                        <div className="reg-skel-line" style={{ flex: 0.9 }} />
                        <div className="reg-skel-line" style={{ flex: 1.4 }} />
                        <div className="reg-skel-line" style={{ flex: 1.1 }} />
                        <div className="reg-skel-line" style={{ flex: 0.6 }} />
                     </div>
                  ))}
               </div>
            ) : filteredRoles.length === 0 ? (
               <div className="reg-empty">
                  <div className="reg-empty-seal">
                     <span className="reg-empty-glyph">&#10022;</span>
                  </div>
                  <h3 className="reg-empty-title">
                     {searchQuery || levelFilter !== 'all' || standingFilter !== 'all'
                        ? 'No office meets your search.'
                        : 'The register awaits its first office.'}
                  </h3>
                  <p className="reg-empty-body">
                     {searchQuery || levelFilter !== 'all' || standingFilter !== 'all'
                        ? 'Amend your query, or broaden the filters to include all levels and standings.'
                        : 'Begin by establishing the first office upon the register.'}
                  </p>
               </div>
            ) : (
               <div className="reg-table-wrap">
                  <table className="reg-table">
                     <thead>
                        <tr>
                           <th className="reg-th reg-th--check" onClick={(e) => e.stopPropagation()}>
                              <label className="reg-check" onClick={(e) => { e.preventDefault(); toggleSelectAll(); }}>
                                 <input type="checkbox" checked={filteredRoles.length > 0 && selectedIds.size === filteredRoles.filter((r) => !r.isSystem).length && selectedIds.size > 0} readOnly />
                                 <span className="reg-check-box">
                                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                       <polyline points="2.5 6 5 8.5 9.5 3.5" />
                                    </svg>
                                 </span>
                              </label>
                           </th>
                           <th className="reg-th reg-th--no">№</th>
                           <th className="reg-th">Office</th>
                           <th className="reg-th">Level</th>
                           <th className="reg-th">Mandate</th>
                           <th className="reg-th">Permissions</th>
                           <th className="reg-th">Constituted</th>
                           <th className="reg-th">Standing</th>
                           <th className="reg-th reg-th--actions" aria-label="Actions" />
                        </tr>
                     </thead>
                     <tbody>
                        {filteredRoles.map((role, i) => {
                           const isActive = role.isActive !== false;
                           const standing = isActive ? 'active' : 'inactive';
                           const standingLabel = isActive ? 'Active' : 'Inactive';
                           const levelKey = getLevelKey(role.level);
                           const permissions = role.permissions || [];
                           const created = role.createdAt ? new Date(role.createdAt) : null;
                           const yearLabel = created ? created.toLocaleDateString('en-AU', { year: 'numeric' }) : '';
                           const dateLabel = created ? created.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—';
                           const goto = () => {
                              if (showDeleteConfirm || showEditModal || showCreateModal || showViewModal || showBulkDeleteConfirm) return;
                              if (selectedIds.size > 0) {
                                 if (!role.isSystem) toggleSelect(role._id);
                                 return;
                              }
                              setSelectedRole(role);
                              setShowViewModal(true);
                           };
                           return (
                              <tr key={role._id} className="reg-tr" style={{ animationDelay: `${0.05 + i * 0.04}s` }} onClick={goto}>
                                 <td className="reg-td reg-td--check" onClick={(e) => e.stopPropagation()}>
                                    <label className="reg-check" onClick={(e) => { e.preventDefault(); if (!role.isSystem) toggleSelect(role._id); }} style={role.isSystem ? { opacity: 0.35, cursor: 'not-allowed' } : undefined} title={role.isSystem ? 'System offices cannot be dissolved' : undefined}>
                                       <input type="checkbox" checked={selectedIds.has(role._id)} disabled={role.isSystem} readOnly />
                                       <span className="reg-check-box">
                                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                             <polyline points="2.5 6 5 8.5 9.5 3.5" />
                                          </svg>
                                       </span>
                                    </label>
                                 </td>
                                 <td className="reg-td reg-td--no"><span className="reg-no">{String(i + 1).padStart(2, '0')}</span></td>

                                 <td className="reg-td reg-td--union">
                                    <div className="reg-td-union">
                                       <div className="reg-seal-block" aria-hidden>
                                          <span className="reg-seal-glyph">&#10022;</span>
                                       </div>
                                       <div className="reg-td-union-text">
                                          <div className="reg-td-name">
                                             <button
                                                className="reg-td-name-btn"
                                                onClick={(e) => { e.stopPropagation(); router.push(`/roles/${role._id}/permissions`); }}
                                             >
                                                {role.displayName || role.name || 'Unnamed Office'}
                                             </button>
                                             {role.isSystem && (
                                                <span className="reg-sys-badge">
                                                   <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                                   System
                                                </span>
                                             )}
                                          </div>
                                          {role.name && role.name !== role.displayName && (
                                             <div className="reg-td-path">{role.name}</div>
                                          )}
                                       </div>
                                    </div>
                                 </td>

                                 <td className="reg-td reg-td--state">
                                    <span className={`reg-state ${levelKey}`}>
                                       <span className="reg-state-dot" />
                                       {levelLabel(role.level)}
                                    </span>
                                 </td>

                                 <td className="reg-td reg-td--parent">
                                    {role.description ? (
                                       <div className="reg-td-path" style={{ maxWidth: '32ch', fontStyle: 'normal', color: 'var(--reg-ink)' }} title={role.description}>
                                          {role.description}
                                       </div>
                                    ) : (
                                       <span className="reg-dash">&mdash;</span>
                                    )}
                                 </td>

                                 <td className="reg-td">
                                    {permissions.length > 0 ? (
                                       <div className="reg-chips">
                                          {permissions.slice(0, 3).map((p, idx) => (
                                             <span key={idx} className="reg-chip">{p}</span>
                                          ))}
                                          {permissions.length > 3 && (
                                             <span className="reg-chip reg-chip--muted">+{permissions.length - 3}</span>
                                          )}
                                       </div>
                                    ) : (
                                       <span className="reg-chip reg-chip--muted">none</span>
                                    )}
                                 </td>

                                 <td className="reg-td reg-td--when">
                                    {created ? (
                                       <>
                                          <div className="reg-td-when-year">{yearLabel}</div>
                                          <div className="reg-td-when-time">{dateLabel}</div>
                                       </>
                                    ) : (
                                       <span className="reg-dash">&mdash;</span>
                                    )}
                                 </td>

                                 <td className="reg-td reg-td--state">
                                    <span className={`reg-state ${standing}`}>
                                       <span className="reg-state-dot" />
                                       {standingLabel}
                                    </span>
                                 </td>

                                 <td className="reg-td reg-td--actions" onClick={(e) => e.stopPropagation()}>
                                    <RowActionsMenu actions={[
                                       { label: 'View Details', onClick: () => { setSelectedRole(role); setShowViewModal(true); } },
                                       { label: 'Manage Permissions', onClick: () => router.push(`/roles/${role._id}/permissions`) },
                                       { label: 'Edit', onClick: () => { setSelectedRole(role); setShowEditModal(true); }, disabled: role.isSystem, disabledReason: 'System offices cannot be edited' },
                                       { label: 'Dissolve', onClick: () => { setRoleToDelete(role); setShowDeleteConfirm(true); }, variant: 'danger', disabled: role.isSystem, disabledReason: 'System offices cannot be dissolved' },
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

         <BulkDissolveDialog
            isOpen={showBulkDeleteConfirm}
            count={selectedIds.size}
            loading={bulkDeleting}
            onCancel={() => setShowBulkDeleteConfirm(false)}
            onConfirm={handleBulkDelete}
         />

         <DissolveRoleDialog
            isOpen={showDeleteConfirm}
            role={roleToDelete}
            onCancel={() => { setShowDeleteConfirm(false); setRoleToDelete(null); }}
            onConfirm={handleDeleteRole}
         />
      </AdminLayout>
   );
}

function BulkDissolveDialog({
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
      return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
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
               <p className="del-kicker"><span className="del-kicker-rule" />Bulk Dissolution</p>
               <h2 className="del-title">Dissolve <em>{count}</em> {count === 1 ? 'office' : 'offices'}?</h2>
               <p className="del-lede">The selected offices shall be struck from the register. Their mandates are retained in the archive.</p>
            </div>
            <div className="del-foot">
               <button type="button" onClick={onCancel} disabled={loading} className="del-btn del-btn--ghost">Cancel</button>
               <button type="button" onClick={onConfirm} disabled={loading} className="del-btn del-btn--danger">
                  {loading ? (<><span className="del-spinner" /><span>Striking from register…</span></>) : (<><span>Dissolve {count} {count === 1 ? 'Office' : 'Offices'}</span><span className="del-btn-arrow">&rarr;</span></>)}
               </button>
            </div>
         </div>
         <DeleteDialogStyles />
      </div>,
      document.body
   );
}

function DissolveRoleDialog({
   isOpen, role, onCancel, onConfirm,
}: {
   isOpen: boolean;
   role: Role | null;
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
      return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
   }, [isOpen, loading, onCancel]);
   if (!isOpen || !role || !mounted) return null;
   const handleConfirm = async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } };

   const permCount = (role.permissions || []).length;

   const notes = [
      { label: 'Level of office',  hint: levelLabel(role.level) },
      { label: 'Permissions held', hint: permCount === 0 ? 'none' : `${permCount} ${permCount === 1 ? 'mandate' : 'mandates'}` },
      { label: 'Standing',         hint: role.isActive !== false ? 'active' : 'inactive' },
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
               <p className="del-kicker"><span className="del-kicker-rule" />Notice of Dissolution</p>
               <h2 className="del-title">Dissolve <em>{role.displayName || role.name}</em> from the register?</h2>
               <p className="del-lede">
                  The office shall be struck from the register. Any members holding this office
                  will have it revoked. The record is retained in the archive.
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
                        <span className="del-req-label">{n.label}</span>
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
                  {loading ? (<><span className="del-spinner" /><span>Striking from register…</span></>) : (<><span>Dissolve Office</span><span className="del-btn-arrow">&rarr;</span></>)}
               </button>
            </div>
         </div>
         <DeleteDialogStyles />
      </div>,
      document.body
   );
}
