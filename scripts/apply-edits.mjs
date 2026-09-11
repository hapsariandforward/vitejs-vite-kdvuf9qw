#!/usr/bin/env node
/*
 * Applies a patch exported by the in-app editor to the source files.
 *
 *   node scripts/apply-edits.mjs path/to/planner-edits.json
 *   node scripts/apply-edits.mjs patch.json --dry-run
 *
 * Editing a piece of wording changes it everywhere it is displayed, which is what the preview in the
 * browser already showed you: a label written once in the source but rendered down eight table rows is
 * one edit, and a label written twice changes in both places. What it never touches is the same text
 * appearing as code — `owner: 'Myself'` is a data value, not the label "Myself" — which is why the
 * positions come from the shared extractor rather than from a substring search.
 *
 * Nothing is written unless every edit in the patch can be placed. A half-applied patch would leave the
 * source in a state nobody asked for.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProse, normalise, decodeEntities, escapeFor, skeleton, looksLikeCode } from './extract-copy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..');

// How many places this text is displayed. Exported so the editor can say "changes N places" and be right.
export function occurrences(source, text) {
  return findProse(source, text).length;
}

function applyCopy(source, edits, report) {
  let out = source;
  for (const edit of edits) {
    const before = normalise(decodeEntities(String(edit.before ?? '')));
    const after = normalise(String(edit.after ?? ''));
    if (!before || before === after) { report.skipped.push({ ...edit, reason: 'unchanged' }); continue; }
    const hits = findProse(out, before);
    if (!hits.length) {
      report.failed.push({ before, after, reason: 'not shown anywhere in the source — the text was probably a calculated value, not fixed copy' });
      continue;
    }
    // back to front, so replacing one occurrence does not shift the offsets of the ones before it
    for (const hit of [...hits].reverse()) {
      // escaped for the exact context it lands in, so no typed character can escape its string or its
      // JSX text run — which is what makes it impossible for an edit to break the file
      const replacement = escapeFor(hit.kind, after);
      out = out.slice(0, hit.index) + replacement + out.slice(hit.index + hit.length);
    }
    report.applied.push({ before, after, places: hits.length });
  }
  return out;
}

/*
 * Token edits are scoped to one theme's CSS custom-property block in index.html. Each block is found by
 * its selector and only the declarations inside it are touched.
 */
const THEME_SELECTOR = { classic: ':root {', light: 'html[data-theme="light"] {', dark: 'html[data-theme="dark"] {' };

function applyTokens(html, tokensByTheme, report) {
  let out = html;
  for (const [theme, vars] of Object.entries(tokensByTheme || {})) {
    const selector = THEME_SELECTOR[theme];
    if (!selector) { report.failed.push({ theme, reason: 'unknown theme' }); continue; }
    const start = out.indexOf(selector);
    if (start === -1) { report.failed.push({ theme, reason: `block "${selector}" not found in index.html` }); continue; }
    const end = out.indexOf('\n      }', start);
    if (end === -1) { report.failed.push({ theme, reason: 'could not find the end of the block' }); continue; }
    let block = out.slice(start, end);
    for (const [name, value] of Object.entries(vars)) {
      const decl = new RegExp(`(--${name.replace(/[^a-z0-9-]/gi, '')}\\s*:)([^;]*)(;)`);
      if (decl.test(block)) {
        block = block.replace(decl, `$1 ${value}$3`);
        report.applied.push({ theme, token: name, value });
      } else {
        // a token the theme has not declared yet is appended rather than dropped
        block = block.replace(/\n$/, '') + `\n        --${name}: ${value};`;
        report.applied.push({ theme, token: name, value, added: true });
      }
    }
    out = out.slice(0, start) + block + out.slice(end);
  }
  return out;
}

function applyFonts(html, fonts, report) {
  if (!fonts || !Object.keys(fonts).length) return html;
  let out = html;
  for (const [role, stack] of Object.entries(fonts)) {
    if (!['sans', 'mono', 'display'].includes(role)) continue;
    const re = new RegExp(`(${role}:\\s*\\[)[^\\]]*(\\])`);
    if (!re.test(out)) { report.failed.push({ role, reason: 'font role not found in the Tailwind config' }); continue; }
    // Only the primary face changes. The generic fallbacks after it are what keep the app readable when
    // the chosen font is missing, so replacing the whole list with one name would be a regression.
    const existing = re.exec(out)[0].replace(/^[^[]*\[/, '').replace(/\]$/, '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const named = String(stack).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    const quoted = named.includes(' ') ? `'"${named}"'` : `'${named}'`;
    const fallbacks = existing.slice(1);
    out = out.replace(re, `$1${[quoted, ...fallbacks].join(', ')}$2`);
    report.applied.push({ font: role, stack: named, keptFallbacks: fallbacks.length });
  }
  return out;
}

export function applyPatch(patch, { root = DEFAULT_ROOT, write = true } = {}) {
  const appPath = path.join(root, 'src', 'App.jsx');
  const htmlPath = path.join(root, 'index.html');
  const report = { ok: true, applied: [], failed: [], skipped: [], files: [] };

  const originalApp = fs.readFileSync(appPath, 'utf8');
  const originalHtml = fs.readFileSync(htmlPath, 'utf8');

  const nextApp = applyCopy(originalApp, patch.copy || [], report);
  let nextHtml = applyTokens(originalHtml, patch.tokens, report);
  nextHtml = applyFonts(nextHtml, patch.fonts, report);

  /*
   * The decisive safety check. With every piece of copy cut out, the file must be byte-for-byte what it
   * was: same code, same structure, same string boundaries. If it is not, the edit reached past the text
   * it was supposed to change and nothing at all gets written.
   */
  if (nextApp !== originalApp && skeleton(nextApp) !== skeleton(originalApp)) {
    // much the commonest cause is new wording that reads as code, which the extractor then stops
    // recognising as text at all; say so rather than leaving the refusal looking arbitrary
    const codey = (patch.copy || []).filter(e => looksLikeCode(e.after)).map(e => e.after);
    report.failed.push({
      reason: codey.length
        ? `new wording that reads as code cannot be written into the source: ${codey.map(c => JSON.stringify(c.slice(0, 60))).join(', ')}`
        : 'the edit would have changed the code around the text, not just the text — refusing to write'
    });
  }

  // all or nothing: a partly-applied patch leaves the source in a state nobody asked for
  if (report.failed.length) {
    report.ok = false;
    return report;
  }
  if (write) {
    if (nextApp !== originalApp) { fs.writeFileSync(appPath, nextApp); report.files.push('src/App.jsx'); }
    if (nextHtml !== originalHtml) { fs.writeFileSync(htmlPath, nextHtml); report.files.push('index.html'); }
  }
  return report;
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const file = args.find(a => !a.startsWith('--'));
  if (!file) {
    console.error('usage: node scripts/apply-edits.mjs <patch.json> [--dry-run]');
    process.exit(2);
  }
  const patch = JSON.parse(fs.readFileSync(file, 'utf8'));
  const report = applyPatch(patch, { write: !dryRun });
  const n = report.applied.length;
  if (report.ok) {
    console.log(`${dryRun ? 'Would apply' : 'Applied'} ${n} edit${n === 1 ? '' : 's'}${report.files.length ? ' to ' + report.files.join(', ') : ''}.`);
    report.applied.forEach(a => console.log('  ' + (a.token ? `${a.theme} --${a.token} -> ${a.value}` : a.font ? `font ${a.font} -> ${a.stack}` : `"${a.before}"\n    -> "${a.after}"`)));
  } else {
    console.error(`Nothing written — ${report.failed.length} edit(s) could not be placed:`);
    report.failed.forEach(f => console.error(`  ${f.reason}\n    ${JSON.stringify(f.before ?? f.theme ?? f.role)}`));
    process.exit(1);
  }
  if (report.skipped.length) console.log(`(${report.skipped.length} unchanged, skipped)`);
}
