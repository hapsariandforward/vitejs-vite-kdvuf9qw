#!/usr/bin/env node
/*
 * Applies a patch exported by the in-app editor to the source files.
 *
 *   node scripts/apply-edits.mjs path/to/retirement-planner-edits.json
 *   node scripts/apply-edits.mjs patch.json --dry-run
 *
 * The governing rule is that this never guesses. A copy edit is written only when its original text
 * occurs exactly once in App.jsx; zero occurrences (the text was dynamic, or the source has moved on)
 * and two or more (ambiguous) are both reported and skipped, and nothing is written unless every edit
 * in the patch can be placed. A half-applied patch would be far worse than a rejected one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..');

// JSX text is HTML-ish: the source writes &amp; and &rarr; where the DOM hands back & and →.
const ENTITIES = [
  ['&amp;', '&'], ['&lt;', '<'], ['&gt;', '>'], ['&quot;', '"'], ['&nbsp;', ' '],
  ['&rarr;', '→'], ['&larr;', '←'], ['&mdash;', '—'], ['&ndash;', '–'],
  ['&rsquo;', '’'], ['&lsquo;', '‘'], ['&hellip;', '…'], ['&times;', '×'],
  ['&pound;', '£'], ['&deg;', '°'], ['&uarr;', '↑'], ['&darr;', '↓']
];
export const decodeEntities = (s) => ENTITIES.reduce((acc, [ent, ch]) => acc.split(ent).join(ch), s);
// Only the characters that would break JSX get re-encoded; the rest are fine as literal UTF-8.
const encodeForJsx = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

/*
 * Every way the source might have spelled this text. The DOM hands back decoded characters, but the
 * source could have written any of them as an entity — and a caption with both "&" and "→" in it needs
 * both encoded at once, so the fully-encoded form has to be a candidate in its own right.
 */
export function sourceForms(text) {
  const forms = new Set([text, encodeForJsx(text)]);
  const applicable = ENTITIES.filter(([, ch]) => text.includes(ch));
  if (applicable.length) forms.add(applicable.reduce((acc, [ent, ch]) => acc.split(ch).join(ent), text));
  for (const [ent, ch] of applicable) forms.add(text.split(ch).join(ent));
  return [...forms];
}

// Find the one place `text` appears as source, trying each spelling it might have been written in.
function locate(source, text) {
  let ambiguous = null;
  for (const needle of sourceForms(text)) {
    const n = source.split(needle).length - 1;
    if (n === 1) return { needle, count: 1 };
    if (n > 1 && !ambiguous) ambiguous = { needle, count: n };
  }
  return ambiguous || { needle: null, count: 0 };
}

// How many times this text occurs in the source, by the same measure `locate` uses. Exported so the
// editor's "used in N places" warning predicts exactly what applying the patch will do.
export function occurrences(source, text) {
  return locate(source, decodeEntities(text)).count;
}

function applyCopy(source, edits, report) {
  let out = source;
  for (const edit of edits) {
    const before = decodeEntities(String(edit.before ?? ''));
    const after = String(edit.after ?? '');
    if (!before || before === after) { report.skipped.push({ ...edit, reason: 'unchanged' }); continue; }
    const { needle, count } = locate(out, before);
    if (count === 0) {
      report.failed.push({ before, after, reason: 'not found in source — the text was probably a calculated value, not fixed copy' });
      continue;
    }
    if (count > 1) {
      report.failed.push({ before, after, reason: `appears ${count} times in source, so the right one cannot be identified` });
      continue;
    }
    // re-encode to match how the original was written, so an edit does not change the escaping style
    const replacement = needle === before ? after : encodeForJsx(after);
    out = out.replace(needle, replacement);
    report.applied.push({ before, after });
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
