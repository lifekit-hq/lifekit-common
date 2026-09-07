# 001 — Tasks

## [US1] `stacked` reaches `cmn-area-chart` — done-when 1

- [x] `buildAreaChartConfig` / `buildAreaDatasets` take `stacked` (trailing, defaults `true`) and
      apply it to both cartesian scales and to each dataset's `fill`.
- [x] `updateAreaChart` restacks the live scales as well as replacing the datasets, then
      `chart.update('none')`.
- [x] `AreaChartComponent.stacked = input<boolean>(true)`, forwarded on construction and re-applied
      from the existing `effect` — no refetch, no second `Chart`.
- [x] Story documents the input: `argTypes.stacked` description + `Stacked` and `Lines` stories.
- [x] `fixtures/consumer-type-check/consumer.ts` reads `stacked` off the packed artifact, so the
      input is asserted on the surface finance-sentry actually pins.

## [US2] Both states are proven — done-when 2

- [x] `area.spec.ts` covers the builders in both modes, the empty-series case, and the live-update
      path (labels, datasets, `'none'` repaint, no-cartesian-scales chart).
- [x] `area-chart.component.spec.ts` asserts the default, the toggle to lines, and the toggle back
      on a real Chart.js instance in headless Chromium.
- [x] Those assertions read the built scale and the y-axis's plotted maximum, so they fail if
      Chart.js ignores the option rather than passing on a read-back of what was written.

## [US3] finance-sentry can drop the patch — done-when 3

- [ ] Merge the PR — release-please raises the lockstep patch-release PR (ui + core + tokens +
      config + charts-core, with ui's charts-core pin rewritten to match).
- [ ] Release: Weekly Release workflow (Mondays 08:00 UTC) or a manual dispatch merges the release
      PR, which tags and publishes all packages to GitHub Packages. Owner action — no worker step.
- [ ] finance-sentry pins the release and deletes `scripts/patch-lifekit-ui.js` + its `postinstall`
      hook (tracked in finance-sentry#557, not in this repo).

## Follow-ups found while shipping this (not in scope here)

- [ ] `cmn-bar-chart`'s `stacked` input is construction-time only: `updateBarChart` takes no
      `stacked` parameter and `BarChartComponent`'s effect never reads the signal, so toggling it
      at runtime silently no-ops (and does not even re-run the effect) — the same bug this feature
      fixes for area. Needs its own issue.
- [ ] `@lifekit-hq/ui` imports `chart.js` directly in four components but declares it neither as a
      dependency nor a peer dependency; it resolves today only because `@lifekit-hq/charts-core`
      declares the peer. Should be declared on ui too.
- [ ] `cmn-bar-chart` still ships no `*.stories.ts`, against the CLAUDE.md rule (pre-existing, one
      of several).
