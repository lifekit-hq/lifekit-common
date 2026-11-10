# @lifekit-hq/tokens

Design tokens for the lifekit ecosystem, framework-agnostic.

- `theme.css`: CSS custom properties. The light theme is the default (`:root` and
  `[data-theme='light']`); the dark theme applies under `[data-theme='dark']`. The file has no
  `prefers-color-scheme` media query. To follow the OS, the app sets `data-theme` on `<html>`: the
  pre-paint script in `brand` does it before first paint, and `ThemeService` keeps it live. It also owns the font (`--font-sans`, `--font-mono`),
  radius (`--radius-sm/md/lg` are `0px`, square, and `--radius-full` is the pill), shadow (`--shadow-sm/md/lg`) and touch-target (`--size-touch`,
  44px) tokens and
  `--color-surface-hover`, each light and dark where themed. It sets `color-scheme` per theme, and
  the `html` background and text colour, so the canvas follows the active theme. A
  `prefers-reduced-motion` block suppresses transitions and decorative animation. Looping loading
  spinners (`animate-spin`, `animate-cmn-spin`) are exempt; pulses settle. It also owns the motion
  tokens (`--cmn-duration-short|medium|long`, Carbon's 150/240/400ms; `--cmn-ease-standard|decelerate|accelerate`
  are Carbon's productive curves and `--cmn-ease-expressive-standard|decelerate|accelerate` its expressive
  ones; the old `--cmn-ease-emphasized-*` names are deprecated aliases), the Carbon layout sizes
  (`--cmn-size-xs|sm|md|lg`, 24/32/40/48px), the filled-field geometry (`--cmn-field-bg`,
  `--cmn-field-border-bottom`, `--cmn-field-focus`) and the skeleton
  colours (`--color-skeleton`, `--color-skeleton-sheen`, derived from the surface tokens so a seed
  carries through) with the `.cmn-skeleton-sweep` block `cmn-skeleton` draws. The page rhythm
  tokens (`--cmn-page-gutter`, `--cmn-title-gap`, `--cmn-section-gap`, `--cmn-group-gap`,
  `--cmn-control-h`) set the composed page: 16/16/24/8/48px on a phone, the gutter 32px and the
  title gap 24px from 768px; the control height is Carbon's 48px at every width. `cmn-page` reads them; values and
  rules: the Layout section of [`DESIGN.md`](../../DESIGN.md#layout).
- `presets/<id>.css`: design presets, a look the whole library can wear, chosen by `data-preset` on
  `<html>` next to `data-theme`. Carbon is the unscoped default in `theme.css`, so no attribute means
  Carbon. A preset overrides token names under `:root[data-preset='<id>']`, never `--color-*`, and
  loads its own font; an app imports only the presets it offers. The contract and the per-preset
  test are in [`presets/README.md`](presets/README.md); `DESIGN.md` has the Presets section. The
  Lit elements' spacing (`--space-1..4`, 4/8/12/16px) is defined in `theme.css` so a preset can
  reset it. The pre-paint script sets `data-preset` from `cmn-preset`; a stored `carbon` removes the attribute, so it beats an app's own default.
- `tailwind`: a Tailwind preset mapping the tokens onto the `cmn-*` scale (`duration-cmn-short|medium|long`,
  `ease-cmn-standard|decelerate|accelerate`, `bg-skeleton`). Its fonts, radii,
  shadows and `cmn-touch` size read the `theme.css` custom properties, so a value change lands in `theme.css` only.
  The rhythm tokens are spacing steps of the same name (`px-cmn-page-gutter`, `mb-cmn-title-gap`,
  `gap-cmn-section-gap`, `gap-cmn-group-gap`, `h-cmn-control-h`), added beside Tailwind's defaults.
  Every colour is the plain `var(--color-*)` and takes an opacity modifier too: `border-status-warning/40`
  and `bg-status-error/[0.04]` compile to `color-mix(in srgb, var(--color-status-warning) 40%, transparent)`,
  so they follow the theme. (Tailwind 3 silently drops a modifier on a bare `var()` colour, and the
  border then falls back to Preflight's gray-200 in both themes; a test fails on that.) A utility with
  no modifier stays the plain custom property. Chosen over replacing the component classes with
  dedicated border tokens because it fixes the class for every consumer, not only the places the
  library used it.
- `fonts.css`: self-hosted IBM Plex Sans (variable), the `--font-sans` font, and IBM Plex Mono for code (`--font-mono`). No font CDN.
- `brand`: the lifekit mark and the browser-chrome standard. That covers per-app icon sets under
  `brand/<app>/`, `brand/head.html`, `brand/manifest.fragment.json`, the pre-paint theme script
  (`brand/theme-init.js`) with its CSP hash, Node helpers, a Vite plugin
  (`brand/vite`), the browser-safe mark geometry (`brand/mark`: `markSvg`, `seedMarkColors`; per-app
  glyphs `lk`, `fs`, `dc`, `bk`), the `lifekit-chrome-check` drift check and the `lifekit-theme-sync` bin. See
  [`docs/BROWSER-CHROME.md`](../../docs/BROWSER-CHROME.md).
- `engine`: the seed engine, plain zero-dependency ES modules with types
  (`@lifekit-hq/tokens/engine`). `derive({seed, intensity, mode, contrast})` turns one colour into
  the whole `--color-*` palette, every pair solved to its WCAG floor. It also exports the app
  seeds, the picker presets (used by `<lk-theme-picker>`) and the per-device storage helpers that
  `ThemeService.setSeed()` and the pre-paint script share. What each role is for and where the accent
  may appear: [`docs/design/patterns.md`](../../docs/design/patterns.md#colour).
- Fixed-meaning colours (`--color-asset-equity|crypto|cash`, `--color-gain|loss`,
  `--color-flow-in|out`, `--color-flow-in-fill|flow-out-fill`, `--color-category-1`…`category-14` and
  `--color-category-other`, also Tailwind colours of the same name): set in `theme.css` for light
  and dark, never derived by the engine or set by a seed. `FIXED_COLOUR_NAMES` from `engine` lists
  them and `CATEGORY_COLOUR_NAMES` the categorical palette in index order. `flow-in|out` are the text
  grade (gain and loss); the `-fill` pair is for bars and dots, a lightness gap apart. Categories are
  a fixed palette a host maps its category keys onto, not a seed-derived series.
- `seeds/<app>.css`: each app's palette (`fs`, `lk`, `dc`, `bs`) for light, dark and
  `prefers-contrast: more`, generated from the engine by `scripts/build-seeds.mjs`
  (`npm run build:seeds`). Import it after `theme.css`; with none, the app gets the default
  (finance-sentry's petrol) palette.
- `carbon-bridge.css`: IBM Carbon's colour names (`--cds-*`) mapped onto the `--color-*` roles, so a
  Carbon-specced value follows the app's seed and light/dark with no JS. Generated by
  `scripts/build-carbon-bridge.mjs` (`npm run build:carbon-bridge`) from `scripts/carbon-bridge-map.mjs`,
  which fails on any role `theme.css` lacks; `test/carbon-bridge.spec.mjs` checks every name against
  Carbon's own g10 token set. Import it after `theme.css` and the app seed. Nothing imports it yet and
  nothing here depends on Carbon at runtime: `@carbon/styles` (with `sass`) is a devDependency of this
  package only, used by that test. It runs IBM's telemetry postinstall; set `IBM_TELEMETRY_DISABLED=true`
  wherever you `npm install` (CI does). Tags keep Carbon's colours for the cyan, teal, purple, cool-gray
  and warm-gray families, which have no lifekit role.
- `drift`: `lifekit-chrome-check drift <path>…`, a static scan of an app's source for what
  bypasses these tokens (font, colour, text size, radius, root font size, layout transitions,
  spacing) and error copy that says "please" or "invalid". Run it in CI; it exits 1 on any
  finding. Rules and options: the "Design drift check" section of
  [`docs/BROWSER-CHROME.md`](../../docs/BROWSER-CHROME.md). Rule logic adapted from impeccable
  (Apache-2.0), see [`NOTICE.md`](NOTICE.md).
- `icons`: `lifekit-chrome-check icons <path>…`, a static scan of an app's source for Lucide icon
  names that `<cmn-icon>` would render empty (outside the library's subset and the app's own
  `provideLucideIcons`). Run it in CI; it exits 1 on any finding. Rules and fixes: the "Icon check"
  section of [`docs/BROWSER-CHROME.md`](../../docs/BROWSER-CHROME.md).
- `whats-new`: `lifekit-whats-new`, the bin that turns an app's `src/whats-new/notes.md` (and,
  optionally, its release-please `CHANGELOG.md`) into the `whats-new.json` that `cmn-whats-new` in
  `@lifekit-hq/ui` fetches, with `--check` for CI. The parser and the `WhatsNewData` types are
  `@lifekit-hq/tokens/whats-new`. Notes format and wiring: [`docs/WHATS-NEW.md`](../../docs/WHATS-NEW.md).
- `screen`: the screen-composition check (`@lifekit-hq/tokens/screen`), rules C0 to C10 over a
  rendered route: page template, one left edge, title clearance, control heights, stretched
  fields, uppercase labels, row-action noise and the rest. `checkScreen(page)` runs it from an
  app's Playwright e2e at `SCREEN_VIEWPORTS.phone` and `.desktop`; `lifekit-chrome-check screen
<url>…` runs it ad hoc (needs Playwright in the calling project). Wiring and rules:
  [`docs/SCREEN-CHECK.md`](../../docs/SCREEN-CHECK.md). `checkSkeleton(page, {url, hold})` is
  its sibling for loading states: it holds a route's data requests, measures the page's
  top-level sections as a skeleton and again once loaded, and fails any pair more than 8px apart.
  `defineScreenBaselines({test, expect}, {routes})` is the pixel sibling: every route at 390 and
  1280, light and dark, against committed Linux baselines, with the before and after images
  attached to any pull request that changes one
  ([`docs/SCREEN-BASELINES.md`](../../docs/SCREEN-BASELINES.md)).
  `defineRouteScans({test, expect}, {routes})` is the judge's sibling: every route at 390 and 1280,
  light and dark, once settled, frozen and read by the impeccable design judge and by axe-core
  ([`docs/ROUTE-SCAN.md`](../../docs/ROUTE-SCAN.md)).

```js
// tailwind.config.js
module.exports = {
  presets: [require('@lifekit-hq/tokens/tailwind')],
  content: ['./src/**/*.{ts,tsx,html}'],
};
```

```css
/* global stylesheet */
@import '@lifekit-hq/tokens/fonts.css';
@import '@lifekit-hq/tokens/theme.css';
@import '@lifekit-hq/tokens/seeds/lk.css'; /* your app's seed, after theme.css */
@import '@lifekit-hq/tokens/base.css';
```

`base.css` is optional plain CSS over the theme variables: box-sizing, thin theme-aware
scrollbars, accent colour on class-less links, a heading margin reset and a pointer cursor on buttons,
plus `.cmn-hit-slop`, which grows a small inline control (a link in a card) to the `--size-touch`
(44px) hit area without changing how it looks. Import it after `theme.css` so every app scrolls and
links the same way.

It also carries two text primitives, so an app does not re-spell their utilities. They are CSS
classes, not elements, because both style a native node the app must own: an `<a>` the router
turns into a `routerLink`, a `<pre>` whose text it interpolates. A custom element would hold that
node in its shadow tree, out of reach of `routerLink`.

- `.cmn-link` is the accent link: underlined on hover, with a `--color-border-focus` ring on
  keyboard focus. Modifiers `--primary`, `--secondary` and `--inherit` pick the text colour, and
  `--underlined` keeps the underline on, for a link inside running text. It sets no size or weight.
  Add `.cmn-hit-slop` to a small link on a phone.
- `.cmn-code-block` is a monospace `<pre>` in a bordered box that wraps long lines instead of
  widening the page. `--cmn-code-block-max-height` caps it and makes it scroll; give that box
  `tabindex="0"` and an `aria-label`. `--bare` drops the box.

```html
<a class="cmn-link" routerLink="/goals/42">Goal 42</a>
<a class="cmn-link" href="https://github.com/..." target="_blank" rel="noopener noreferrer">PR</a>
<pre class="cmn-code-block">{{ log }}</pre>
```

The icons, head template and manifest fragment under `brand/` are generated from
`brand/mark.mjs`, `theme.css` and, for an app with its own colour, its `APP_MARK_SEEDS` seed by `scripts/build-brand.mjs` (`npm run build:brand` at the
workspace root, and automatically on `prepack`). Never edit them by hand.
