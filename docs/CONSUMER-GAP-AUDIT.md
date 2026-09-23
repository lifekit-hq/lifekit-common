# Consumer gap audit

**Scope.** What the lifekit products need from `lifekit-common` against what the
four packages actually provide, as of `0.3.2`. Phase A of making this library
the shared UI layer the products reuse; adoption in each consumer is tracked
separately and depends on this.

**Method.** Read the three consumers' component code directly — every
`cmn-*` selector, every `@lifekit-hq/*` import, and every locally-held
presentational component — and matched it against `projects/*/src/**/index.ts`.
This audit describes the consumers' code only.

**Not in scope.** Bringing components up to the M5 design bar (issue #3).
This audit records what exists, what nobody uses, and what is missing; it does
not redesign anything.

**Relationship to `docs/STRATEGY.md`.** That document decides _what each Angular
component should become_ (keep-own / wrap-base / element-rewrite / delete). It
recorded every component as `ported-from-production` and noted that the consumer
repositories "were not available for direct grep at the time of this audit", so
no component could be marked _no external consumer found_. This audit supplies
that missing evidence — §5 below is the list STRATEGY.md left open. It does not
change any decision in that table; see §6.2.

---

## 1. Consumers at a glance

| Consumer          | Stack                              | Packages consumed today          | Can consume `@lifekit-hq/ui` |
| ----------------- | ---------------------------------- | -------------------------------- | ---------------------------- |
| finance-sentry    | Angular 21                         | `ui`, `core`, `tokens`, `config` | Yes — already does           |
| lifekit-dashboard | React 19 + Vite + Tailwind v4      | none                             | **No** — Angular components  |
| devclaw console   | React 18 + Vite + hand-written CSS | none                             | **No** — Angular components  |

The single largest gap is structural and not a missing component: **two of the
three consumers are React**, and `@lifekit-hq/ui` ships Angular components. The
only framework-agnostic surfaces the library has today are `@lifekit-hq/tokens`
(CSS custom properties + a Tailwind preset) and `@lifekit-hq/elements`, which
currently exports exactly one custom element.

---

## 2. finance-sentry

Already on `ui`, `core`, `tokens` and `config`. This is the consumer that
proves the library works; it is also the only source of real usage data.

### 2.1 Library surface it uses

Components (by selector, with `cmn-` dropped): `alert`, `alert-item`,
`app-layout`, `area-chart`, `bar-chart`, `button`, `card`, `chat`, `chip`,
`column` (+ `cmnCell` / `cmnHeaderCell`), `data-table`, `dialog-actions`,
`donut-chart`, `empty-state`, `form-field`, `google-sign-in-button`, `icon`,
`input`, `institution-avatar`, `line-chart`, `list-item-row`, `page-header`,
`password-strength`, `select`, `selectable-card`, `skeleton`, `stat-card`,
`status-indicator`, `tag`, `toggle`.

Reached through other components or services rather than by selector:
`CommandPaletteComponent`, `ConfirmDialogComponent`,
`CmnDialogBareContainerComponent`, `MenuComponent`, `SidebarNavComponent`,
`TopBarComponent`, `ToastComponent`, `CmnDrawerContainerComponent`,
`ChatInputComponent`, `ChatMessageComponent`.

Services and providers: `CmnDialogService`, `CmnDrawerService`, `ToastService`,
`ThemeService`, `provideCustomIcons`.

From `@lifekit-hq/core`: `ApiService`, `API_BASE_URL`, `ErrorMessageService`,
`ERROR_MESSAGES`, `extractErrorCode`, `withAsyncStatus`, `withPagination`,
`withUrlSync`.

### 2.2 What it still holds locally that belongs in the library

finance-sentry's remaining local components are all store-coupled domain
screens — they inject a feature store and are not extractable as they stand.
What _is_ generic and duplicated is smaller and lives in `shared/`:

| Local item                                       | Why it belongs in the library                                                                                                                                                                                   | Library home                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `RelativeTimePipe` + `TimeUtils.getRelativeTime` | Every consumer formats "3m ago". `cmn-alert-item` already carries a _private_ copy of this logic (`formatRelativeTime`), and devclaw and lifekit-dashboard each have a third. Four implementations of one rule. | `@lifekit-hq/core` (pure function) + a `ui` pipe |
| `date-range.utils`                               | Range presets (today / 7d / 30d / month) drive every chart and table filter; nothing about them is finance-specific.                                                                                            | `@lifekit-hq/core`                               |
| `error.utils` / `store-error.utils`              | Normalising an unknown thrown value into a message before it reaches a store. `core` already owns `extractErrorCode` and `ErrorMessageService`; this is the missing third piece.                                | `@lifekit-hq/core`                               |
| The connect-modal step machine                   | A multi-step modal flow (type → provider → credentials → syncing → done) reimplemented with a store enum. A generic stepper/wizard is a real library component.                                                 | new `ui` component                               |

Nothing in finance-sentry's `modules/` is extractable without lifting its store
with it, so the "component a consumer has locally that belongs in the library"
list is deliberately short. The extraction from `dsdevq-common` was thorough.

### 2.3 What it needs at adoption time (it is already adopted)

- Nothing blocking. Its `package.json` pins `^0.2.0` for all four packages while
  the library is at `0.3.2`; a version bump is a consumer-side change.
- A `cmn-tab-group` / `cmn-page-container` pass would let it drop hand-rolled
  layout in a few pages, but that is opportunistic, not required.

---

## 3. lifekit-dashboard

React 19, Vite, Tailwind **v4**, `lucide-react`. Consumes none of the four
packages today.

### 3.1 Local components that map onto library components

| Local                                                        | Library equivalent                                   | Notes                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------- |
| `components/Layout.tsx`                                      | `cmn-app-layout` + `cmn-sidebar-nav` + `cmn-top-bar` | Same shape: fixed sidebar, nav list, mobile nav.              |
| `components/States.tsx` → `Loading`                          | `cmn-skeleton` / `cmn-async-state`                   |                                                               |
| `components/States.tsx` → `Empty`                            | `cmn-empty-state`                                    |                                                               |
| `components/States.tsx` → `ErrorState`, `ErrorBanner`        | `cmn-alert` (`variant="error"`)                      | `ErrorBanner` takes a list; `cmn-alert` takes one body.       |
| `components/Toast.tsx` (`ToastProvider`)                     | `ToastService` + `cmn-toast`                         |                                                               |
| `ActivityCard`, `BoxVitalsCard`, `DevclawCard`, `HonestCard` | `cmn-card` + `cmn-stat-card`                         | Domain composition over generic primitives.                   |
| `NeedsYouStrip`                                              | `cmn-alert-item` list                                |                                                               |
| `TokenGate`                                                  | —                                                    | Auth gate; app-specific, stays local.                         |
| `utils/cn.ts`                                                | —                                                    | 4-line class joiner; not worth a package.                     |
| `utils/time.ts` → `relativeTime`                             | see §2.2                                             | Third copy of the same rule.                                  |
| `hooks/usePolledFetch`, `usePolledRaw`                       | `@lifekit-hq/core`'s `poll`                          | Same concept, different runtime — `poll` is an RxJS operator. |

**No local component here belongs in the library as written** — every one is a
React function component, and its Angular counterpart already exists. The gap
runs the other way: the library has the components, in the wrong framework.

### 3.2 What it needs at adoption time

1. **A Tailwind v4 token entry point.** `@lifekit-hq/tokens` ships
   `tailwind/preset.cjs`, a Tailwind **v3** preset (`module.exports`, consumed
   via the `presets:` array). Tailwind v4 has no `presets:` array — it reads
   `@theme` blocks from CSS. lifekit-dashboard is on v4, so the preset is not
   consumable as-is. `theme.css` (pure custom properties) _is_ consumable today
   via `@import`.
2. **A token-name mapping.** The dashboard's own variables are
   `--color-surface-0…4`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`,
   `--color-border`, `--color-border-strong`, and `--color-{ok,warn,err}-{bg,fg,border}`.
   The library's are `--color-surface-{bg,card,raised}`,
   `--color-text-{primary,secondary,disabled,inverse}`,
   `--color-border-{default,strong,focus}`, and `--color-status-{success,warning,error,info}`.
   The library has no `-bg` / `-fg` / `-border` triple per status; the dashboard
   would have to derive two of the three, or the library would have to add them.
3. **Dark-first vs light-first.** The dashboard's `:root` is dark with no light
   theme at all. `theme.css` defines light on `:root` and dark under
   `[data-theme='dark']`, so adopting it flips the dashboard's default.
4. **React components.** Without those, adoption stops at tokens.
5. `@lifekit-hq/config`'s ESLint preset is Angular-only (see §5) — not usable.

---

## 4. devclaw console

React 18, Vite, hand-written CSS (no Tailwind), a self-hosted font stack, and a
single inline UI kit at `src/ui.tsx`. Consumes none of the four packages.

### 4.1 Local components that map onto library components

| Local (`src/ui.tsx` unless noted) | Library equivalent                          | Notes                                                                                                           |
| --------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `StatusDot`                       | `cmn-status-indicator`                      | devclaw adds a `live` pulse variant the library lacks.                                                          |
| `Badge`                           | `cmn-tag` / `cmn-badge`                     |                                                                                                                 |
| `TieredDisclosure`                | `cmn-disclosure-row`                        | Currently used by **no** consumer — see §5.                                                                     |
| `Tabs<T>`                         | `cmn-tab-group`                             | Currently used by no consumer.                                                                                  |
| `Modal`                           | `CmnDialogService` + `cmn-dialog-container` |                                                                                                                 |
| `EmptyState`                      | `cmn-empty-state`                           |                                                                                                                 |
| `Loading`                         | `cmn-skeleton` / `cmn-async-state`          |                                                                                                                 |
| `ErrorNote`                       | `cmn-alert` (`variant="error"`)             |                                                                                                                 |
| `Trend` (+ `TrendPoint`)          | `cmn-line-chart` / `cmn-area-chart`         | Hand-drawn inline SVG sparkline.                                                                                |
| `UsageChip`                       | —                                           | **Genuinely missing.** A compact "n of m used" meter chip. `cmn-chip` is a selectable filter pill, not a meter. |
| `SectionLabel`                    | `cmnTypography="label"`                     | Directive exists; adds a collapse affordance the directive lacks.                                               |
| `components/AppShell.tsx`         | `cmn-app-layout`                            |                                                                                                                 |
| `components/AttentionCard.tsx`    | `cmn-card` + `cmn-alert-item`               | Domain composition.                                                                                             |
| `components/VerdictList.tsx`      | `cmn-data-table` / `cmn-list-item-row`      | Domain composition.                                                                                             |
| `src/icons.tsx` (19 inline SVGs)  | `cmn-icon` + `provideCustomIcons`           | The registry provider is exactly this use case.                                                                 |
| `src/theme.ts`                    | `ThemeService`                              | **Already compatible** — see below.                                                                             |
| `src/util/time.ts`                | see §2.2                                    | Fourth copy of relative-time.                                                                                   |

**`UsageChip` and the `live` pulse on `StatusDot` are the only two things
devclaw has that the library genuinely does not.** Everything else is a React
re-implementation of a component the library already ships in Angular.

### 4.2 The one thing that already lines up

`devclaw/console/src/theme.ts` switches themes by setting
`document.documentElement.dataset.theme`, persisted in `localStorage`.
`ThemeService` and `theme.css` use **the same mechanism and the same attribute**
(`[data-theme='dark']`). Theme switching is portable today without either side
changing; only the variable names differ.

### 4.3 What it needs at adoption time

1. **CSS-variable adoption, not Tailwind.** No Tailwind here, so
   `tailwind/preset.cjs` is irrelevant and `theme.css` is the whole integration
   surface. That works — it is pure custom properties by design.
2. **A token-name mapping**, larger than the dashboard's: devclaw uses `--bg`,
   `--bg-elevated`, `--bg-inset`, `--text`, `--text-secondary`, `--text-muted`,
   `--border`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-ink`,
   `--accent-soft`, `--green`/`--amber`/`--red` (+ `-soft`), `--violet`, plus
   radii (`--r-sm/md/lg`), fonts (`--sans`, `--mono`), shadows
   (`--shadow-card`, `--shadow-pop`) and layout metrics (`--sidebar-w`,
   `--topbar-h`).
   The library ships colours and two shadows but **no radius, font-family or
   layout-metric tokens as CSS variables** — those live only in the Tailwind
   preset. A non-Tailwind consumer cannot reach them.
3. **Dark-first vs light-first**, same as §3.2 item 3 — devclaw defaults to dark.
4. **React components**, same as the dashboard.
5. `@lifekit-hq/config`'s ESLint preset is Angular-only — not usable.

---

## 5. Library surface no consumer uses

Verified against all three consumers.

| Export                                       | Package       | Status                                                                      |
| -------------------------------------------- | ------------- | --------------------------------------------------------------------------- |
| `cmn-async-state`                            | `ui`          | Unused. Both React consumers hand-roll the same loading/error/empty switch. |
| `cmn-badge`                                  | `ui`          | Unused. devclaw's `Badge` is a `cmn-tag`, not this count/dot badge.         |
| `cmn-disclosure-row`                         | `ui`          | Unused — but devclaw's `TieredDisclosure` is the same idea.                 |
| `cmn-editable-field`                         | `ui`          | Unused by anyone.                                                           |
| `cmn-page-container`                         | `ui`          | Unused by anyone.                                                           |
| `cmn-tab-group`                              | `ui`          | Unused — but devclaw's `Tabs` is the same idea.                             |
| `cmnTypography` directive                    | `ui`          | Unused. finance-sentry writes the classes directly.                         |
| `cmnSkeleton` directive                      | `ui`          | Unused. finance-sentry uses `<cmn-skeleton>` (19 call sites) instead.       |
| `withFilters`                                | `core`        | Unused.                                                                     |
| `withSorting`                                | `core`        | Unused.                                                                     |
| `poll`                                       | `core`        | Unused in Angular; both React consumers hand-roll polling hooks.            |
| **`@lifekit-hq/elements`** (`lk-line-chart`) | `elements`    | **Entire package unused.** One element, no consumer.                        |
| **`@lifekit-hq/charts-core`**                | `charts-core` | No _direct_ consumer; used internally by the four `ui` chart components.    |

Four of these — `async-state`, `disclosure-row`, `tab-group`, `typography` —
are unused only because the consumer that would use them cannot (React). They
are not dead code; they are stranded behind the framework gap, and devclaw has a
hand-written equivalent of three of them.

**None of these warrants `delete` in `docs/STRATEGY.md`.** "No external consumer
found" is now true for each row above, but for the React-stranded ones the cause
is the framework gap, not redundancy; `editable-field` and `page-container` are
the only two with no equivalent in any consumer at all.

`@lifekit-hq/elements` is the exception worth naming: it is the library's own
answer to the framework gap (framework-agnostic custom elements), it works, and
it has one element in it.

---

## 6. What this audit surfaced

### 6.1 Fixed in this change

| Finding                                                                                                                                                                                                                                                                          | Fix                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `cmn-toggle`'s `disabled` input dims the control and sets `pointer-events-none`, but never sets the button's `disabled` property or `aria-disabled`. A keyboard user can still focus the switch and activate it with Enter/Space, and assistive tech is not told it is disabled. | Bind `[disabled]` and `[attr.aria-disabled]` on the host button. |

### 6.2 Filed, not fixed

These are new components or behaviour changes, outside this issue's boundary:

| #                                                             | What                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [#34](https://github.com/lifekit-hq/lifekit-common/issues/34) | Close the framework gap — two of three consumers are React and cannot use `@lifekit-hq/ui`. `@lifekit-hq/elements` is the existing seam.                                                                                             |
| [#35](https://github.com/lifekit-hq/lifekit-common/issues/35) | A Tailwind v4 token entry point; the current preset is v3-only.                                                                                                                                                                      |
| [#36](https://github.com/lifekit-hq/lifekit-common/issues/36) | Radius, font and layout tokens as CSS custom properties, so non-Tailwind consumers can reach them.                                                                                                                                   |
| [#37](https://github.com/lifekit-hq/lifekit-common/issues/37) | A usage/meter chip, and a `live` pulse on `cmn-status-indicator` — the two things devclaw has that the library lacks.                                                                                                                |
| [#38](https://github.com/lifekit-hq/lifekit-common/issues/38) | One canonical relative-time formatter in `@lifekit-hq/core`, replacing the four copies.                                                                                                                                              |
| [#39](https://github.com/lifekit-hq/lifekit-common/issues/39) | A stepper / multi-step-dialog component (finance-sentry's connect flow).                                                                                                                                                             |
| [#40](https://github.com/lifekit-hq/lifekit-common/issues/40) | Fill in `docs/STRATEGY.md`'s usage-evidence column from §5. That table is a DRAFT awaiting ratification and its decisions are issue #5's call, so this change leaves it untouched.                                                   |
| [#41](https://github.com/lifekit-hq/lifekit-common/issues/41) | `ThemeService`'s accent contrast auto-correction moves OkLCH lightness away from midrange instead of toward it, so failing light stops are driven to white. Its spec should assert a concrete expected ramp, not a hex-format regex. |

### 6.3 Coverage delivered alongside this audit

Every exported component in `ui` now has a story covering its real states, and
every exported symbol across all four code packages has a spec for what a story
cannot assert. The per-component breakdown is in the pull request that carries
this document.

Two defects surfaced by writing that coverage are fixed here (§6.1); everything
else is filed (§6.2).
