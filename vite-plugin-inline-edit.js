/*
 * In-app editing support, split into two independent halves.
 *
 * 1. A virtual module (`virtual:editable-copy`) listing every static prose string in the UI source,
 *    with how many times each occurs. The editor uses it to decide what is safe to offer for editing:
 *    a string that is not in the manifest is dynamic (a computed figure, a date) and editing it would
 *    have nothing to write back to; a string occurring more than once cannot be rewritten unambiguously.
 *    It is generated at dev-server start and at build time, so a deployed copy carries it too.
 *
 * 2. A dev-only endpoint that applies a patch straight to the source files. It exists only under
 *    `vite dev` — a built site has no server to write with, and the editor falls back to exporting the
 *    patch as a file instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import { decodeEntities, occurrences } from './scripts/apply-edits.mjs';

const VIRTUAL_ID = 'virtual:editable-copy';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/*
 * Pull the prose out of the JSX. This is deliberately a scanner rather than a parser: it only needs to
 * recognise text sitting between two tags, and being conservative costs nothing — a string it misses is
 * simply not offered for editing, which is a far better failure than offering one it cannot write back.
 */
// `a > b && c < d` in the engine looks exactly like JSX text to a naive scan, so the text must be
// followed by a closing tag and must not read like an expression.
const CODE_SMELL = /&&|\|\||=>|[=!<>]==?|\breturn\b|\bconst\b|\bfunction\b|\);|\.\w+\(|\$\{/;

export function extractEditableStrings(source) {
  const counts = new Map();
  // text sitting immediately before a closing tag, with no braces (interpolation) and no nested markup
  const re = />([^<>{}\n]+)<\//g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const text = m[1].trim();
    if (text.length < 2) continue;
    // needs to read as prose: at least two consecutive letters, and no expression syntax
    if (!/[A-Za-z]{2}/.test(text)) continue;
    if (CODE_SMELL.test(text)) continue;
    counts.set(text, (counts.get(text) || 0) + 1);
  }
  return counts;
}

// String attributes worth editing (tooltips and placeholders are user-visible copy too).
export function extractEditableAttributes(source) {
  const counts = new Map();
  const re = /\b(?:placeholder|title|aria-label)="([^"\n{}]+)"/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const text = m[1].trim();
    if (text.length < 2 || !/[A-Za-z]{2}/.test(text)) continue;
    if (CODE_SMELL.test(text)) continue;
    counts.set(text, (counts.get(text) || 0) + 1);
  }
  return counts;
}

/*
 * The manifest is keyed on what the browser will show, not on what the source says: JSX writes
 * `Bed &amp; SIPP` where the DOM hands back `Bed & SIPP`, and the editor matches against the DOM.
 * The entity handling and the occurrence count both come from the applier, so the editor's warning and
 * the applier's refusal can never disagree.
 */
function buildManifest(root) {
  const file = path.join(root, 'src', 'App.jsx');
  let source = '';
  try { source = fs.readFileSync(file, 'utf8'); } catch { return { strings: {}, generatedAt: null }; }
  const counts = extractEditableStrings(source);
  for (const [k, v] of extractEditableAttributes(source)) counts.set(k, (counts.get(k) || 0) + v);
  /*
   * The count recorded is how many times the text occurs anywhere in the source, not how many times it
   * occurs as JSX text — that is the measure the applier refuses on. "Myself" reads as a single label on
   * screen but appears dozens of times across the file, and the warning has to say so.
   */
  const out = {};
  for (const k of counts.keys()) {
    const shown = decodeEntities(k);
    out[shown] = occurrences(source, shown);
  }
  return { strings: out, generatedAt: new Date().toISOString() };
}

export default function inlineEdit() {
  let root = process.cwd();
  let isDev = false;
  return {
    name: 'inline-edit',
    configResolved(config) { root = config.root; isDev = config.command === 'serve'; },
    resolveId(id) { return id === VIRTUAL_ID ? RESOLVED_ID : null; },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const manifest = buildManifest(root);
      // `canSaveToSource` tells the editor which save path to offer without it having to probe the server
      return `export const EDITABLE = ${JSON.stringify(manifest.strings)};
export const GENERATED_AT = ${JSON.stringify(manifest.generatedAt)};
export const CAN_SAVE_TO_SOURCE = ${JSON.stringify(isDev)};
`;
    },
    // rebuild the manifest when the source changes, so newly added copy becomes editable without a restart
    handleHotUpdate({ file, server }) {
      if (!file.endsWith(path.join('src', 'App.jsx'))) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
    configureServer(server) {
      server.middlewares.use('/__inline-edit/apply', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return; }
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 4e6) req.destroy(); });
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const patch = JSON.parse(body);
            const { applyPatch } = await import('./scripts/apply-edits.mjs');
            const result = applyPatch(patch, { root, write: true });
            res.end(JSON.stringify(result));
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
          }
        });
      });
    }
  };
}
