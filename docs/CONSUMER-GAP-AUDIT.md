# Consumer gap audit

**Scope.** What the three lifekit consumers use from `lifekit-common`, and what
nothing uses. Refreshed 2026-10-07 for migration step 7 (`chore: remove unused
surface`), against `origin/main` of each consumer.

**Method.** `git grep` over each consumer's `origin/main` source (`frontend/src`,
`console/src`; markdown excluded) for every `cmn-*` selector, `lk-*` element and
exported symbol. A count of zero means no code reference; a doc mention is not a
reference.

| Consumer          | Commit     | Stack   | Packages                                                    |
| ----------------- | ---------- | ------- | ----------------------------------------------------------- |
| finance-sentry    | `e0f5b751` | Angular | `ui`, `core`, `elements`, `charts-core`, `tokens`, `config` |
| lifekit-dashboard | `ce348a0`  | Angular | `ui`, `core`, `elements`, `tokens`, `config`                |
| devclaw console   | `1ed6e45`  | Angular | `ui`, `core`, `elements`, `tokens`, `config`                |

All three consumers are Angular apps now, so `@lifekit-hq/ui` is reachable by
each. The earlier framework-gap findings (React dashboard and console, #34, #35)
no longer describe the consumers.

---

## 1. Removed in step 7

Each had zero code references in all three consumers.

| Export                                          | Package    | Evidence                                                                                                                                                                      |
| ----------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cmn-editable-field` (`EditableFieldComponent`) | `ui`       | No `cmn-editable-field`, `EditableField` in any consumer.                                                                                                                     |
| `<lk-account-menu>` (`LkAccountMenu`)           | `elements` | No `lk-account-menu` or `LkAccountMenu` in any consumer source. lifekit-dashboard's `AGENTS.md` names it only to say `cmn-app-layout`'s built-in avatar menu is used instead. |
| `withFilters`                                   | `core`     | No reference in any consumer.                                                                                                                                                 |
| `withSorting`                                   | `core`     | No reference in any consumer.                                                                                                                                                 |
| `withPagination`                                | `core`     | No reference in any consumer.                                                                                                                                                 |

Removing public exports is a breaking change for the lockstep packages.

## 2. Kept: a consumer adopted it

| Export                                                     | Package    | Consumer reference                                                                                                    |
| ---------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `cmn-badge`                                                | `ui`       | finance-sentry `frontend/src/app/core/shell/more-page/more-page.component.html` (`<cmn-badge [count] status avatar>`) |
| `PushSubscriptionService`                                  | `core/pwa` | lifekit-dashboard `frontend/src/app/push/push-toggle.component.ts`; finance-sentry (12 references)                    |
| `cmn-tab-group`, `cmn-disclosure-row`                      | `ui`       | finance-sentry (2 each); devclaw (`cmn-disclosure-row`, 2)                                                            |
| `cmn-async-state`                                          | `ui`       | finance-sentry 6, lifekit-dashboard 7, devclaw 14                                                                     |
| `cmn-skeleton`, `cmn-stat-card`, `cmn-data-table`          | `ui`       | finance-sentry (29 / 14 / 7), lifekit-dashboard (2 / 1 / 0), devclaw (data-table 4)                                   |
| `poll`                                                     | `core`     | lifekit-dashboard 6, devclaw 5                                                                                        |
| `withAsyncStatus`, `withUrlSync`                           | `core`     | finance-sentry (`accounts.store.ts`, `dashboard.store.ts`, `budgets.store.ts`)                                        |
| `lk-update-prompt`, `lk-install-hint`, `lk-offline-banner` | `elements` | all three consumers                                                                                                   |

## 3. Still without a direct consumer reference

Not removed in step 7: they are outside its candidate list, several are new, and
some are reached through `cmn-app-layout` rather than by selector. Each needs its
own keep-or-remove call.

| Export                                                                                                                    | Package    |
| ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `cmn-date-range`, `cmn-multi-select`, `cmn-password-strength`, `cmn-search-input`, `cmn-stepper-dialog`, `cmn-usage-chip` | `ui`       |
| `cmnTypography`, `cmnSkeleton` directives                                                                                 | `ui`       |
| `provideLucideIcons`, `PageActionsService`, `ShellService`                                                                | `ui`       |
| `lk-line-chart`, `lk-segmented`, `lk-theme-picker`, `lk-dismissible-chip`                                                 | `elements` |

`charts-core` is a dependency of finance-sentry only;
it is used internally by the `ui` chart components and `lk-line-chart`.
