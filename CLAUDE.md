# lifekit-common — Claude Context

Shared design system & Angular component library for the lifekit-hq ecosystem. Four lockstep-versioned packages published to GitHub Packages:

| Package              | What                                                                                                    | Consumers                               |
| -------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `@lifekit-hq/tokens` | Design tokens — `theme.css` (pure custom properties, light/dark) + Tailwind preset. Framework-agnostic. | All lifekit frontends (Angular + React) |
| `@lifekit-hq/ui`     | Angular component library (`cmn-*` selectors), Storybook-first                                          | finance-sentry                          |
| `@lifekit-hq/core`   | Angular signal-store features & helpers                                                                 | finance-sentry                          |
| `@lifekit-hq/config` | ESLint / Prettier / Stylelint / tsconfig presets                                                        | lifekit repos (build-time)              |

Extracted from finance-sentry (`dsdevq-common`) 2026-08-25. Sole developer: Denys.

## Commands

```bash
npm ci
npm run storybook        # THE dev loop — develop components here, not in a host app
npm run test             # Vitest via @angular/build:unit-test (ci config = coverage gates)
npm run lint             # ESLint (angular-eslint) across all projects
npm run build            # ng-packagr build of ui + core
npm run build-storybook  # static catalog (deployed to Pages on merge)
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
- **Releases**: release-please maintains the release PR (lockstep version bump across all packages + CHANGELOG); the Weekly Release workflow merges it Mondays 08:00 UTC (or dispatch manually for "release now"). Merging it tags the release and publishes all four packages to GitHub Packages.
- Main is protected in spirit: all changes land via squash-merged PR, CI green first.
- Root markdown is `README.md`, `CLAUDE.md`, and the devclaw onboarding set (`AGENTS.md`); `CHANGELOG.md` is release-please-owned. No session artifacts or ad-hoc docs at the root — durable docs go to `docs/`.

## Storybook-first rule

New components and component changes are developed and reviewed **in Storybook**, not by running a consuming app. If a change can't be demonstrated in a story, add the story that demonstrates it. The hosted catalog (GitHub Pages) is the reference other lifekit projects design against.
