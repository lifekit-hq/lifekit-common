# @lifekit-hq/tokens

Design tokens for the lifekit ecosystem — framework-agnostic.

- `theme.css` — CSS custom properties, light + dark themes (`[data-theme]` + `prefers-color-scheme`).
- `tailwind` — Tailwind preset mapping the tokens onto the `cmn-*` scale.

```js
// tailwind.config.js
module.exports = {
  presets: [require('@lifekit-hq/tokens/tailwind')],
  content: ['./src/**/*.{ts,tsx,html}'],
};
```

```css
/* global stylesheet */
@import '@lifekit-hq/tokens/theme.css';
```
