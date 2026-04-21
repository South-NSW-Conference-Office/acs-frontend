'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/contexts/HierarchicalPermissionContext';
import { serviceManagement } from '@/lib/serviceManagement';

interface ServiceDetails {
   service: {
      _id: string;
      name: string;
      type: string;
      teamId?: {
         _id: string;
         name: string;
         type: string;
      };
      descriptionShort: string;
      descriptionLong: string;
      status: 'active' | 'paused' | 'archived';
      primaryImage?: { url: string; alt: string };
      bannerImage?: { url: string; alt: string };
      gallery?: Array<{ url: string; alt: string; caption: string }>;
      tags?: string[];
      availability?: 'always_open' | 'set_times' | 'set_events' | null;
      scheduling?: {
         weeklySchedule?: {
            timezone?: string;
            schedule?: Array<{
               dayOfWeek: number;
               timeSlots: Array<{ startTime: string; endTime: string }>;
               isEnabled: boolean;
            }>;
         };
         events?: Array<{
            name: string;
            description?: string;
            startDateTime: string;
            endDateTime: string;
            timezone?: string;
            isRecurring?: boolean;
            recurrencePattern?: { type?: 'daily' | 'weekly' | 'monthly'; interval?: number; endDate?: string; daysOfWeek?: number[] };
         }>;
         lastUpdated?: string;
      };
      locations: Array<{
         label: string;
         address: { street?: string; suburb?: string; state?: string; postcode?: string };
         coordinates?: { lat: number; lng: number };
      }>;
      contactInfo: { email?: string; phone?: string; website?: string };
      createdAt: string;
      updatedAt: string;
   };
   events: Array<{ _id: string; name: string; start: string; end?: string; description?: string; locationText?: string }>;
   permissions: { canUpdate: boolean; canDelete: boolean; canManage: boolean };
}

function ServiceAvatarImage({ service }: { service: ServiceDetails['service'] }) {
   const [imageError, setImageError] = useState(false);
   const imageData = (service.primaryImage?.url ? service.primaryImage : null) ||
                     (service.bannerImage?.url ? service.bannerImage : null) ||
                     null;

   if (!imageData?.url || imageError) {
      return (
         <div className="lx-avatar-monogram">
            <span>{(service.name || 'S').charAt(0).toUpperCase()}</span>
         </div>
      );
   }

   return (
      <Image
         src={imageData.url}
         alt={imageData.alt || service.name}
         fill
         className="lx-banner-img"
         priority
         onError={() => setImageError(true)}
      />
   );
}

export default function ServiceDetailPage() {
   const params = useParams();
   const router = useRouter();
   const serviceId = params?.id as string;
   const { user, loading: authLoading } = usePermissions();

   const [serviceData, setServiceData] = useState<ServiceDetails | null>(null);
   const [loading, setLoading] = useState(true);
   const { error: showErrorToast } = useToast();

   const fetchServiceDetails = useCallback(async () => {
      try {
         setLoading(true);
         const data = await serviceManagement.getServiceDetails(serviceId) as ServiceDetails | { data: ServiceDetails['service']; events?: ServiceDetails['events']; permissions?: ServiceDetails['permissions'] } | ServiceDetails['service'];

         let result: ServiceDetails;
         if ('service' in data) {
            result = data as ServiceDetails;
         } else if ('data' in data) {
            result = {
               service: data.data,
               events: data.events || [],
               permissions: data.permissions || { canUpdate: false, canDelete: false, canManage: false },
            };
         } else {
            result = {
               service: data as ServiceDetails['service'],
               events: [],
               permissions: { canUpdate: false, canDelete: false, canManage: false },
            };
         }
         setServiceData(result);
      } catch (error) {
         console.error('Failed to fetch service details:', error);
         showErrorToast('Failed to load service details');
         router.push('/services');
      } finally {
         setLoading(false);
      }
   }, [serviceId, router, showErrorToast]);

   useEffect(() => {
      if (!authLoading && user) fetchServiceDetails();
   }, [fetchServiceDetails, authLoading, user]);

   if (authLoading || loading) {
      return (
         <AdminLayout title="Loading..." description="Please wait">
            <LuxuryStyles />
            <div className="lx-loading">
               <div className="lx-loading-ring">
                  <span className="lx-loading-glyph">&#10022;</span>
               </div>
               <p className="lx-loading-text">Summoning the record</p>
            </div>
         </AdminLayout>
      );
   }

   if (!serviceData) {
      return (
         <AdminLayout title="Service Not Found" description="Not found">
            <LuxuryStyles />
            <div className="lx-notfound">
               <p className="lx-kicker">Absent from the Register</p>
               <h2 className="lx-notfound-title">No such ministry is held in record.</h2>
               <p className="lx-notfound-body">The archive does not recognise this identifier.</p>
               <button onClick={() => router.push('/services')} className="lx-btn">
                  Return to the Register
               </button>
            </div>
         </AdminLayout>
      );
   }

   const { service, events, permissions } = serviceData;
   const created = new Date(service.createdAt);
   const updated = new Date(service.updatedAt);
   const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
   const fmt = (d: Date) => `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

   const kind = service.type.replace(/_/g, ' ');
   const teamName = service.teamId?.name;
   const teamId = service.teamId?._id;

   const locCount = service.locations?.length || 0;
   const galleryCount = service.gallery?.length || 0;
   const eventCount = events?.length || 0;
   const tagCount = service.tags?.length || 0;

   const stats = [
      { label: 'Locations', value: locCount },
      { label: 'Gallery',   value: galleryCount },
      { label: 'Events',    value: eventCount },
      { label: 'Tags',      value: tagCount },
   ];
   const hasStats = locCount + galleryCount + eventCount + tagCount > 0;

   const hasSchedule = !!(
      service.availability ||
      (service.scheduling?.weeklySchedule?.schedule && service.scheduling.weeklySchedule.schedule.length > 0) ||
      (service.scheduling?.events && service.scheduling.events.length > 0)
   );
   const hasGallery = galleryCount > 0 || permissions.canUpdate;
   const hasEvents = eventCount > 0;

   const sectionOrder: string[] = [];
   if (hasStats) sectionOrder.push('stats');
   sectionOrder.push('brief');
   sectionOrder.push('seat');
   if (hasSchedule) sectionOrder.push('hours');
   if (teamName) sectionOrder.push('parent');
   if (hasEvents) sectionOrder.push('events');
   if (hasGallery) sectionOrder.push('gallery');
   sectionOrder.push('colophon');
   const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
   const numFor = (key: string) => roman[sectionOrder.indexOf(key)] || 'I';

   const statusLabel = service.status === 'active' ? 'In Standing' : service.status === 'paused' ? 'Paused' : 'Archived';
   const statusKey = service.status === 'active' ? 'on' : service.status === 'paused' ? 'paused' : 'off';

   const availabilityCopy = (() => {
      if (service.availability === 'always_open') return 'Open always — at all hours, the doors are kept.';
      if (service.availability === 'set_times') return 'By set hours — the ministry keeps a weekly schedule.';
      if (service.availability === 'set_events') return 'By set occasions — the ministry gathers on appointed days.';
      return null;
   })();

   const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
   const weeklySchedule = service.scheduling?.weeklySchedule?.schedule || [];

   return (
      <AdminLayout title={service.name} description="Ministry" hideTitle={true} hideHeader={true}>
         <LuxuryStyles />

         <div className="lx-root">
            <div className="lx-vignette" aria-hidden />
            <div className="lx-grain" aria-hidden />
            <div className="lx-glow" aria-hidden />

            {/* TOP BAR */}
            <header className="lx-top">
               <button onClick={() => router.push('/services')} className="lx-back">
                  <span className="lx-back-line" />
                  <span>The Register of Ministries</span>
               </button>
               <div className="lx-top-meta">
                  <span className="lx-monogram">SV</span>
                  <span className="lx-dot" />
                  <span>Register № {(service._id || '').slice(-6).toUpperCase()}</span>
                  <span className="lx-dot" />
                  <span className={`lx-state ${statusKey}`}>
                     <span className="lx-state-dot" />
                     {statusLabel}
                  </span>
               </div>
            </header>

            {/* HERO */}
            <section className="lx-hero lx-hero--avatar">
               <div className="lx-avatar">
                  <span className="lx-avatar-ring" />
                  <span className="lx-avatar-ring lx-avatar-ring--2" />
                  <div className="lx-avatar-inner">
                     <ServiceAvatarImage service={service} />
                  </div>
                  <span className="lx-avatar-mark">&#10022;</span>
               </div>

               <div className="lx-hero-text">
                  <p className="lx-kicker">
                     <span className="lx-kicker-rule" />
                     Ministry&nbsp;&middot;&nbsp;{kind}
                     {teamName && (
                        <>
                           &nbsp;&middot;&nbsp;
                           {teamId ? (
                              <button onClick={() => router.push(`/teams/${teamId}`)} className="lx-kicker-link">
                                 of the {teamName}
                              </button>
                           ) : (
                              <span>of the {teamName}</span>
                           )}
                        </>
                     )}
                  </p>

                  <h1 className="lx-title">
                     {service.name.split(' ').map((w, i, arr) => (
                        <span key={i} className="lx-word" style={{ animationDelay: `${0.2 + i * 0.09}s` }}>
                           {w}{i < arr.length - 1 ? '\u00A0' : ''}
                        </span>
                     ))}
                  </h1>

                  <p className="lx-lede">{service.descriptionShort || 'A work of mercy and welcome, held by the church for the good of the community.'}</p>

                  <div className="lx-hero-signature">
                     <span className="lx-sig-rule" />
                     <span className="lx-sig-text">
                        Inscribed {fmt(created)} &nbsp;&middot;&nbsp; Last revised {fmt(updated)}
                     </span>
                  </div>

                  {permissions.canUpdate && galleryCount > 0 && (
                     <div className="lx-hero-actions">
                        <button onClick={() => router.push(`/services/${serviceId}/images`)} className="lx-btn lx-btn--compact">
                           Manage Gallery &rarr;
                        </button>
                     </div>
                  )}
               </div>
            </section>

            {/* HOLDINGS */}
            {hasStats && (
               <section className="lx-sec">
                  <SectionHead num={numFor('stats')} title="The Holdings" meta={`As of ${fmt(updated)}`} />
                  <div className="lx-stats">
                     {stats.map((s, i) => (
                        <div className="lx-stat" key={s.label} style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                           <div className="lx-stat-frame">
                              <div className="lx-stat-num">{String(s.value).padStart(2, '0')}</div>
                              <div className="lx-stat-ornament">&#10022;</div>
                           </div>
                           <div className="lx-stat-label">{s.label}</div>
                        </div>
                     ))}
                  </div>
               </section>
            )}

            {/* BRIEF */}
            <section className="lx-sec">
               <SectionHead num={numFor('brief')} title="The Brief" />
               <div className="lx-designation">
                  <div>
                     {service.descriptionLong && service.descriptionLong !== service.descriptionShort ? (
                        <p className="lx-designation-body">{service.descriptionLong}</p>
                     ) : service.descriptionShort ? (
                        <p className="lx-designation-body">{service.descriptionShort}</p>
                     ) : (
                        <p className="lx-designation-empty">No brief has yet been entered into the register.</p>
                     )}

                     {service.tags && service.tags.length > 0 && (
                        <div className="lx-chips" style={{ marginTop: '2rem', paddingTop: 0, borderTop: 'none' }}>
                           <span className="lx-chips-label">Marked by</span>
                           {service.tags.map((tag, i) => (
                              <span key={i} className="lx-chip">{tag}</span>
                           ))}
                        </div>
                     )}
                  </div>

                  <dl className="lx-attrs">
                     <div className="lx-attrs-row">
                        <dt>Kind</dt>
                        <dd><span className="lx-chip-kind">{kind}</span></dd>
                     </div>
                     <div className="lx-attrs-row">
                        <dt>Standing</dt>
                        <dd>
                           <span className={`lx-chip-state ${statusKey}`}>
                              <span className="lx-chip-state-dot" />
                              {statusLabel}
                           </span>
                        </dd>
                     </div>
                     {service.availability && (
                        <div className="lx-attrs-row">
                           <dt>Kept</dt>
                           <dd>{service.availability === 'always_open' ? 'Always open' : service.availability === 'set_times' ? 'By set hours' : 'By occasion'}</dd>
                        </div>
                     )}
                     <div className="lx-attrs-row">
                        <dt>Locations</dt>
                        <dd className="lx-attrs-num">{locCount}</dd>
                     </div>
                  </dl>
               </div>
            </section>

            {/* SEAT & CORRESPONDENCE */}
            <section className="lx-sec">
               <SectionHead num={numFor('seat')} title="Seat &amp; Correspondence" />
               <div className="lx-twocol">
                  <article className="lx-entry">
                     <h3 className="lx-entry-title">Seat</h3>
                     {service.locations && service.locations.length > 0 ? (
                        <div className="lx-locations">
                           {service.locations.map((loc, i) => (
                              <div className="lx-location" key={i}>
                                 <p className="lx-location-label">{loc.label}</p>
                                 {loc.address?.street && <p>{loc.address.street}</p>}
                                 {(loc.address?.suburb || loc.address?.state || loc.address?.postcode) && (
                                    <p>
                                       {[loc.address.suburb, loc.address.state].filter(Boolean).join(', ')}
                                       {loc.address.postcode ? ` · ${loc.address.postcode}` : ''}
                                    </p>
                                 )}
                              </div>
                           ))}
                        </div>
                     ) : (
                        <p className="lx-designation-empty">No seat has been appointed.</p>
                     )}
                  </article>

                  <article className="lx-entry">
                     <h3 className="lx-entry-title">Correspondence</h3>
                     <dl className="lx-dl">
                        {service.contactInfo?.email && (
                           <div className="lx-dl-row">
                              <dt>By post electronic</dt>
                              <dd><a href={`mailto:${service.contactInfo.email}`} className="lx-link">{service.contactInfo.email}</a></dd>
                           </div>
                        )}
                        {service.contactInfo?.phone && (
                           <div className="lx-dl-row">
                              <dt>By telephone</dt>
                              <dd><a href={`tel:${service.contactInfo.phone}`} className="lx-link">{service.contactInfo.phone}</a></dd>
                           </div>
                        )}
                        {service.contactInfo?.website && (
                           <div className="lx-dl-row">
                              <dt>By world&#8209;wide web</dt>
                              <dd>
                                 <a href={service.contactInfo.website} target="_blank" rel="noopener noreferrer" className="lx-link">
                                    {service.contactInfo.website.replace(/^https?:\/\//, '')}
                                    <span className="lx-ext">&nearr;</span>
                                 </a>
                              </dd>
                           </div>
                        )}
                        {!service.contactInfo?.email && !service.contactInfo?.phone && !service.contactInfo?.website && (
                           <p className="lx-designation-empty">No correspondence on record.</p>
                        )}
                     </dl>
                  </article>
               </div>
            </section>

            {/* HOURS OF SERVICE */}
            {hasSchedule && (
               <section className="lx-sec">
                  <SectionHead
                     num={numFor('hours')}
                     title="Hours of Service"
                     meta={service.scheduling?.weeklySchedule?.timezone}
                  />
                  {availabilityCopy && (
                     <p className="lx-hours-copy">{availabilityCopy}</p>
                  )}

                  {service.availability === 'set_times' && weeklySchedule.length > 0 && (
                     <div className="lx-schedule">
                        {dayNames.map((day, di) => {
                           const entry = weeklySchedule.find((s) => s.dayOfWeek === di);
                           return (
                              <div className="lx-schedule-row" key={day}>
                                 <dt>
                                    <span className="lx-schedule-name">{day}</span>
                                 </dt>
                                 <dd>
                                    {entry?.isEnabled ? (
                                       entry.timeSlots && entry.timeSlots.length > 0 ? (
                                          entry.timeSlots.map((slot, si) => (
                                             <span key={si} className="lx-schedule-time">
                                                {slot.startTime} &ndash; {slot.endTime}
                                             </span>
                                          ))
                                       ) : (
                                          <span className="lx-schedule-closed">No hours set</span>
                                       )
                                    ) : (
                                       <span className="lx-schedule-closed">Closed</span>
                                    )}
                                 </dd>
                              </div>
                           );
                        })}
                     </div>
                  )}

                  {service.availability === 'set_events' && service.scheduling?.events && service.scheduling.events.length > 0 && (
                     <ul className="lx-programs">
                        {service.scheduling.events.slice(0, 8).map((ev, i) => (
                           <li className="lx-program" key={`sched-${i}`} style={{ animationDelay: `${0.2 + i * 0.06}s` }}>
                              <div className="lx-program-num">{String(i + 1).padStart(2, '0')}</div>
                              <div className="lx-program-body">
                                 <h4 className="lx-program-name">{ev.name}</h4>
                                 {ev.isRecurring && <span className="lx-program-type">Recurring · {ev.recurrencePattern?.type || 'weekly'}</span>}
                                 {ev.description && <p className="lx-program-desc">{ev.description}</p>}
                                 <dl className="lx-program-dl">
                                    <div>
                                       <dt>Begins</dt>
                                       <dd>{new Date(ev.startDateTime).toLocaleString()}</dd>
                                    </div>
                                    {ev.endDateTime && (
                                       <div>
                                          <dt>Ends</dt>
                                          <dd>{new Date(ev.endDateTime).toLocaleString()}</dd>
                                       </div>
                                    )}
                                 </dl>
                              </div>
                           </li>
                        ))}
                     </ul>
                  )}
               </section>
            )}

            {/* HELD UNDER (team) */}
            {teamName && (
               <section className="lx-sec">
                  <SectionHead num={numFor('parent')} title="Held Under" meta="Parent Team" />
                  <div className="lx-parent">
                     <div className="lx-parent-card">
                        <span className="lx-parent-kicker">The Team</span>
                        <h3 className="lx-parent-name">{teamName}</h3>
                        {teamId && (
                           <button onClick={() => router.push(`/teams/${teamId}`)} className="lx-parent-link">
                              <span className="lx-parent-line" />
                              <span>Open the Team&apos;s record</span>
                              <span className="lx-parent-arrow">&rarr;</span>
                           </button>
                        )}
                     </div>
                  </div>
               </section>
            )}

            {/* EVENTS */}
            {hasEvents && (
               <section className="lx-sec">
                  <SectionHead num={numFor('events')} title="Occasions" meta={`${events.length} on the roll`} />
                  <ul className="lx-programs">
                     {events.slice(0, 10).map((ev, i) => (
                        <li className="lx-program" key={ev._id} style={{ animationDelay: `${0.2 + i * 0.06}s` }}>
                           <div className="lx-program-num">{String(i + 1).padStart(2, '0')}</div>
                           <div className="lx-program-body">
                              <h4 className="lx-program-name">{ev.name}</h4>
                              {ev.description && <p className="lx-program-desc">{ev.description}</p>}
                              <dl className="lx-program-dl">
                                 <div>
                                    <dt>Date</dt>
                                    <dd>{new Date(ev.start).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                                 </div>
                                 {ev.start.includes('T') && new Date(ev.start).getHours() !== 0 && (
                                    <div>
                                       <dt>Time</dt>
                                       <dd>
                                          {new Date(ev.start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                          {ev.end && ` — ${new Date(ev.end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`}
                                       </dd>
                                    </div>
                                 )}
                                 {ev.locationText && (
                                    <div>
                                       <dt>Seat</dt>
                                       <dd>{ev.locationText}</dd>
                                    </div>
                                 )}
                              </dl>
                           </div>
                        </li>
                     ))}
                  </ul>
               </section>
            )}

            {/* GALLERY */}
            {hasGallery && (
               <section className="lx-sec">
                  <SectionHead
                     num={numFor('gallery')}
                     title="The Plates"
                     meta={galleryCount > 0 ? `${galleryCount} held` : undefined}
                  />
                  {galleryCount > 0 ? (
                     <>
                        <div className="lx-gallery">
                           {service.gallery!.slice(0, 8).map((image, i) => (
                              <div className="lx-gallery-plate" key={i} style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
                                 <div className="lx-gallery-plate-inner">
                                    <Image
                                       src={image.url}
                                       alt={image.alt || `Plate ${i + 1}`}
                                       fill
                                       className="lx-gallery-img"
                                    />
                                 </div>
                                 {image.caption && (
                                    <p className="lx-gallery-caption">{image.caption}</p>
                                 )}
                              </div>
                           ))}
                           {galleryCount > 8 && (
                              <button
                                 className="lx-gallery-more"
                                 onClick={() => permissions.canUpdate && router.push(`/services/${serviceId}/images`)}
                                 disabled={!permissions.canUpdate}
                              >
                                 <span className="lx-gallery-more-num">+{galleryCount - 8}</span>
                                 <span className="lx-gallery-more-label">more plates</span>
                              </button>
                           )}
                        </div>
                        {permissions.canUpdate && (
                           <div className="lx-hero-actions" style={{ marginTop: '2rem' }}>
                              <button onClick={() => router.push(`/services/${serviceId}/images`)} className="lx-btn lx-btn--compact">
                                 Manage Gallery &rarr;
                              </button>
                           </div>
                        )}
                     </>
                  ) : (
                     <div className="lx-empty-inline">
                        <p>No plates have yet been bound to the register.</p>
                        {permissions.canUpdate && (
                           <button onClick={() => router.push(`/services/${serviceId}/images`)} className="lx-btn lx-btn--compact">
                              Add First Plate
                           </button>
                        )}
                     </div>
                  )}
               </section>
            )}

            {/* COLOPHON */}
            <section className="lx-sec">
               <SectionHead num={numFor('colophon')} title="Colophon" meta="Record of System" />
               <div className="lx-colophon">
                  <dl className="lx-ledger">
                     <LedgerRow label="Identifier" value={service._id} mono />
                     <LedgerRow label="Name" value={service.name} />
                     <LedgerRow label="Kind" value={kind} />
                     {teamName && <LedgerRow label="Held by Team" value={teamName} />}
                     {service.teamId?.type && <LedgerRow label="Team Type" value={service.teamId.type} />}
                     <LedgerRow label="Locations" value={String(locCount)} />
                     <LedgerRow label="Gallery Plates" value={String(galleryCount)} />
                     <LedgerRow label="Events" value={String(eventCount)} />
                     {service.availability && (
                        <LedgerRow label="Availability" value={service.availability.replace(/_/g, ' ')} />
                     )}
                     {service.scheduling?.weeklySchedule?.timezone && (
                        <LedgerRow label="Timezone" value={service.scheduling.weeklySchedule.timezone} />
                     )}
                     <LedgerRow label="Inscribed" value={fmt(created)} />
                     <LedgerRow label="Revised" value={fmt(updated)} />
                  </dl>

                  <aside className="lx-seal">
                     <div className="lx-seal-outer">
                        <div className="lx-seal-mid">
                           <div className="lx-seal-inner">
                              <span className="lx-seal-glyph">M</span>
                           </div>
                        </div>
                     </div>
                     <p className="lx-seal-caption">
                        <span>Sealed under the hand of the</span>
                        <em>Office of Ministry</em>
                     </p>
                  </aside>
               </div>
            </section>

            <footer className="lx-foot">
               <span className="lx-foot-rule" />
               <span className="lx-foot-glyph">&#10023;</span>
               <span className="lx-foot-rule" />
            </footer>
         </div>
      </AdminLayout>
   );
}

function SectionHead({ num, title, meta }: { num: string; title: string; meta?: string }) {
   return (
      <div className="lx-sec-head">
         <span className="lx-sec-num">{num}.</span>
         <h2 className="lx-sec-title" dangerouslySetInnerHTML={{ __html: title }} />
         <span className="lx-sec-rule" />
         {meta && <span className="lx-sec-meta">{meta}</span>}
      </div>
   );
}

function LedgerRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
   return (
      <div className="lx-ledger-row">
         <dt>{label}</dt>
         <dd className={mono ? 'mono' : ''}>{value}</dd>
      </div>
   );
}

function LuxuryStyles() {
   return (<style jsx global>{`
      :root {
         --lx-black: #ffffff; --lx-ink: #f6f2ea; --lx-char: #ede6d5;
         --lx-cream: #141210; --lx-cream-d: #555048;
         --lx-gold: #a87f2b; --lx-gold-d: #6b4f15; --lx-gold-l: #8a6214;
         --lx-amber: #c18a2b;
         --lx-poppins: var(--font-poppins), 'Poppins', system-ui, sans-serif;
         --lx-didone: var(--lx-poppins); --lx-body: var(--lx-poppins);
         --lx-accent: var(--lx-poppins); --lx-mono: var(--lx-poppins);
      }
      .lx-root { position: relative; margin: -1.5rem; padding: 3rem clamp(1.5rem, 5vw, 5rem) 5rem; background: var(--lx-black); color: var(--lx-cream); font-family: var(--lx-body); font-weight: 300; min-height: calc(100vh - 4rem); overflow: hidden; }
      .lx-vignette { position: absolute; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 90% 70% at 50% 0%, rgba(168,127,43,0.09), transparent 55%), radial-gradient(ellipse 70% 50% at 0% 100%, rgba(90,30,32,0.05), transparent 60%), radial-gradient(ellipse 140% 100% at 50% 50%, transparent 60%, rgba(90,70,30,0.06) 100%); }
      .lx-grain { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5; mix-blend-mode: multiply; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.28 0 0 0 0 0.18 0 0 0 0.18 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }
      .lx-glow { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 900px; height: 900px; pointer-events: none; z-index: 0; background: radial-gradient(circle, rgba(168,127,43,0.10), transparent 55%); filter: blur(40px); animation: lx-breathe 12s ease-in-out infinite; }
      @keyframes lx-breathe { 0%, 100% { opacity: 0.9; transform: translateX(-50%) scale(1); } 50% { opacity: 0.55; transform: translateX(-50%) scale(1.08); } }
      .lx-root > *:not(.lx-vignette):not(.lx-grain):not(.lx-glow) { position: relative; z-index: 1; }

      .lx-top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(201,169,97,0.22); font-family: var(--lx-mono); font-weight: 300; font-size: 0.68rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--lx-cream-d); animation: lx-fade 1.2s ease-out both; gap: 1rem; flex-wrap: wrap; }
      .lx-back { background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 0.8rem; font: inherit; color: var(--lx-cream-d); padding: 0; transition: color 0.35s, letter-spacing 0.4s; }
      .lx-back-line { display: inline-block; width: 28px; height: 1px; background: var(--lx-gold); transition: width 0.4s; }
      .lx-back:hover { color: var(--lx-gold-l); letter-spacing: 0.28em; }
      .lx-back:hover .lx-back-line { width: 44px; background: var(--lx-gold-l); }
      .lx-top-meta { display: inline-flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; }
      .lx-monogram { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 500; font-style: italic; font-size: 1.1rem; letter-spacing: 0; color: var(--lx-gold); text-transform: none; }
      .lx-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--lx-gold-d); }
      .lx-state { display: inline-flex; align-items: center; gap: 0.5rem; }
      .lx-state-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--lx-cream-d); }
      .lx-state.on .lx-state-dot { background: var(--lx-gold-l); box-shadow: 0 0 8px var(--lx-gold), 0 0 16px rgba(201,169,97,0.4); animation: lx-ember 2.4s ease-in-out infinite; }
      .lx-state.paused .lx-state-dot { background: var(--lx-amber); box-shadow: 0 0 8px rgba(193,138,43,0.45); }
      @keyframes lx-ember { 0%, 100% { box-shadow: 0 0 8px var(--lx-gold), 0 0 16px rgba(201,169,97,0.4); } 50% { box-shadow: 0 0 4px var(--lx-gold), 0 0 8px rgba(201,169,97,0.2); } }

      .lx-hero--avatar { display: flex; align-items: center; gap: clamp(2rem, 4vw, 4rem); padding: 4rem 0 4.5rem; }
      @media (max-width: 760px) { .lx-hero--avatar { flex-direction: column; align-items: flex-start; gap: 2rem; padding: 2.5rem 0 3rem; } }
      .lx-avatar { position: relative; width: clamp(140px, 16vw, 200px); height: clamp(140px, 16vw, 200px); flex-shrink: 0; animation: lx-fade 1.4s ease-out 0.3s both; }
      .lx-avatar-ring { position: absolute; inset: -14px; border: 1px solid var(--lx-gold); border-radius: 50%; opacity: 0.55; animation: lx-rotate 60s linear infinite; }
      .lx-avatar-ring::before, .lx-avatar-ring::after { content: ''; position: absolute; width: 8px; height: 8px; border-radius: 50%; background: var(--lx-gold); top: 50%; transform: translateY(-50%); }
      .lx-avatar-ring::before { left: -4px; }
      .lx-avatar-ring::after { right: -4px; }
      .lx-avatar-ring--2 { inset: -26px; border-style: dotted; border-color: var(--lx-gold-d); opacity: 0.35; animation-duration: 120s; animation-direction: reverse; }
      .lx-avatar-ring--2::before, .lx-avatar-ring--2::after { display: none; }
      .lx-avatar-inner { position: relative; width: 100%; height: 100%; border-radius: 50%; overflow: hidden; border: 1px solid var(--lx-gold); box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 4px var(--lx-black), 0 0 0 5px rgba(168,127,43,0.35), 0 24px 50px -20px rgba(107,79,21,0.35); background: var(--lx-ink); transition: box-shadow 0.5s, transform 0.8s; display: flex; align-items: center; justify-content: center; }
      .lx-avatar:hover .lx-avatar-inner { transform: scale(1.03); box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 4px var(--lx-black), 0 0 0 5px var(--lx-gold), 0 28px 60px -18px rgba(107,79,21,0.5); }
      .lx-avatar-inner .lx-banner-img { object-fit: cover; filter: sepia(0.2) saturate(0.85) contrast(1.04); transition: filter 1s, transform 6s ease-out; }
      .lx-avatar:hover .lx-banner-img { filter: sepia(0.08) saturate(0.95) contrast(1); transform: scale(1.08); }
      .lx-avatar-monogram { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-style: italic; font-size: clamp(4.5rem, 8vw, 6.5rem); color: var(--lx-gold-l); text-shadow: 0 0 20px rgba(201,169,97,0.3); background: radial-gradient(circle at 40% 35%, rgba(168,127,43,0.18), transparent 65%), linear-gradient(180deg, #fbf6ea, #efe5ce); transition: transform 1.2s; }
      .lx-avatar:hover .lx-avatar-monogram { transform: scale(1.05); }
      .lx-avatar-mark { position: absolute; right: -4px; bottom: 4px; width: 32px; height: 32px; border-radius: 50%; background: var(--lx-black); border: 1px solid var(--lx-gold); color: var(--lx-gold); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; box-shadow: 0 4px 12px -4px rgba(107,79,21,0.4); }

      .lx-kicker { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; font-family: var(--lx-mono); font-weight: 300; font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--lx-gold); margin: 0 0 2rem; animation: lx-fade 1.2s ease-out 0.15s both; }
      .lx-kicker-rule { display: inline-block; width: 46px; height: 1px; background: var(--lx-gold); }
      .lx-kicker-link { background: none; border: none; padding: 0; font: inherit; color: var(--lx-gold-l); text-transform: none; letter-spacing: 0.04em; font-style: italic; cursor: pointer; transition: color 0.3s, text-shadow 0.3s; }
      .lx-kicker-link:hover { color: var(--lx-gold); text-shadow: 0 0 12px rgba(168,127,43,0.35); }

      .lx-title { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-size: clamp(3.2rem, 7vw, 6.4rem); line-height: 0.96; letter-spacing: -0.015em; margin: 0 0 2.2rem; color: var(--lx-cream); }
      .lx-word { display: inline-block; opacity: 0; animation: lx-rise 1.4s cubic-bezier(0.2,0.8,0.2,1) both; }
      .lx-title .lx-word:nth-child(even) { font-style: italic; color: var(--lx-gold-l); }
      @keyframes lx-rise { from { opacity: 0; transform: translateY(30px); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      @keyframes lx-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

      .lx-lede { font-family: var(--lx-body); font-weight: 300; font-size: clamp(1.1rem, 1.3vw, 1.3rem); line-height: 1.7; color: var(--lx-cream-d); max-width: 52ch; margin: 0 0 2.5rem; animation: lx-fade 1.4s ease-out 0.5s both; }

      .lx-hero-signature { display: flex; align-items: center; gap: 1rem; animation: lx-fade 1.4s ease-out 0.8s both; flex-wrap: wrap; }
      .lx-sig-rule { width: 32px; height: 1px; background: var(--lx-gold-d); }
      .lx-sig-text { font-family: var(--lx-accent); font-size: 0.9rem; letter-spacing: 0.06em; color: var(--lx-cream-d); }

      .lx-hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 2rem; animation: lx-fade 1.4s ease-out 1s both; }

      .lx-sec { padding: 4rem 0; border-top: 1px solid rgba(201,169,97,0.18); animation: lx-fade 1.4s ease-out 0.6s both; }
      .lx-sec-head { display: flex; align-items: baseline; gap: 1.4rem; margin-bottom: 3rem; }
      .lx-sec-num { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-style: italic; font-size: 2rem; color: var(--lx-gold); }
      .lx-sec-title { font-family: var(--lx-didone); font-variation-settings: "opsz" 72, "wght" 400; font-size: clamp(1.6rem, 2.4vw, 2.2rem); font-weight: 400; letter-spacing: 0; margin: 0; color: var(--lx-cream); }
      .lx-sec-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--lx-gold-d), transparent); }
      .lx-sec-meta { font-family: var(--lx-accent); font-size: 0.95rem; letter-spacing: 0.06em; color: var(--lx-cream-d); }

      .lx-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2rem; }
      @media (max-width: 760px) { .lx-stats { grid-template-columns: repeat(2, 1fr); } }
      .lx-stat { opacity: 0; animation: lx-rise 1.2s cubic-bezier(0.2,0.8,0.2,1) both; text-align: center; }
      .lx-stat-frame { position: relative; aspect-ratio: 4 / 5; border: 1px solid rgba(168,127,43,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; background: radial-gradient(ellipse at 50% 35%, rgba(168,127,43,0.07), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.5), rgba(241,235,220,0.4)); transition: border-color 0.4s, transform 0.6s, box-shadow 0.6s; }
      .lx-stat-frame::before { content: ''; position: absolute; inset: 5px; border: 1px solid rgba(168,127,43,0.22); pointer-events: none; }
      .lx-stat:hover .lx-stat-frame { border-color: var(--lx-gold); transform: translateY(-4px); box-shadow: 0 14px 40px -20px rgba(107,79,21,0.4); }
      .lx-stat-num { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-size: clamp(3.5rem, 6vw, 5rem); line-height: 1; color: var(--lx-cream); font-feature-settings: "lnum" 1, "tnum" 1; }
      .lx-stat:nth-child(even) .lx-stat-num { font-style: italic; color: var(--lx-gold-l); }
      .lx-stat-ornament { margin-top: 0.7rem; color: var(--lx-gold); font-size: 0.85rem; opacity: 0.7; }
      .lx-stat-label { font-family: var(--lx-mono); font-weight: 300; font-size: 0.68rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--lx-cream-d); margin-top: 1rem; }

      .lx-designation { display: grid; grid-template-columns: 1.4fr 1fr; gap: 3rem; align-items: start; }
      @media (max-width: 860px) { .lx-designation { grid-template-columns: 1fr; } }
      .lx-designation-body { font-family: var(--lx-body); font-size: clamp(1.05rem, 1.15vw, 1.2rem); line-height: 1.75; color: var(--lx-cream); margin: 0; font-weight: 300; max-width: 62ch; }
      .lx-designation-empty { font-family: var(--lx-body); font-size: 1rem; font-style: italic; color: var(--lx-cream-d); line-height: 1.7; margin: 0; max-width: 62ch; }

      .lx-attrs { margin: 0; }
      .lx-attrs-row { display: grid; grid-template-columns: 120px 1fr; gap: 1.5rem; padding: 0.9rem 0; border-bottom: 1px solid rgba(201,169,97,0.12); align-items: center; }
      .lx-attrs-row:first-child { border-top: 1px solid rgba(201,169,97,0.12); }
      .lx-attrs-row dt { font-family: var(--lx-mono); font-size: 0.6rem; letter-spacing: 0.26em; text-transform: uppercase; color: var(--lx-gold-d); font-weight: 500; }
      .lx-attrs-row dd { margin: 0; color: var(--lx-cream); font-size: 1rem; font-weight: 400; }
      .lx-attrs-num { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-style: italic; font-size: 1.6rem !important; color: var(--lx-gold-l) !important; font-feature-settings: "lnum" 1, "tnum" 1; }
      .lx-chip-kind { display: inline-block; font-family: var(--lx-mono); font-size: 0.6rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--lx-gold-d); border: 1px solid rgba(168,127,43,0.4); background: rgba(168,127,43,0.06); padding: 0.35rem 0.8rem; }
      .lx-chip-state { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--lx-mono); font-size: 0.62rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--lx-cream-d); font-weight: 500; }
      .lx-chip-state-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--lx-cream-d); }
      .lx-chip-state.on { color: #6b7d3a; }
      .lx-chip-state.on .lx-chip-state-dot { background: #6b7d3a; box-shadow: 0 0 8px rgba(107,125,58,0.45); animation: lx-ember-green 2.6s ease-in-out infinite; }
      .lx-chip-state.paused { color: var(--lx-amber); }
      .lx-chip-state.paused .lx-chip-state-dot { background: var(--lx-amber); box-shadow: 0 0 8px rgba(193,138,43,0.35); }
      @keyframes lx-ember-green { 0%, 100% { box-shadow: 0 0 8px rgba(107,125,58,0.45); } 50% { box-shadow: 0 0 4px rgba(107,125,58,0.18); } }

      .lx-chips { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
      .lx-chips-label { font-family: var(--lx-mono); font-size: 0.6rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--lx-gold-d); margin-right: 0.3rem; }
      .lx-chip { display: inline-block; font-family: var(--lx-body); font-size: 0.78rem; letter-spacing: 0.02em; color: var(--lx-cream); border: 1px solid rgba(168,127,43,0.3); padding: 0.35rem 0.8rem; background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(249,245,236,0.3)); transition: border-color 0.3s, color 0.3s; }
      .lx-chip:hover { border-color: var(--lx-gold); color: var(--lx-gold-l); }

      .lx-twocol { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(2rem, 4vw, 4rem); }
      @media (max-width: 760px) { .lx-twocol { grid-template-columns: 1fr; } }
      .lx-entry-title { font-family: var(--lx-accent); font-size: 1.4rem; font-weight: 400; color: var(--lx-gold-l); margin: 0 0 1.4rem; padding-bottom: 0.8rem; border-bottom: 1px solid rgba(201,169,97,0.2); letter-spacing: 0.04em; }

      .lx-locations { display: flex; flex-direction: column; gap: 1.3rem; }
      .lx-location { font-size: 1rem; color: var(--lx-cream); font-weight: 300; line-height: 1.5; }
      .lx-location p { margin: 0 0 0.2rem; }
      .lx-location-label { font-style: italic; color: var(--lx-gold-l); font-weight: 400 !important; margin-bottom: 0.4rem !important; }

      .lx-dl { margin: 0; }
      .lx-dl-row { display: grid; grid-template-columns: 1fr 1.4fr; gap: 1.5rem; padding: 0.9rem 0; border-bottom: 1px solid rgba(201,169,97,0.12); align-items: baseline; }
      .lx-dl-row dt { font-family: var(--lx-accent); font-size: 0.95rem; letter-spacing: 0.04em; color: var(--lx-cream-d); }
      .lx-dl-row dd { margin: 0; font-family: var(--lx-body); font-weight: 300; font-size: 1.1rem; color: var(--lx-cream); }
      .lx-link { color: var(--lx-cream); text-decoration: none; background-image: linear-gradient(var(--lx-gold), var(--lx-gold)); background-size: 0% 1px; background-repeat: no-repeat; background-position: 0 100%; padding-bottom: 2px; transition: color 0.3s, background-size 0.45s ease; }
      .lx-link:hover { color: var(--lx-gold-l); background-size: 100% 1px; }
      .lx-ext { margin-left: 0.35rem; color: var(--lx-gold); font-size: 0.9em; }

      /* HOURS */
      .lx-hours-copy { font-family: var(--lx-body); font-size: 1.05rem; line-height: 1.7; color: var(--lx-cream-d); max-width: 60ch; margin: 0 0 2.5rem; font-style: italic; }
      .lx-schedule { margin: 0; padding: 0; }
      .lx-schedule-row { display: grid; grid-template-columns: 160px 1fr; gap: 2rem; padding: 1rem 0; border-bottom: 1px dotted rgba(20,18,16,0.18); align-items: baseline; }
      .lx-schedule-row:first-child { border-top: 1px solid rgba(201,169,97,0.2); }
      .lx-schedule-row:last-child { border-bottom: 1px solid rgba(201,169,97,0.2); }
      .lx-schedule-row dt { display: flex; flex-direction: column; }
      .lx-schedule-name { font-family: var(--lx-didone); font-size: 1.1rem; font-weight: 400; color: var(--lx-cream); }
      .lx-schedule-row dd { margin: 0; display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-start; }
      .lx-schedule-time { font-family: var(--lx-didone); font-variation-settings: "opsz" 72, "wght" 400; font-size: 1.15rem; font-style: italic; color: var(--lx-gold-l); font-feature-settings: "lnum" 1, "tnum" 1; }
      .lx-schedule-closed { font-family: var(--lx-mono); font-size: 0.68rem; letter-spacing: 0.25em; text-transform: uppercase; color: var(--lx-cream-d); }

      /* PROGRAMS (events / schedule items) */
      .lx-programs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.2rem; }
      .lx-program { display: flex; gap: 1.2rem; padding: 1.4rem 1.4rem 1.6rem; border: 1px solid rgba(168,127,43,0.2); background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(249,245,236,0.3)); opacity: 0; animation: lx-rise 1.1s cubic-bezier(0.2,0.8,0.2,1) both; transition: border-color 0.4s, transform 0.5s, box-shadow 0.5s; position: relative; }
      .lx-program::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 1px; background: linear-gradient(90deg, var(--lx-gold), transparent); transform: scaleX(0); transform-origin: left; transition: transform 0.55s cubic-bezier(0.2,0.8,0.2,1); }
      .lx-program:hover { border-color: var(--lx-gold); transform: translateY(-3px); box-shadow: 0 18px 40px -22px rgba(107,79,21,0.32); }
      .lx-program:hover::before { transform: scaleX(1); }
      .lx-program-num { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-size: 1.6rem; font-style: italic; color: var(--lx-gold-l); line-height: 1; padding-top: 0.1rem; min-width: 2.2ch; font-feature-settings: "lnum" 1, "tnum" 1; }
      .lx-program-body { flex: 1; min-width: 0; }
      .lx-program-name { font-family: var(--lx-didone); font-size: 1.2rem; font-weight: 400; color: var(--lx-cream); margin: 0 0 0.5rem; letter-spacing: -0.005em; }
      .lx-program-type { display: inline-block; font-family: var(--lx-mono); font-size: 0.58rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--lx-gold); border: 1px solid rgba(168,127,43,0.35); padding: 0.25rem 0.55rem; margin-bottom: 0.9rem; }
      .lx-program-desc { font-size: 0.92rem; line-height: 1.6; color: var(--lx-cream-d); margin: 0 0 1rem; }
      .lx-program-dl { margin: 0.6rem 0 0; padding-top: 0.6rem; border-top: 1px dotted rgba(20,18,16,0.15); display: flex; flex-direction: column; gap: 0.3rem; }
      .lx-program-dl > div { display: flex; gap: 0.7rem; font-size: 0.85rem; }
      .lx-program-dl dt { font-family: var(--lx-mono); font-size: 0.6rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--lx-gold-d); min-width: 10ch; }
      .lx-program-dl dd { margin: 0; color: var(--lx-cream); font-weight: 400; }

      /* PARENT */
      .lx-parent { display: flex; justify-content: center; }
      .lx-parent-card { max-width: 520px; width: 100%; text-align: center; padding: 3rem 2.4rem; border: 1px solid rgba(168,127,43,0.35); position: relative; background: radial-gradient(ellipse at 50% 0%, rgba(168,127,43,0.08), transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.6), rgba(241,235,220,0.35)); }
      .lx-parent-card::before { content: ''; position: absolute; inset: 8px; border: 1px solid rgba(168,127,43,0.18); pointer-events: none; }
      .lx-parent-kicker { display: inline-block; font-family: var(--lx-mono); font-size: 0.62rem; letter-spacing: 0.32em; text-transform: uppercase; color: var(--lx-gold); margin-bottom: 1.2rem; }
      .lx-parent-name { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-style: italic; font-size: clamp(1.8rem, 3vw, 2.6rem); line-height: 1.1; color: var(--lx-cream); margin: 0 0 1.8rem; }
      .lx-parent-link { background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 0.8rem; font-family: var(--lx-mono); font-weight: 300; font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--lx-gold-l); padding: 0.6rem 0; transition: color 0.3s, letter-spacing 0.4s; }
      .lx-parent-line { display: inline-block; width: 28px; height: 1px; background: var(--lx-gold); transition: width 0.4s; }
      .lx-parent-arrow { transition: transform 0.4s cubic-bezier(0.2,0.8,0.2,1); }
      .lx-parent-link:hover { color: var(--lx-gold); letter-spacing: 0.33em; }
      .lx-parent-link:hover .lx-parent-line { width: 44px; }
      .lx-parent-link:hover .lx-parent-arrow { transform: translateX(6px); }

      /* GALLERY */
      .lx-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.2rem; }
      .lx-gallery-plate { position: relative; opacity: 0; animation: lx-rise 1.1s cubic-bezier(0.2,0.8,0.2,1) both; }
      .lx-gallery-plate-inner {
         position: relative;
         aspect-ratio: 4 / 5;
         border: 1px solid rgba(168,127,43,0.35);
         padding: 8px;
         background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(249,245,236,0.4));
         overflow: hidden;
      }
      .lx-gallery-plate-inner::before { content: ''; position: absolute; inset: 4px; border: 1px solid rgba(168,127,43,0.18); pointer-events: none; z-index: 2; }
      .lx-gallery-img {
         object-fit: cover;
         filter: sepia(0.2) saturate(0.85) contrast(1.02);
         transition: filter 0.8s, transform 1.2s;
      }
      .lx-gallery-plate:hover .lx-gallery-img { filter: sepia(0.05) saturate(1); transform: scale(1.06); }
      .lx-gallery-caption {
         margin: 0.7rem 0 0;
         font-family: var(--lx-accent);
         font-style: italic;
         font-size: 0.85rem;
         color: var(--lx-cream-d);
         text-align: center;
         line-height: 1.4;
      }
      .lx-gallery-more {
         aspect-ratio: 4 / 5;
         display: flex; flex-direction: column; align-items: center; justify-content: center;
         gap: 0.4rem;
         border: 1px dashed rgba(168,127,43,0.4);
         background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(249,245,236,0.2));
         cursor: pointer;
         font-family: var(--lx-didone);
         color: var(--lx-gold-l);
         transition: border-color 0.4s, background 0.4s;
      }
      .lx-gallery-more:hover:not(:disabled) { border-color: var(--lx-gold); background: linear-gradient(180deg, rgba(253,249,235,0.8), rgba(249,241,220,0.4)); }
      .lx-gallery-more:disabled { cursor: default; opacity: 0.6; }
      .lx-gallery-more-num { font-style: italic; font-size: 2.2rem; }
      .lx-gallery-more-label { font-family: var(--lx-mono); font-size: 0.65rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--lx-cream-d); }

      .lx-empty-inline { text-align: center; padding: 3rem 1rem; border: 1px dashed rgba(168,127,43,0.3); background: linear-gradient(180deg, rgba(255,255,255,0.5), rgba(249,245,236,0.2)); }
      .lx-empty-inline p { font-family: var(--lx-didone); font-style: italic; font-size: 1.2rem; color: var(--lx-cream-d); margin: 0 0 1.4rem; }

      /* COLOPHON */
      .lx-colophon { display: grid; grid-template-columns: 1fr 260px; gap: 4rem; align-items: start; }
      @media (max-width: 860px) { .lx-colophon { grid-template-columns: 1fr; } }
      .lx-ledger { margin: 0; }
      .lx-ledger-row { display: grid; grid-template-columns: 260px 1fr; gap: 2rem; padding: 1rem 0; border-bottom: 1px solid rgba(201,169,97,0.14); align-items: baseline; }
      .lx-ledger-row:first-child { border-top: 1px solid rgba(201,169,97,0.14); }
      .lx-ledger-row dt { font-family: var(--lx-mono); font-weight: 300; font-size: 0.65rem; letter-spacing: 0.26em; text-transform: uppercase; color: var(--lx-gold-d); }
      .lx-ledger-row dd { margin: 0; font-family: var(--lx-body); font-weight: 300; font-size: 1.1rem; color: var(--lx-cream); }
      .lx-ledger-row dd.mono { font-family: var(--lx-mono); font-size: 0.82rem; color: var(--lx-cream-d); word-break: break-all; }

      .lx-seal { text-align: center; }
      .lx-seal-outer { width: 180px; height: 180px; border: 1px solid var(--lx-gold); border-radius: 50%; margin: 0 auto 1.5rem; padding: 8px; position: relative; background: radial-gradient(circle, rgba(201,169,97,0.08), transparent 70%); animation: lx-rotate 90s linear infinite; }
      .lx-seal-outer::before { content: ''; position: absolute; inset: -10px; border: 1px dotted var(--lx-gold-d); border-radius: 50%; opacity: 0.5; }
      .lx-seal-mid { width: 100%; height: 100%; border: 1px dashed rgba(201,169,97,0.5); border-radius: 50%; padding: 10px; }
      .lx-seal-inner { width: 100%; height: 100%; border: 1px solid var(--lx-gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(201,169,97,0.12), transparent 65%); }
      .lx-seal-glyph { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-style: italic; font-size: 5rem; color: var(--lx-gold-l); animation: lx-counter-rotate 90s linear infinite; text-shadow: 0 0 20px rgba(201,169,97,0.4); }
      @keyframes lx-rotate { to { transform: rotate(360deg); } }
      @keyframes lx-counter-rotate { to { transform: rotate(-360deg); } }
      .lx-seal-caption { font-family: var(--lx-accent); font-size: 0.95rem; line-height: 1.6; color: var(--lx-cream-d); margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }
      .lx-seal-caption em { font-style: italic; color: var(--lx-gold-l); }

      .lx-foot { margin-top: 4rem; display: flex; align-items: center; justify-content: center; gap: 1.2rem; }
      .lx-foot-rule { display: inline-block; width: 80px; height: 1px; background: var(--lx-gold-d); }
      .lx-foot-glyph { font-family: var(--lx-didone); color: var(--lx-gold); font-size: 1rem; }

      .lx-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; background: var(--lx-black); margin: -1.5rem; color: var(--lx-cream); }
      .lx-loading-ring { width: 70px; height: 70px; border-radius: 50%; border: 1px solid var(--lx-gold); display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; animation: lx-rotate 4s linear infinite; }
      .lx-loading-glyph { font-size: 1.2rem; color: var(--lx-gold-l); animation: lx-counter-rotate 4s linear infinite; }
      .lx-loading-text { font-family: var(--lx-accent); font-size: 1rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--lx-cream-d); }

      .lx-notfound { max-width: 560px; margin: 6rem auto; padding: 2rem; text-align: center; background: var(--lx-black); color: var(--lx-cream); }
      .lx-notfound-title { font-family: var(--lx-didone); font-variation-settings: "opsz" 96, "wght" 400; font-style: italic; font-size: 2.4rem; margin: 1rem 0; }
      .lx-notfound-body { color: var(--lx-cream-d); line-height: 1.7; margin-bottom: 2rem; font-size: 1.1rem; }

      .lx-btn { font-family: var(--lx-mono); font-weight: 300; font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; background: transparent; color: var(--lx-gold-l); border: 1px solid var(--lx-gold); padding: 1rem 2.2rem; cursor: pointer; transition: background 0.4s, color 0.4s, letter-spacing 0.4s, border-color 0.4s; display: inline-flex; align-items: center; gap: 0.5rem; }
      .lx-btn:hover { background: var(--lx-gold); color: #fbf8f1; letter-spacing: 0.35em; }
      .lx-btn--compact { padding: 0.75rem 1.4rem; font-size: 0.65rem; letter-spacing: 0.22em; }
      .lx-btn--compact:hover { letter-spacing: 0.27em; }
   `}</style>);
}
