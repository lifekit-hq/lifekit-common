# lifekit-common — AGENTS.md

Shared design system, Angular component library, and framework-free element layer for the lifekit ecosystem.

## Commands

```bash
npm ci
npm run storybook        # primary dev loop — components developed here
npm run test             # Vitest via @angular/build:unit-test (CI config = coverage gates)
npm run lint             # ESLint (angular-eslint) across all projects
npm run build            # ng-packagr: charts-core → elements → ui → core (order matters)
npm run build-storybook  # static Storybook catalog (deployed to Pages on merge)
```

## Verify gate

```bash
npm run build && \
node_modules/.bin/ng test @lifekit-hq/charts-core --configuration ci && \
node_modules/.bin/ng test @lifekit-hq/elements --configuration ci && \
node_modules/.bin/ng test @lifekit-hq/ui --configuration ci && \
node_modules/.bin/ng test @lifekit-hq/core --configuration ci && \
node_modules/.bin/ng lint && \
npm run consumer-type-check && \
node_modules/.bin/ng run "@lifekit-hq/ui:build-storybook"
```

`ng` is local-only (`node_modules/.bin/ng`) — there is no global CLI in this environment.

## Layout

```
projects/
  tokens/        @lifekit-hq/tokens  — theme.css (CSS custom properties) + Tailwind preset
  config/        @lifekit-hq/config  — ESLint / Prettier / tsconfig presets
  ui/            @lifekit-hq/ui      — Angular components (cmn-* selectors), Storybook host
  core/          @lifekit-hq/core    — Angular signal-store features
  charts-core/   @lifekit-hq/charts-core — framework-free Chart.js builders (zero @angular/*)
  elements/      @lifekit-hq/elements    — Lit custom elements (zero @angular/*)
fixtures/        consumer-type-check harness (npm pack → compile)
specs/           speckit artifacts (spec.md, plan.md, tasks.md per feature)
```

## Key conventions

- Angular: `ChangeDetectionStrategy.OnPush`, `inject()` only, `cmn-` selector prefix, no `standalone: true` boilerplate.
- Elements: Lit, token-only theming (`var(--token, fallback)`), no Tailwind in shadow DOM. See `projects/elements/README.md`.
- Build order: charts-core must be built before elements; elements before ui (tsconfig `paths` point at `dist/`).
- `sideEffects` must list element registration files explicitly — `sideEffects: false` silently drops `customElements.define` calls in Rollup/Vite production builds.
- VRT baselines are `*-win32.png`; Denys runs VRT on Windows. Container-pinned Linux baselines are a follow-up (not in the current verify gate).

## Further reading

- `CLAUDE.md` — coding conventions, commit style, PR/issue norms
- `projects/elements/README.md` — settled conventions for the Lit element layer
- `specs/` — speckit feature artifacts
