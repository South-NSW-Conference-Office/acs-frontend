'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { toast } from '@/components/ui/use-toast';
import { teamTypeService, TeamType, CreateTeamTypeData } from '@/lib/teamTypes';
import { CreateTeamTypeModal } from '@/components/teamTypes/CreateTeamTypeModal';

export default function TeamTypeDetailPage() {
   const params = useParams();
   const router = useRouter();
   const teamTypeId = params?.id as string;

   const [teamType, setTeamType] = useState<TeamType | null>(null);
   const [loading, setLoading] = useState(true);
   const [editOpen, setEditOpen] = useState(false);

   const fetchTeamType = useCallback(async () => {
      try {
         setLoading(true);
         const response = await teamTypeService.getTeamType(teamTypeId);
         if (response.success && response.data) {
            setTeamType(response.data);
         } else {
            throw new Error('Failed to fetch team type');
         }
      } catch (error) {
         console.error('Failed to fetch team type:', error);
         toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to load team type',
            variant: 'destructive',
         });
         router.push('/team-types');
      } finally {
         setLoading(false);
      }
   }, [teamTypeId, router]);

   useEffect(() => { fetchTeamType(); }, [fetchTeamType]);

   const handleUpdate = async (data: CreateTeamTypeData) => {
      try {
         const response = await teamTypeService.updateTeamType(teamTypeId, data);
         if (response.success && response.data) {
            setTeamType(response.data);
            toast({ title: 'Team type updated', description: 'The kind has been amended.' });
            setEditOpen(false);
         }
      } catch (error) {
         toast({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to update team type',
            variant: 'destructive',
         });
         throw error;
      }
   };

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

   if (!teamType) {
      return (
         <AdminLayout title="Team Type Not Found" description="Not found">
            <LuxuryStyles />
            <div className="lx-notfound">
               <p className="lx-kicker">Absent from the Roll</p>
               <h2 className="lx-notfound-title">No such kind is held in record.</h2>
               <p className="lx-notfound-body">
                  The archive does not recognise this identifier.
               </p>
               <button onClick={() => router.push('/team-types')} className="lx-btn">
                  Return to the Roll
               </button>
            </div>
         </AdminLayout>
      );
   }

   const created = new Date(teamType.createdAt);
   const updated = new Date(teamType.updatedAt);
   const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
   const fmt = (d: Date) => `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

   const teamCount = teamType.teamCount ?? 0;
   const hasStats = teamCount > 0;

   const sectionOrder: string[] = [];
   if (hasStats) sectionOrder.push('stats');
   sectionOrder.push('designation');
   sectionOrder.push('colophon');
   const roman = ['I', 'II', 'III', 'IV'];
   const numFor = (key: string) => roman[sectionOrder.indexOf(key)] || 'I';

   return (
      <AdminLayout title={teamType.name} description="Team Type" hideTitle={true} hideHeader={true}>
         <LuxuryStyles />

         <div className="lx-root">
            <div className="lx-vignette" aria-hidden />
            <div className="lx-grain" aria-hidden />
            <div className="lx-glow" aria-hidden />

            {/* TOP BAR */}
            <header className="lx-top">
               <button onClick={() => router.push('/team-types')} className="lx-back">
                  <span className="lx-back-line" />
                  <span>The Roll of Kinds</span>
               </button>
               <div className="lx-top-meta">
                  <span className="lx-monogram">TT</span>
                  <span className="lx-dot" />
                  <span>Register № {(teamType._id || '').slice(-6).toUpperCase()}</span>
                  <span className="lx-dot" />
                  <span className={`lx-state ${teamType.isActive ? 'on' : 'off'}`}>
                     <span className="lx-state-dot" />
                     {teamType.isActive ? 'In Standing' : 'Dormant'}
                  </span>
               </div>
            </header>

            {/* HERO */}
            <section className="lx-hero lx-hero--avatar">
               <div className="lx-avatar">
                  <span className="lx-avatar-ring" />
                  <span className="lx-avatar-ring lx-avatar-ring--2" />
                  <div className="lx-avatar-inner">
                     <div className="lx-avatar-monogram">
                        <span>{(teamType.name || 'T').charAt(0)}</span>
                     </div>
                  </div>
                  <span className="lx-avatar-mark">&#10022;</span>
               </div>

               <div className="lx-hero-text">
                  <p className="lx-kicker">
                     <span className="lx-kicker-rule" />
                     Team Type&nbsp;&middot;&nbsp;
                     {teamType.isDefault ? 'Default Designation' : 'Custom Designation'}
                  </p>

                  <h1 className="lx-title">
                     {teamType.name.split(' ').map((w, i, arr) => (
                        <span key={i} className="lx-word" style={{ animationDelay: `${0.2 + i * 0.09}s` }}>
                           {w}{i < arr.length - 1 ? '\u00A0' : ''}
                        </span>
                     ))}
                  </h1>

                  <p className="lx-lede">
                     A <em>kind</em> by which teams are classified within the register &mdash;
                     a mark of <em>ministry, craft</em>, or <em>service</em> borne in common.
                  </p>

                  <div className="lx-hero-signature">
                     <span className="lx-sig-rule" />
                     <span className="lx-sig-text">
                        Inscribed {fmt(created)} &nbsp;&middot;&nbsp; Last revised {fmt(updated)}
                     </span>
                  </div>

                  <div className="lx-hero-actions">
                     <button onClick={() => setEditOpen(true)} className="lx-btn lx-btn--compact">
                        Amend Record
                     </button>
                     <button
                        onClick={() => router.push(`/teams?teamType=${teamType._id}`)}
                        className="lx-btn lx-btn--ghost lx-btn--compact"
                     >
                        View Teams &rarr;
                     </button>
                  </div>
               </div>
            </section>

            {/* HOLDINGS */}
            {hasStats && (
               <section className="lx-sec">
                  <SectionHead num={numFor('stats')} title="The Holdings" meta={`As of ${fmt(updated)}`} />
                  <div className="lx-stats lx-stats--single">
                     <div className="lx-stat" style={{ animationDelay: '0.4s' }}>
                        <div className="lx-stat-frame">
                           <div className="lx-stat-num">{String(teamCount).padStart(2, '0')}</div>
                           <div className="lx-stat-ornament">&#10022;</div>
                        </div>
                        <div className="lx-stat-label">Teams bearing this kind</div>
                     </div>
                  </div>
               </section>
            )}

            {/* DESIGNATION (description) */}
            <section className="lx-sec">
               <SectionHead num={numFor('designation')} title="The Designation" />
               <div className="lx-designation">
                  {teamType.description ? (
                     <p className="lx-designation-body">{teamType.description}</p>
                  ) : (
                     <p className="lx-designation-empty">
                        No designation has yet been entered into the register for this kind.
                        Amend the record to describe its nature and purpose.
                     </p>
                  )}

                  <dl className="lx-attrs">
                     <div className="lx-attrs-row">
                        <dt>Class</dt>
                        <dd>
                           <span className={`lx-chip-class ${teamType.isDefault ? 'is-default' : ''}`}>
                              {teamType.isDefault ? 'Default &mdash; System' : 'Custom &mdash; User'}
                           </span>
                        </dd>
                     </div>
                     <div className="lx-attrs-row">
                        <dt>Standing</dt>
                        <dd>
                           <span className={`lx-chip-state ${teamType.isActive ? 'on' : 'off'}`}>
                              <span className="lx-chip-state-dot" />
                              {teamType.isActive ? 'In Standing' : 'Dormant'}
                           </span>
                        </dd>
                     </div>
                     <div className="lx-attrs-row">
                        <dt>Teams held</dt>
                        <dd className="lx-attrs-num">{teamCount}</dd>
                     </div>
                  </dl>
               </div>
            </section>

            {/* COLOPHON */}
            <section className="lx-sec">
               <SectionHead num={numFor('colophon')} title="Colophon" meta="Record of System" />
               <div className="lx-colophon">
                  <dl className="lx-ledger">
                     <LedgerRow label="Identifier" value={teamType._id} mono />
                     <LedgerRow label="Name" value={teamType.name} />
                     <LedgerRow label="Class" value={teamType.isDefault ? 'Default (system)' : 'Custom (user)'} />
                     <LedgerRow label="Standing" value={teamType.isActive ? 'Active' : 'Dormant'} />
                     <LedgerRow label="Teams of Record" value={String(teamCount)} />
                     <LedgerRow label="Inscribed" value={fmt(created)} />
                     <LedgerRow label="Revised" value={fmt(updated)} />
                  </dl>

                  <aside className="lx-seal">
                     <div className="lx-seal-outer">
                        <div className="lx-seal-mid">
                           <div className="lx-seal-inner">
                              <span className="lx-seal-glyph">T</span>
                           </div>
                        </div>
                     </div>
                     <p className="lx-seal-caption">
                        <span>Sealed under the hand of the</span>
                        <em>Office of Classification</em>
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

         <CreateTeamTypeModal
            open={editOpen}
            onOpenChange={setEditOpen}
            onSubmit={handleUpdate}
            editTeamType={teamType}
            mode="edit"
         />
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
            --lx-black:   #ffffff;
            --lx-ink:     #f6f2ea;
            --lx-char:    #ede6d5;
            --lx-cream:   #141210;
            --lx-cream-d: #555048;
            --lx-gold:    #a87f2b;
            --lx-gold-d:  #6b4f15;
            --lx-gold-l:  #8a6214;
            --lx-wine:    #5a1e20;
            --lx-blue:    #3d5a80;

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
            gap: 1rem;
            flex-wrap: wrap;
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
         .lx-top-meta { display: inline-flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; }
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

         /* HERO */
         .lx-hero {
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: clamp(2rem, 5vw, 5rem);
            padding: 4rem 0 5rem;
            align-items: center;
         }
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
            display: flex; align-items: center; justify-content: center;
         }
         .lx-avatar:hover .lx-avatar-inner {
            transform: scale(1.03);
            box-shadow:
               0 1px 0 rgba(255, 255, 255, 0.6) inset,
               0 0 0 4px var(--lx-black),
               0 0 0 5px var(--lx-gold),
               0 28px 60px -18px rgba(107, 79, 21, 0.5);
         }
         .lx-avatar-monogram {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-style: italic;
            font-size: clamp(4.5rem, 8vw, 6.5rem);
            color: var(--lx-gold-l);
            text-shadow: 0 0 20px rgba(201, 169, 97, 0.3);
            background:
               radial-gradient(circle at 40% 35%, rgba(168, 127, 43, 0.18), transparent 65%),
               linear-gradient(180deg, #fbf6ea, #efe5ce);
            transition: transform 1.2s;
         }
         .lx-avatar:hover .lx-avatar-monogram {
            transform: scale(1.05);
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

         .lx-hero-actions {
            display: flex; gap: 1rem; flex-wrap: wrap;
            margin-top: 2rem;
            animation: lx-fade 1.4s ease-out 1s both;
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
         .lx-stats--single {
            grid-template-columns: 1fr;
            max-width: 280px;
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
         .lx-stats--single .lx-stat-num {
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

         /* DESIGNATION */
         .lx-designation {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 3rem;
            align-items: start;
         }
         @media (max-width: 860px) { .lx-designation { grid-template-columns: 1fr; } }
         .lx-designation-body {
            font-family: var(--lx-body);
            font-size: clamp(1.05rem, 1.15vw, 1.2rem);
            line-height: 1.75;
            color: var(--lx-cream);
            margin: 0;
            font-weight: 300;
            max-width: 62ch;
         }
         .lx-designation-empty {
            font-family: var(--lx-body);
            font-size: 1rem;
            font-style: italic;
            color: var(--lx-cream-d);
            line-height: 1.7;
            margin: 0;
            max-width: 62ch;
         }

         .lx-attrs { margin: 0; }
         .lx-attrs-row {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 1.5rem;
            padding: 0.9rem 0;
            border-bottom: 1px solid rgba(201, 169, 97, 0.12);
            align-items: center;
         }
         .lx-attrs-row:first-child { border-top: 1px solid rgba(201, 169, 97, 0.12); }
         .lx-attrs-row dt {
            font-family: var(--lx-mono);
            font-size: 0.6rem;
            letter-spacing: 0.26em;
            text-transform: uppercase;
            color: var(--lx-gold-d);
            font-weight: 500;
         }
         .lx-attrs-row dd { margin: 0; }
         .lx-attrs-num {
            font-family: var(--lx-didone);
            font-variation-settings: "opsz" 96, "wght" 400;
            font-style: italic;
            font-size: 1.6rem;
            color: var(--lx-gold-l);
            font-feature-settings: "lnum" 1, "tnum" 1;
         }
         .lx-chip-class {
            display: inline-block;
            font-family: var(--lx-mono);
            font-size: 0.6rem;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: var(--lx-cream-d);
            border: 1px solid rgba(20, 18, 16, 0.2);
            padding: 0.35rem 0.8rem;
         }
         .lx-chip-class.is-default {
            color: var(--lx-blue);
            border-color: rgba(61, 90, 128, 0.4);
            background: rgba(61, 90, 128, 0.05);
         }
         .lx-chip-state {
            display: inline-flex; align-items: center; gap: 0.5rem;
            font-family: var(--lx-mono);
            font-size: 0.62rem;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: var(--lx-cream-d);
            font-weight: 500;
         }
         .lx-chip-state-dot {
            width: 5px; height: 5px; border-radius: 50%;
            background: var(--lx-cream-d);
         }
         .lx-chip-state.on { color: #6b7d3a; }
         .lx-chip-state.on .lx-chip-state-dot {
            background: #6b7d3a;
            box-shadow: 0 0 8px rgba(107, 125, 58, 0.45);
            animation: lx-ember-green 2.6s ease-in-out infinite;
         }
         @keyframes lx-ember-green {
            0%, 100% { box-shadow: 0 0 8px rgba(107, 125, 58, 0.45); }
            50%      { box-shadow: 0 0 4px rgba(107, 125, 58, 0.18); }
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
         .lx-seal-caption em { font-style: italic; color: var(--lx-gold-l); }

         /* FOOTER */
         .lx-foot {
            margin-top: 4rem;
            display: flex; align-items: center; justify-content: center;
            gap: 1.2rem;
         }
         .lx-foot-rule { display: inline-block; width: 80px; height: 1px; background: var(--lx-gold-d); }
         .lx-foot-glyph { font-family: var(--lx-didone); color: var(--lx-gold); font-size: 1rem; }

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

         /* BUTTON */
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
            transition: background 0.4s, color 0.4s, letter-spacing 0.4s, border-color 0.4s;
            display: inline-flex; align-items: center; gap: 0.5rem;
         }
         .lx-btn:hover {
            background: var(--lx-gold);
            color: #fbf8f1;
            letter-spacing: 0.35em;
         }
         .lx-btn--compact {
            padding: 0.75rem 1.4rem;
            font-size: 0.65rem;
            letter-spacing: 0.22em;
         }
         .lx-btn--compact:hover { letter-spacing: 0.27em; }
         .lx-btn--ghost {
            color: var(--lx-cream-d);
            border-color: rgba(20, 18, 16, 0.25);
         }
         .lx-btn--ghost:hover {
            background: var(--lx-cream);
            color: #fff;
            border-color: var(--lx-cream);
         }
      `}</style>
   );
}
