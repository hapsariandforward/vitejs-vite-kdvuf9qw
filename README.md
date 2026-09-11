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

**Changing wording.** Turn on edit mode, hover over any text, and click it. Figures, dates and percentages
are deliberately not clickable: they are calculated, so there is no fixed text behind them to rewrite.

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

### What it will refuse to do

The applier never guesses. A wording change is written only when its original text appears **exactly once**
in the source. If the same wording is used in several places — short labels like "Myself" or "Owner" — it
cannot tell which one you meant, so it refuses and tells you. The editor warns you about this at the moment
you edit such a string, using the same count the applier will use, so the warning is never a surprise.

If any single edit in a patch cannot be placed, **nothing is written at all**. A half-applied patch would be
worse than a rejected one.

It also only edits text and design tokens. Moving things around, changing layout, or adding elements is not
something it can do — ask Claude for those.

### How it works

`vite-plugin-inline-edit.js` scans `src/App.jsx` at dev-server start and at build time and exposes every
static prose string, with how many times each occurs, as the virtual module `virtual:editable-copy`. The
editor uses that to decide what is safe to offer. Under `vite dev` the same plugin adds a
`POST /__inline-edit/apply` endpoint; a production build has the manifest but no endpoint.

Edits are stored as `{before, after}` pairs keyed on the text itself rather than on a DOM path or source
line, because the text is what has to be found in the source anyway. They are re-applied to the DOM after
each React render by a `MutationObserver`, which is why no component had to be changed to support this.
