# lifekit-common — AGENTS.md

Shared design system & Angular component library for the lifekit-hq ecosystem. Six lockstep-versioned packages published to GitHub Packages:

| Package                   | What                                                                                                                                                                        | Consumers                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `@lifekit-hq/tokens`      | Design tokens — `theme.css` (light/dark) + Tailwind preset, self-hosted IBM Plex Sans, brand mark + browser-chrome standard (`docs/BROWSER-CHROME.md`). Framework-agnostic. | All lifekit frontends (Angular + React) |
| `@lifekit-hq/charts-core` | Framework-free Chart.js config builders (zero `@angular/*`)                                                                                                                 | `ui`, `elements`                        |
| `@lifekit-hq/elements`    | Framework-free Lit custom elements (`lk-*`) — incl. PWA install/update/offline pieces                                                                                       | finance-sentry                          |
| `@lifekit-hq/ui`          | Angular component library (`cmn-*` selectors), Storybook-first                                                                                                              | finance-sentry                          |
| `@lifekit-hq/core`        | Angular signal-store features & helpers                                                                                                                                     | finance-sentry                          |
| `@lifekit-hq/config`      | ESLint / Prettier / Stylelint / tsconfig presets                                                                                                                            | lifekit repos (build-time)              |

Extracted from finance-sentry (`dsdevq-common`) 2026-08-25. Sole developer: Denys.

## Commands

```bash
npm ci
npm run storybook        # THE dev loop — develop components here, not in a host app
npm run test             # Vitest via @angular/build:unit-test (CI config = coverage gates) + node:test for tokens brand (test:tokens)
npm run lint             # ESLint (angular-eslint) across all projects
npm run build            # build:brand (tokens icons), then ng-packagr: charts-core → elements → ui → core (order matters)
npm run build-storybook  # static Storybook catalog (deployed to Pages on merge)
npm run check:drift      # static design-drift scan of source (font/colour/size/radius/root-size/transition literals outside tokens); CI fails on any finding, no baseline — rules in docs/BROWSER-CHROME.md
npm run design:scan      # impeccable detector over source (+ `-- --storybook <url>` for a built catalog); report-only, compares to docs/design-baseline.json
```

## Verify gate

```bash
npm run build && \
node_modules/.bin/ng test @lifekit-hq/charts-core --configuration ci && \
node_modules/.bin/ng test @lifekit-hq/elements --configuration ci && \
node_modules/.bin/ng test @lifekit-hq/ui --configuration ci && \
node_modules/.bin/ng test @lifekit-hq/core --configuration ci && \
npm run test:tokens && \
node_modules/.bin/ng lint && \
npm run consumer-type-check && \
node_modules/.bin/ng run "@lifekit-hq/ui:build-storybook"
```

`ng` is local-only (`node_modules/.bin/ng`) — there is no global CLI in this environment.

## Layout

```
projects/
  tokens/        @lifekit-hq/tokens
  config/        @lifekit-hq/config
  ui/            @lifekit-hq/ui (also the Storybook host)
  core/          @lifekit-hq/core
  charts-core/   @lifekit-hq/charts-core
  elements/      @lifekit-hq/elements
fixtures/        consumer-type-check harness (npm pack → compile)
specs/           speckit artifacts (spec.md, plan.md, tasks.md per feature)
```

## Mandatory gates (same bar as finance-sentry)

- After modifying any `.ts` file: `npx eslint <file>` from the repo root — zero errors before moving on. `inject()` only, `ChangeDetectionStrategy.OnPush`, no `standalone: true` boilerplate, explicit access modifiers, no magic numbers, `cmn-` selector prefix.
- Every component ships with: `*.spec.ts` (Vitest, meaningful branches covered) **and** `*.stories.ts` (Storybook). No component lands without both.
- `npm run test` and `npm run build-storybook` green before any PR.
- Prettier via `prettier.config.mjs` (re-exports `@lifekit-hq/config/prettier`) — never add a local override.

## Design-token discipline

`projects/tokens/theme.css` is the canonical token file and stays **framework-agnostic**: pure CSS custom properties + keyframes. No Tailwind directives, no framework imports — those live in each consumer's entry stylesheet (Storybook's is `projects/ui/.storybook/storybook.css`). `projects/ui/src/styles/theme.css` is a thin re-export; edit tokens only in the tokens package.

## Conventions (ecosystem-standard)

- **Branch**: `<type>/<issue#>-<slug>` (e.g. `feat/2-publish-pipeline`); create via `gh issue develop <n>`.
- **Commits / PR titles**: conventional commits — release-please parses them into the CHANGELOG. Scope = package or area: `feat(ui): …`, `fix(tokens): …`.
- **PR body**: what + why, then a **Validation** section stating exactly what was run and green.
- **Issues**: imperative title, no priority prefix — priority lives in the `P1`/`P2` label. P1 issues carry acceptance criteria; P2/P3 stay one-liners until promoted.
- **Milestones**: `M<n> — <outcome>`, named for the outcome, never a date.
- **Releases**: release-please maintains the release PR (lockstep version bump across all packages + CHANGELOG); the Weekly Release workflow merges it Mondays 00:07 UTC (or dispatch manually for "release now"). Merging it tags the release and publishes all six packages to GitHub Packages.
- Main is protected in spirit: all changes land via squash-merged PR, CI green first.
- Root markdown is `README.md`, `CLAUDE.md`, the devclaw onboarding set (`AGENTS.md`), and the impeccable design context (`PRODUCT.md`, `DESIGN.md` — the engine reads them from the root); `CHANGELOG.md` is release-please-owned. No session artifacts or ad-hoc docs at the root — durable docs go to `docs/`.

## Storybook-first rule

New components and component changes are developed and reviewed **in Storybook**, not by running a consuming app. If a change can't be demonstrated in a story, add the story that demonstrates it. The hosted catalog (GitHub Pages) is the reference other lifekit projects design against.

## Key conventions

- Elements: Lit, token-only theming (`var(--token, fallback)`), no Tailwind in shadow DOM. See `projects/elements/README.md`.
- Build order: charts-core must be built before elements; elements before ui (tsconfig `paths` point at `dist/`).
- `sideEffects` in `projects/elements/package.json` must name the _built_ bundle (`./fesm2022/lifekit-hq-elements.mjs`), not `src/` paths — ng-packagr copies the field verbatim, and `sideEffects: false` (or non-matching paths) silently drops `customElements.define` calls in Rollup/Vite production builds.
- VRT baselines are `*-win32.png`; Denys runs VRT on Windows. Container-pinned Linux baselines are a follow-up (not in the current verify gate).
- Every exported component ships a `*.stories.ts` covering its real states and a `*.spec.ts` for what a story cannot assert. Infrastructure components that only exist behind a service (dialog/drawer containers, the command palette) get one launcher story per service rather than a story each.
- Two of the three consumers are React, so `@lifekit-hq/ui` is reachable only by finance-sentry today; `tokens` (plain custom properties) and `elements` (Lit) are the framework-free seams. See `docs/CONSUMER-GAP-AUDIT.md` before adding surface area.
- Vitest browser mode writes failure screenshots to `__screenshots__/` next to the failing spec; the directory is gitignored.

## Further reading

- `docs/BROWSER-CHROME.md` — brand mark, icon set, theme-color, head/manifest standard and `lifekit-chrome-check`
- `docs/PHONE-CONTRACT.md` — what the app shell guarantees on a phone and what a page declares (title, parent, actions, sheet vs page, state pattern)
- `docs/CONSUMER-GAP-AUDIT.md` — what each consumer needs against what the library provides, and what is unused
- `projects/elements/README.md` — settled conventions for the Lit element layer
- `specs/` — speckit feature artifacts
