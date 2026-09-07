# 001 — Area chart: a real `stacked` input

**Tracks:** [lifekit-common#23](https://github.com/lifekit-hq/lifekit-common/issues/23)
**Consumers:** finance-sentry [#406](https://github.com/lifekit-hq/finance-sentry/issues/406) (the toggle), [#557](https://github.com/lifekit-hq/finance-sentry/issues/557) (delete the monkey-patch)

## Why

finance-sentry's Net Worth Over Time card has a Stacked/Lines toggle. It only works because
`frontend/package.json` runs a 351-line postinstall script that string-replaces
`node_modules/@lifekit-hq/ui`'s FESM and `.d.ts` to add a `stacked` input this library never
shipped. Production builds therefore depend on a monkey-patch of a dependency, and the script
`String.replace`s silently when its needles stop matching. Shipping the input for real is the
only way finance-sentry can delete it.

## Done when

1. `cmn-area-chart` exposes a `stacked` boolean input, defaulting to today's shipped behaviour
   (stacked), that toggles Chart.js dataset stacking + fill without re-fetching data; the input
   is documented in the component's story.
2. A unit test asserts both states produce the expected Chart.js result — stacked scales + fill
   on, independent unfilled lines off.
3. A patch release is published so finance-sentry can pin it and drop `scripts/patch-lifekit-ui.js`.

## Behaviour contract (from finance-sentry#406)

- `stacked` defaults to `true`, so every existing call site renders exactly as before.
- `false` plots each series from zero with no fill, so a move in a bottom band no longer
  visually displaces the series above it.
- Toggling re-renders the series already loaded — it never refetches, and never rebuilds the
  `Chart` instance.

## Verification

`npm run test`, `npm run build`, and the story rendering both states
(`components-areachart--stacked` / `--lines`).
