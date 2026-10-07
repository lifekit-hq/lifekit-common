# Design patterns

How lifekit apps use the design system: which token or component a situation calls for and
where the line sits. Each section covers one concern. The tokens themselves live in
`@lifekit-hq/tokens` (`projects/tokens/theme.css`); the components in Storybook.

## Colour

Each app has one colour, its **seed**. The `@lifekit-hq/tokens` engine derives the whole
`--color-*` palette from it: surfaces, text, accent, borders, status and chart series, for light
and dark and for `prefers-contrast: more`. Components only ever read the role tokens below, so
a different seed reshapes an app without touching a component.

### Roles

| Role         | Tokens                                                                                         | Rule                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces     | `surface-bg`, `surface-card`, `surface-raised`, `surface-hover`                                | Grouped: cards sit on the page ground. In dark, a raised surface is lighter. Tinted by the seed only as far as the intensity says. |
| Text         | `text-primary`, `text-secondary`, `text-disabled`, `text-placeholder`                          | Primary is 7:1 on every surface, the rest 4.5:1 (10:1 and 7:1 with more contrast).                                                 |
| Text on fill | `text-inverse`                                                                                 | The label on an accent fill (primary button), 4.5:1.                                                                               |
| Accent       | `accent-default`, `accent-hover`, `accent-active`, `accent-subtle`, `accent-100`…`accent-1000` | The seed. Accent text is 4.5:1 on the surfaces and on `accent-subtle`.                                                             |
| Borders      | `border-default`, `border-strong`, `border-focus`                                              | `border-default` is a decorative hairline. A boundary that must be seen (an input) uses `border-strong`, 3:1. Focus is 3:1.        |
| Status       | `status-{info,success,warning,error}`, `status-…-subtle`                                       | Fixed hues whatever the seed, so red always means a problem. Status text is 4.5:1 on the surfaces and on its own `-subtle` tint.   |
| Delta        | `delta-up`, `delta-down`                                                                       | A value's change. Aliases of success and error.                                                                                    |
| Chart        | `chart-series-1`…`chart-series-8`, `chart-series-9`, `chart-grid`                              | Series 1 is the accent, 2-8 are categories, 9 is the neutral (an "other" or a baseline). Every mark is 3:1 on the card and page.   |

### Where the accent may appear

The seed marks where you act or where you are, and nowhere else:

- the app's brand tile;
- the selected navigation item (`accent-subtle` behind `text-primary`);
- the primary button, at most one per view;
- links;
- the focus ring;
- chart series 1.

Not on headings, body text, decorative icons, card or page backgrounds, borders, secondary
buttons or status. If a second thing on the screen wants the accent, it is a secondary action.
With a higher intensity the surfaces carry the seed's hue too, but that is the engine's job: a
component never paints a surface with an accent token to get the same effect.

### Delta-only colour

Green and red mean "went up" and "went down" (`delta-up`, `delta-down`), and the matching status.
They are never a category:

- A chart's categories use the series tokens. The engine walks series 2-8 around the colour wheel
  from the seed and skips the red and green arcs, so a category never reads as a gain or a loss.
  `@lifekit-hq/charts-core` defaults to that order (`CATEGORICAL_STEPS`).
- A chart that shows one gain or loss, such as a sparkline coloured by its trend, uses the delta
  tokens.
- Colour is never the only signal: a change also carries its sign or an arrow.

### Seeds and intensity

| App            | Seed             | Default intensity |
| -------------- | ---------------- | ----------------- |
| finance-sentry | Petrol `#175a6d` | Quiet (0.12)      |
| lifekit        | Indigo `#4f46e5` | Quiet (0.12)      |
| devclaw        | Plum `#8e3b8a`   | Quiet (0.12)      |

Intensity is how far the seed tints the surfaces: Quiet 0.12 (the default: near-neutral
surfaces, colour only where you act), Tinted 0.45, Immersive 0.85.

- `theme.css` ships finance-sentry's palette as the default. Each app imports its own generated
  stylesheet after it: `@import '@lifekit-hq/tokens/seeds/<app>.css';` (`fs`, `lk`, `dc`). With
  no seed stylesheet an app renders as finance-sentry does.
- A user can pick another colour and intensity on their device, in Settings > Appearance with
  `<lk-theme-picker>`. In an Angular app the picker's `lk-theme-picker-change` goes to
  `ThemeService.setSeed()` (or `resetSeed()` for the app's own colour). The service sets the
  derived palette inline on `<html>` and caches it under `cmn-theme-seed`, which the pre-paint
  script applies before first paint. That script's CSP hash changed with seed support; see
  [`BROWSER-CHROME.md`](../BROWSER-CHROME.md).
- Any seed is safe. The engine solves each role's lightness to its WCAG floor rather than
  trusting the colour, and `npm run test:tokens` checks every pair over a sweep of seeds
  (`SEED_AA_FULL=1` runs the full design-time sweep). A seed close to a status hue still works,
  but the picker says the accent may be read as that status.
- The installed app icon and the manifest `theme_color` stay the app's own. A user's colour never
  changes the app's identity at OS level.
- Never write a hex in a component. Read the role token; a seed reaches every token, not a
  literal.
