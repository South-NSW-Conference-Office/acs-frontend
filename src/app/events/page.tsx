'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMounted } from '@/hooks/useMounted';
import AdminLayout from '@/components/AdminLayout';
import { PermissionGate } from '@/components/PermissionGate';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import EventModal from '@/components/EventModal';
import RegisterStyles from '@/components/register/RegisterStyles';
import DeleteDialogStyles from '@/components/register/DeleteDialogStyles';
import { useToast } from '@/contexts/ToastContext';
import { eventsAPI, EventListItem } from '@/lib/eventsAPI';

type Standing = 'upcoming' | 'active' | 'concluded';

function getEventStanding(ev: EventListItem): Standing {
   const now = new Date();
   const start = new Date(ev.start);
   const end = new Date(ev.end);
   if (now < start) return 'upcoming';
   if (now >= start && now <= end) return 'active';
   return 'concluded';
}

export default function Events() {
   const [events, setEvents] = useState<EventListItem[]>([]);
   const [services, setServices] = useState<Array<{ _id: string; name: string; type: string }>>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [serviceFilter, setServiceFilter] = useState('');
   const [standingFilter, setStandingFilter] = useState<'all' | Standing>('all');
   const [selectedEvent, setSelectedEvent] = useState<EventListItem | null>(null);
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [eventToDelete, setEventToDelete] = useState<EventListItem | null>(null);
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [bulkDeleting, setBulkDeleting] = useState(false);
   const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
   const { error: showErrorToast, success: showSuccessToast } = useToast();

   const fetchEvents = useCallback(async () => {
      try {
         setLoading(true);
         const eventsData = await eventsAPI.getAllEvents({
            search: searchQuery || undefined,
            serviceId: serviceFilter || undefined,
         });
         setEvents(eventsData);
         setSelectedIds(new Set());
      } catch (error) {
         showErrorToast('Failed to load events', error instanceof Error ? error.message : 'Unknown error');
      } finally {
         setLoading(false);
      }
   }, [searchQuery, serviceFilter, showErrorToast]);

   const fetchServices = useCallback(async () => {
      try {
         const servicesData = await eventsAPI.getServicesForDropdown();
         setServices(servicesData);
      } catch (error) {
         console.error('Failed to fetch services:', error);
      }
   }, []);

   useEffect(() => { fetchEvents(); }, [fetchEvents]);
   useEffect(() => { fetchServices(); }, [fetchServices]);

   const handleEventSaved = () => {
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedEvent(null);
      fetchEvents();
   };

   const handleDeleteEvent = async () => {
      if (!eventToDelete) return;
      try {
         await eventsAPI.deleteEvent(eventToDelete._id);
         showSuccessToast('Occasion retired', `${eventToDelete.name} has been removed from the register.`);
         setShowDeleteConfirm(false);
         setEventToDelete(null);
         fetchEvents();
      } catch (error) {
         showErrorToast('Failed to retire occasion', error instanceof Error ? error.message : 'Unknown error');
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
      if (selectedIds.size === filteredEvents.length) {
         setSelectedIds(new Set());
      } else {
         setSelectedIds(new Set(filteredEvents.map((e) => e._id)));
      }
   };

   const handleBulkDelete = async () => {
      setBulkDeleting(true);
      const ids = [...selectedIds];
      const results = { success: 0, failed: 0, errors: [] as string[] };
      for (const id of ids) {
         try {
            await eventsAPI.deleteEvent(id);
            results.success++;
         } catch (err) {
            results.failed++;
            results.errors.push(err instanceof Error ? err.message : `Failed ${id}`);
         }
      }
      if (results.success > 0) showSuccessToast(`${results.success} occasion(s) retired from the register.`);
      if (results.failed > 0) showErrorToast(`${results.failed} could not be retired. ${results.errors[0] || ''}`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setBulkDeleting(false);
      fetchEvents();
   };

   const filteredEvents = events.filter((ev) => {
      if (standingFilter !== 'all' && getEventStanding(ev) !== standingFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
         ev.name.toLowerCase().includes(q) ||
         ev.service.name.toLowerCase().includes(q) ||
         (ev.description?.toLowerCase().includes(q) ?? false) ||
         (ev.locationText?.toLowerCase().includes(q) ?? false)
      );
   });

   const upcomingCount = events.filter((e) => getEventStanding(e) === 'upcoming').length;
   const activeCount = events.filter((e) => getEventStanding(e) === 'active').length;

   return (
      <AdminLayout
         title="Events"
         description="Manage events for all community services"
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
                     Seventh&#8209;day Adventist Church&nbsp;&middot;&nbsp;Calendar
                  </p>
                  <h1 className="reg-title">
                     <span className="reg-word" style={{ animationDelay: '0.15s' }}>The</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.24s' }}>Register</span>
                     <br />
                     <span className="reg-word" style={{ animationDelay: '0.33s' }}>of</span>&nbsp;
                     <span className="reg-word reg-word--italic" style={{ animationDelay: '0.42s' }}>Occasions</span>
                  </h1>
                  <p className="reg-subtitle">
                     A calendar of the occasions held by the church&apos;s ministries &mdash;
                     gatherings, meetings, and works appointed for a day.
                  </p>
               </div>

               <aside className="reg-mast-right">
                  <div className="reg-counter">
                     <div className="reg-counter-num">{String(filteredEvents.length).padStart(2, '0')}</div>
                     <div className="reg-counter-label">Occasions on Record</div>
                     <div className="reg-counter-rule" />
                     <div className="reg-counter-sub">
                        <span>{upcomingCount}</span> upcoming
                        {activeCount > 0 && <> &middot; <span>{activeCount}</span> in session</>}
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
                        placeholder="Search by name, ministry, or seat…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="reg-search-input"
                     />
                     <span className="reg-search-underline" />
                  </div>

                  <div className="reg-filter">
                     <label className="reg-filter-label" htmlFor="filter-service">Ministry</label>
                     <select
                        id="filter-service"
                        className="reg-filter-select"
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                     >
                        <option value="">All</option>
                        {services.map((s) => (
                           <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                     </select>
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
                        <option value="upcoming">Upcoming</option>
                        <option value="active">In Session</option>
                        <option value="concluded">Concluded</option>
                     </select>
                  </div>
               </div>

               <PermissionGate permission="services.manage">
                  <button onClick={() => setShowCreateModal(true)} className="reg-btn">
                     <span className="reg-btn-plus">+</span>
                     <span>Appoint New Occasion</span>
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
                  <PermissionGate permission="services.manage">
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
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '18%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '18%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '16%' }} />
                     <div className="reg-skel-line reg-skel-line--head" style={{ width: '10%' }} />
                  </div>
                  {[0, 1, 2, 3, 4].map((i) => (
                     <div key={i} className="reg-skel-row" style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="reg-skel-avatar reg-skel-avatar--sm" />
                        <div className="reg-skel-line" style={{ flex: 1.6 }} />
                        <div className="reg-skel-line" style={{ flex: 1.1 }} />
                        <div className="reg-skel-line" style={{ flex: 1.1 }} />
                        <div className="reg-skel-line" style={{ flex: 1.3 }} />
                        <div className="reg-skel-line" style={{ flex: 0.6 }} />
                     </div>
                  ))}
               </div>
            ) : filteredEvents.length === 0 ? (
               <div className="reg-empty">
                  <div className="reg-empty-seal">
                     <span className="reg-empty-glyph">&#10022;</span>
                  </div>
                  <h3 className="reg-empty-title">
                     {searchQuery || serviceFilter || standingFilter !== 'all'
                        ? 'No occasion meets your search.'
                        : 'The register awaits its first occasion.'}
                  </h3>
                  <p className="reg-empty-body">
                     {searchQuery || serviceFilter || standingFilter !== 'all'
                        ? 'Amend your query, or broaden the filters to include all ministries and standings.'
                        : 'Begin by appointing the first occasion to the register.'}
                  </p>
               </div>
            ) : (
               <div className="reg-table-wrap">
                  <table className="reg-table">
                     <thead>
                        <tr>
                           <th className="reg-th reg-th--check" onClick={(e) => e.stopPropagation()}>
                              <label className="reg-check" onClick={(e) => { e.preventDefault(); toggleSelectAll(); }}>
                                 <input type="checkbox" checked={filteredEvents.length > 0 && selectedIds.size === filteredEvents.length} readOnly />
                                 <span className="reg-check-box">
                                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                       <polyline points="2.5 6 5 8.5 9.5 3.5" />
                                    </svg>
                                 </span>
                              </label>
                           </th>
                           <th className="reg-th reg-th--no">№</th>
                           <th className="reg-th">Occasion</th>
                           <th className="reg-th">Ministry</th>
                           <th className="reg-th">When</th>
                           <th className="reg-th">Seat</th>
                           <th className="reg-th">Standing</th>
                           <th className="reg-th reg-th--actions" aria-label="Actions" />
                        </tr>
                     </thead>
                     <tbody>
                        {filteredEvents.map((ev, i) => {
                           const standing = getEventStanding(ev);
                           const start = new Date(ev.start);
                           const end = new Date(ev.end);
                           const isSameDay = ev.start.split('T')[0] === ev.end.split('T')[0];
                           const standingLabel = standing === 'upcoming' ? 'Upcoming' : standing === 'active' ? 'In Session' : 'Concluded';
                           const dayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][start.getDay()];
                           const dayNum = start.getDate();
                           const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][start.getMonth()];
                           const goto = () => {
                              if (showDeleteConfirm || showEditModal || showCreateModal || showBulkDeleteConfirm) return;
                              if (selectedIds.size > 0) { toggleSelect(ev._id); return; }
                              setSelectedEvent(ev);
                              setShowEditModal(true);
                           };
                           return (
                              <tr key={ev._id} className="reg-tr" style={{ animationDelay: `${0.05 + i * 0.04}s` }} onClick={goto}>
                                 <td className="reg-td reg-td--check" onClick={(e) => e.stopPropagation()}>
                                    <label className="reg-check" onClick={(e) => { e.preventDefault(); toggleSelect(ev._id); }}>
                                       <input type="checkbox" checked={selectedIds.has(ev._id)} readOnly />
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
                                       <div className="reg-date-block" aria-hidden>
                                          <div className="reg-date-day">{dayLabel}</div>
                                          <div className="reg-date-num">{String(dayNum).padStart(2, '0')}</div>
                                          <div className="reg-date-mon">{month}</div>
                                       </div>
                                       <div className="reg-td-union-text">
                                          <div className="reg-td-name">{ev.name}</div>
                                          {ev.description && (
                                             <div className="reg-td-path">{ev.description}</div>
                                          )}
                                       </div>
                                    </div>
                                 </td>

                                 <td className="reg-td reg-td--parent">
                                    {ev.service?.name ? (
                                       <>
                                          <div className="reg-td-parent">{ev.service.name}</div>
                                          {ev.service.type && (
                                             <div className="reg-td-parent-sub">{ev.service.type.replace(/_/g, ' ')}</div>
                                          )}
                                       </>
                                    ) : (
                                       <span className="reg-dash">&mdash;</span>
                                    )}
                                 </td>

                                 <td className="reg-td reg-td--when">
                                    <div className="reg-td-when-year">
                                       {start.toLocaleDateString('en-AU', { year: 'numeric' })}
                                    </div>
                                    <div className="reg-td-when-time">
                                       {start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                       {' '}&ndash;{' '}
                                       {isSameDay
                                          ? end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
                                          : `${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · ${end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
                                       }
                                    </div>
                                 </td>

                                 <td className="reg-td reg-td--seat">
                                    {ev.locationText ? (
                                       <div className="reg-td-city">{ev.locationText}</div>
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
                                       { label: 'Edit', onClick: () => { setSelectedEvent(ev); setShowEditModal(true); } },
                                       { label: 'Retire', onClick: () => { setEventToDelete(ev); setShowDeleteConfirm(true); }, variant: 'danger' },
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

         {showCreateModal && (
            <EventModal
               isOpen={showCreateModal}
               onClose={() => setShowCreateModal(false)}
               onEventSaved={handleEventSaved}
            />
         )}
         {showEditModal && selectedEvent && (
            <EventModal
               isOpen={showEditModal}
               onClose={() => { setShowEditModal(false); setSelectedEvent(null); }}
               onEventSaved={handleEventSaved}
               event={selectedEvent}
            />
         )}

         <BulkDeleteDialog
            isOpen={showBulkDeleteConfirm}
            count={selectedIds.size}
            loading={bulkDeleting}
            onCancel={() => setShowBulkDeleteConfirm(false)}
            onConfirm={handleBulkDelete}
         />

         <DeleteEventDialog
            isOpen={showDeleteConfirm}
            event={eventToDelete}
            onCancel={() => { setShowDeleteConfirm(false); setEventToDelete(null); }}
            onConfirm={handleDeleteEvent}
         />
      </AdminLayout>
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
               <p className="del-kicker"><span className="del-kicker-rule" />Bulk Retirement</p>
               <h2 className="del-title">Retire <em>{count}</em> {count === 1 ? 'occasion' : 'occasions'}?</h2>
               <p className="del-lede">The selected occasions shall be struck from the calendar. Their records are retained in the archive.</p>
            </div>
            <div className="del-foot">
               <button type="button" onClick={onCancel} disabled={loading} className="del-btn del-btn--ghost">Cancel</button>
               <button type="button" onClick={onConfirm} disabled={loading} className="del-btn del-btn--danger">
                  {loading ? (<><span className="del-spinner" /><span>Striking from record…</span></>) : (<><span>Retire {count} {count === 1 ? 'Occasion' : 'Occasions'}</span><span className="del-btn-arrow">&rarr;</span></>)}
               </button>
            </div>
         </div>
         <DeleteDialogStyles />
      </div>,
      document.body
   );
}

function DeleteEventDialog({
   isOpen, event, onCancel, onConfirm,
}: {
   isOpen: boolean;
   event: EventListItem | null;
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
   if (!isOpen || !event || !mounted) return null;
   const handleConfirm = async () => { setLoading(true); try { await onConfirm(); } finally { setLoading(false); } };

   const start = new Date(event.start);
   const standing = getEventStanding(event);
   const standingLabel = standing === 'upcoming' ? 'upcoming' : standing === 'active' ? 'currently in session' : 'concluded';

   const notes = [
      { label: 'Appointed for',     hint: start.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) },
      { label: 'Held by Ministry',  hint: event.service?.name || 'none noted' },
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
               <p className="del-kicker"><span className="del-kicker-rule" />Notice of Retirement</p>
               <h2 className="del-title">Retire <em>{event.name}</em> from the register?</h2>
               <p className="del-lede">
                  The occasion shall be struck from the calendar. Its record is
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
                  {loading ? (<><span className="del-spinner" /><span>Striking from record…</span></>) : (<><span>Retire Occasion</span><span className="del-btn-arrow">&rarr;</span></>)}
               </button>
            </div>
         </div>
         <DeleteDialogStyles />
      </div>,
      document.body
   );
}
