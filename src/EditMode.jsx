/*
 * In-app editing. Kept entirely separate from the app it edits: nothing in App.jsx knows this exists
 * beyond rendering <EditMode /> once, and no component has to thread edited copy through its props.
 *
 * Editing is by text, not by location. Changing a piece of wording changes it everywhere that wording is
 * displayed — a status label written once but rendered down eight table rows is a single edit, and the
 * preview shows all eight change at once because that is exactly what saving will do. Keying on the text
 * rather than a DOM path or source line is also what makes an edit survive a re-render and a reload.
 *
 * Overrides are re-applied to the DOM after each React render by a MutationObserver. That is unusual, but
 * it is the right shape here: the alternative is threading a lookup through several hundred literals.
 *
 * What is offered for editing comes from the manifest the Vite plugin extracts from the source, so a
 * calculated figure is never presented as editable text that could not be written back.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EDITABLE, CAN_SAVE_TO_SOURCE } from 'virtual:editable-copy';
import { Pencil, X, Check, Download, Undo2, Type, Save, Info, Copy } from 'lucide-react';

const STORAGE_KEY = 'rp_inline_edits_v1';
// Writing to source changes files the dev server is watching, so HMR reloads the page a moment later and
// takes the confirmation with it. The result is parked here so it can be shown again after the reload.
const SAVE_NOTE_KEY = 'rp_inline_edit_last_save';
const FONT_ROLES = [
  { id: 'sans', label: 'Body', hint: 'Labels, captions, most of the interface' },
  { id: 'display', label: 'Headings', hint: 'The app title and landing page headline' },
  { id: 'mono', label: 'Figures', hint: 'Every money amount and table number' }
];
const FONT_SUGGESTIONS = {
  sans: ['IBM Plex Sans', 'Inter', 'Source Sans 3', 'system-ui'],
  display: ['Newsreader', 'Playfair Display', 'Lora', 'Georgia'],
  mono: ['IBM Plex Mono', 'JetBrains Mono', 'Roboto Mono', 'ui-monospace']
};
// Only tokens worth nudging by eye. The full palette is better edited in source.
const TOKENS = [
  { id: 'surface', label: 'Panel background' },
  { id: 'slate-50', label: 'Page background' },
  { id: 'slate-900', label: 'Body text' },
  { id: 'blue-600', label: 'Primary accent' },
  { id: 'indigo-600', label: 'Secondary accent' }
];

const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch { /* private mode */ } };

const rgbToHex = (triplet) => {
  const p = String(triplet).trim().split(/\s+/).map(Number);
  if (p.length !== 3 || p.some(n => !Number.isFinite(n))) return '#000000';
  return '#' + p.map(n => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('');
};
const hexToRgb = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

// JSX collapses a newline-and-indent inside a text run to one space, which is how the manifest stores it.
const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
const isEditableText = (text) => {
  const t = norm(text);
  return t.length >= 2 && Object.prototype.hasOwnProperty.call(EDITABLE, t);
};
// How many places in the source this wording is written. All of them change together.
const placesFor = (text) => EDITABLE[norm(text)] || 0;

/*
 * The text node under the pointer, rather than the element. A paragraph like
 * `<p><strong>What it does:</strong> Models compound wealth…</p>` is two separate runs in the source and
 * two separate text nodes in the DOM, so targeting the element would offer neither — and a run sitting
 * beside an interpolated figure is its own node for the same reason.
 */
function textNodeAt(x, y) {
  let node = null;
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    node = pos && pos.offsetNode;
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    node = range && range.startContainer;
  }
  return node && node.nodeType === Node.TEXT_NODE ? node : null;
}

export default function EditMode() {
  const [on, setOn] = useState(false);
  const [panel, setPanel] = useState('text');          // 'text' | 'style'
  const [edits, setEdits] = useState(load);            // { originalText: newText }
  const [tokens, setTokens] = useState({});            // { theme: { token: 'r g b' } }
  const [fonts, setFonts] = useState({});              // { role: 'Family Name' }
  const [target, setTarget] = useState(null);          // { original, places, rect }
  const [hover, setHover] = useState(null);            // { rects, ambiguous }
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState(null);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);

  const editCount = Object.keys(edits).length;
  const styleCount = Object.values(tokens).reduce((n, t) => n + Object.keys(t).length, 0) + Object.keys(fonts).length;
  const total = editCount + styleCount;

  useEffect(() => { save(edits); }, [edits]);

  /*
   * Picking up the confirmation after a save.
   *
   * Saving rewrites files the dev server is watching, so it reloads the page — and it does so in the same
   * instant the note is written, sometimes a beat before. A reloaded page can therefore start up just
   * ahead of its own confirmation, which is why this watches for the note for a few seconds rather than
   * reading it once at mount. Writing both App.jsx and index.html also reloads twice, so the note is left
   * in place for a while instead of being cleared the moment it is first read.
   */
  useEffect(() => {
    const read = () => { try { return sessionStorage.getItem(SAVE_NOTE_KEY); } catch { return null; } };
    let clear = null;
    const settle = (note) => {
      setStatus({ kind: 'ok', text: note });
      setOn(true);
      clear = setTimeout(() => { try { sessionStorage.removeItem(SAVE_NOTE_KEY); } catch { /* ignore */ } }, 5000);
    };
    const first = read();
    if (first) { settle(first); return () => clearTimeout(clear); }
    let tries = 0;
    const poll = setInterval(() => {
      const note = read();
      if (note) { clearInterval(poll); settle(note); }
      else if (++tries > 12) clearInterval(poll);
    }, 300);
    return () => { clearInterval(poll); if (clear) clearTimeout(clear); };
  }, []);

  /* ---------------------------------------------------------------- applying overrides to the DOM
   * React owns these text nodes and will restore the original on any re-render, so the overrides are
   * re-applied whenever the tree changes. The observer is disconnected around our own writes so it
   * cannot retrigger itself.
   */
  const applyOverrides = useCallback(() => {
    if (!Object.keys(edits).length) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const pending = [];
    let node;
    while ((node = walker.nextNode())) {
      if (overlayRef.current && overlayRef.current.contains(node)) continue;
      const raw = node.nodeValue;
      const key = norm(raw);
      if (!key) continue;
      const replacement = edits[key];
      if (replacement !== undefined && key !== replacement) {
        // a run beside an interpolation owns its spacing (" different"), so keep the node's own edges
        const lead = (raw.match(/^\s*/) || [''])[0];
        const trail = (raw.match(/\s*$/) || [''])[0];
        pending.push([node, lead + replacement + trail]);
      }
    }
    pending.forEach(([n, v]) => { n.nodeValue = v; });
  }, [edits]);

  useEffect(() => {
    if (!Object.keys(edits).length) return undefined;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        observer.disconnect();
        applyOverrides();
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      });
    });
    applyOverrides();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [edits, applyOverrides]);

  /* ---------------------------------------------------------------- live style preview */
  useEffect(() => {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') || 'classic';
    Object.entries(tokens[theme] || {}).forEach(([k, v]) => root.style.setProperty(`--${k}`, v));
    return () => Object.keys(tokens[theme] || {}).forEach(k => root.style.removeProperty(`--${k}`));
  }, [tokens]);

  useEffect(() => {
    if (!Object.keys(fonts).length) return undefined;
    const el = document.createElement('style');
    const stack = (role, fallback) => fonts[role] ? `"${fonts[role]}", ${fallback}` : null;
    el.textContent = [
      stack('sans', 'ui-sans-serif, system-ui, sans-serif') && `.font-sans, body { font-family: ${stack('sans', 'ui-sans-serif, system-ui, sans-serif')} !important; }`,
      stack('display', 'ui-serif, Georgia, serif') && `.font-display { font-family: ${stack('display', 'ui-serif, Georgia, serif')} !important; }`,
      stack('mono', 'ui-monospace, monospace') && `.font-mono { font-family: ${stack('mono', 'ui-monospace, monospace')} !important; }`
    ].filter(Boolean).join('\n');
    document.head.appendChild(el);
    return () => el.remove();
  }, [fonts]);

  /* ---------------------------------------------------------------- picking a target */
  useEffect(() => {
    if (!on || panel !== 'text') return undefined;
    document.body.classList.add('inline-edit-on');
    // The highlight is drawn as boxes over the run's client rects rather than by adding a class to an
    // element: the run is usually only part of its parent, and wrapping it would mean mutating a DOM
    // that React owns.
    const rectsFor = (node) => {
      const r = document.createRange();
      r.selectNodeContents(node);
      return [...r.getClientRects()].map(b => ({ top: b.top, left: b.left, width: b.width, height: b.height }));
    };
    const inOverlay = (n) => overlayRef.current && overlayRef.current.contains(n.nodeType === 1 ? n : n.parentElement);
    /*
     * Tab labels are copy too, so they are editable — but if a plain click edited them, edit mode would
     * trap you on whichever page you happened to be on. The tab bar therefore keeps working as a tab bar
     * and Alt-click edits it, while everywhere else a plain click edits, including the text inside cards
     * and buttons. The cost is that other buttons do not act while editing, which is the right trade:
     * edit mode is for editing, but it must not stop you reaching the page you want to edit.
     */
    const inControl = (node) => !!(node.parentElement && node.parentElement.closest('[data-tabbar]'));
    const wantsEdit = (node, e) => inControl(node) ? (e.altKey || e.metaKey) : true;
    const moveFn = (e) => {
      const node = textNodeAt(e.clientX, e.clientY);
      if (!node || inOverlay(node) || !isEditableText(node.nodeValue)) { setHover(null); return; }
      setHover({ rects: rectsFor(node), needsAlt: inControl(node) && !(e.altKey || e.metaKey) });
    };
    const leaveFn = () => setHover(null);
    const clickFn = (e) => {
      const node = textNodeAt(e.clientX, e.clientY);
      if (!node || inOverlay(node) || !isEditableText(node.nodeValue)) return;
      if (!wantsEdit(node, e)) { setHover(null); return; }
      e.preventDefault(); e.stopPropagation();
      const key = norm(node.nodeValue);
      const rects = rectsFor(node);
      const rect = rects[0] || node.parentElement.getBoundingClientRect();
      setTarget({ original: key, places: placesFor(key), rect: { ...rect, bottom: rect.top + rect.height } });
      setDraft(edits[key] === undefined ? key : edits[key]);
      setHover(null);
    };
    document.addEventListener('mousemove', moveFn, true);
    document.addEventListener('mouseleave', leaveFn, true);
    document.addEventListener('click', clickFn, true);
    return () => {
      document.body.classList.remove('inline-edit-on');
      setHover(null);
      document.removeEventListener('mousemove', moveFn, true);
      document.removeEventListener('mouseleave', leaveFn, true);
      document.removeEventListener('click', clickFn, true);
    };
  }, [on, panel, edits]);

  useEffect(() => { if (target && inputRef.current) inputRef.current.focus(); }, [target]);

  const commit = () => {
    if (!target) return;
    const next = { ...edits };
    if (draft.trim() === target.original || !draft.trim()) delete next[target.original];
    else next[target.original] = draft;
    setEdits(next);
    setTarget(null);
  };
  const revertOne = (key) => { const n = { ...edits }; delete n[key]; setEdits(n); };
  const revertAll = () => { setEdits({}); setTokens({}); setFonts({}); setStatus(null); };

  /* ---------------------------------------------------------------- saving */
  const patch = () => ({
    version: 1,
    generatedAt: new Date().toISOString(),
    copy: Object.entries(edits).map(([before, after]) => ({ before, after })),
    tokens, fonts
  });

  const download = () => {
    const blob = new Blob([JSON.stringify(patch(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `planner-edits-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus({ kind: 'ok', text: 'Downloaded. Send that file to Claude, or run it through scripts/apply-edits.mjs.' });
  };
  const copyPatch = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(patch(), null, 2));
      setStatus({ kind: 'ok', text: 'Copied to the clipboard — paste it into the chat.' });
    } catch {
      setStatus({ kind: 'warn', text: 'The browser refused clipboard access. Use Download instead.' });
    }
  };
  const saveToSource = async () => {
    setStatus({ kind: 'busy', text: 'Writing to source…' });
    try {
      const res = await fetch('/__inline-edit/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch())
      });
      const report = await res.json();
      if (report.ok) {
        const n = (report.applied || []).length;
        const places = (report.applied || []).reduce((t, a) => t + (a.places || 0), 0);
        const note = `Saved ${n} change${n === 1 ? '' : 's'}${places > n ? ` across ${places} places` : ''} to `
          + `${(report.files || []).join(' and ') || 'source'}. Commit them when you are happy.`;
        try { sessionStorage.setItem(SAVE_NOTE_KEY, note); } catch { /* private mode */ }
        setEdits({}); setTokens({}); setFonts({});
        // The dev server reloads the page once it sees the files change; the confirmation is read back
        // out of sessionStorage on the other side of that reload.
        setStatus({ kind: 'busy', text: 'Saved — reloading to pick up the change…' });
      } else {
        setStatus({ kind: 'warn', text: `Nothing written. ${(report.failed || []).map(f => f.reason).join('; ') || report.error}` });
      }
    } catch (e) {
      setStatus({ kind: 'warn', text: `Could not reach the dev server (${e.message}). Use Download instead.` });
    }
  };

  /* ---------------------------------------------------------------- render */
  if (!on) {
    return (
      <>
        <EditStyles />
        <button type="button" onClick={() => setOn(true)} title="Edit the wording and look of this page"
          className="fixed bottom-4 right-4 z-[60] px-3.5 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-slate-800 transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Edit page{total > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px]">{total}</span>}
        </button>
      </>
    );
  }

  const theme = document.documentElement.getAttribute('data-theme') || 'classic';
  const readVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

  return (
    <>
      <EditStyles />
      {/* hover highlight: one box per client rect, so a run wrapping across lines is outlined properly */}
      {hover && !target && hover.rects.map((r, i) => (
        <div key={i} aria-hidden="true"
          style={{ position: 'fixed', top: r.top - 2, left: r.left - 2, width: r.width + 4, height: r.height + 4 }}
          className={`z-[68] pointer-events-none rounded-[3px] border-2 ${hover.needsAlt ? 'border-dotted border-slate-400/80' : 'border-dashed border-amber-500/90'}`} />
      ))}
      {/* inline editor popover, anchored to whatever was clicked */}
      {target && (
        <div className="fixed inset-0 z-[70]" onMouseDown={() => setTarget(null)}>
          <div onMouseDown={(e) => e.stopPropagation()}
            style={{ top: Math.min(window.innerHeight - 190, target.rect.bottom + 8), left: Math.max(12, Math.min(window.innerWidth - 430, target.rect.left)) }}
            className="absolute w-[min(26rem,calc(100vw-24px))] bg-surface border border-slate-300 rounded-2xl shadow-lg p-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Edit this text</div>
            <textarea ref={inputRef} value={draft} rows={Math.min(6, Math.ceil(draft.length / 46) + 1)}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setTarget(null);
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
              }}
              className="w-full p-2 bg-surface border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y" />
            {target.places > 1 && (
              <div className="flex items-start gap-1.5 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">
                <Info className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                <span>This wording is written in {target.places} places in the code, and all of them will change together.</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">Esc to cancel &middot; {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to apply</span>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setTarget(null)} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancel</button>
                <button type="button" onClick={commit} className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer flex items-center gap-1"><Check className="w-3 h-3" /> Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* the dock */}
      <div ref={overlayRef} className="fixed bottom-0 inset-x-0 z-[65] pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-3xl m-3 bg-surface border border-slate-300 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50">
            <Pencil className="w-3.5 h-3.5 text-amber-600" />
            <strong className="text-xs font-bold text-slate-900">Editing this page</strong>
            <div className="flex items-center gap-0.5 ml-2 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[['text', 'Wording'], ['style', 'Fonts & colours']].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setPanel(id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${panel === id ? 'bg-surface text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
              ))}
            </div>
            <span className="ml-auto text-[11px] text-slate-500">{total === 0 ? 'No changes yet' : `${total} pending change${total === 1 ? '' : 's'}`}</span>
            <button type="button" onClick={() => { setOn(false); setTarget(null); }} title="Close the editor (your changes are kept)"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>

          <div className="p-3 max-h-[38vh] overflow-y-auto">
            {panel === 'text' ? (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>Click any wording on the page to change it. A change applies everywhere that wording is shown, so a label repeated down a column changes in every row at once.</p>
                  <p>The tabs at the top keep working while you edit, so you can go to the page you want — hold <kbd className="px-1 py-0.5 rounded border border-slate-300 bg-surface font-sans text-[10px]">Alt</kbd> and click to edit a tab's own name. Other buttons do not act while edit mode is on.</p>
                  <p className="text-slate-400">Two kinds of text are deliberately not clickable: <strong className="font-semibold text-slate-500">calculated values</strong> — every figure, date and percentage — and <strong className="font-semibold text-slate-500">words the model also uses as data</strong>, like a wrapper or policy name, where renaming the label would stop your saved scenarios loading. Ask Claude for those and they can be changed properly.</p>
                </div>
                {editCount === 0 ? null : (
                  <ul className="space-y-1.5">
                    {Object.entries(edits).map(([before, after]) => (
                      <li key={before} className="flex items-start gap-2 text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="min-w-0 flex-1">
                          <span className="block text-slate-400 line-through truncate">{before}</span>
                          <span className="block text-slate-900 font-semibold">{after}</span>
                        </span>
                        {placesFor(before) > 1 && <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 font-semibold" title={`Written in ${placesFor(before)} places in the code — all change together`}>&times;{placesFor(before)}</span>}
                        <button type="button" onClick={() => revertOne(before)} title="Undo this one"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"><Undo2 className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider"><Type className="w-3.5 h-3.5 text-slate-500" /> Fonts</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {FONT_ROLES.map(role => (
                      <label key={role.id} className="block">
                        <span className="text-[11px] font-semibold text-slate-700 block">{role.label}</span>
                        <input list={`fonts-${role.id}`} value={fonts[role.id] || ''} placeholder="unchanged"
                          onChange={(e) => setFonts(f => { const n = { ...f }; if (e.target.value.trim()) n[role.id] = e.target.value.trim(); else delete n[role.id]; return n; })}
                          className="w-full mt-1 p-1.5 bg-surface border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                        <datalist id={`fonts-${role.id}`}>{FONT_SUGGESTIONS[role.id].map(f => <option key={f} value={f} />)}</datalist>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{role.hint}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">A font only renders if the browser has it or it is loaded in index.html. Stick to the suggestions, or ask Claude to add a new one properly.</p>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Colours — {theme} theme</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TOKENS.map(t => {
                      const current = tokens[theme]?.[t.id] ?? readVar(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-slate-50">
                          <input type="color" value={rgbToHex(current)}
                            onChange={(e) => { const rgb = hexToRgb(e.target.value); if (rgb) setTokens(p => ({ ...p, [theme]: { ...p[theme], [t.id]: rgb } })); }}
                            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                          <span className="text-[11px] text-slate-700 leading-tight">{t.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400">Each theme is stored separately — switch theme in the header to restyle the others.</p>
                </div>
              </div>
            )}
          </div>

          {status && (
            <div className={`px-3 py-2 text-[11px] border-t ${status.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : status.kind === 'busy' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>{status.text}</div>
          )}

          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-slate-200 bg-slate-50">
            <button type="button" onClick={revertAll} disabled={!total}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-300 text-slate-700 bg-surface hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" /> Revert all</button>
            <span className="text-[10px] text-slate-400 hidden sm:inline">Changes stay in this browser until you save them.</span>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={copyPatch} disabled={!total}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-300 text-slate-700 bg-surface hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> Copy for chat</button>
              <button type="button" onClick={download} disabled={!total}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-300 text-slate-700 bg-surface hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Download</button>
              {CAN_SAVE_TO_SOURCE && (
                <button type="button" onClick={saveToSource} disabled={!total}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"><Save className="w-3.5 h-3.5" /> Save to source</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EditStyles() {
  return (
    <style>{`
      body.inline-edit-on { cursor: default; }
    `}</style>
  );
}
