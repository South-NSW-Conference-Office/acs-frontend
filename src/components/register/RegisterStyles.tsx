'use client';

export default function RegisterStyles() {
   return (<style jsx global>{`
      :root {
         --reg-bg: #ffffff; --reg-bed: #f9f5ec;
         --reg-ink: #141210; --reg-ink-2: #555048; --reg-ink-3: #8a8276;
         --reg-gold: #a87f2b; --reg-gold-d: #6b4f15; --reg-gold-l: #d4b26b;
         --reg-rose: #b85a3a; --reg-green: #6b7d3a; --reg-blue: #3d5a80;
         --reg-purple: #6e4a8a;
         --reg-font: var(--font-poppins), 'Poppins', system-ui, sans-serif;
      }
      .reg-root { position: relative; margin: -1.5rem; padding: 3rem clamp(1.5rem, 4vw, 4rem) 5rem; background: var(--reg-bg); color: var(--reg-ink); font-family: var(--reg-font); min-height: calc(100vh - 4rem); }
      .reg-decor { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
      .reg-vignette { position: absolute; inset: 0; background: radial-gradient(ellipse 90% 70% at 50% -10%, rgba(168,127,43,0.08), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, rgba(184,90,58,0.04), transparent 60%); }
      .reg-grain { position: absolute; inset: 0; opacity: 0.5; mix-blend-mode: multiply; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.28 0 0 0 0 0.18 0 0 0 0.14 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>"); }
      .reg-glow { position: absolute; top: -180px; left: 50%; transform: translateX(-50%); width: 820px; height: 820px; background: radial-gradient(circle, rgba(168,127,43,0.09), transparent 55%); filter: blur(50px); animation: reg-breathe 14s ease-in-out infinite; }
      @keyframes reg-breathe { 0%, 100% { opacity: 0.9; transform: translateX(-50%) scale(1); } 50% { opacity: 0.55; transform: translateX(-50%) scale(1.08); } }
      .reg-root > *:not(.reg-decor) { position: relative; z-index: 1; }

      .reg-masthead { display: grid; grid-template-columns: 1fr auto; gap: 3rem; align-items: end; padding-bottom: 2.5rem; border-bottom: 1px solid rgba(20,18,16,0.12); animation: reg-fade 1.2s ease-out both; }
      @media (max-width: 820px) { .reg-masthead { grid-template-columns: 1fr; gap: 2rem; } }
      @keyframes reg-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .reg-kicker { display: flex; align-items: center; gap: 0.9rem; font-size: 0.68rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: var(--reg-gold); margin: 0 0 1.6rem; }
      .reg-kicker-rule { display: inline-block; width: 36px; height: 1px; background: var(--reg-gold); }
      .reg-title { font-family: var(--reg-font); font-weight: 300; font-size: clamp(3rem, 6.5vw, 5.6rem); line-height: 0.95; letter-spacing: -0.035em; margin: 0 0 1.6rem; color: var(--reg-ink); }
      .reg-word { display: inline-block; opacity: 0; animation: reg-rise 1.3s cubic-bezier(0.2,0.8,0.2,1) both; }
      .reg-word--italic { font-style: italic; font-weight: 400; color: var(--reg-gold-l); }
      @keyframes reg-rise { from { opacity: 0; transform: translateY(28px); filter: blur(5px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      .reg-subtitle { font-size: 1.05rem; font-weight: 300; line-height: 1.6; color: var(--reg-ink-2); max-width: 54ch; margin: 0; animation: reg-fade 1.4s ease-out 0.5s both; }
      .reg-mast-right { animation: reg-fade 1.4s ease-out 0.3s both; }
      .reg-counter { border: 1px solid rgba(168,127,43,0.3); padding: 1.8rem 2rem; text-align: right; min-width: 240px; position: relative; background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(249,245,236,0.3)); }
      .reg-counter::before { content: ''; position: absolute; inset: 5px; border: 1px solid rgba(168,127,43,0.12); pointer-events: none; }
      .reg-counter-num { font-size: clamp(3rem, 5vw, 4.2rem); font-weight: 200; line-height: 1; color: var(--reg-ink); font-feature-settings: "lnum" 1, "tnum" 1; letter-spacing: -0.03em; }
      .reg-counter-label { margin-top: 0.5rem; font-size: 0.62rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--reg-gold); font-weight: 500; }
      .reg-counter-rule { width: 32px; height: 1px; background: var(--reg-gold-d); margin: 0.9rem 0 0.9rem auto; }
      .reg-counter-sub { font-size: 0.8rem; color: var(--reg-ink-2); font-style: italic; font-weight: 300; }
      .reg-counter-sub span { font-style: normal; font-weight: 500; color: var(--reg-gold-l); }

      .reg-console { display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; padding: 2rem 0 2.5rem; animation: reg-fade 1.4s ease-out 0.7s both; }
      .reg-console-left { display: flex; align-items: center; gap: 2rem; flex: 1; flex-wrap: wrap; }
      .reg-search { position: relative; min-width: 320px; flex: 1; max-width: 480px; }
      .reg-search-icon { position: absolute; left: 0; top: 50%; transform: translateY(-50%); color: var(--reg-gold); pointer-events: none; }
      .reg-search-input { width: 100%; background: transparent; border: none; outline: none; padding: 0.9rem 0 0.9rem 1.8rem; font-family: inherit; font-size: 0.95rem; font-weight: 300; color: var(--reg-ink); letter-spacing: 0.01em; }
      .reg-search-input::placeholder { color: var(--reg-ink-3); font-style: italic; font-weight: 300; }
      .reg-search-underline { position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: rgba(20,18,16,0.2); }
      .reg-search-underline::after { content: ''; position: absolute; left: 0; bottom: 0; width: 0; height: 1px; background: var(--reg-gold); transition: width 0.5s cubic-bezier(0.2,0.8,0.2,1); }
      .reg-search:focus-within .reg-search-underline::after { width: 100%; }

      .reg-filter { display: inline-flex; align-items: center; gap: 0.7rem; }
      .reg-filter-label { font-size: 0.6rem; letter-spacing: 0.26em; text-transform: uppercase; color: var(--reg-gold-d); font-weight: 500; }
      .reg-filter-select {
         background: transparent; border: none;
         border-bottom: 1px solid rgba(20,18,16,0.2);
         font-family: inherit; font-size: 0.85rem; color: var(--reg-ink);
         padding: 0.5rem 1.2rem 0.5rem 0.2rem;
         cursor: pointer; outline: none; font-weight: 300;
         transition: border-color 0.3s;
         max-width: 200px;
      }
      .reg-filter-select:focus { border-bottom-color: var(--reg-gold); }

      .reg-th--check, .reg-td--check { width: 40px; padding-left: 0.8rem; padding-right: 0; }
      .reg-check { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; }
      .reg-check input { position: absolute; opacity: 0; pointer-events: none; }
      .reg-check-box { width: 18px; height: 18px; border: 1px solid rgba(20,18,16,0.3); display: inline-flex; align-items: center; justify-content: center; transition: border-color 0.3s, background 0.3s; }
      .reg-check-box svg { width: 12px; height: 12px; opacity: 0; transform: scale(0.5); transition: opacity 0.2s, transform 0.25s cubic-bezier(0.2,0.8,0.2,1); color: #fff; }
      .reg-check input:checked + .reg-check-box { background: var(--reg-gold); border-color: var(--reg-gold); }
      .reg-check input:checked + .reg-check-box svg { opacity: 1; transform: scale(1); }
      .reg-check-box:hover { border-color: var(--reg-gold); }

      .reg-bulk { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.9rem 1.2rem; margin-bottom: 0.5rem; border: 1px solid rgba(168,127,43,0.35); background: linear-gradient(180deg, rgba(249,245,236,0.8), rgba(255,255,255,0.6)); animation: reg-fade 0.4s ease-out both; }
      .reg-bulk-left { display: flex; align-items: center; gap: 0.8rem; }
      .reg-bulk-count { font-size: 1.3rem; font-weight: 300; color: var(--reg-gold-d); font-feature-settings: "lnum" 1, "tnum" 1; line-height: 1; }
      .reg-bulk-label { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--reg-ink-2); font-weight: 500; }
      .reg-bulk-clear { background: none; border: none; font-family: inherit; font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--reg-gold); font-weight: 500; cursor: pointer; padding: 0.3rem 0.6rem; border-left: 1px solid rgba(20,18,16,0.15); transition: color 0.3s; }
      .reg-bulk-clear:hover { color: var(--reg-ink); }
      .reg-bulk-delete { display: inline-flex; align-items: center; gap: 0.6rem; background: transparent; color: var(--reg-rose); border: 1px solid var(--reg-rose); padding: 0.65rem 1.3rem; font-family: inherit; font-size: 0.68rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; position: relative; overflow: hidden; transition: color 0.35s, letter-spacing 0.4s; }
      .reg-bulk-delete::before { content: ''; position: absolute; inset: 0; background: var(--reg-rose); transform: translateY(100%); transition: transform 0.45s cubic-bezier(0.2,0.8,0.2,1); z-index: 0; }
      .reg-bulk-delete > * { position: relative; z-index: 1; }
      .reg-bulk-delete:hover { color: #fff; letter-spacing: 0.26em; }
      .reg-bulk-delete:hover::before { transform: translateY(0); }

      .reg-btn { display: inline-flex; align-items: center; gap: 0.7rem; background: transparent; color: var(--reg-gold-l); border: 1px solid var(--reg-gold); padding: 0.85rem 1.6rem; font-family: inherit; font-size: 0.72rem; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer; position: relative; overflow: hidden; transition: color 0.35s, letter-spacing 0.4s; }
      .reg-btn::before { content: ''; position: absolute; inset: 0; background: var(--reg-gold); transform: translateY(100%); transition: transform 0.45s cubic-bezier(0.2,0.8,0.2,1); z-index: 0; }
      .reg-btn > * { position: relative; z-index: 1; }
      .reg-btn:hover { color: #fff; letter-spacing: 0.28em; }
      .reg-btn:hover::before { transform: translateY(0); }
      .reg-btn-plus { font-size: 1.1rem; font-weight: 300; line-height: 0; }

      .reg-table-wrap { overflow: visible; margin: 0 -0.5rem; padding: 0 0.5rem; }
      .reg-table { width: 100%; border-collapse: separate; border-spacing: 0; font-family: var(--reg-font); min-width: 1000px; }
      .reg-th { text-align: left; padding: 1.1rem 1.2rem; font-size: 0.6rem; font-weight: 500; letter-spacing: 0.26em; text-transform: uppercase; color: var(--reg-gold); border-top: 1px solid var(--reg-ink); border-bottom: 1px solid var(--reg-ink); background: transparent; white-space: nowrap; }
      .reg-th--no { width: 56px; padding-left: 0.6rem; }
      .reg-th--actions { width: 48px; }
      .reg-tr { cursor: pointer; opacity: 0; animation: reg-row-in 0.9s cubic-bezier(0.2,0.8,0.2,1) both; transition: background 0.35s; position: relative; }
      @keyframes reg-row-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .reg-tr:hover { background: rgba(168,127,43,0.045); }
      .reg-td { padding: 1.3rem 1.2rem; border-bottom: 1px dotted rgba(20,18,16,0.14); vertical-align: middle; font-size: 0.92rem; color: var(--reg-ink); font-weight: 300; transition: border-color 0.3s; }
      .reg-tr:last-child .reg-td { border-bottom: 1px solid var(--reg-ink); }
      .reg-tr:hover .reg-td { border-bottom-color: rgba(168,127,43,0.4); }
      .reg-td--no { padding-left: 0.6rem; width: 56px; }
      .reg-no { font-size: 0.72rem; font-weight: 400; letter-spacing: 0.1em; color: var(--reg-ink-3); font-feature-settings: "lnum" 1, "tnum" 1; transition: color 0.3s; }
      .reg-tr:hover .reg-no { color: var(--reg-gold); }

      /* PRIMARY ENTITY (occasion / member / office) CELL */
      .reg-td--union { min-width: 280px; }
      .reg-td-union { display: flex; align-items: center; gap: 1.2rem; }

      /* DATE BLOCK — small calendar card (events page) */
      .reg-date-block {
         flex-shrink: 0;
         width: 52px;
         min-height: 60px;
         display: flex; flex-direction: column; align-items: center; justify-content: center;
         border: 1px solid var(--reg-gold);
         background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(249,245,236,0.5));
         position: relative;
         box-shadow: 0 4px 14px -8px rgba(107,79,21,0.3);
         transition: border-color 0.3s, transform 0.5s;
         padding: 0.3rem 0;
      }
      .reg-date-block::before { content: ''; position: absolute; inset: 3px; border: 1px solid rgba(168,127,43,0.2); pointer-events: none; }
      .reg-tr:hover .reg-date-block { border-color: var(--reg-gold-d); transform: translateY(-2px); }
      .reg-date-day { font-size: 0.58rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--reg-gold); font-weight: 500; }
      .reg-date-num { font-size: 1.5rem; font-weight: 300; color: var(--reg-ink); line-height: 1; margin-top: 0.15rem; font-feature-settings: "lnum" 1, "tnum" 1; letter-spacing: -0.02em; }
      .reg-date-mon { font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--reg-ink-2); font-weight: 400; margin-top: 0.15rem; font-style: italic; }

      /* AVATAR MONOGRAM — for members/offices */
      .reg-mono {
         flex-shrink: 0;
         width: 52px;
         height: 52px;
         display: flex; align-items: center; justify-content: center;
         border: 1px solid var(--reg-gold);
         background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(249,245,236,0.5));
         position: relative;
         box-shadow: 0 4px 14px -8px rgba(107,79,21,0.3);
         transition: border-color 0.3s, transform 0.5s;
         border-radius: 50%;
      }
      .reg-mono::before { content: ''; position: absolute; inset: 3px; border: 1px solid rgba(168,127,43,0.2); pointer-events: none; border-radius: 50%; }
      .reg-tr:hover .reg-mono { border-color: var(--reg-gold-d); transform: translateY(-2px); }
      .reg-mono-text { font-size: 0.95rem; font-weight: 400; color: var(--reg-gold-d); font-style: italic; letter-spacing: -0.01em; }
      .reg-mono-glyph { color: var(--reg-gold-d); }

      /* SEAL — ornamental circle for offices */
      .reg-seal-block {
         flex-shrink: 0;
         width: 52px;
         height: 52px;
         display: flex; align-items: center; justify-content: center;
         border: 1px solid var(--reg-gold);
         border-radius: 50%;
         position: relative;
         background: radial-gradient(circle, rgba(168,127,43,0.08), transparent 65%), linear-gradient(180deg, #fff, rgba(249,245,236,0.5));
         transition: border-color 0.3s, transform 0.5s;
      }
      .reg-seal-block::before { content: ''; position: absolute; inset: -4px; border: 1px dotted rgba(168,127,43,0.35); border-radius: 50%; pointer-events: none; }
      .reg-tr:hover .reg-seal-block { border-color: var(--reg-gold-d); transform: translateY(-2px); }
      .reg-seal-glyph { color: var(--reg-gold-d); font-size: 1.2rem; }

      .reg-td-union-text { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
      .reg-td-name { font-size: 1rem; font-weight: 500; letter-spacing: -0.005em; color: var(--reg-ink); transition: color 0.3s; }
      .reg-td-name-btn { background: none; border: none; padding: 0; font: inherit; color: inherit; cursor: pointer; text-align: left; transition: color 0.3s; }
      .reg-td-name-btn:hover { color: var(--reg-gold-d); }
      .reg-tr:hover .reg-td-name { color: var(--reg-gold-d); }
      .reg-td-path { font-size: 0.8rem; color: var(--reg-ink-2); font-weight: 300; line-height: 1.4; max-width: 40ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-style: italic; }

      /* SYSTEM badge (inline) */
      .reg-sys-badge { display: inline-flex; align-items: center; gap: 0.3rem; margin-left: 0.55rem; padding: 0.15rem 0.5rem; border: 1px solid var(--reg-gold); font-size: 0.56rem; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: var(--reg-gold-d); background: rgba(168,127,43,0.08); }

      /* MINISTRY / generic secondary cell */
      .reg-td--parent { min-width: 180px; }
      .reg-td-parent { font-size: 0.95rem; font-weight: 400; color: var(--reg-ink); transition: color 0.3s; }
      .reg-tr:hover .reg-td-parent { color: var(--reg-gold-d); }
      .reg-td-parent-sub { font-size: 0.75rem; color: var(--reg-ink-3); font-style: italic; margin-top: 0.15rem; letter-spacing: 0.02em; }

      /* WHEN */
      .reg-td--when { min-width: 200px; }
      .reg-td-when-year { font-size: 0.66rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--reg-gold); font-weight: 500; margin-bottom: 0.35rem; }
      .reg-td-when-time {
         font-family: var(--reg-font);
         font-style: italic;
         font-size: 1.05rem;
         color: var(--reg-ink);
         font-feature-settings: "lnum" 1, "tnum" 1;
         line-height: 1.3;
      }

      /* SEAT / generic small cell */
      .reg-td-city { color: var(--reg-ink); font-weight: 400; font-size: 0.92rem; }

      .reg-dash { color: var(--reg-ink-3); font-style: italic; }

      /* CHIPS (roles, permissions) */
      .reg-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; max-width: 28ch; }
      .reg-chip { display: inline-flex; align-items: center; padding: 0.2rem 0.55rem; border: 1px solid rgba(168,127,43,0.35); background: rgba(249,245,236,0.6); color: var(--reg-ink-2); font-size: 0.68rem; letter-spacing: 0.04em; font-weight: 400; }
      .reg-chip--muted { border-color: rgba(20,18,16,0.15); background: transparent; color: var(--reg-ink-3); font-style: italic; }

      /* STATE badges */
      .reg-td--state { width: 160px; }
      .reg-state { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--reg-ink-3); font-weight: 500; }
      .reg-state-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--reg-ink-3); }
      .reg-state.upcoming { color: var(--reg-blue); }
      .reg-state.upcoming .reg-state-dot { background: var(--reg-blue); box-shadow: 0 0 6px rgba(61,90,128,0.35); }
      .reg-state.active { color: var(--reg-green); }
      .reg-state.active .reg-state-dot { background: var(--reg-green); box-shadow: 0 0 8px rgba(107,125,58,0.5); animation: reg-ember 2.4s ease-in-out infinite; }
      .reg-state.concluded { color: var(--reg-ink-3); }
      .reg-state.verified { color: var(--reg-green); }
      .reg-state.verified .reg-state-dot { background: var(--reg-green); box-shadow: 0 0 8px rgba(107,125,58,0.5); }
      .reg-state.pending { color: var(--reg-blue); }
      .reg-state.pending .reg-state-dot { background: var(--reg-blue); box-shadow: 0 0 6px rgba(61,90,128,0.35); animation: reg-ember 2.4s ease-in-out infinite; }
      .reg-state.inactive { color: var(--reg-rose); }
      .reg-state.inactive .reg-state-dot { background: var(--reg-rose); }
      .reg-state.union { color: var(--reg-purple); }
      .reg-state.union .reg-state-dot { background: var(--reg-purple); box-shadow: 0 0 6px rgba(110,74,138,0.4); }
      .reg-state.conference { color: var(--reg-blue); }
      .reg-state.conference .reg-state-dot { background: var(--reg-blue); box-shadow: 0 0 6px rgba(61,90,128,0.35); }
      .reg-state.church { color: var(--reg-green); }
      .reg-state.church .reg-state-dot { background: var(--reg-green); box-shadow: 0 0 6px rgba(107,125,58,0.4); }
      @keyframes reg-ember { 0%, 100% { box-shadow: 0 0 8px rgba(107,125,58,0.5); } 50% { box-shadow: 0 0 4px rgba(107,125,58,0.2); } }

      .reg-td--actions { width: 48px; text-align: right; padding-right: 0.4rem; }
      @media (max-width: 760px) { .reg-table-wrap { margin: 0 -1rem; padding: 0 1rem; } }

      .reg-skel-table { padding-top: 0.5rem; }
      .reg-skel-header { display: flex; align-items: center; gap: 1.2rem; padding: 1.1rem 1.2rem; border-top: 1px solid var(--reg-ink); border-bottom: 1px solid var(--reg-ink); margin-bottom: 0.4rem; }
      .reg-skel-row { display: flex; align-items: center; gap: 1.2rem; padding: 1.3rem 1.2rem; border-bottom: 1px dotted rgba(20,18,16,0.14); opacity: 0; animation: reg-fade 0.8s ease-out both; }
      .reg-skel-avatar--sm { width: 44px; height: 52px; border-radius: 0; }
      .reg-skel-avatar--round { width: 44px; height: 44px; border-radius: 50%; }
      .reg-skel-avatar { flex-shrink: 0; background: linear-gradient(90deg, #f2ecdf 0%, #faf5e8 50%, #f2ecdf 100%); background-size: 200% 100%; animation: reg-shimmer 2s ease-in-out infinite; }
      .reg-skel-line { height: 12px; border-radius: 2px; background: linear-gradient(90deg, #f2ecdf 0%, #faf5e8 50%, #f2ecdf 100%); background-size: 200% 100%; animation: reg-shimmer 2s ease-in-out infinite; }
      .reg-skel-line--head { height: 8px; }
      @keyframes reg-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

      .reg-empty { text-align: center; padding: 5rem 1rem; max-width: 500px; margin: 0 auto; }
      .reg-empty-seal { width: 96px; height: 96px; border: 1px solid var(--reg-gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.8rem; position: relative; animation: reg-rotate 40s linear infinite; }
      .reg-empty-seal::before { content: ''; position: absolute; inset: -8px; border: 1px dotted var(--reg-gold-d); opacity: 0.4; border-radius: 50%; }
      .reg-empty-glyph { font-size: 1.8rem; color: var(--reg-gold); animation: reg-counter-rotate 40s linear infinite; }
      @keyframes reg-rotate { to { transform: rotate(360deg); } }
      @keyframes reg-counter-rotate { to { transform: rotate(-360deg); } }
      .reg-empty-title { font-size: 1.7rem; font-weight: 300; font-style: italic; color: var(--reg-ink); margin: 0 0 0.8rem; }
      .reg-empty-body { color: var(--reg-ink-2); font-weight: 300; line-height: 1.6; }

      .reg-foot { margin-top: 5rem; display: flex; align-items: center; justify-content: center; gap: 1.2rem; }
      .reg-foot-rule { width: 80px; height: 1px; background: var(--reg-gold-d); opacity: 0.5; }
      .reg-foot-glyph { color: var(--reg-gold); font-size: 1rem; }
   `}</style>);
}
