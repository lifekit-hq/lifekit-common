# 001 — Plan

## Load-bearing decisions (do not relitigate)

- **The flag lives in `charts-core`, not the Angular component.** `buildAreaChartConfig`,
  `buildAreaDatasets` and `updateAreaChart` take `stacked`; `AreaChartComponent` only forwards it.
  Why: `docs/STRATEGY.md` marks `area-chart` `element-rewrite`, so the Lit element inherits the
  behaviour for free instead of reimplementing it.
- **Default `true`.** Area's shipped behaviour is stacked, so the default preserves every existing
  call site. This deliberately differs from `cmn-bar-chart`, whose `stacked` defaults to `false` —
  same input shape (`input<boolean>()`), different default, because each mirrors its own status quo.
- **Toggling mutates the live chart** (`updateAreaChart` → `chart.update('none')`); the `series`
  input is never re-read from the host and the `Chart` instance is never recreated. Why: #406's
  acceptance criterion is explicit that the toggle must not refetch.
- **Scale stacking is an options concern, not a dataset one**, so `updateAreaChart` reaches into
  `chart.options.scales` as well as replacing datasets. The cast there narrows Chart.js's
  all-scale-types union, which has no common `stacked` (radial lacks it) — without it, `ng build`
  fails `TS2339`.
- **Assertions read the built scale and the plotted maximum, never `chart.options`.**
  `chart.options.scales.y.stacked` echoes back whatever was written to it, so asserting there
  passes even if Chart.js ignored the change. `chart.scales['y'].getMinMax(true).max` is the
  observable proof — Chart.js only sums the columns there when the scale is stacked, giving
  exactly 175 stacked vs 120 unstacked for the spec fixture. `scale.max` is not used: it is
  rounded out to a tick, so its value depends on the plot height. Verified by mutation — forcing
  the scales always-stacked fails the Lines test.
- **The packed artifact is the surface finance-sentry pins**, so the new input is asserted in
  `fixtures/consumer-type-check/consumer.ts`, which compiles against the `npm pack` tarball with
  `skipLibCheck: false`.
- **Release plumbing was an owner ruling, not worker scope.** `@lifekit-hq/ui` declares an exact
  pin on `@lifekit-hq/charts-core`, which the pipeline built but never published or version-bumped.
  Denys supplied the capability by hand in PR #26, which landed on `main` after this branch was
  cut (so the plumbing is not visible in this branch's tree): release-please now bumps
  `projects/charts-core/package.json` and rewrites ui's pin to match, and the publish step publishes
  charts-core ahead of ui. Workers do not edit `.github/workflows/release-please.yml` or
  `release-please-config.json` — report the block instead.

## Slice surface (the next session's read budget)

- **US1 — the input.** `projects/charts-core/src/area.ts`,
  `projects/ui/src/lib/components/area-chart/{area-chart.component.ts,area-chart.stories.ts}`,
  `fixtures/consumer-type-check/consumer.ts`.
- **US2 — the proof.** `projects/charts-core/src/area.spec.ts` (pure builders, fake chart is fine),
  `projects/ui/src/lib/components/area-chart/area-chart.component.spec.ts` (real headless Chromium,
  real Chart.js — assert rendered state).
- **US3 — the release.** No files in this repo. Merge, then release-please; publishing is the
  Weekly Release workflow (Mondays 08:00 UTC) or a manual dispatch.
