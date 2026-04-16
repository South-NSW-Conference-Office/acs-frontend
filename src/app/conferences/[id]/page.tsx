'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { useToast } from '@/contexts/ToastContext';
import { ConferenceService } from '@/lib/conferenceService';
import { Conference } from '@/types/rbac';

interface ConferenceDetails {
   conference: Conference;
   permissions: { canUpdate: boolean; canDelete: boolean; canManage: boolean };
}

function ConferenceBannerImage({ conference }: { conference: Conference }) {
   const [imageError, setImageError] = useState(false);

   if (!conference.primaryImage?.url || imageError) {
      return <div className="lx-banner-fallback" />;
   }

   return (
      <Image
         src={conference.primaryImage.url}
         alt={conference.primaryImage.alt || conference.name}
         fill
         className="lx-banner-img"
         priority
         onError={() => setImageError(true)}
      />
   );
}

function getUnionName(union: Conference['union']): string | null {
   if (!union) return null;
   if (typeof union === 'string') return union;
   if (typeof union === 'object' && 'name' in union && union.name) return union.name;
   return null;
}

function getUnionId(union: Conference['union']): string | null {
   if (!union) return null;
   if (typeof union === 'string') return union;
   if (typeof union === 'object' && '_id' in union && union._id) return union._id;
   return null;
}

export default function ConferenceDetailPage() {
   const params = useParams();
   const router = useRouter();
   const conferenceId = params?.id as string;

   const [conferenceData, setConferenceData] = useState<ConferenceDetails | null>(null);
   const [loading, setLoading] = useState(true);
   const { error: showErrorToast } = useToast();

   const fetchConferenceDetails = useCallback(async () => {
      try {
         setLoading(true);
         const response = await ConferenceService.getConferenceById(conferenceId);
         if (response.success && response.data) {
            setConferenceData({
               conference: response.data,
               permissions: { canUpdate: true, canDelete: true, canManage: true },
            });
         } else {
            throw new Error(response.message || 'Failed to fetch conference details');
         }
      } catch (error) {
         console.error('Failed to fetch conference details:', error);
         showErrorToast('Failed to load conference details');
         router.push('/conferences');
      } finally {
         setLoading(false);
      }
   }, [conferenceId, router, showErrorToast]);

   useEffect(() => {
      fetchConferenceDetails();
   }, [fetchConferenceDetails]);

   if (loading) {
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

   if (!conferenceData) {
      return (
         <AdminLayout title="Conference Not Found" description="Not found">
            <LuxuryStyles />
            <div className="lx-notfound">
               <p className="lx-kicker">Absent from the Roll</p>
               <h2 className="lx-notfound-title">No such conference is held in record.</h2>
               <p className="lx-notfound-body">
                  The archive does not recognise this identifier.
               </p>
               <button onClick={() => router.push('/conferences')} className="lx-btn">
                  Return to the Roll
               </button>
            </div>
         </AdminLayout>
      );
   }

   const { conference } = conferenceData;
   const created = new Date(conference.createdAt);
   const updated = new Date(conference.updatedAt);
   const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
   const fmt = (d: Date) => `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

   const toRoman = (n: number): string => {
      const map: [number, string][] = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
      let r = ''; let x = n;
      for (const [v, s] of map) { while (x >= v) { r += s; x -= v; } }
      return r || 'I';
   };

   const churchCount = conference.metadata?.churchCount ?? 0;
   const memberCount = conference.metadata?.membershipCount ?? 0;
   const programCount = conference.programs?.length ?? 0;
   const descendantCount = conference.childCount ?? churchCount;

   const stats = [
      { label: 'Churches',    value: churchCount },
      { label: 'Members',     value: memberCount },
      { label: 'Programs',    value: programCount },
      { label: 'Descendants', value: descendantCount },
   ];

   const hasStats = churchCount > 0 || memberCount > 0 || programCount > 0 || descendantCount > 0;
   const hasPrograms = !!(conference.programs && conference.programs.length > 0);

   const unionName = getUnionName(conference.union);
   const unionId = getUnionId(conference.union);

   // Section numbering — Roman numerals, advanced only when the section renders.
   const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
   const sectionOrder: string[] = [];
   if (hasStats) sectionOrder.push('stats');
   sectionOrder.push('seat');
   if (unionName) sectionOrder.push('parent');
   if (hasPrograms) sectionOrder.push('programs');
   sectionOrder.push('colophon');
   const numFor = (key: string) => romanNumerals[sectionOrder.indexOf(key)] || 'I';

   return (
      <AdminLayout title={conference.name} description="Conference" hideTitle={true} hideHeader={true}>
         <LuxuryStyles />

         <div className="lx-root">
            <div className="lx-vignette" aria-hidden />
            <div className="lx-grain" aria-hidden />
            <div className="lx-glow" aria-hidden />

            {/* TOP BAR */}
            <header className="lx-top">
               <button onClick={() => router.push('/conferences')} className="lx-back">
                  <span className="lx-back-line" />
                  <span>The Roll of Conferences</span>
               </button>
               <div className="lx-top-meta">
                  <span className="lx-monogram">CF</span>
                  <span className="lx-dot" />
                  <span>Register № {(conference._id || '').slice(-6).toUpperCase()}</span>
                  <span className="lx-dot" />
                  <span className={`lx-state ${conference.isActive ? 'on' : 'off'}`}>
                     <span className="lx-state-dot" />
                     {conference.isActive ? 'In Standing' : 'Dormant'}
                  </span>
               </div>
            </header>

            {/* HERO with AVATAR */}
            <section className="lx-hero lx-hero--avatar">
               <div className="lx-avatar">
                  <span className="lx-avatar-ring" />
                  <span className="lx-avatar-ring lx-avatar-ring--2" />
                  <div className="lx-avatar-inner">
                     <ConferenceBannerImage conference={conference} />
                  </div>
                  <span className="lx-avatar-mark">&#10022;</span>
               </div>

               <div className="lx-hero-text">
                  <p className="lx-kicker">
                     <span className="lx-kicker-rule" />
                     Conference&nbsp;&middot;&nbsp;Level&nbsp;{toRoman(conference.hierarchyLevel)}
                     {unionName && (
                        <>
                           &nbsp;&middot;&nbsp;
                           {unionId ? (
                              <button onClick={() => router.push(`/unions/${unionId}`)} className="lx-kicker-link">
                                 of the {unionName}
                              </button>
                           ) : (
                              <span>of the {unionName}</span>
                           )}
                        </>
                     )}
                  </p>

                  <h1 className="lx-title">
                     {conference.name.split(' ').map((w, i, arr) => (
                        <span key={i} className="lx-word" style={{ animationDelay: `${0.2 + i * 0.09}s` }}>
                           {w}{i < arr.length - 1 ? '\u00A0' : ''}
                        </span>
                     ))}
                  </h1>

                  <p className="lx-lede">
                     A regional body of the Seventh&#8209;day Adventist church,
                     stewarding under its care a register of <em>churches, teams</em>,
                     and the <em>community services</em> rendered within their bounds.
                  </p>

                  <div className="lx-hero-signature">
                     <span className="lx-sig-rule" />
                     <span className="lx-sig-text">
                        Inscribed {fmt(created)} &nbsp;&middot;&nbsp; Last revised {fmt(updated)}
                     </span>
                  </div>
               </div>
            </section>

            {/* STATISTICS */}
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

            {/* SEAT & CORRESPONDENCE */}
            <section className="lx-sec">
               <SectionHead num={numFor('seat')} title="Seat &amp; Correspondence" />

               <div className="lx-twocol">
                  {conference.headquarters && (
                     <article className="lx-entry">
                        <h3 className="lx-entry-title">Headquarters</h3>
                        <div className="lx-address">
                           {conference.headquarters.address && <p>{conference.headquarters.address}</p>}
                           <p>
                              {[conference.headquarters.city, conference.headquarters.state].filter(Boolean).join(', ')}
                              {conference.headquarters.postalCode ? ` · ${conference.headquarters.postalCode}` : ''}
                           </p>
                           {conference.headquarters.country && <p className="lx-country">{conference.headquarters.country}</p>}
                        </div>
                     </article>
                  )}

                  {conference.contact && (
                     <article className="lx-entry">
                        <h3 className="lx-entry-title">Correspondence</h3>
                        <dl className="lx-dl">
                           {conference.contact.email && (
                              <div className="lx-dl-row">
                                 <dt>By post electronic</dt>
                                 <dd><a href={`mailto:${conference.contact.email}`} className="lx-link">{conference.contact.email}</a></dd>
                              </div>
                           )}
                           {conference.contact.phone && (
                              <div className="lx-dl-row">
                                 <dt>By telephone</dt>
                                 <dd><a href={`tel:${conference.contact.phone}`} className="lx-link">{conference.contact.phone}</a></dd>
                              </div>
                           )}
                           {conference.contact.website && (
                              <div className="lx-dl-row">
                                 <dt>By world&#8209;wide web</dt>
                                 <dd>
                                    <a href={conference.contact.website} target="_blank" rel="noopener noreferrer" className="lx-link">
                                       {conference.contact.website.replace(/^https?:\/\//, '')}
                                       <span className="lx-ext">&nearr;</span>
                                    </a>
                                 </dd>
                              </div>
                           )}
                        </dl>
                     </article>
                  )}
               </div>

               {conference.territory?.description && (
                  <article className="lx-entry lx-entry--wide">
                     <h3 className="lx-entry-title">Territory</h3>
                     <p className="lx-territory">{conference.territory.description}</p>
                  </article>
               )}
            </section>

            {/* PARENT UNION */}
            {unionName && (
               <section className="lx-sec">
                  <SectionHead num={numFor('parent')} title="Held Under" meta="Parent Body" />
                  <div className="lx-parent">
                     <div className="lx-parent-card">
                        <span className="lx-parent-kicker">The Union of</span>
                        <h3 className="lx-parent-name">{unionName}</h3>
                        {unionId && (
                           <button
                              onClick={() => router.push(`/unions/${unionId}`)}
                              className="lx-parent-link"
                           >
                              <span className="lx-parent-line" />
                              <span>Open the Union&apos;s record</span>
                              <span className="lx-parent-arrow">&rarr;</span>
                           </button>
                        )}
                     </div>
                  </div>
               </section>
            )}

            {/* PROGRAMS */}
            {conference.programs && conference.programs.length > 0 && (
               <section className="lx-sec">
                  <SectionHead
                     num={numFor('programs')}
                     title="Programmes &amp; Services"
                     meta={`${conference.programs.length} on the roll`}
                  />
                  <ul className="lx-programs">
                     {conference.programs.map((program, i) => (
                        <li className="lx-program" key={`${program.name}-${i}`} style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
                           <div className="lx-program-num">{String(i + 1).padStart(2, '0')}</div>
                           <div className="lx-program-body">
                              <h4 className="lx-program-name">{program.name}</h4>
                              {program.type && (
                                 <span className="lx-program-type">
                                    {program.type.replace(/_/g, ' ')}
                                 </span>
                              )}
                              {program.description && (
                                 <p className="lx-program-desc">{program.description}</p>
                              )}
                              {(program.director || program.contact) && (
                                 <dl className="lx-program-dl">
                                    {program.director && (
                                       <div>
                                          <dt>Director</dt>
                                          <dd>{program.director}</dd>
                                       </div>
                                    )}
                                    {program.contact && (
                                       <div>
                                          <dt>Correspondent</dt>
                                          <dd>{program.contact}</dd>
                                       </div>
                                    )}
                                 </dl>
                              )}
                           </div>
                        </li>
                     ))}
                  </ul>
               </section>
            )}

            {/* COLOPHON */}
            <section className="lx-sec">
               <SectionHead
                  num={numFor('colophon')}
                  title="Colophon"
                  meta="Record of System"
               />

               <div className="lx-colophon">
                  <dl className="lx-ledger">
                     <LedgerRow label="Identifier" value={conference._id} mono />
                     <LedgerRow label="Hierarchy Path" value={conference.hierarchyPath} mono />
                     <LedgerRow label="Hierarchy Level" value={`${toRoman(conference.hierarchyLevel)}  ·  ${conference.hierarchyLevel}`} />
                     {unionName && (
                        <LedgerRow label="Held by Union" value={unionName} />
                     )}
                     <LedgerRow label="Inscribed" value={fmt(created)} />
                     <LedgerRow label="Revised" value={fmt(updated)} />
                     {conference.childCount !== undefined && (
                        <LedgerRow label="Direct Descendants" value={String(conference.childCount)} />
                     )}
                     {conference.metadata?.churchCount !== undefined && (
                        <LedgerRow label="Churches of Record" value={String(conference.metadata.churchCount)} />
                     )}
                     {conference.metadata?.membershipCount !== undefined && (
                        <LedgerRow label="Members of Record" value={String(conference.metadata.membershipCount)} />
                     )}
                     {conference.metadata?.lastReportDate && (
                        <LedgerRow label="Last Report" value={fmt(new Date(conference.metadata.lastReportDate))} />
                     )}
                  </dl>

                  <aside className="lx-seal">
                     <div className="lx-seal-outer">
                        <div className="lx-seal-mid">
                           <div className="lx-seal-inner">
                              <span className="lx-seal-glyph">C</span>
                           </div>
                        </div>
                     </div>
                     <p className="lx-seal-caption">
                        <span>Sealed under the hand of the</span>
                        <em>Office of the Conference</em>
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
   return (
      <style jsx global>{`
         :root {
            /* pure white, deep ink, burnished gold */
            --lx-black:   #ffffff;  /* page */
            --lx-ink:     #f6f2ea;  /* plate bed */
            --lx-char:    #ede6d5;  /* secondary bed */
            --lx-cream:   #141210;  /* primary text */
            --lx-cream-d: #555048;  /* secondary text */
            --lx-gold:    #a87f2b;  /* accent */
            --lx-gold-d:  #6b4f15;  /* deep accent */
            --lx-gold-l:  #8a6214;  /* rich accent */
            --lx-wine:    #5a1e20;

            --lx-poppins: var(--font-poppins), 'Poppins', system-ui, sans-serif;
            --lx-didone:  var(--lx-poppins);
            --lx-body:    var(--lx-poppins);
            --lx-accent:  var(--lx-poppins);
            --lx-mono:    var(--lx-poppins);
         }

         .lx-root {
            position: relative;
            margin: -1.5rem;
            padding: 3rem clamp(1.5rem, 5vw, 5rem) 5rem;
            background: var(--lx-black);
            color: var(--lx-cream);
            font-family: var(--lx-body);
            font-weight: 300;
            min-height: calc(100vh - 4rem);
            overflow: hidden;
         }

         .lx-vignette {
            position: absolute; inset: 0; pointer-events: none; z-index: 0;
            background:
               radial-gradient(ellipse 90% 70% at 50% 0%, rgba(168, 127, 43, 0.09), transparent 55%),
               radial-gradient(ellipse 70% 50% at 0% 100%, rgba(90, 30, 32, 0.05), transparent 60%),
               radial-gradient(ellipse 140% 100% at 50% 50%, transparent 60%, rgba(90, 70, 30, 0.06) 100%);
         }
         .lx-grain {
            position: absolute; inset: 0; pointer-events: none; z-index: 0;
            opacity: 0.5; mix-blend-mode: multiply;
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.28 0 0 0 0 0.18 0 0 0 0.18 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
         }
         .lx-glow {
            position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
            width: 900px; height: 900px; pointer-events: none; z-index: 0;
            background: radial-gradient(circle, rgba(168, 127, 43, 0.10), transparent 55%);
            filter: blur(40px);
            animation: lx-breathe 12s ease-in-out infinite;
         }
         @keyframes lx-breathe {
            0%, 100% { opacity: 0.9; transform: translateX(-50%) scale(1); }
            50% { opacity: 0.55; transform: translateX(-50%) scale(1.08); }
         }

         .lx-root > *:not(.lx-vignette):not(.lx-grain):not(.lx-glow) {
            position: relative; z-index: 1;
         }

         /* TOP BAR */
         .lx-top {
            display: flex; justify-content: space-between; align-items: center;
            padding-bottom: 1.25rem;
            border-bottom: 1px solid rgba(201, 169, 97, 0.22);
            font-family: var(--lx-mono);
            font-weight: 300;
            font-size: 0.68rem;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--lx-cream-d);
            animation: lx-fade 1.2s ease-out both;
         }
         .lx-back {
            background: none; border: none; cursor: pointer;
            display: inline-flex; align-items: center; gap: 0.8rem;
            font: inherit; color: var(--lx-cream-d);
            padding: 0;
            transition: color 0.35s, letter-spacing 0.4s;
         }
         .lx-back-line {
            display: inline-block; width: 28px; height: 1px;
            background: var(--lx-gold); transition: width 0.4s;
         }
         .lx-back:hover { color: var(--lx-gold-l); letter-spacing: 0.28em; }
         .lx-back:hover .lx-back-line { width: 44px; background: var(--lx-gold-l); }

         .lx-top-meta { display: inline-flex; align-items: center; gap: 0.9rem; }
         .lx-monogram {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 500;
            font-style: italic;
            font-size: 1.1rem;
            letter-spacing: 0;
            color: var(--lx-gold);
            text-transform: none;
         }
         .lx-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--lx-gold-d); }
         .lx-state { display: inline-flex; align-items: center; gap: 0.5rem; }
         .lx-state-dot {
            width: 5px; height: 5px; border-radius: 50%;
            background: var(--lx-cream-d);
         }
         .lx-state.on .lx-state-dot {
            background: var(--lx-gold-l);
            box-shadow: 0 0 8px var(--lx-gold), 0 0 16px rgba(201, 169, 97, 0.4);
            animation: lx-ember 2.4s ease-in-out infinite;
         }
         @keyframes lx-ember {
            0%, 100% { box-shadow: 0 0 8px var(--lx-gold), 0 0 16px rgba(201, 169, 97, 0.4); }
            50%      { box-shadow: 0 0 4px var(--lx-gold), 0 0 8px rgba(201, 169, 97, 0.2); }
         }

         /* AVATAR */
         .lx-hero--avatar {
            display: flex;
            align-items: center;
            gap: clamp(2rem, 4vw, 4rem);
            padding: 4rem 0 4.5rem;
         }
         @media (max-width: 760px) {
            .lx-hero--avatar { flex-direction: column; align-items: flex-start; gap: 2rem; padding: 2.5rem 0 3rem; }
         }
         .lx-avatar {
            position: relative;
            width: clamp(140px, 16vw, 200px);
            height: clamp(140px, 16vw, 200px);
            flex-shrink: 0;
            animation: lx-fade 1.4s ease-out 0.3s both;
         }
         .lx-avatar-ring {
            position: absolute; inset: -14px;
            border: 1px solid var(--lx-gold);
            border-radius: 50%;
            opacity: 0.55;
            animation: lx-rotate 60s linear infinite;
         }
         .lx-avatar-ring::before, .lx-avatar-ring::after {
            content: ''; position: absolute;
            width: 8px; height: 8px; border-radius: 50%;
            background: var(--lx-gold);
            top: 50%; transform: translateY(-50%);
         }
         .lx-avatar-ring::before { left: -4px; }
         .lx-avatar-ring::after  { right: -4px; }
         .lx-avatar-ring--2 {
            inset: -26px;
            border-style: dotted;
            border-color: var(--lx-gold-d);
            opacity: 0.35;
            animation-duration: 120s;
            animation-direction: reverse;
         }
         .lx-avatar-ring--2::before, .lx-avatar-ring--2::after { display: none; }

         .lx-avatar-inner {
            position: relative;
            width: 100%; height: 100%;
            border-radius: 50%;
            overflow: hidden;
            border: 1px solid var(--lx-gold);
            box-shadow:
               0 1px 0 rgba(255, 255, 255, 0.6) inset,
               0 0 0 4px var(--lx-black),
               0 0 0 5px rgba(168, 127, 43, 0.35),
               0 24px 50px -20px rgba(107, 79, 21, 0.35);
            background: var(--lx-ink);
            transition: box-shadow 0.5s, transform 0.8s;
         }
         .lx-avatar:hover .lx-avatar-inner {
            transform: scale(1.03);
            box-shadow:
               0 1px 0 rgba(255, 255, 255, 0.6) inset,
               0 0 0 4px var(--lx-black),
               0 0 0 5px var(--lx-gold),
               0 28px 60px -18px rgba(107, 79, 21, 0.5);
         }
         .lx-avatar-inner .lx-banner-img {
            object-fit: cover;
            filter: sepia(0.2) saturate(0.85) contrast(1.04);
            transition: filter 1s, transform 6s ease-out;
         }
         .lx-avatar:hover .lx-banner-img {
            filter: sepia(0.08) saturate(0.95) contrast(1);
            transform: scale(1.08);
         }
         .lx-avatar-inner .lx-banner-fallback::after {
            font-size: 3.2rem;
         }
         .lx-avatar-mark {
            position: absolute;
            right: -4px; bottom: 4px;
            width: 32px; height: 32px;
            border-radius: 50%;
            background: var(--lx-black);
            border: 1px solid var(--lx-gold);
            color: var(--lx-gold);
            display: flex; align-items: center; justify-content: center;
            font-size: 0.85rem;
            box-shadow: 0 4px 12px -4px rgba(107, 79, 21, 0.4);
         }

         /* HERO */
         .lx-hero {
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: clamp(2rem, 5vw, 5rem);
            padding: 4rem 0 5rem;
            align-items: center;
         }
         @media (max-width: 960px) {
            .lx-hero { grid-template-columns: 1fr; padding: 2.5rem 0 3rem; }
         }

         .lx-kicker {
            display: flex; align-items: center; gap: 1rem;
            flex-wrap: wrap;
            font-family: var(--lx-mono);
            font-weight: 300;
            font-size: 0.7rem;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: var(--lx-gold);
            margin: 0 0 2rem;
            animation: lx-fade 1.2s ease-out 0.15s both;
         }
         .lx-kicker-rule {
            display: inline-block; width: 46px; height: 1px; background: var(--lx-gold);
         }
         .lx-kicker-link {
            background: none; border: none; padding: 0;
            font: inherit;
            color: var(--lx-gold-l);
            text-transform: none;
            letter-spacing: 0.04em;
            font-style: italic;
            cursor: pointer;
            transition: color 0.3s, text-shadow 0.3s;
         }
         .lx-kicker-link:hover {
            color: var(--lx-gold);
            text-shadow: 0 0 12px rgba(168, 127, 43, 0.35);
         }

         .lx-title {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-size: clamp(3.2rem, 7vw, 6.4rem);
            line-height: 0.96;
            letter-spacing: -0.015em;
            margin: 0 0 2.2rem;
            color: var(--lx-cream);
         }
         .lx-word {
            display: inline-block;
            opacity: 0;
            animation: lx-rise 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
         }
         .lx-title .lx-word:nth-child(even) {
            font-style: italic;
            font-variation-settings: "opsz" 96, "wght" 400;
            color: var(--lx-gold-l);
         }
         @keyframes lx-rise {
            from { opacity: 0; transform: translateY(30px); filter: blur(6px); }
            to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
         }
         @keyframes lx-fade {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
         }

         .lx-lede {
            font-family: var(--lx-body);
            font-weight: 300;
            font-size: clamp(1.1rem, 1.3vw, 1.3rem);
            line-height: 1.7;
            color: var(--lx-cream-d);
            max-width: 46ch;
            margin: 0 0 2.5rem;
            animation: lx-fade 1.4s ease-out 0.5s both;
         }
         .lx-lede em {
            font-style: italic;
            color: var(--lx-cream);
            text-decoration: underline;
            text-decoration-color: var(--lx-gold-d);
            text-decoration-thickness: 0.5px;
            text-underline-offset: 4px;
         }

         .lx-hero-signature {
            display: flex; align-items: center; gap: 1rem;
            animation: lx-fade 1.4s ease-out 0.8s both;
         }
         .lx-sig-rule { width: 32px; height: 1px; background: var(--lx-gold-d); }
         .lx-sig-text {
            font-family: var(--lx-accent);
            font-size: 0.9rem;
            letter-spacing: 0.06em;
            color: var(--lx-cream-d);
         }

         /* BANNER (avatar content) */
         .lx-banner-img {
            object-fit: cover;
            filter: brightness(0.98) contrast(1.02) saturate(0.7) sepia(0.25);
            transition: filter 1.2s, transform 10s ease-out;
         }
         .lx-banner-fallback {
            position: absolute; inset: 0;
            background:
               radial-gradient(ellipse at 50% 40%, rgba(168, 127, 43, 0.18), transparent 60%),
               linear-gradient(180deg, var(--lx-ink), var(--lx-char));
         }
         .lx-banner-fallback::after {
            content: '\\269C'; /* fleur de lis */
            position: absolute; inset: 0;
            display: flex; align-items: center; justify-content: center;
            font-family: var(--lx-didone);
            font-size: 6rem;
            color: var(--lx-gold);
            opacity: 0.4;
         }

         /* SECTIONS */
         .lx-sec {
            padding: 4rem 0;
            border-top: 1px solid rgba(201, 169, 97, 0.18);
            animation: lx-fade 1.4s ease-out 0.6s both;
         }
         .lx-sec-head {
            display: flex; align-items: baseline; gap: 1.4rem;
            margin-bottom: 3rem;
         }
         .lx-sec-num {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-style: italic;
            font-size: 2rem;
            color: var(--lx-gold);
         }
         .lx-sec-title {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 72, "wght" 400;
            font-size: clamp(1.6rem, 2.4vw, 2.2rem);
            font-weight: 400;
            letter-spacing: 0;
            margin: 0;
            color: var(--lx-cream);
         }
         .lx-sec-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--lx-gold-d), transparent); }
         .lx-sec-meta {
            font-family: var(--lx-accent);
            font-size: 0.95rem;
            letter-spacing: 0.06em;
            color: var(--lx-cream-d);
         }

         /* STATS */
         .lx-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.2rem;
         }
         @media (max-width: 760px) { .lx-stats { grid-template-columns: repeat(2, 1fr); } }

         .lx-stat {
            opacity: 0;
            animation: lx-rise 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both;
            text-align: center;
         }
         .lx-stat-frame {
            position: relative;
            aspect-ratio: 4 / 5;
            border: 1px solid rgba(168, 127, 43, 0.4);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 1rem;
            background:
               radial-gradient(ellipse at 50% 35%, rgba(168, 127, 43, 0.07), transparent 70%),
               linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(241, 235, 220, 0.4));
            transition: border-color 0.4s, transform 0.6s, box-shadow 0.6s;
         }
         .lx-stat-frame::before {
            content: ''; position: absolute; inset: 5px;
            border: 1px solid rgba(168, 127, 43, 0.22);
            pointer-events: none;
         }
         .lx-stat:hover .lx-stat-frame {
            border-color: var(--lx-gold);
            transform: translateY(-4px);
            box-shadow: 0 14px 40px -20px rgba(107, 79, 21, 0.4);
         }
         .lx-stat-num {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-size: clamp(3.5rem, 6vw, 5rem);
            line-height: 1;
            color: var(--lx-cream);
            font-feature-settings: "lnum" 1, "tnum" 1;
         }
         .lx-stat:nth-child(even) .lx-stat-num {
            font-style: italic;
            color: var(--lx-gold-l);
         }
         .lx-stat-ornament {
            margin-top: 0.7rem;
            color: var(--lx-gold);
            font-size: 0.85rem;
            opacity: 0.7;
         }
         .lx-stat-label {
            font-family: var(--lx-mono);
            font-weight: 300;
            font-size: 0.68rem;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: var(--lx-cream-d);
            margin-top: 1rem;
         }

         /* TWOCOL */
         .lx-twocol {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: clamp(2rem, 4vw, 4rem);
         }
         @media (max-width: 760px) { .lx-twocol { grid-template-columns: 1fr; } }

         .lx-entry-title {
            font-family: var(--lx-accent);
            font-size: 1.4rem;
            font-weight: 400;
            color: var(--lx-gold-l);
            margin: 0 0 1.4rem;
            padding-bottom: 0.8rem;
            border-bottom: 1px solid rgba(201, 169, 97, 0.2);
            letter-spacing: 0.04em;
         }
         .lx-entry--wide { margin-top: 3rem; }
         .lx-territory {
            margin: 0;
            font-family: var(--lx-body);
            font-weight: 300;
            font-size: 1.1rem;
            line-height: 1.7;
            color: var(--lx-cream);
            max-width: 72ch;
            font-style: italic;
         }
         .lx-address p { margin: 0 0 0.3rem; font-size: 1.1rem; color: var(--lx-cream); line-height: 1.55; }
         .lx-country {
            font-style: italic;
            color: var(--lx-gold-l);
            margin-top: 0.6rem !important;
         }

         .lx-dl { margin: 0; }
         .lx-dl-row {
            display: grid;
            grid-template-columns: 1fr 1.4fr;
            gap: 1.5rem;
            padding: 0.9rem 0;
            border-bottom: 1px solid rgba(201, 169, 97, 0.12);
            align-items: baseline;
         }
         .lx-dl-row dt {
            font-family: var(--lx-accent);
            font-size: 0.95rem;
            letter-spacing: 0.04em;
            color: var(--lx-cream-d);
         }
         .lx-dl-row dd {
            margin: 0;
            font-family: var(--lx-body);
            font-weight: 300;
            font-size: 1.1rem;
            color: var(--lx-cream);
         }
         .lx-link {
            color: var(--lx-cream);
            text-decoration: none;
            background-image: linear-gradient(var(--lx-gold), var(--lx-gold));
            background-size: 0% 1px;
            background-repeat: no-repeat;
            background-position: 0 100%;
            padding-bottom: 2px;
            transition: color 0.3s, background-size 0.45s ease;
         }
         .lx-link:hover { color: var(--lx-gold-l); background-size: 100% 1px; }
         .lx-ext { margin-left: 0.35rem; color: var(--lx-gold); font-size: 0.9em; }

         /* PARENT UNION */
         .lx-parent {
            display: flex;
            justify-content: center;
         }
         .lx-parent-card {
            max-width: 520px;
            width: 100%;
            text-align: center;
            padding: 3rem 2.4rem;
            border: 1px solid rgba(168, 127, 43, 0.35);
            position: relative;
            background:
               radial-gradient(ellipse at 50% 0%, rgba(168, 127, 43, 0.08), transparent 70%),
               linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(241, 235, 220, 0.35));
         }
         .lx-parent-card::before {
            content: ''; position: absolute; inset: 8px;
            border: 1px solid rgba(168, 127, 43, 0.18);
            pointer-events: none;
         }
         .lx-parent-kicker {
            display: inline-block;
            font-family: var(--lx-mono);
            font-size: 0.62rem;
            letter-spacing: 0.32em;
            text-transform: uppercase;
            color: var(--lx-gold);
            margin-bottom: 1.2rem;
         }
         .lx-parent-name {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-style: italic;
            font-size: clamp(1.8rem, 3vw, 2.6rem);
            line-height: 1.1;
            color: var(--lx-cream);
            margin: 0 0 1.8rem;
         }
         .lx-parent-link {
            background: none; border: none; cursor: pointer;
            display: inline-flex; align-items: center; gap: 0.8rem;
            font-family: var(--lx-mono);
            font-weight: 300;
            font-size: 0.7rem;
            letter-spacing: 0.28em;
            text-transform: uppercase;
            color: var(--lx-gold-l);
            padding: 0.6rem 0;
            transition: color 0.3s, letter-spacing 0.4s;
         }
         .lx-parent-line {
            display: inline-block; width: 28px; height: 1px;
            background: var(--lx-gold); transition: width 0.4s;
         }
         .lx-parent-arrow {
            transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
         }
         .lx-parent-link:hover {
            color: var(--lx-gold);
            letter-spacing: 0.33em;
         }
         .lx-parent-link:hover .lx-parent-line { width: 44px; }
         .lx-parent-link:hover .lx-parent-arrow { transform: translateX(6px); }

         /* PROGRAMS */
         .lx-programs {
            list-style: none; margin: 0; padding: 0;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.2rem;
         }
         .lx-program {
            display: flex;
            gap: 1.2rem;
            padding: 1.4rem 1.4rem 1.6rem;
            border: 1px solid rgba(168, 127, 43, 0.2);
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(249, 245, 236, 0.3));
            opacity: 0;
            animation: lx-rise 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
            transition: border-color 0.4s, transform 0.5s, box-shadow 0.5s;
            position: relative;
         }
         .lx-program::before {
            content: ''; position: absolute;
            top: 0; left: 0;
            width: 100%; height: 1px;
            background: linear-gradient(90deg, var(--lx-gold), transparent);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
         }
         .lx-program:hover {
            border-color: var(--lx-gold);
            transform: translateY(-3px);
            box-shadow: 0 18px 40px -22px rgba(107, 79, 21, 0.32);
         }
         .lx-program:hover::before { transform: scaleX(1); }

         .lx-program-num {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-size: 1.6rem;
            font-style: italic;
            color: var(--lx-gold-l);
            line-height: 1;
            padding-top: 0.1rem;
            min-width: 2.2ch;
            font-feature-settings: "lnum" 1, "tnum" 1;
         }
         .lx-program-body { flex: 1; min-width: 0; }
         .lx-program-name {
            font-family: var(--lx-didone);
            font-size: 1.2rem;
            font-weight: 400;
            color: var(--lx-cream);
            margin: 0 0 0.5rem;
            letter-spacing: -0.005em;
         }
         .lx-program-type {
            display: inline-block;
            font-family: var(--lx-mono);
            font-size: 0.58rem;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: var(--lx-gold);
            border: 1px solid rgba(168, 127, 43, 0.35);
            padding: 0.25rem 0.55rem;
            margin-bottom: 0.9rem;
         }
         .lx-program-desc {
            font-size: 0.92rem;
            line-height: 1.6;
            color: var(--lx-cream-d);
            margin: 0 0 1rem;
         }
         .lx-program-dl {
            margin: 0.6rem 0 0;
            padding-top: 0.6rem;
            border-top: 1px dotted rgba(20, 18, 16, 0.15);
            display: flex; flex-direction: column; gap: 0.3rem;
         }
         .lx-program-dl > div {
            display: flex; gap: 0.7rem;
            font-size: 0.85rem;
         }
         .lx-program-dl dt {
            font-family: var(--lx-mono);
            font-size: 0.6rem;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--lx-gold-d);
            min-width: 10ch;
         }
         .lx-program-dl dd {
            margin: 0;
            color: var(--lx-cream);
            font-weight: 400;
         }

         /* COLOPHON */
         .lx-colophon {
            display: grid;
            grid-template-columns: 1fr 260px;
            gap: 4rem;
            align-items: start;
         }
         @media (max-width: 860px) { .lx-colophon { grid-template-columns: 1fr; } }

         .lx-ledger { margin: 0; }
         .lx-ledger-row {
            display: grid;
            grid-template-columns: 260px 1fr;
            gap: 2rem;
            padding: 1rem 0;
            border-bottom: 1px solid rgba(201, 169, 97, 0.14);
            align-items: baseline;
         }
         .lx-ledger-row:first-child { border-top: 1px solid rgba(201, 169, 97, 0.14); }
         .lx-ledger-row dt {
            font-family: var(--lx-mono);
            font-weight: 300;
            font-size: 0.65rem;
            letter-spacing: 0.26em;
            text-transform: uppercase;
            color: var(--lx-gold-d);
         }
         .lx-ledger-row dd {
            margin: 0;
            font-family: var(--lx-body);
            font-weight: 300;
            font-size: 1.1rem;
            color: var(--lx-cream);
         }
         .lx-ledger-row dd.mono {
            font-family: var(--lx-mono);
            font-size: 0.82rem;
            color: var(--lx-cream-d);
            word-break: break-all;
         }

         /* SEAL */
         .lx-seal { text-align: center; }
         .lx-seal-outer {
            width: 180px; height: 180px;
            border: 1px solid var(--lx-gold);
            border-radius: 50%;
            margin: 0 auto 1.5rem;
            padding: 8px;
            position: relative;
            background: radial-gradient(circle, rgba(201, 169, 97, 0.08), transparent 70%);
            animation: lx-rotate 90s linear infinite;
         }
         .lx-seal-outer::before {
            content: ''; position: absolute; inset: -10px;
            border: 1px dotted var(--lx-gold-d); border-radius: 50%; opacity: 0.5;
         }
         .lx-seal-mid {
            width: 100%; height: 100%;
            border: 1px dashed rgba(201, 169, 97, 0.5);
            border-radius: 50%;
            padding: 10px;
         }
         .lx-seal-inner {
            width: 100%; height: 100%;
            border: 1px solid var(--lx-gold);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            background: radial-gradient(circle, rgba(201, 169, 97, 0.12), transparent 65%);
         }
         .lx-seal-glyph {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-style: italic;
            font-size: 5rem;
            color: var(--lx-gold-l);
            animation: lx-counter-rotate 90s linear infinite;
            text-shadow: 0 0 20px rgba(201, 169, 97, 0.4);
         }
         @keyframes lx-rotate         { to { transform: rotate(360deg); } }
         @keyframes lx-counter-rotate { to { transform: rotate(-360deg); } }

         .lx-seal-caption {
            font-family: var(--lx-accent);
            font-size: 0.95rem;
            line-height: 1.6;
            color: var(--lx-cream-d);
            margin: 0;
            display: flex; flex-direction: column; gap: 0.25rem;
         }
         .lx-seal-caption em {
            font-style: italic;
            color: var(--lx-gold-l);
         }

         /* FOOTER */
         .lx-foot {
            margin-top: 4rem;
            display: flex; align-items: center; justify-content: center;
            gap: 1.2rem;
         }
         .lx-foot-rule { display: inline-block; width: 80px; height: 1px; background: var(--lx-gold-d); }
         .lx-foot-glyph {
            font-family: var(--lx-didone);
            color: var(--lx-gold);
            font-size: 1rem;
         }

         /* LOADING */
         .lx-loading {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            min-height: 60vh;
            background: var(--lx-black);
            margin: -1.5rem;
            color: var(--lx-cream);
         }
         .lx-loading-ring {
            width: 70px; height: 70px; border-radius: 50%;
            border: 1px solid var(--lx-gold);
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 1.5rem;
            animation: lx-rotate 4s linear infinite;
         }
         .lx-loading-glyph {
            font-size: 1.2rem; color: var(--lx-gold-l);
            animation: lx-counter-rotate 4s linear infinite;
         }
         .lx-loading-text {
            font-family: var(--lx-accent);
            font-size: 1rem;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: var(--lx-cream-d);
         }

         /* NOTFOUND */
         .lx-notfound {
            max-width: 560px; margin: 6rem auto; padding: 2rem;
            text-align: center; background: var(--lx-black); color: var(--lx-cream);
         }
         .lx-notfound-title {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-style: italic;
            font-size: 2.4rem;
            margin: 1rem 0;
         }
         .lx-notfound-body { color: var(--lx-cream-d); line-height: 1.7; margin-bottom: 2rem; font-size: 1.1rem; }
         .lx-btn {
            font-family: var(--lx-mono);
            font-weight: 300;
            font-size: 0.7rem;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            background: transparent;
            color: var(--lx-gold-l);
            border: 1px solid var(--lx-gold);
            padding: 1rem 2.2rem;
            cursor: pointer;
            transition: background 0.4s, color 0.4s, letter-spacing 0.4s;
         }
         .lx-btn:hover {
            background: var(--lx-gold);
            color: #fbf8f1;
            letter-spacing: 0.35em;
         }
      `}</style>
   );
}
