# @lifekit-hq/tokens

Design tokens for the lifekit ecosystem, framework-agnostic.

- `theme.css`: CSS custom properties. The light theme is the default (`:root` and
  `[data-theme='light']`); the dark theme applies under `[data-theme='dark']`. The file has no
  `prefers-color-scheme` media query. To follow the OS, the app sets `data-theme` on `<html>`, as
  finance-sentry's pre-paint script does. It also owns the font (`--font-sans`, `--font-mono`),
  radius (`--radius-sm/md/lg/full`) and shadow (`--shadow-sm/md/lg`) tokens and
  `--color-surface-hover`, each light and dark where themed. It sets `color-scheme` per theme, and
  the `html` background and text colour, so the canvas follows the active theme. A
  `prefers-reduced-motion` block suppresses transitions and decorative animation. Looping loading
  indicators (`animate-spin`, `animate-pulse`, `animate-cmn-spin`, `animate-cmn-pulse`) are exempt.
- `tailwind`: a Tailwind preset mapping the tokens onto the `cmn-*` scale. Its fonts, radii and
  shadows read the `theme.css` custom properties, so a value change lands in `theme.css` only.
- `fonts.css`: self-hosted variable Inter, the `--font-sans` font. No font CDN.
- `brand`: the lifekit mark and the browser-chrome standard. That covers per-app icon sets under
  `brand/<app>/`, `brand/head.html`, `brand/manifest.fragment.json`, Node helpers, a Vite plugin
  (`brand/vite`) and the `lifekit-chrome-check` drift check. See
  [`docs/BROWSER-CHROME.md`](../../docs/BROWSER-CHROME.md).

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
```

The icons, head template and manifest fragment under `brand/` are generated from
`brand/mark.mjs` and `theme.css` by `scripts/build-brand.mjs` (`npm run build:brand` at the
workspace root, and automatically on `prepack`). Never edit them by hand.
