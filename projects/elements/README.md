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
- Elements use `css\`…\`` with `var(--token, fallback)` — no Tailwind utilities, no inline styles
  generated at build time.
- The host page (Angular, React, plain HTML) imports `@lifekit-hq/tokens/theme.css` once; elements
  pick up the resolved values automatically.

```css
/* inside an element's static styles */
:host { display: block; }
.wrapper {
  background: var(--color-surface-card, #ffffff);
  border: 1px solid var(--color-border-default, #c7c4d8);
}
```

### Property / event naming

| Concern          | Convention                                                         |
| ---------------- | ------------------------------------------------------------------ |
| Data inputs      | Camel-case properties (set via `.prop=${value}` in Lit templates)  |
| Simple scalars   | Also map to kebab-case attributes for plain-HTML convenience       |
| Complex objects  | **Property-only** (arrays, objects — `@property({type: Array})`)  |
| Output events    | `CustomEvent` with `detail`, named `lk-<element>-<action>`        |

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
no Angular-specific transforms are applied). The entry point is `src/public-api.ts`.

Peer dependencies: `lit ^3.0.0`, `chart.js ^4.5.1`.

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
    { label: 'Jan', value: 1_400_000 },
    { label: 'Feb', value: 1_420_892 },
  ];
</script>
```
