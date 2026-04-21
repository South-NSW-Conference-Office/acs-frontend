'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import UserModal from '@/components/UserModal';
import RegisterStyles from '@/components/register/RegisterStyles';
import DeleteDialogStyles from '@/components/register/DeleteDialogStyles';
import { useMounted } from '@/hooks/useMounted';
import { useToast } from '@/contexts/ToastContext';
import { rbacService } from '@/lib/rbac';
import { User } from '@/types/rbac';

type Standing = 'verified' | 'pending';

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
   unionAssignments?: User['unionAssignments'];
   conferenceAssignments?: User['conferenceAssignments'];
   churchAssignments?: User['churchAssignments'];
}

function getInitials(name: string): string {
   if (!name) return '—';
   const parts = name.trim().split(/\s+/).filter(Boolean);
   if (parts.length === 0) return '—';
   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
   return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function collectRoleNames(user: User): string[] {
   const all = [
      ...(user.unionAssignments || []),
      ...(user.conferenceAssignments || []),
      ...(user.churchAssignments || []),
   ];
   return all.map((a) => {
      const r = a.role;
      if (typeof r === 'object' && r !== null) return r.displayName || r.name || 'Unknown Role';
      return String(r || 'Unknown Role');
   });
}

export default function Users() {
   const router = useRouter();
   const [users, setUsers] = useState<User[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [standingFilter, setStandingFilter] = useState<'all' | Standing>('all');
   const [selectedUser, setSelectedUser] = useState<User | null>(null);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [userToDelete, setUserToDelete] = useState<User | null>(null);
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [bulkDeleting, setBulkDeleting] = useState(false);
   const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
   const toast = useToast();
   const toastRef = useRef(toast);
   useEffect(() => { toastRef.current = toast; }, [toast]);

   const fetchUsers = useCallback(async () => {
      try {
         setLoading(true);
         const data = await rbacService.getUsers();
         const mapped = Array.isArray(data)
            ? (data as ApiUser[]).map((u) => ({
                 ...u,
                 id: u._id,
                 verified: u.verified ?? false,
                 createdAt: u.createdAt || new Date().toISOString(),
                 updatedAt: u.updatedAt || new Date().toISOString(),
              })) as User[]
            : [];
         setUsers(mapped);
         setSelectedIds(new Set());
      } catch (error) {
         console.error('Error fetching users:', error);
         setUsers([]);
         toastRef.current?.error('Failed to load members', error instanceof Error ? error.message : 'Please try again later');
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => { fetchUsers(); }, [fetchUsers]);

   const deleteUserRequest = async (userId: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${userId}`, {
         method: 'DELETE',
         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
         credentials: 'include',
      });
      if (!response.ok) {
         const err = await response.json().catch(() => ({}));
         throw new Error(err.message || `Failed to remove ${userId}`);
      }
   };

   const handleDeleteUser = async () => {
      if (!userToDelete) return;
      try {
         await deleteUserRequest(userToDelete._id);
         setUsers((prev) => prev.filter((u) => u._id !== userToDelete._id));
         toast.success('Member removed', `${userToDelete.name} has been struck from the roll.`);
      } catch (error) {
         toast.error('Failed to remove member', error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
         setShowDeleteConfirm(false);
         setUserToDelete(null);
      }
   };

   const handleResendVerification = async (user: User) => {
      if (user.verified) {
         toast.info('Already verified', 'This member has already verified their email address.');
         return;
      }
      try {
         const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/resend-verification`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            credentials: 'include',
            body: JSON.stringify({ userId: user._id }),
         });
         if (response.ok) {
            toast.success('Letter of verification sent', `Dispatched to ${user.email}.`);
         } else {
            const err = await response.json().catch(() => ({}));
            toast.error('Failed to dispatch', err.message || 'An unexpected error occurred');
         }
      } catch (error) {
         toast.error('Failed to dispatch', error instanceof Error ? error.message : 'An unexpected error occurred');
      }
   };

   const handleUserSaved = (savedUser: User, isEdit: boolean) => {
      if (isEdit) {
         setUsers((prev) => prev.map((u) => (u._id === savedUser._id ? savedUser : u)));
         toast.success('Member updated', `${savedUser.name || 'Member'} has been updated on the roll.`);
      } else {
         setUsers((prev) => [...prev, savedUser]);
         toast.success('Member enrolled', `${savedUser.name || 'Member'} has been added to the roll.`);
         setTimeout(fetchUsers, 500);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedUser(null);
   };

   const toggleSelect = (id: string) => {
      setSelectedIds((prev) => {
         const next = new Set(prev);
         if (next.has(id)) next.delete(id); else next.add(id);
         return next;
      });
   };

   const toggleSelectAll = () => {
      if (selectedIds.size === filteredUsers.length) {
         setSelectedIds(new Set());
      } else {
         setSelectedIds(new Set(filteredUsers.map((u) => u._id)));
      }
   };

   const handleBulkDelete = async () => {
      setBulkDeleting(true);
      const ids = [...selectedIds];
      const results = { success: 0, failed: 0, errors: [] as string[] };
      for (const id of ids) {
         try {
            await deleteUserRequest(id);
            results.success++;
         } catch (err) {
            results.failed++;
            results.errors.push(err instanceof Error ? err.message : `Failed ${id}`);
         }
      }
      if (results.success > 0) toast.success(`${results.success} member(s) struck from the roll.`);
      if (results.failed > 0) toast.error(`${results.failed} could not be removed. ${results.errors[0] || ''}`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setBulkDeleting(false);
      fetchUsers();
   };

   const filteredUsers = users.filter((u) => {
      const standing: Standing = u.verified ? 'verified' : 'pending';
      if (standingFilter !== 'all' && standing !== standingFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
         (u.name || '').toLowerCase().includes(q) ||
         (u.email || '').toLowerCase().includes(q) ||
         (u.phone || '').toLowerCase().includes(q) ||
         (u.city || '').toLowerCase().includes(q)
      );
   });

   const verifiedCount = users.filter((u) => u.verified).length;
   const pendingCount = users.filter((u) => !u.verified).length;

   return (
      <AdminLayout title="Members" description="Manage members and their role assignments" hideTitle={true} hideHeader={true}>
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
                     Seventh&#8209;day Adventist Church&nbsp;&middot;&nbsp;Directory
                  </p>
                  <h1 className="reg-title">
                     <span className="reg-word" style={{ animationDelay: '0.15s' }}>The</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.24s' }}>Roll</span>
                     <br />
                     <span className="reg-word" style={{ animationDelay: '0.33s' }}>of</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.42s' }}>Members</span>
                  </h1>
                  <p className="reg-subtitle">
                     A directory of those entrusted with the stewardship of the church&apos;s ministries &mdash;
                     their names, stations, and standings set down in order.
                  </p>
               </div>

               <aside className="reg-mast-right">
                  <div className="reg-counter">
                     <div className="reg-counter-num">{String(filteredUsers.length).padStart(2, '0')}</div>
                     <div className="reg-counter-label">Members on the Roll</div>
                     <div className="reg-counter-rule" />
                     <div className="reg-counter-sub">
                        <span>{verifiedCount}</span> verified
                        {pendingCount > 0 && <> &middot; <span>{pendingCount}</span> pending</>}
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
                        placeholder="Search by name, email, or station…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="reg-search-input"
                     />
                     <span className="reg-search-underline" />
                  </div>

                  <div className="reg-filter">
                     <label className="reg-filter-label" htmlFor="filter-standing">Standing</label>
                     <select
                        id="filter-standing"
                        className="reg-filter-select"
                        value={standingFilter}
                        onChange={(e) => setStandingFilter(e.target.value as 'all' | Standing)}
                     >
                        <option value="all">All</option>
                        <option value="verified">Verified</option>
                        <option value="pending">Pending</option>
                     </select>
                  </div>
               </div>

               <PermissionGate permission="users.create">
                  <button onClick={() => setShowCreateModal(true)} className="reg-btn">
                     <span className="reg-btn-plus">+</span>
                     <span>Enrol New Member</span>
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
                  <PermissionGate permission="users.delete">
                     <button className="reg-bulk-delete" onClick={() => setShowBulkDeleteConfirm(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
                           <path d="M10 11v6M14 11v6" />
                        </svg>
                        <span>Remove Selected</span>
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
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '18%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '18%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '16%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '10%' }} />
                  </div>
                  {[0, 1, 2, 3, 4].map((i) => (
                     <div key={i} className="reg-skel-row" style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="reg-skel-avatar reg-skel-avatar--round" />
                        <div className="reg-skel-line" style={{ flex: 1.6 }} />
                        <div className="reg-skel-line" style={{ flex: 1.1 }} />
                        <div className="reg-skel-line" style={{ flex: 1.1 }} />
                        <div className="reg-skel-line" style={{ flex: 1.3 }} />
                        <div className="reg-skel-line" style={{ flex: 0.6 }} />
                     </div>
                  ))}
               </div>
            ) : filteredUsers.length === 0 ? (
               <div className="reg-empty">
                  <div className="reg-empty-seal">
                     <span className="reg-empty-glyph">&#10022;</span>
                  </div>
                  <h3 className="reg-empty-title">
                     {searchQuery || standingFilter !== 'all'
                        ? 'No member meets your search.'
                        : 'The roll awaits its first member.'}
                  </h3>
                  <p className="reg-empty-body">
                     {searchQuery || standingFilter !== 'all'
                        ? 'Amend your query, or broaden the filters to include all standings.'
                        : 'Begin by enrolling the first member upon the roll.'}
                  </p>
               </div>
            ) : (
               <div className="reg-table-wrap">
                  <table className="reg-table">
                     <thead>
                        <tr>
                           <th className="reg-th reg-th--check" onClick={(e) => e.stopPropagation()}>
                              <label className="reg-check" onClick={(e) => { e.preventDefault(); toggleSelectAll(); }}>
                                 <input type="checkbox" checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length} readOnly />
                                 <span className="reg-check-box">
                                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                       <polyline points="2.5 6 5 8.5 9.5 3.5" />
                                    </svg>
                                 </span>
                              </label>
                           </th>
                           <th className="reg-th reg-th--no">№</th>
                           <th className="reg-th">Member</th>
                           <th className="reg-th">Station</th>
                           <th className="reg-th">Offices Held</th>
                           <th className="reg-th">Enrolled</th>
                           <th className="reg-th">Standing</th>
                           <th className="reg-th reg-th--actions" aria-label="Actions" />
                        </tr>
                     </thead>
                     <tbody>
                        {filteredUsers.map((u, i) => {
                           const standing: Standing = u.verified ? 'verified' : 'pending';
                           const standingLabel = standing === 'verified' ? 'Verified' : 'Pending';
                           const roleNames = collectRoleNames(u);
                           const created = new Date(u.createdAt);
                           const yearLabel = created.toLocaleDateString('en-AU', { year: 'numeric' });
                           const dateLabel = created.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
                           const city = [u.city, u.state, u.country].filter(Boolean).join(', ');
                           const goto = () => {
                              if (showDeleteConfirm || showEditModal || showCreateModal || showBulkDeleteConfirm) return;
                              if (selectedIds.size > 0) { toggleSelect(u._id); return; }
                              setSelectedUser(u);
                              setShowEditModal(true);
                           };
                           return (
                              <tr key={u._id} className="reg-tr" style={{ animationDelay: `${0.05 + i * 0.04}s` }} onClick={goto}>
                                 <td className="reg-td reg-td--check" onClick={(e) => e.stopPropagation()}>
                                    <label className="reg-check" onClick={(e) => { e.preventDefault(); toggleSelect(u._id); }}>
                                       <input type="checkbox" checked={selectedIds.has(u._id)} readOnly />
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
                                       <div className="reg-mono" aria-hidden>
                                          <span className="reg-mono-text">{getInitials(u.name)}</span>
                                       </div>
                                       <div className="reg-td-union-text">
                                          <div className="reg-td-name">{u.name || 'Unnamed Member'}</div>
                                          <div className="reg-td-path">{u.email || '—'}</div>
                                       </div>
                                    </div>
                                 </td>

                                 <td className="reg-td reg-td--parent">
                                    {u.address || city ? (
                                       <>
                                          <div className="reg-td-parent">{u.address || city || '—'}</div>
                                          {u.address && city && (
                                             <div className="reg-td-parent-sub">{city}</div>
                                          )}
                                          {u.phone && (
                                             <div className="reg-td-parent-sub">{u.phone}</div>
                                          )}
                                       </>
                                    ) : u.phone ? (
                                       <div className="reg-td-parent">{u.phone}</div>
                                    ) : (
                                       <span className="reg-dash">&mdash;</span>
                                    )}
                                 </td>

                                 <td className="reg-td">
                                    {roleNames.length > 0 ? (
                                       <div className="reg-chips">
                                          {roleNames.slice(0, 3).map((n, idx) => (
                                             <span key={idx} className="reg-chip">{n}</span>
                                          ))}
                                          {roleNames.length > 3 && (
                                             <span className="reg-chip reg-chip--muted">+{roleNames.length - 3}</span>
                                          )}
                                       </div>
                                    ) : (
                                       <span className="reg-chip reg-chip--muted">no office</span>
                                    )}
                                 </td>

                                 <td className="reg-td reg-td--when">
                                    <div className="reg-td-when-year">{yearLabel}</div>
                                    <div className="reg-td-when-time">{dateLabel}</div>
                                 </td>

                                 <td className="reg-td reg-td--state">
                                    <span className={`reg-state ${standing}`}>
                                       <span className="reg-state-dot" />
                                       {standingLabel}
                                    </span>
                                 </td>

                                 <td className="reg-td reg-td--actions" onClick={(e) => e.stopPropagation()}>
                                    <RowActionsMenu actions={[
                                       { label: 'View Details', onClick: () => router.push(`/users/${u._id}`) },
                                       { label: 'Resend Verification', onClick: () => handleResendVerification(u), hidden: u.verified },
                                       { label: 'Edit', onClick: () => { setSelectedUser(u); setShowEditModal(true); } },
                                       { label: 'Remove', onClick: () => { setUserToDelete(u); setShowDeleteConfirm(true); }, variant: 'danger' },
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

         <BulkRemoveDialog
            isOpen={showBulkDeleteConfirm}
            count={selectedIds.size}
            loading={bulkDeleting}
            onCancel={() => setShowBulkDeleteConfirm(false)}
            onConfirm={handleBulkDelete}
         />

         <RemoveUserDialog
            isOpen={showDeleteConfirm}
            user={userToDelete}
            onCancel={() => { setShowDeleteConfirm(false); setUserToDelete(null); }}
            onConfirm={handleDeleteUser}
         />
      </AdminLayout>
   );
}

function BulkRemoveDialog({
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
               <p className="del-kicker"><span className="del-kicker-rule" />Bulk Removal</p>
               <h2 className="del-title">Strike <em>{count}</em> {count === 1 ? 'member' : 'members'} from the roll?</h2>
               <p className="del-lede">The selected members shall be removed from the directory. Their records are retained in the archive.</p>
            </div>
            <div className="del-foot">
               <button type="button" onClick={onCancel} disabled={loading} className="del-btn del-btn--ghost">Cancel</button>
               <button type="button" onClick={onConfirm} disabled={loading} className="del-btn del-btn--danger">
                  {loading ? (<><span className="del-spinner" /><span>Striking from roll…</span></>) : (<><span>Remove {count} {count === 1 ? 'Member' : 'Members'}</span><span className="del-btn-arrow">&rarr;</span></>)}
               </button>
            </div>
         </div>
         <DeleteDialogStyles />
      </div>,
      document.body
   );
}

function RemoveUserDialog({
   isOpen, user, onCancel, onConfirm,
}: {
   isOpen: boolean;
   user: User | null;
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
   if (!isOpen || !user || !mounted) return null;
   const handleConfirm = async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } };

   const standingLabel = user.verified ? 'verified' : 'pending verification';
   const roleCount = collectRoleNames(user).length;

   const notes = [
      { label: 'Email of record',   hint: user.email || 'none noted' },
      { label: 'Offices held',      hint: roleCount === 0 ? 'none' : `${roleCount} ${roleCount === 1 ? 'office' : 'offices'}` },
      { label: 'Standing',          hint: standingLabel },
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
               <p className="del-kicker"><span className="del-kicker-rule" />Notice of Removal</p>
               <h2 className="del-title">Strike <em>{user.name}</em> from the roll?</h2>
               <p className="del-lede">
                  The member shall be removed from the directory. Their record is
                  retained in the archive and may be reinstated by an administrator.
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
                  {loading ? (<><span className="del-spinner" /><span>Striking from roll…</span></>) : (<><span>Remove Member</span><span className="del-btn-arrow">&rarr;</span></>)}
               </button>
            </div>
         </div>
         <DeleteDialogStyles />
      </div>,
      document.body
   );
}
