/*
 * Finds the user-visible copy in the UI source, and says exactly where each piece lives.
 *
 * One extractor serves both sides of the editor, which is the point: the manifest that decides what is
 * clickable and the applier that rewrites the file agree by construction rather than by two regexes
 * happening to behave the same way.
 *
 * Positions matter more than counts. "Myself" is a label on screen, but it is also a data value written
 * seventeen times in the source (`owner: 'Myself'`). Editing the label has to rewrite the places it is
 * displayed and none of the places it is code, and only a position can tell those apart.
 */

// JSX text is HTML-ish: the source writes &amp; and &rarr; where the DOM hands back & and →.
export const ENTITIES = [
  ['&amp;', '&'], ['&lt;', '<'], ['&gt;', '>'], ['&quot;', '"'], ['&nbsp;', '\u00a0'],
  ['&rarr;', '\u2192'], ['&larr;', '\u2190'], ['&mdash;', '\u2014'], ['&ndash;', '\u2013'],
  ['&rsquo;', '\u2019'], ['&lsquo;', '\u2018'], ['&hellip;', '\u2026'], ['&times;', '\u00d7'],
  ['&pound;', '\u00a3'], ['&deg;', '\u00b0'], ['&uarr;', '\u2191'], ['&darr;', '\u2193']
];
export const decodeEntities = (s) => ENTITIES.reduce((acc, [ent, ch]) => acc.split(ent).join(ch), s);
// Only the characters that would break JSX get encoded; the rest are fine as literal UTF-8.
export const encodeForJsx = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

// JSX collapses a newline-and-indent inside a text run to one space and trims the ends, so this is the
// form the browser actually shows — and therefore the form the editor matches against.
export const normalise = (t) => (t || '').replace(/\s+/g, ' ').trim();

// Structural operators only, never bare keywords: "rates of return" is prose, and a sentence is far more
// likely to contain the word "return" than to be a line of code.
const CODE_SMELL = /&&|\|\||=>|[=!<>]==?|\);|\.\w+\(|\$\{|^\w+:$|^[?:]|[{}]$/;
const isProse = (t) => t.length >= 2 && /[A-Za-z]{2}/.test(t) && !CODE_SMELL.test(t);
// Exported so a refusal can say *why*: new wording that reads as code is not written into the source.
export const looksLikeCode = (t) => CODE_SMELL.test(normalise(t));

/*
 * Blank out what is not copy, replacing it with spaces rather than deleting it so that every offset in
 * the blanked text still points at the same character of the original.
 */
const blankOut = (source, re) => source.replace(re, (m) => ' '.repeat(m.length));
function blankNoise(source) {
  let s = source;
  s = blankOut(s, /\bclassName=\{`[^`]*`\}/g);
  s = blankOut(s, /\bclassName=\{[^}]*\}/g);
  s = blankOut(s, /\bclassName="[^"]*"/g);
  s = blankOut(s, /\bd="[^"]*"/g);
  s = blankOut(s, /^import .*$/gm);
  return s;
}

/*
 * Every piece of displayed copy, as {text, index, length} into the original source. `text` is the source
 * spelling (entities and all); `shown` is what the browser renders, which is what the editor keys on.
 */
export function extractProse(source) {
  const blanked = blankNoise(source);
  const out = [];
  const push = (index, length, kind) => {
    const raw = source.slice(index, index + length);
    const shown = normalise(decodeEntities(raw));
    if (isProse(shown)) out.push({ text: raw, shown, index, length, kind });
  };

  /*
   * Text between two tags, which may span lines and may sit beside an inline tag rather than a closing
   * one — `<p><strong>What it does:</strong> Models compound wealth…</p>` is two separate runs, and both
   * are copy. A run containing interpolation is split on it, because React renders each static piece as
   * its own text node: that is what makes the halves of "… the {x}% tax-free element …" editable.
   */
  const between = />([^<>]*)</g;
  let m;
  while ((m = between.exec(blanked)) !== null) {
    const run = m[1];
    if (!run.trim()) continue;
    // the character after the closing '<' must begin a tag, or this was a comparison, not markup
    if (!/^<\/?[A-Za-z]/.test(blanked.slice(m.index + m[0].length - 1))) continue;
    const runStart = m.index + 1;
    let cursor = 0;
    const pieces = [];
    const interp = /\{[^}]*\}/g;
    let im;
    while ((im = interp.exec(run)) !== null) { pieces.push([cursor, im.index]); cursor = im.index + im[0].length; }
    pieces.push([cursor, run.length]);
    for (const [a, b] of pieces) {
      const slice = run.slice(a, b);
      if (!slice.trim()) continue;
      const lead = slice.length - slice.trimStart().length;
      push(runStart + a + lead, slice.trim().length, 'jsx');
    }
  }

  /*
   * Copy also lives in plain string literals — the landing page builds its steps and tab cards from arrays
   * of objects — but so does data, and the two look identical to a regex. `category: 'Other Investments
   * (e.g. GIA)'` reads like a caption and is in fact the key that saved plans are matched on: rewriting it
   * would make every stored scenario fail to load. So only literals under a property name that can only
   * mean copy are taken, and everything else is left for a human to change deliberately.
   */
  const COPY_KEYS = /\b(label|body|name|title|note|description|need|hint|caption|text|heading|subtitle)\s*:\s*$/;
  const underCopyKey = (index) => COPY_KEYS.test(blanked.slice(Math.max(0, index - 40), index - 1));
  const simple = /(?<![\w$])(['"])((?:(?!\1)[^\\\n]|\\.){12,})\1/g;
  while ((m = simple.exec(blanked)) !== null) {
    if (underCopyKey(m.index)) push(m.index + 1, m[2].length, m[1] === '"' ? 'literal-dq' : 'literal-sq');
  }
  // template literals too, but only those with no interpolation — a `${…}` makes the text dynamic
  const template = /`([^`\\]{12,}?)`/g;
  while ((m = template.exec(blanked)) !== null) {
    if (m[1].includes('${') || !underCopyKey(m.index)) continue;
    push(m.index + 1, m[1].length, 'template');
  }

  // Tooltips and placeholders are user-visible copy too.
  const attr = /\b(?:placeholder|title|aria-label)="([^"\n{}]+)"/g;
  while ((m = attr.exec(blanked)) !== null) push(m.index + m[0].indexOf('"') + 1, m[1].length, 'attr');

  // a class list or a path is not a sentence, however many spaces it has
  return out.filter(r => {
    if (r.kind === 'jsx' || r.kind === 'attr') return true;
    if (!/\s/.test(r.shown)) return false;
    return !/^[a-z0-9\s:/[\]._-]+$/.test(r.shown);
  });
}

/*
 * Escape a replacement for the exact context it is going into, so that no text a person can type is able
 * to break the file. This is a guarantee rather than a check: a quote cannot end a quoted string, a brace
 * cannot open a JSX expression, and a backtick cannot close a template, because none of them survive.
 */
export function escapeFor(kind, text) {
  const flat = String(text).replace(/[\r\n]+/g, ' ');
  switch (kind) {
    case 'jsx':        return encodeForJsx(flat);
    case 'attr':       return flat.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    case 'literal-sq': return flat.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    case 'literal-dq': return flat.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    case 'template':   return flat.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
    default:           return encodeForJsx(flat);
  }
}

/*
 * The file with every piece of copy cut out of it. Two versions that differ only in wording produce the
 * identical skeleton, so comparing skeletons before and after proves that an edit changed text and
 * nothing else — no brace moved, no string closed early, no code touched. A bracket typed into a
 * sentence is invisible here, as it should be, because it lives inside a region that was cut out.
 */
export function skeleton(source) {
  const regions = extractProse(source).sort((a, b) => a.index - b.index);
  let out = '';
  let cursor = 0;
  for (const r of regions) {
    if (r.index < cursor) continue;          // a literal caught by two patterns; it is already covered
    out += source.slice(cursor, r.index) + '\u0000';
    cursor = r.index + r.length;
  }
  return out + source.slice(cursor);
}

// Every place `shown` is displayed, earliest first. Code occurrences of the same text are not included.
export function findProse(source, shown) {
  const want = normalise(shown);
  const seen = new Set();
  return extractProse(source).filter(r => {
    if (r.shown !== want) return false;
    const key = `${r.index}:${r.length}`;
    if (seen.has(key)) return false;      // a literal can be caught by two patterns; keep one
    seen.add(key);
    return true;
  }).sort((a, b) => a.index - b.index);
}
