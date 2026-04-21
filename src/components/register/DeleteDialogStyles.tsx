'use client';

export default function DeleteDialogStyles() {
   return (<style jsx global>{`
      :root {
         --del-ink: #141210; --del-ink-2: #555048; --del-ink-3: #8a8276;
         --del-gold: #a87f2b; --del-gold-d: #6b4f15;
         --del-rose: #9b3b2a; --del-rose-d: #6e2418;
         --del-font: var(--font-poppins), 'Poppins', system-ui, sans-serif;
      }
      .del-overlay { position: fixed; inset: 0; background: rgba(20,18,16,0.55); backdrop-filter: blur(6px) saturate(1.1); -webkit-backdrop-filter: blur(6px) saturate(1.1); display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; z-index: 100; animation: del-fade 0.4s ease-out both; }
      @keyframes del-fade { from { opacity: 0; } to { opacity: 1; } }
      .del-dialog { position: relative; width: 100%; max-width: 520px; max-height: calc(100vh - 4rem); overflow-y: auto; background: #fff; border: 1px solid rgba(168,127,43,0.35); font-family: var(--del-font); color: var(--del-ink); padding: 2.4rem 2.4rem 2rem; box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 40px 80px -30px rgba(20,18,16,0.5), 0 0 0 1px rgba(168,127,43,0.12); animation: del-rise 0.6s cubic-bezier(0.2,0.8,0.2,1) both; }
      .del-dialog::before { content: ''; position: absolute; inset: 8px; border: 1px solid rgba(168,127,43,0.22); pointer-events: none; }
      @keyframes del-rise { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .del-close { position: absolute; top: 1.1rem; right: 1.1rem; width: 28px; height: 28px; background: transparent; border: 1px solid rgba(20,18,16,0.15); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: border-color 0.3s, background 0.3s, transform 0.3s; z-index: 2; }
      .del-close span { position: absolute; width: 12px; height: 1px; background: var(--del-ink-2); transition: background 0.3s; }
      .del-close span:first-child { transform: rotate(45deg); }
      .del-close span:last-child { transform: rotate(-45deg); }
      .del-close:hover:not(:disabled) { border-color: var(--del-rose); background: rgba(155,59,42,0.06); transform: rotate(90deg); }
      .del-close:hover:not(:disabled) span { background: var(--del-rose); }
      .del-close:disabled { opacity: 0.4; cursor: not-allowed; }
      .del-head { text-align: center; padding: 0.3rem 0 1.6rem; }
      .del-seal { position: relative; width: 72px; height: 72px; margin: 0 auto 1.5rem; }
      .del-seal-ring { position: absolute; inset: -6px; border: 1px solid var(--del-rose); border-radius: 50%; opacity: 0.6; animation: del-rotate 18s linear infinite; }
      .del-seal-ring--2 { inset: -12px; border-style: dotted; border-color: var(--del-rose-d); opacity: 0.35; animation-duration: 36s; animation-direction: reverse; }
      .del-seal-inner { width: 100%; height: 100%; border: 1px solid var(--del-rose); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--del-rose); background: radial-gradient(circle, rgba(155,59,42,0.1), transparent 65%), linear-gradient(180deg, #fff, #fbf7ef); box-shadow: 0 0 0 3px #fff, 0 0 0 4px rgba(155,59,42,0.25); }
      @keyframes del-rotate { to { transform: rotate(360deg); } }
      .del-kicker { display: inline-flex; align-items: center; gap: 0.8rem; font-size: 0.6rem; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: var(--del-rose); margin: 0 0 1rem; }
      .del-kicker-rule { display: inline-block; width: 28px; height: 1px; background: var(--del-rose); }
      .del-title { font-size: clamp(1.5rem, 3vw, 1.85rem); font-weight: 300; line-height: 1.25; letter-spacing: -0.015em; color: var(--del-ink); margin: 0 0 1rem; }
      .del-title em { font-style: italic; font-weight: 400; color: var(--del-gold-d); }
      .del-lede { font-size: 0.92rem; line-height: 1.6; color: var(--del-ink-2); font-weight: 300; max-width: 42ch; margin: 0 auto; }
      .del-reqs { border-top: 1px solid rgba(20,18,16,0.1); padding-top: 1.4rem; margin-bottom: 1.8rem; }
      .del-reqs-head { display: flex; align-items: baseline; gap: 0.8rem; margin-bottom: 1rem; }
      .del-reqs-num { font-size: 0.9rem; font-weight: 400; font-style: italic; color: var(--del-gold); }
      .del-reqs-head h3 { font-size: 0.68rem; font-weight: 500; letter-spacing: 0.26em; text-transform: uppercase; color: var(--del-ink); margin: 0; }
      .del-reqs-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--del-gold-d), transparent); }
      .del-reqs-list { list-style: none; margin: 0; padding: 0; }
      .del-req { display: grid; grid-template-columns: 28px 1fr auto; align-items: baseline; gap: 0.8rem; padding: 0.7rem 0; border-bottom: 1px dotted rgba(20,18,16,0.14); }
      .del-req:last-child { border-bottom: none; }
      .del-req-index { font-size: 0.65rem; letter-spacing: 0.1em; color: var(--del-ink-3); font-feature-settings: "tnum" 1, "lnum" 1; }
      .del-req-label { font-size: 0.92rem; color: var(--del-ink); font-weight: 400; }
      .del-req-tail { display: inline-flex; align-items: baseline; gap: 0.8rem; }
      .del-req-glyph { color: var(--del-ink-3); }
      .del-req-state { font-size: 0.6rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--del-ink-3); font-weight: 500; }
      .del-foot { display: flex; justify-content: flex-end; gap: 0.8rem; padding-top: 1.2rem; border-top: 1px solid rgba(20,18,16,0.08); }
      .del-btn { display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1.5rem; font-family: inherit; font-size: 0.7rem; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer; background: transparent; border: 1px solid transparent; position: relative; overflow: hidden; transition: color 0.3s, letter-spacing 0.4s, border-color 0.3s; }
      .del-btn:disabled { cursor: not-allowed; opacity: 0.45; }
      .del-btn--ghost { color: var(--del-ink-2); border-color: rgba(20,18,16,0.2); }
      .del-btn--ghost:hover:not(:disabled) { color: var(--del-ink); border-color: var(--del-ink); letter-spacing: 0.26em; }
      .del-btn--danger { color: var(--del-rose); border-color: var(--del-rose); }
      .del-btn--danger::before { content: ''; position: absolute; inset: 0; background: var(--del-rose); transform: translateY(100%); transition: transform 0.5s cubic-bezier(0.2,0.8,0.2,1); z-index: 0; }
      .del-btn--danger > * { position: relative; z-index: 1; }
      .del-btn--danger:hover:not(:disabled) { color: #fff; letter-spacing: 0.28em; }
      .del-btn--danger:hover:not(:disabled)::before { transform: translateY(0); }
      .del-btn-arrow { display: inline-block; transition: transform 0.4s cubic-bezier(0.2,0.8,0.2,1); }
      .del-btn--danger:hover:not(:disabled) .del-btn-arrow { transform: translateX(4px); }
      .del-spinner { width: 12px; height: 12px; border: 1px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: del-rotate 1s linear infinite; }
   `}</style>);
}
