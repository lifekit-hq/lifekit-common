# Design presets

A preset is a look the whole library can wear, chosen like a theme: `data-preset="<id>"` on
`<html>`, next to `data-theme`. Carbon is the default and the unscoped values in `theme.css`, so
**no attribute means Carbon** and there is no `carbon.css`. Colour is a third axis (the app's seed
palette, set inline), so the result is theme x seed x preset.

One preset is one file here, `<id>.css`, exported as `@lifekit-hq/tokens/presets/<id>.css`. An app
imports only the presets it offers; an app that stays on Carbon imports nothing.

```css
/* presets/example.css */
@font-face {
  font-family: 'Example Sans';
  src: url('./example-sans.woff2') format('woff2'); /* self-hosted; fetched only when used */
}

:root[data-preset='example'] {
  --font-sans: 'Example Sans', system-ui, sans-serif;
  --radius-md: 8px;
  --cmn-control-h: 40px;
  --shadow-md: 0 2px 6px rgb(0 0 0 / 0.12);
}
:root[data-preset='example'][data-theme='dark'] {
  --shadow-md: 0 2px 6px rgb(0 0 0 / 0.5);
}
@media (max-width: 767px) {
  :root[data-preset='example'] {
    --cmn-control-h: 44px;
  }
}
```

## Rules

`projects/tokens/test/presets.spec.mjs` runs these over every file in this directory:

- **Own selector only.** Every rule is `:root[data-preset='<id>']`, optionally with
  `[data-theme='dark']`, plain or inside `@media`. That is specificity 0,2,0, so it beats the
  unscoped `:root` of `theme.css` (0,1,0). `<id>` is the file name.
- **Existing tokens only, never `--color-*`.** A preset sets names `theme.css` already declares, so
  the Carbon values stay the documented defaults. Colour stays on the seed axis.
- **Restate what theme.css varies.** The preset's base rule is more specific than `theme.css`'s
  dark block and its `@media` blocks, so a token that has a dark value (`--shadow-*`) or changes at
  768px (`--cmn-page-gutter`) is restated in the matching dark rule or media query.
- **The phone floor.** `--size-touch` and `--cmn-control-h` resolve to at least 44px at phone width.
- **Contrast.** A field border (a token with `field`, `input`, `select` or `checkbox` and `border`
  in its name) is at least 3:1 on the card and the page ground, light and dark. A `-bg`/`-fg` pair is
  at least 4.5:1. Colours are `--color-*` roles the test can read, not `color-mix()`.
- **Self-hosted fonts.** `@font-face` `src` is a local file.
- **Hooks** (below) are held to the rule `HOOK_RULES` names for each: a field outline 3:1, a chosen
  or secondary fill and its text 4.5:1, text on a selected fill 4.5:1, a toggle's on colour 3:1, and
  a toggle thumb that fits its track.

## Hooks

A token value cannot change anatomy Carbon fixes: an underline field against an outlined one, a
hairline card against a shadowed one, a bar against a pill for the selected nav item. Those are
**hooks**, the `--cmn-*` names in the PRESET HOOKS block of `theme.css`. Each defaults to its Carbon
value, so a preset sets only the ones it disagrees on, and a component reaches them through a
`cmn-*` utility in `tailwind/preset.cjs`, never by value. There is one component implementation;
a preset sets values, the component owns structure.

| Hook family                                                                               | What it decides                                                                                | Components                                                                                                  |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `--cmn-radius-control\|field\|surface\|inset`                                             | which size step a kind of thing takes: a button, a field, a card or panel, a small inner shape | every component (none names `--radius-sm\|md\|lg` directly; a test holds that)                              |
| `--cmn-field-border-width\|color`, `--cmn-select-bg\|border-width`                        | field frame: bottom rule (Carbon) or full outline                                              | input, textarea, search-input, select, date-range, chat input, top-bar search                               |
| `--cmn-card-border-color\|shadow`, `--cmn-float-border-color`, `--cmn-shell-border-color` | edge of a resting card, a floating panel and the app shell: hairline (Carbon) or shadow        | card, stat-card, charts, data-table, skeleton, dialog, menu, palette, tooltip, nav, top-bar, bottom-tab-bar |
| `--cmn-nav-*`                                                                             | side nav item inset, gap, height, radius, selected fill and mark (3px bar in Carbon)           | sidebar-nav                                                                                                 |
| `--cmn-btn-*`                                                                             | label weight, resting shadow, the secondary kind's fill, text, hover and border                | button                                                                                                      |
| `--cmn-tab*`, `--cmn-tabs-*`                                                              | line tab (Carbon) or filled tab in a tinted row                                                | tab-group                                                                                                   |
| `--cmn-segmented-*`                                                                       | box and cell radius, outline, chosen cell fill and text                                        | segmented                                                                                                   |
| `--cmn-toggle-*`                                                                          | track, thumb, padding and the on colour                                                        | toggle                                                                                                      |
| `--cmn-alert-stripe`, `--cmn-table-head-bg`                                               | alert stripe width, data-table header fill                                                     | alert, data-table                                                                                           |

Row separators inside a list, a disclosure row or a dialog stay on `border-default`: they read the
same in every look. `test/hooks.spec.mjs` fails on a hook with no Carbon default, a hook nothing
uses, or a hook the per-preset test has no rule for (`HOOK_RULES` in `test/presets-check.mjs`).

## Adding a preset

1. Write `<id>.css` here; `npm run test:tokens` checks it.
2. Import it in the app's entry stylesheet (Storybook's is `projects/ui/.storybook/storybook.css`)
   and list it in `provideDesignPresets` (app) and the toolbar list in `.storybook/preview.ts`.
3. Add a section for it to `DESIGN.md`.
