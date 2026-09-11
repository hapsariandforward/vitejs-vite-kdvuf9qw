# Monte-Carlo Retirement Planner

A UK retirement model: pensions, ISAs, GIA and cash projected through thousands of market paths, with UK
income tax, NIC, CGT and pension allowances applied to every year.

- `src/App.jsx` — the whole app. The top half is the framework-free engine; the UI starts at
  `export default function App`.
- `index.html` — fonts, the Tailwind config, and the CSS custom properties for the three themes.
- `src/EditMode.jsx` — the in-app editor (below).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run lint
```

## Editing the page from inside the page

There is an **Edit page** button in the bottom-right corner. It lets you change wording, fonts and colours
by clicking them, rather than by editing code — and the result becomes a real change to the source, not a
setting saved in your browser.

**Changing wording.** Turn on edit mode, hover over any text, and click it. A change applies everywhere
that wording is shown, so a status label repeated down a table column changes in every row at once — the
preview shows exactly what saving will do.

The tabs at the top keep working while you edit, so you can reach the page you want; Alt-click a tab to
edit its own name. Other buttons do not act while edit mode is on.

**Changing fonts and colours.** Switch the dock to *Fonts & colours*. Font changes replace the primary
typeface and keep the fallbacks. Colours are stored per theme, so switch theme in the header to restyle the
others. Everything previews live.

Changes are held in your browser until you save them, and survive a reload.

### Getting your changes into the code

Two routes, and the editor offers whichever applies:

- **Running `npm run dev`** → a **Save to source** button appears. It writes straight into `src/App.jsx`
  and `index.html`. The page will reload itself once the files change; the confirmation is shown again
  after. Then commit as usual.
- **Looking at a deployed or preview build** → there is no server to write with, so use **Copy for chat**
  (paste it to Claude) or **Download** to get a patch file. Either can be applied later with:

  ```bash
  node scripts/apply-edits.mjs planner-edits-2026-09-11.json --dry-run   # see what it would do
  node scripts/apply-edits.mjs planner-edits-2026-09-11.json
  ```

### Why it cannot break the model

Two kinds of text are deliberately not clickable, and both matter:

- **Calculated values** — every figure, date and percentage. There is no fixed text behind them to rewrite.
- **Words the model also uses as data.** `'Other Investments (e.g. GIA)'` reads like a caption and is in
  fact the key your saved scenarios are matched on; `'Phased Drawdown'` and `'Bracket Fill Basic'` are
  matched by string in the engine. Renaming those would stop saved plans loading, so the editor will not
  touch them. Ask Claude and they can be changed properly, everywhere at once.

That distinction is not a guess about the text — it comes from *where* each piece of copy sits in the
source. `"Myself"` is a label shown in four places and also a data value written seventeen times; an edit
rewrites the four and leaves the seventeen alone.

Three further guarantees:

- **No typed character can break the file.** Every replacement is escaped for the exact context it lands
  in, so a quote cannot close a string, a brace cannot open a JSX expression, and a backtick cannot end a
  template.
- **Only text changes.** After applying, the file with all copy cut out of it must be byte-for-byte what it
  was. If it is not, nothing is written.
- **All or nothing.** If any single edit in a patch cannot be placed, nothing is written at all.

It only edits text and design tokens. Moving things around, changing layout, or adding elements is not
something it can do — ask Claude for those.

### How it works

`scripts/extract-copy.mjs` finds the user-visible copy in the source and says exactly where each piece
lives. One extractor serves both sides, which is the point: the manifest that decides what is clickable and
the applier that rewrites the file agree by construction rather than by two regexes happening to behave the
same way.

`vite-plugin-inline-edit.js` runs it at dev-server start and at build time and exposes the result as the
virtual module `virtual:editable-copy`. Under `vite dev` the same plugin adds a `POST /__inline-edit/apply`
endpoint; a production build has the manifest but no endpoint.

Edits are stored as `{before, after}` pairs keyed on the text itself rather than on a DOM path or source
line, because the text is what has to be found in the source anyway. They are re-applied to the DOM after
each React render by a `MutationObserver`, which is why no component had to be changed to support this.
