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
- [x] Fill — the other half of done-when 1 — is read off the Filler plugin's resolved target
      (`getDatasetMeta(i).$filler.fill`) rather than `dataset.fill`, for the same reason.

## [US3] finance-sentry can drop the patch — done-when 3

- [x] Branch carries the charts-core publish plumbing: `main` merged in, bringing PR #26's
      `release-please-config.json` extra-files (charts-core version + ui's pin) and the
      `npm publish ./dist/lifekit-hq/charts-core` step. Without it the release publishes a
      `@lifekit-hq/ui` whose exact `@lifekit-hq/charts-core` pin does not exist on the registry.
- [x] Merged tree re-verified end to end — the release job builds from `main`, so the merge has to
      be green before the release, not after it.
- [x] Branch tip re-subjected `feat(ui): expose a real stacked input on cmn-area-chart`, because
      the squash title is the only commit release-please ever sees (see plan.md) and the tip
      carried `test(ui):`, which bumps nothing. The governing field is the PR's *title*, which
      lives on GitHub and not in this repo — so this only helps if the title is derived from the
      tip. **Owner: confirm PR #25's title reads `feat(ui): …` before merging.**
- [ ] Merge the PR — release-please raises the lockstep release PR: **0.2.2 → 0.3.0** (minor, not
      the patch the issue's wording assumes — `feat` bumps the minor) across ui + core + tokens +
      config + charts-core, with ui's charts-core pin rewritten to match. Owner action.
- [ ] Release: Weekly Release workflow (Mondays 08:00 UTC) or a manual dispatch merges the release
      PR, which tags and publishes all packages to GitHub Packages. Owner action — no worker step.
      If the run prints "No pending release PR", the squash title was not releasable and `main`
      needs a follow-up `feat`/`fix` commit.
- [ ] finance-sentry pins `@lifekit-hq/ui@0.3.0` and deletes `scripts/patch-lifekit-ui.js` + its
      `postinstall` hook (tracked in finance-sentry#557, not in this repo).

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
- [ ] The area tooltip footer prints `Total: …` unconditionally (`area.ts`), which is misleading in
      `stacked=false` mode where the bands are no longer summed. Pre-existing wording, and
      finance-sentry's monkey-patch had the same gap, so not a regression — but worth an issue.
- [ ] `@lifekit-hq/elements` is built but never published by `release-please.yml`. Nothing depends
      on it externally today, so it is not blocking this release.
