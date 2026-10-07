# @lifekit-hq/elements

Framework-free Lit custom elements — the long-term UI substrate for the lifekit ecosystem.

## Direction

Web components are the **long-term direction** for lifekit-common leaf components. New simple leaf
components are born as Lit elements here; existing Angular components convert when touched.
Angular apps (finance-sentry, lifekit-dashboard) and the React devclaw console consume these
elements side-by-side — the web standard is the shared contract.

Angular Elements (compiling the Angular runtime into each element) is **rejected**: it ships
zone.js and the Angular runtime to every consumer.

---

## Conventions (settled by the `<lk-line-chart>` pilot — ratified by merging this PR)

### Theming strategy: tokens-only, no Tailwind in shadow DOM

Tailwind utility classes do **not** pierce shadow DOM. The right theming contract is:

- `@lifekit/tokens` CSS custom properties (`--color-*`, `--space-*`, `--radius-*`) **do** pierce
  shadow DOM because they inherit down the cascade.
- Elements use `css\`…\``with`var(--token, fallback)` — no Tailwind utilities, no inline styles
  generated at build time.
- The host page (Angular, React, plain HTML) imports `@lifekit-hq/tokens/theme.css` once; elements
  pick up the resolved values automatically.

```css
/* inside an element's static styles */
:host {
  display: block;
}
.wrapper {
  background: var(--color-surface-card, #ffffff);
  border: 1px solid var(--color-border-default, #c7c4d8);
}
```

### Property / event naming

| Concern         | Convention                                                        |
| --------------- | ----------------------------------------------------------------- |
| Data inputs     | Camel-case properties (set via `.prop=${value}` in Lit templates) |
| Simple scalars  | Also map to kebab-case attributes for plain-HTML convenience      |
| Complex objects | **Property-only** (arrays, objects — `@property({type: Array})`)  |
| Output events   | `CustomEvent` with `detail`, named `lk-<element>-<action>`        |

Example:

```typescript
@property({type: Array}) public points: ChartPoint[] = [];
@property({type: String}) public label = '';   // also reflects to attribute
```

Angular consumes via property binding:

```html
<lk-line-chart [points]="data" [label]="'Net Worth'"></lk-line-chart>
```

React (when no framework wrapping is needed) uses Lit's React wrappers or property-setting refs.

### File layout

```
projects/elements/src/
  lk-<name>.ts        ← element implementation + type re-exports
  lk-<name>.spec.ts   ← Vitest unit tests (jsdom)
```

Storybook stories for Angular consumption proof live in `projects/ui/src/lib/elements/`:

```
projects/ui/src/lib/elements/
  lk-<name>.stories.ts   ← @storybook/angular story; proves Angular host renders the element
```

### Storybook / VRT

Stories for elements live in the Angular Storybook host (`@lifekit-hq/ui`), demonstrating
consumption from Angular. The story imports the element as a side effect (which registers the
custom element), then uses an Angular render template with `CUSTOM_ELEMENTS_SCHEMA`.

VRT baselines are `*-win32.png`; Denys runs VRT on Windows at PR review. Container-pinned Linux
baselines (for CI VRT) are a deliberate follow-up — not part of this package.

### Build

The package is built by `ng build @lifekit-hq/elements` (ng-packagr compiles the TypeScript;
no Angular-specific transforms are applied). The entry point is `src/index.ts`.

Peer dependencies: `lit ^3.0.0`, `chart.js ^4.5.1`. Runtime dependency: `@lifekit-hq/charts-core`
(version-locked to the lockstep release via `release-please-config.json`).

---

## Elements

### `<lk-line-chart>`

Renders a Chart.js line chart inside shadow DOM. Themed via `@lifekit/tokens` CSS custom
properties. Data flows in via the `points` property; no user-interaction events are emitted
in this pilot.

| Property      | Type                                                                | Default      | Description                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `points`      | `ChartPoint[]`                                                      | `[]`         | Data series — `{label, value, time?}` points                                                                                                                                          |
| `label`       | `string`                                                            | `''`         | Card title rendered above the chart                                                                                                                                                   |
| `currency`    | `string`                                                            | `'USD'`      | ISO 4217 code, used when `valueFormat` is `'currency'`                                                                                                                                |
| `valueFormat` | `'currency' \| 'number' \| 'percent' \| (value, compact) => string` | `'currency'` | How ticks and tooltips render values. `'number'` and `'percent'` carry no currency symbol; a function (property only) gets `compact: true` for axis ticks. Attribute: `value-format`. |
| `compact`     | `boolean`                                                           | `false`      | Sparkline: just the line and fill - no title, frame, axes, gridlines or tooltip, no animation. Height follows a `height` on the element (min `2rem`).                                 |
| `yDomain`     | `{min?: number, max?: number}`                                      | `undefined`  | Fixes the y range instead of auto-scaling it to the data; an omitted bound stays auto. Property only. Works in compact mode.                                                          |
| `xSpacing`    | `'even' \| 'time'`                                                  | `'even'`     | `'time'` places each point by the epoch-ms `time` on it instead of in an equal slot (points without one are left out). Attribute: `x-spacing`. Works in compact mode.                 |
| `scrubbable`  | `boolean`                                                           | `false`      | Opts into scrub-to-read (below). The chart's own tooltip steps aside; ignored in compact mode.                                                                                        |

**Scrub-to-read.** With `scrubbable`, a crosshair and a dot follow a held pointer - a hovering mouse
or pen, or a finger pressed on the chart (a horizontal drag reads the chart, a vertical one still
scrolls the page). `lk-line-chart-scrub` fires when the point under the pointer changes, or when
the data under a held pointer does, with a `ChartScrubPoint` as `detail` (`index`, `label`, `x`,
`y`, `total`, `values`), and `lk-line-chart-scrub-end` fires on release. The host swaps its
headline number and delta while scrubbing and restores them on the end event;
`chartDelta(from, to)` from `@lifekit-hq/charts-core` gives the change and percent. Colour the delta text only - the chart never repaints.

```html
<lk-line-chart label="Net Worth" currency="USD"></lk-line-chart>
<!-- sparkline sized by the host -->
<lk-line-chart compact style="height: 2.5rem"></lk-line-chart>
<!-- unit-less series, e.g. a score of 25 renders as "25", not "$25" -->
<lk-line-chart label="Health score" value-format="number"></lk-line-chart>
<script>
  document.querySelector('lk-line-chart').points = [
    {label: 'Jan', value: 1_400_000},
    {label: 'Feb', value: 1_420_892},
  ];
</script>
```

### `<lk-dismissible-chip>`

Removable chip for an applied filter or a picked value: the label plus a remove button. It is the
chip with its own remove affordance, so a host never nests an icon in a selectable chip to fake one.
The remove button is a native `<button>` (Tab reaches it, Enter and Space press it), at least 44px
square (`--size-touch`) while the pill around the label stays chip-sized, with a `--color-border-focus`
ring on keyboard focus. A host laying chips out in wrapping rows needs a row gap of at least 12px,
so the remove targets of chips on adjacent rows never overlap.

| Property      | Attribute      | Type      | Default | Description                                                                                           |
| ------------- | -------------- | --------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `label`       | `label`        | `string`  | `''`    | The chip text; a long one truncates with an ellipsis                                                  |
| `removeLabel` | `remove-label` | `string`  | `''`    | Accessible name of the remove button; empty means "Remove {label}", e.g. "Remove Category: Groceries" |
| `disabled`    | `disabled`     | `boolean` | `false` | Disables the remove button                                                                            |

Event: `lk-dismissible-chip-remove` - the reader pressed remove; `detail` is `{label}`. The element
does not remove itself: the host drops the chip from its own state, and should then move focus
somewhere sensible, since the focused button is gone.

```html
<lk-dismissible-chip label="Category: Groceries"></lk-dismissible-chip>
<script>
  const chip = document.querySelector('lk-dismissible-chip');
  chip.addEventListener('lk-dismissible-chip-remove', () => chip.remove());
</script>
```

Why `lk-dismissible-chip` and not a variant of `cmn-chip`: it is a presentational leaf with no
framework behaviour, so the layered substrate rule in `docs/STRATEGY.md` makes it a Lit element;
`cmn-chip` and `cmn-tag` are unchanged.

### `<lk-segmented>`

One-row segmented control for picking one value out of a short list, such as a chart period. A
`role="radiogroup"` of `role="radio"` cells, not a tablist: choosing a cell changes a value the host
reads, it does not swap a panel. Cells share the row equally, never wrap and are at least 44px
square (seven fit the 326px a card leaves on a 390px phone).

| Property   | Attribute  | Type                                                   | Default | Description                                                    |
| ---------- | ---------- | ------------------------------------------------------ | ------- | -------------------------------------------------------------- |
| `options`  | -          | `{value: string, label: string, disabled?: boolean}[]` | `[]`    | The cells, in order. Property only. A disabled cell is skipped |
| `value`    | `value`    | `string`                                               | `''`    | The chosen option's `value`                                    |
| `label`    | `label`    | `string`                                               | `''`    | Accessible name of the group                                   |
| `disabled` | `disabled` | `boolean`                                              | `false` | Disables every cell                                            |

Event: `lk-segmented-change` - the reader chose a cell; `detail` is `{value}`. Like a native `change`,
it fires for the reader's choice only, never for a `value` the host sets.

Keyboard: Tab lands on the chosen cell (or the first enabled one); the arrow keys move and choose,
wrapping at the ends; Home and End jump to the first and last enabled cell.

```html
<lk-segmented label="History range" value="1M"></lk-segmented>
<script>
  const el = document.querySelector('lk-segmented');
  el.options = ['1W', '1M', '1Y'].map(p => ({value: p, label: p}));
  el.addEventListener('lk-segmented-change', e => load(e.detail.value));
</script>
```

Why `lk-segmented` and not a `cmn-*` Angular component: it has no
framework behaviour (no CDK, router, overlay or form integration - the host binds `value` and the
event), so the layered substrate rule in `docs/STRATEGY.md` makes it a framework-free leaf, and the
`lk-` tag prefix is that layer's convention.

### `<lk-update-prompt>`

Presentational "new version available" prompt. Renders nothing until `ready` is true, then stays
until the user acts on it.

| Property | Type      | Default | Description                                |
| -------- | --------- | ------- | ------------------------------------------ |
| `ready`  | `boolean` | `false` | Show the prompt (a new version is waiting) |

Event: `lk-update-prompt-reload` — the user tapped Reload. Pair it with `AppUpdateService.reload()`
from `@lifekit-hq/core/pwa`.

### `<lk-offline-banner>`

Self-contained banner shown while the device is offline (`online` / `offline` window events).

| Property  | Type     | Default              | Description              |
| --------- | -------- | -------------------- | ------------------------ |
| `message` | `string` | generic offline text | Text shown in the banner |

### `<lk-install-hint>`

"Install this app" hint. Hidden when already installed (`display-mode: standalone` or
`navigator.standalone`) or once dismissed. iOS Safari shows "Share, then Add to Home Screen";
Chromium shows an Install button once the browser fires `beforeinstallprompt` (captured at module
load, so late-mounting hints still work). Dismissal is remembered in `localStorage`.

Event: `lk-install-hint-dismiss` — the user dismissed the hint.

### `<lk-account-menu>`

Small "who is signed in" menu shared by every lifekit app: an avatar (initials when there is no
picture) that opens a panel with the name, the email and one **Sign out** link. The element does
not fetch claims or talk to the identity provider; the host passes the claims in and decides the
sign-out URL. Only absolute `http(s)` and root-relative URLs are followed.

| Property     | Attribute      | Type     | Default | Description                                                                    |
| ------------ | -------------- | -------- | ------- | ------------------------------------------------------------------------------ |
| `name`       | `name`         | `string` | `''`    | Display name from the `name` claim                                             |
| `email`      | `email`        | `string` | `''`    | Email from the `email` claim                                                   |
| `picture`    | `picture`      | `string` | `''`    | Optional avatar URL (`picture` claim); initials when empty or it fails to load |
| `signOutUrl` | `sign-out-url` | `string` | `''`    | Where Sign out navigates; no Sign out link is shown when empty                 |

Keyboard: Enter/Space on the avatar opens the panel and moves focus to Sign out; Escape closes it
and returns focus to the avatar; tabbing out or clicking elsewhere closes it. Colours come from
the `@lifekit-hq/tokens` light and dark custom properties.

```html
<lk-account-menu
  name="Ada Lovelace"
  email="ada@example.com"
  sign-out-url="/oauth2/sign_out?rd=..."
></lk-account-menu>
```

**Sign-out URL, apps behind the oauth2-proxy gate.** Sign out has to end two sessions: the gate's
oauth2-proxy cookie and the Logto session. Point `sign-out-url` at the gate's sign-out endpoint
and pass Logto's end-session URL, URL-encoded, as `rd`:

```
/oauth2/sign_out?rd=<encoded: {issuer}/oidc/session/end?client_id={gate client id}&post_logout_redirect_uri={encoded app root}>
```

For the tailnet gate the issuer is `https://lifekit-vps.tail1cb676.ts.net:3001/oidc` (so the end-session URL is
`https://lifekit-vps.tail1cb676.ts.net:3001/oidc/session/end`) and the post-logout landing is the
app's own root (for example `https://lifekit-vps.tail1cb676.ts.net:18790/`), which the gate answers
with the sign-in page. The `client_id` is the gate's Logto application, and the `post_logout_redirect_uri` must be
one of that application's registered post-logout URIs. See "Tailnet sign-in gate" in the
lifekit-stack runbook for the gate itself.

**Sign-out URL, OIDC client apps (finance-sentry).** Use the app's own sign-out route, which ends
its session and then redirects to Logto's `/oidc/session/end` with its own `client_id` and a
registered `post_logout_redirect_uri`.

### `<lk-theme-picker>`

The colour section of Settings > Appearance: the app's own colour, the preset colours, a custom
colour, and an intensity slider (Quiet / Tinted / Immersive). The whole palette is derived from the
one colour by the `@lifekit-hq/tokens` engine, so every choice keeps text and controls readable; a
colour close to a status colour gets a note saying the accent may be read as that status. What the
colour is allowed to touch: [`docs/design/patterns.md`](../../docs/design/patterns.md#colour).

| Property    | Attribute   | Type     | Default | Description                                    |
| ----------- | ----------- | -------- | ------- | ---------------------------------------------- |
| `appSeed`   | `app-seed`  | `string` | `''`    | The app's own colour, offered as "App default" |
| `seed`      | `seed`      | `string` | `''`    | The user's colour; empty for the app's own     |
| `intensity` | `intensity` | `number` | `0.12`  | How far the colour tints the surfaces, 0-1     |

The element is controlled. Events:

- `lk-theme-picker-change`, `detail: {seed: string | null, intensity: number}` (`seed: null` is
  the app's own colour). In an Angular app, pass it to `ThemeService.setSeed(seed, intensity)`,
  or `resetSeed()` for `null`; the service persists it per device and the pre-paint script
  applies it on the next load.

```html
<lk-theme-picker app-seed="#175a6d"></lk-theme-picker>
```
