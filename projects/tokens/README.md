# @lifekit-hq/tokens

Design tokens for the lifekit ecosystem, framework-agnostic.

- `theme.css`: CSS custom properties. The light theme is the default (`:root` and
  `[data-theme='light']`); the dark theme applies under `[data-theme='dark']`. The file has no
  `prefers-color-scheme` media query. To follow the OS, the app sets `data-theme` on `<html>`: the
  pre-paint script in `brand` does it before first paint, and `ThemeService` keeps it live. It also owns the font (`--font-sans`, `--font-mono`),
  radius (`--radius-sm/md/lg/full`), shadow (`--shadow-sm/md/lg`) and touch-target (`--size-touch`,
  44px) tokens and
  `--color-surface-hover`, each light and dark where themed. It sets `color-scheme` per theme, and
  the `html` background and text colour, so the canvas follows the active theme. A
  `prefers-reduced-motion` block suppresses transitions and decorative animation. Looping loading
  spinners (`animate-spin`, `animate-cmn-spin`) are exempt; pulses settle. It also owns the motion
  tokens (`--cmn-duration-short|medium|long`, 150/250/400ms; `--cmn-ease-standard`,
  `--cmn-ease-emphasized-decelerate`, `--cmn-ease-emphasized-accelerate`) and the skeleton
  colours (`--color-skeleton`, `--color-skeleton-sheen`, derived from the surface tokens so a seed
  carries through) with the `.cmn-skeleton-sweep` block `cmn-skeleton` draws.
- `tailwind`: a Tailwind preset mapping the tokens onto the `cmn-*` scale (`duration-cmn-short|medium|long`,
  `ease-cmn-standard|decelerate|accelerate`, `bg-skeleton`). Its fonts, radii,
  shadows and `cmn-touch` size read the `theme.css` custom properties, so a value change lands in `theme.css` only.
- `fonts.css`: self-hosted IBM Plex Sans (variable), the `--font-sans` font, and IBM Plex Mono for code (`--font-mono`). No font CDN.
- `brand`: the lifekit mark and the browser-chrome standard. That covers per-app icon sets under
  `brand/<app>/`, `brand/head.html`, `brand/manifest.fragment.json`, the pre-paint theme script
  (`brand/theme-init.js`) with its CSP hash, Node helpers, a Vite plugin
  (`brand/vite`), the `lifekit-chrome-check` drift check and the `lifekit-theme-sync` bin. See
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
- `drift`: `lifekit-chrome-check drift <path>…`, a static scan of an app's source for what
  bypasses these tokens (font, colour, text size, radius, root font size, layout transitions,
  spacing) and error copy that says "please" or "invalid". Run it in CI; it exits 1 on any
  finding. Rules and options: the last section of
  [`docs/BROWSER-CHROME.md`](../../docs/BROWSER-CHROME.md). Rule logic adapted from impeccable
  (Apache-2.0), see [`NOTICE.md`](NOTICE.md).

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
`brand/mark.mjs` and `theme.css` by `scripts/build-brand.mjs` (`npm run build:brand` at the
workspace root, and automatically on `prepack`). Never edit them by hand.
