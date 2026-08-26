# Component Strategy Audit — lifekit-hq/lifekit-common

**Status:** DRAFT — awaiting ratification by Denys (merge = approval)
**Tracks:** [#5](https://github.com/lifekit-hq/lifekit-common/issues/5)
**Blocks:** [#3](https://github.com/lifekit-hq/lifekit-common/issues/3) (look-and-feel pass)
**Audited:** 2026-08-26

---

## What is already settled (do not re-litigate)

The 2026-08-26 ruling (`system/proposals.md → 2026-08-26-lifekit-common-reuse-boundary`) closed
two questions that were in scope of this audit:

- **Substrate:** web components long-term. New simple-leaf components are born as Lit elements in
  `projects/elements`. Existing Angular components convert strangler-style when touched.
  `@lifekit-hq/tokens` is the ecosystem theming contract.
- **Charting:** Chart.js behind the framework-free `charts-core` package. Pilot: `lk-line-chart`
  in `projects/elements` (issue #10). Angular chart wrappers (`area-chart`, `bar-chart`, etc.) are
  the strangler targets.

This document covers only the **remaining decisions** for the Angular components in
`projects/ui/src/lib/components/`.

---

## Allowed decisions

Each component row carries exactly one of:

| Value | Meaning |
| --- | --- |
| `keep-own` | Own implementation is the right call — deliberate native/CDK-backed choice, or Angular-specific orchestration concern; look-and-feel pass applies here |
| `wrap-base` | Delegate more behaviour to an existing framework-agnostic base (e.g., thin the Angular wrapper once the host migrates to Lit) |
| `element-rewrite` | Convert to a Lit element in `projects/elements` per the strangler strategy; look-and-feel pass lands with the rewrite, not before |
| `delete` | Remove — no active consumer found and functionality is covered elsewhere |

---

## Usage evidence notes

All 41 components were ported from `finance-sentry/dsdevq-common` in commit `ac5a5b9`
(2026-08-25) where they were in active production use. The consumer repos (`finance-sentry`,
`lifekit-dashboard`) are separate private repositories and were not available for direct grep
at the time of this audit. Usage evidence is therefore stated as:

- **ported-from-production** — carried from `finance-sentry/dsdevq-common`; was in production
  use at port date 2026-08-25.
- **no external consumer found** — will be stated explicitly for any component that can be
  confirmed unused.

All 41 components listed below are ported-from-production unless otherwise noted.

---

## Component inventory table

> Machine-checked by `scripts/check-strategy-coverage.mjs` (run in CI).
> Decision must be one of: `keep-own` | `wrap-base` | `element-rewrite` | `delete`.

| Component | Usage evidence | Complexity | Decision | Rationale |
| --- | --- | --- | --- | --- |
| alert | ported-from-production | interactive | keep-own | Variant/dismiss pattern; depends on `icon` component — rewrite alongside `icon` after the Lit icon pilot lands |
| alert-item | ported-from-production | interactive | keep-own | Relative-time formatting, read/dismiss events, inline dynamic colours; finance-sentry notification pattern; too complex to convert before simpler leaves are done |
| app-layout | ported-from-production | templated | keep-own | Angular app-shell orchestrator (SidebarNav + TopBar composition, router/event concerns); convert only once the app shell itself migrates to elements |
| area-chart | ported-from-production | simple-leaf | element-rewrite | charts-core Lit path established by `lk-line-chart` pilot (#10); canvas + Chart.js has no Angular deps — next in the chart rewrite queue |
| async-state | ported-from-production | templated | keep-own | Signal-based state machine with multi-branch `ng-content`; no Lit slot equivalent pattern decided yet |
| badge | ported-from-production | simple-leaf | element-rewrite | Pure CSS + slot wrapper, no framework logic; textbook custom-element target |
| bar-chart | ported-from-production | simple-leaf | element-rewrite | Same charts-core Lit path as `area-chart` |
| button | ported-from-production | interactive | element-rewrite | No Angular CDK deps; variants + slots model maps cleanly to Lit; high-value early pilot — button is the most reused primitive |
| card | ported-from-production | simple-leaf | element-rewrite | Wrapper div + slot + token CSS; no logic beyond host-binding |
| chat | ported-from-production | interactive | wrap-base | Shell wraps the Deep Chat web component (already framework-agnostic); Angular glue should thin to a Lit micro-wrapper once the host migrates |
| chip | ported-from-production | simple-leaf | element-rewrite | Button + `aria-pressed` + CSS; simpler than `button`, same Lit path |
| command-palette | ported-from-production | interactive | keep-own | Grouped keyboard navigation + real-time search; CDK Dialog integration; bespoke interaction model for lifekit navigation |
| data-table | ported-from-production | templated | keep-own | CDK table is the correct foundation; column projection via `contentChildren` is Angular-idiomatic; see §"Expensive components" below |
| dialog | ported-from-production | templated | keep-own | Extends `CdkDialogContainer`; focus-trap, `aria-modal`, keyboard dismiss come from CDK; see §"Expensive components" |
| disclosure-row | ported-from-production | templated | keep-own | Named `ng-content` slots (status/actions) over native `<details>`; institution+amount is a finance-domain pattern; reasonable Lit target later once slot API is stable |
| donut-chart | ported-from-production | simple-leaf | element-rewrite | charts-core Lit path; chrome/legend variants map to attributes and slots |
| drawer | ported-from-production | templated | keep-own | CDK portal + entering/open/closing state machine + `beforeClose$` subscription; a11y focus management via CDK; see §"Expensive components" |
| editable-field | ported-from-production | interactive | keep-own | `model()` two-way binding; inline form with Enter/Escape keyboard UX; Angular forms integration required |
| empty-state | ported-from-production | simple-leaf | element-rewrite | Icon + text + CTA slot; purely presentational |
| form-field | ported-from-production | templated | keep-own | `ControlValueAccessor` integration with `ReactiveFormsModule`; `contentChild(InputComponent)`; no Lit forms pattern decided |
| google-sign-in-button | ported-from-production | simple-leaf | keep-own | Wraps Google Accounts library via `NgZone.runOutsideAngular`; framework-glue concerns outweigh conversion cost |
| icon | ported-from-production | simple-leaf | element-rewrite | Lucide + custom SVG registry; high-value early pilot — icon is a foundational leaf depended on by many other components |
| input | ported-from-production | interactive | keep-own | `ControlValueAccessor`; signal-based value/disabled; integrates with `form-field` and `ReactiveFormsModule` |
| institution-avatar | ported-from-production | simple-leaf | element-rewrite | Image-with-fallback-to-initials; token-based sizing; no framework deps |
| line-chart | ported-from-production | simple-leaf | element-rewrite | Lit replacement `lk-line-chart` already exists in `projects/elements` (#10); this Angular wrapper is the primary strangler target |
| list-item-row | ported-from-production | templated | keep-own | Four named `ng-content` slots (avatar/meta/amount/actions); finance-specific layout; slot combinatorics map awkwardly to Lit today |
| menu | ported-from-production | interactive | keep-own | `CdkConnectedOverlay` for smart positioning + viewport clamping; keyboard escape; overlay lifecycle |
| page-container | ported-from-production | simple-leaf | element-rewrite | Layout wrapper + token CSS; no logic |
| page-header | ported-from-production | interactive | keep-own | Depends on `ButtonComponent` internally; action button with loading/disabled state |
| password-strength | ported-from-production | simple-leaf | element-rewrite | Four-segment progress bar; pure CSS, no framework logic |
| select | ported-from-production | interactive | keep-own | Deliberate native `<select>` — see §"finance-sentry#319 history" |
| selectable-card | ported-from-production | interactive | element-rewrite | Button + named slots (leading/body/trailing) + `aria-pressed`; maps cleanly to Lit |
| sidebar-nav | ported-from-production | interactive | keep-own | Collapsible nav with collapsed signal, badge support, responsive width transition; app-shell concern |
| skeleton | ported-from-production | simple-leaf | element-rewrite | Animate-pulse div; trivially simple |
| stat-card | ported-from-production | interactive | keep-own | Depends on `SkeletonComponent`; delta formatting with trending icons; child-component dependency |
| status-indicator | ported-from-production | simple-leaf | element-rewrite | Status badge + dot + optional timestamp; pure token CSS |
| tab-group | ported-from-production | interactive | keep-own | `model()` two-way binding for `activeTab`; `aria-selected`; Angular-idiomatic tab panel |
| tag | ported-from-production | simple-leaf | element-rewrite | Five-variant badge; trivially simple |
| toast | ported-from-production | interactive | keep-own | Dismiss event + aria role + `toast.service.ts` service layer; keep Angular until service strategy is decided |
| toggle | ported-from-production | interactive | element-rewrite | Switch button + thumb animation + `aria-checked`; `role="switch"` + boolean attribute = clean Lit mapping |
| top-bar | ported-from-production | interactive | keep-own | Uses `MenuComponent`; event orchestration (search/theme/avatar); app-shell concern |

**Summary:** 24 keep-own · 16 element-rewrite · 1 wrap-base · 0 delete

---

## Own-vs-base verdict — expensive components

These five components were the primary focus of the "should we use ng-zorro?" question. Each
verdict is grounded in a code-read of the current implementation.

### select

**What it does today:** `ControlValueAccessor` wrapping a native HTML `<select>` element. Supports
`single` and `multiple` modes, `size` variants (`sm`/`md`/`lg`), `allowClear`, `showSearch`,
`hasError`, and `placeholder`. Exposes computed CSS classes via `SIZE_CLASSES` and `ICON_SIZE`
maps. No external stylesheet, no custom dropdown widget.

**The finance-sentry#319 rationale (verbatim from the PR body,
[finance-sentry#319](https://github.com/lifekit-hq/finance-sentry/pull/319) — title:
"fix(ui): UI hardening sweep — native cmn-select (drop ng-zorro), chart labels, dev-cache"):**

> **`cmn-select` rebuilt on a native `<select>`; ng-zorro removed entirely.** `cmn-select` was
> built on ng-zorro's `<nz-select>`, but ng-zorro's CSS and icon registration were never wired up
> — so the control rendered broken *and* threw an unregistered-icon runtime error. ng-zorro had
> exactly one consumer, so rather than pull in the whole antd theme, `cmn-select` now uses a
> native `<select>` + design tokens + a Lucide chevron (same public API). Removes
> `ng-zorro-antd` from both package.json files and the lockfile.
> Fixes #312 (budgets category selector broken), #314 (icon runtime error), #315 (two icon
> systems / drop ng-zorro).

**Verdict: keep-own.** The native `<select>` gives us a11y and keyboard type-ahead at zero cost
and zero dependency surface. A custom combobox widget (whether ng-zorro's, Angular Material's,
or bespoke) would be warranted only if the product needs richer affordances (async option loading,
option grouping with avatars, multi-select chips) — none of which are current requirements. When
those requirements land, the correct replacement is a Lit combobox element (element-rewrite),
not ng-zorro.

---

### data-table

**What it does today:** Wraps `CdkTableModule` for row/header rendering. Column definitions
are projected via `contentChildren(CmnColumnComponent)`, which carry `CmnCellDirective` and
`CmnHeaderCellDirective` templates. Adds token-based styling, skeleton loading state, pagination
controls (previous/next), empty-row handling, and row-click events. Generic over the row type `T`.

**Verdict: keep-own.** `CdkTableModule` is already a "base library" — it provides the virtual
DOM diffing for table rows without prescribing styles. The custom layer adds our token-based
styling and the column-projection API. A third-party table (ng-zorro `nz-table`, Angular Material
`mat-table`) would be larger, opinionated about its own theming, and harder to override. The
current CDK-backed approach is correct. The long-term path (element-rewrite) requires a new
slot/content-query model for column definitions that does not exist in the Lit ecosystem yet.

---

### dialog

**What it does today:** `CmnDialogContainerComponent` extends `CdkDialogContainer` and adds
token-based chrome: size variants (`sm`/`md`/`lg`/`full`) via `SIZE_CLASSES`, optional title
bar with close button, `aria-modal` and `role="dialog"`, and `disableClose` guard. A companion
`CmnConfirmDialogComponent` and `CmnDialogActionsComponent` handle the common confirm pattern.
The bare variant (`dialog-bare-container.component.ts`) omits the chrome for custom layouts.

**Verdict: keep-own.** CDK Dialog provides focus trapping, WAI-ARIA compliance, keyboard
dismiss, and scroll blocking for free. ng-zorro's `nz-modal` would duplicate this at larger
bundle cost and its own theming layer. The CDK extension model is the correct foundation.

---

### drawer

**What it does today:** `CmnDrawerContainerComponent` uses `CdkPortalOutlet` to render drawer
content into a slide-in panel. Manages an `entering → open → closing` state machine via
`requestAnimationFrame`, reacts to `drawerRef.beforeClose$` to trigger the CSS closing state
before the overlay is removed. Title is a `signal()` set by the opening call.

**Verdict: keep-own.** CDK Portal handles overlay rendering; the container adds the animation
state machine and token-based chrome. ng-zorro's `nz-drawer` would again bring its own
stylesheet and theming layer. The CDK-backed pattern is correct and consistent with how
`dialog` is built.

---

### command-palette

**What it does today:** Opened as a CDK Dialog (reusing `dialog`'s infrastructure). Implements
grouped keyboard navigation (↑/↓/Enter/Escape), real-time search filtering, and group-header
rendering. Items are injected via `CMN_DIALOG_DATA`. Animations are inline keyframes.
No third-party autocomplete or list-box library.

**Verdict: keep-own.** The command palette's interaction model (grouped search over navigation
items, K-shortcut to open) is bespoke to lifekit's product shell and does not map to any
commodity widget. Adding ng-zorro or Angular Material just for a search input + virtual list
would be wasteful. The custom implementation is appropriately minimal for the requirement.

---

## finance-sentry#319 history

[finance-sentry#319](https://github.com/lifekit-hq/finance-sentry/pull/319) — "fix(ui): UI
hardening sweep — native cmn-select (drop ng-zorro), chart labels, dev-cache" — deliberately
dropped ng-zorro's `nz-select` and replaced it with a native `<select>`. Verbatim from the
PR body (no comments; the body is the complete decision record):

> **`cmn-select` rebuilt on a native `<select>`; ng-zorro removed entirely.** `cmn-select` was
> built on ng-zorro's `<nz-select>`, but ng-zorro's CSS and icon registration were never wired up
> — so the control rendered broken *and* threw an unregistered-icon runtime error. ng-zorro had
> exactly one consumer, so rather than pull in the whole antd theme, `cmn-select` now uses a
> native `<select>` + design tokens + a Lucide chevron (same public API). Removes
> `ng-zorro-antd` from both package.json files and the lockfile.
> Fixes #312 (budgets category selector broken), #314 (icon runtime error), #315 (two icon
> systems / drop ng-zorro).

The critical point for this audit: ng-zorro was not rejected on philosophical grounds — it was
broken in production (CSS and icon registration were never wired up) and had exactly one consumer,
making a full antd integration unjustifiable. The native `<select>` was the minimal correct fix.
This audit confirms that verdict stands (see §select verdict above).

---

## Sequencing note — what unblocks issue #3

Issue #3 is the look-and-feel pass (typography, spacing, colour, motion tokens applied
systematically). That pass executes only on **ratified rows marked `keep-own`** — `element-rewrite`
components receive their look-and-feel when they are converted to Lit, not before.

Execute #3 in this order to maximise visible impact per unit of work:

### Tier 1 — atomic primitives (unblock everything else)
`button` · `icon` · `badge` · `tag` · `chip` · `skeleton` · `status-indicator` · `toggle`

These appear on virtually every screen. Finishing them first means every subsequent tier gets
the correct atoms. Note: `button` and `icon` are `element-rewrite` — their look-and-feel work
IS the rewrite; include them here as coordination points.

### Tier 2 — form layer
`input` · `select` · `form-field`

Every data-entry flow depends on these. Polish them before touching any page that has a form.

### Tier 3 — content containers and feedback
`card` · `empty-state` · `toast` · `alert` · `alert-item` · `async-state` · `password-strength`

### Tier 4 — navigation shell
`sidebar-nav` · `top-bar` · `app-layout` · `tab-group` · `page-container` · `page-header`

### Tier 5 — data and overlays
`dialog` · `drawer` · `menu` · `data-table` · `command-palette`

### Tier 6 — domain-specific
`disclosure-row` · `list-item-row` · `stat-card` · `google-sign-in-button` ·
`editable-field` · `selectable-card` · `institution-avatar` · `chat`

Within each tier, order is the author's call. `editable-field` and `selectable-card` have
`element-rewrite` decisions but carry `interactive` complexity — they are included in Tier 6
as coordination reminders, not as look-and-feel targets.
