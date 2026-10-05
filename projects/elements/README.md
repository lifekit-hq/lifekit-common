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

| Property   | Type           | Default | Description                          |
| ---------- | -------------- | ------- | ------------------------------------ |
| `points`   | `ChartPoint[]` | `[]`    | Data series — `{label, value}` pairs |
| `label`    | `string`       | `''`    | Card title rendered above the chart  |
| `currency` | `string`       | `'USD'` | ISO 4217 code for tooltip formatting |

```html
<lk-line-chart label="Net Worth" currency="USD"></lk-line-chart>
<script>
  document.querySelector('lk-line-chart').points = [
    {label: 'Jan', value: 1_400_000},
    {label: 'Feb', value: 1_420_892},
  ];
</script>
```

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
