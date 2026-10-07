# @lifekit-hq/tokens

Design tokens for the lifekit ecosystem, framework-agnostic.

- `theme.css`: CSS custom properties. The light theme is the default (`:root` and
  `[data-theme='light']`); the dark theme applies under `[data-theme='dark']`. The file has no
  `prefers-color-scheme` media query. To follow the OS, the app sets `data-theme` on `<html>`: the
  pre-paint script in `brand` does it before first paint, and `ThemeService` keeps it live. It also owns the font (`--font-sans`, `--font-mono`),
  radius (`--radius-sm/md/lg/full`) and shadow (`--shadow-sm/md/lg`) tokens and
  `--color-surface-hover`, each light and dark where themed. It sets `color-scheme` per theme, and
  the `html` background and text colour, so the canvas follows the active theme. A
  `prefers-reduced-motion` block suppresses transitions and decorative animation. Looping loading
  spinners (`animate-spin`, `animate-cmn-spin`) are exempt; pulses settle.
- `tailwind`: a Tailwind preset mapping the tokens onto the `cmn-*` scale. Its fonts, radii and
  shadows read the `theme.css` custom properties, so a value change lands in `theme.css` only.
- `fonts.css`: self-hosted IBM Plex Sans (variable), the `--font-sans` font, and IBM Plex Mono for code (`--font-mono`). No font CDN.
- `brand`: the lifekit mark and the browser-chrome standard. That covers per-app icon sets under
  `brand/<app>/`, `brand/head.html`, `brand/manifest.fragment.json`, the pre-paint theme script
  (`brand/theme-init.js`) with its CSP hash, Node helpers, a Vite plugin
  (`brand/vite`) and the `lifekit-chrome-check` drift check. See
  [`docs/BROWSER-CHROME.md`](../../docs/BROWSER-CHROME.md).
- `drift`: `lifekit-chrome-check drift <path>…`, a static scan of an app's source for what
  bypasses these tokens (font, colour, text size, radius, root font size, layout transitions). Run
  it in CI; it exits 1 on any finding. Rules and options: the last section of
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
@import '@lifekit-hq/tokens/base.css';
```

`base.css` is optional plain CSS over the theme variables: box-sizing, thin theme-aware
scrollbars, accent colour on class-less links, a heading margin reset and a pointer cursor on buttons, plus `.cmn-hit-slop`, which grows a small inline
control (a link in a card) to the `--size-touch` (44px) hit area without changing how it looks. Import it
after `theme.css` so every app scrolls and links the same way.

The icons, head template and manifest fragment under `brand/` are generated from
`brand/mark.mjs` and `theme.css` by `scripts/build-brand.mjs` (`npm run build:brand` at the
workspace root, and automatically on `prepack`). Never edit them by hand.
