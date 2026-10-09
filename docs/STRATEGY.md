# Component Strategy Audit — lifekit-hq/lifekit-common

**Status:** Ratified 2026-08-28 by the merge of [#17](https://github.com/lifekit-hq/lifekit-common/pull/17)
**Tracks:** [#5](https://github.com/lifekit-hq/lifekit-common/issues/5)
**Blocks:** [#3](https://github.com/lifekit-hq/lifekit-common/issues/3) (look-and-feel pass)
**Audited:** 2026-08-26

---

## What is already settled (do not re-litigate)

The 2026-08-26 ruling (`system/proposals.md → 2026-08-26-lifekit-common-reuse-boundary`) closed
two questions that were in scope of this audit:

- **Substrate:** layered, not "web components long-term" (see §"Layered substrate rule" below).
  `@lifekit-hq/tokens` is the ecosystem theming contract.
- **Charting:** Chart.js behind the framework-free `charts-core` package. Pilot: `lk-line-chart`
  in `projects/elements` (issue #10). Angular chart wrappers (`area-chart`, `bar-chart`, etc.) are
  the strangler targets.

This document covers only the **remaining decisions** for the Angular components in
`projects/ui/src/lib/components/`.

## Layered substrate rule

Components are split by whether they carry framework behaviour. This replaces the earlier
"web components long-term" wording and the strict rule that every component converts to Lit.
The app shell (`cmn-app-layout`, top bar, tab bar, sheets) and every `cmn-*` component stay
Angular, because `@lifekit-hq/ui` has only Angular consumers and a web-component shell would
rebuild the router, focus and overlay handling Angular and the CDK already provide. `lk-*`
elements are only for framework-free leaves, such as the install, offline and update prompts. How
the shell behaves on a phone is in [PHONE-CONTRACT.md](PHONE-CONTRACT.md).

1. **Use-anywhere layer.** Tokens, CSS and `charts-core` stay framework-free, so any consumer,
   Angular or not, can use them directly.
2. **New simple leaves are born as Lit elements.** A new simple-leaf component (no framework
   behaviour: button, badge, card, chip, icon, prompts, charts) is created as a Lit element in
   `projects/elements`. Angular consumes it natively as a custom element, with no wrapper.
   Existing simple leaves convert only when they are touched, in strangler order.
3. **Behavioural and templated components stay Angular.** Components such as data-table,
   dialog, app-layout, command-palette, async-state and forms-bound controls stay in
   `projects/ui`, built on Angular Aria and the CDK. They get no Lit twin and no wrapper layer.
   Their inputs, events and slots are named to the `lk-*` element conventions so a later port
   is mechanical.
4. **CI enforcement.** A new component classed `simple-leaf` cannot land as an Angular
   component. `scripts/check-strategy-coverage.mjs` fails when a directory under
   `projects/ui/src/lib/components/` has `simple-leaf` in the **Complexity** column and is not on
   the frozen `LEGACY_SIMPLE_LEAVES` list in that script. How a component is classed:
   `simple-leaf` means presentational only (inputs and slots, token CSS, no forms integration,
   overlay, focus management, service or router use); `interactive` means it owns behaviour
   (events, state, `ControlValueAccessor`, CDK); `templated` means it composes projected
   templates or slots. Class the component honestly in the inventory table: a simple leaf is
   built in `projects/elements`, not added here. The legacy list only shrinks, and the check
   also fails if an entry outlives its directory or classification.
5. **Revisit trigger.** The behavioural half is reconsidered only when a second framework
   consumer is real and not deferred.

---

## Allowed decisions

Each component row carries exactly one of:

| Value             | Meaning                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `keep-own`        | Own implementation is the right call — deliberate native/CDK-backed choice, or Angular-specific orchestration concern; look-and-feel pass applies here |
| `wrap-base`       | Delegate more behaviour to an existing framework-agnostic base (e.g., thin the Angular wrapper once the host migrates to Lit)                          |
| `element-rewrite` | Convert to a Lit element in `projects/elements` per the strangler strategy; look-and-feel pass lands with the rewrite, not before                      |
| `delete`          | Remove — no active consumer found and functionality is covered elsewhere                                                                               |

---

## Usage evidence notes

The **Usage evidence** column counts the non-spec, non-story source files in each consumer's
`origin/main` that reference the component's selector or exported class, measured 2026-10-06:

- `fs` — `finance-sentry` (`bbf54d5f`)
- `dash` — `lifekit-dashboard` (`2f61e16`)
- `devclaw` is not a column: its console is React and references none of the `cmn-*` components
  (0 files for every row).

Counts are files, not occurrences, so a component used five times in one template counts once.
`0` means no consumer references it today. `sidebar-nav`, `top-bar` and `bottom-tab-bar` are
rendered only through `app-layout`, so their own counts understate real use. Rows marked `new`
were added after the port and keep that note.

Counts are a point-in-time measurement; re-measure before relying on them for a `delete` decision.

---

## Component inventory table

> Machine-checked by `scripts/check-strategy-coverage.mjs` (run in CI).
> Decision must be one of: `keep-own` | `wrap-base` | `element-rewrite` | `delete`.

| Component             | Usage evidence                                                                  | Complexity  | Decision        | Rationale                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------- | ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| alert                 | fs 39 · dash 0                                                                  | interactive | keep-own        | Variant/dismiss pattern; depends on `icon` component — rewrite alongside `icon` after the Lit icon pilot lands                                                                                                |
| alert-item            | fs 2 · dash 0                                                                   | interactive | keep-own        | Relative-time formatting, read/dismiss events, inline dynamic colours; finance-sentry notification pattern; too complex to convert before simpler leaves are done                                             |
| app-layout            | fs 1 · dash 1                                                                   | templated   | keep-own        | Angular app-shell orchestrator (SidebarNav + TopBar + BottomTabBar composition, router/event concerns); convert only once the app shell itself migrates to elements                                           |
| area-chart            | fs 1 · dash 0                                                                   | simple-leaf | element-rewrite | charts-core Lit path established by `lk-line-chart` pilot (#10); canvas + Chart.js has no Angular deps — next in the chart rewrite queue                                                                      |
| async-state           | fs 0 · dash 0                                                                   | templated   | keep-own        | Signal-based state machine; its named slots (`skeleton`, `empty`, `error-action`) fall back to built-in markup when nothing is projected, the same contract as a Lit `<slot>` with fallback content           |
| badge                 | fs 0 · dash 0                                                                   | simple-leaf | element-rewrite | Pure CSS + slot wrapper, no framework logic; textbook custom-element target                                                                                                                                   |
| bar-chart             | fs 1 · dash 0                                                                   | simple-leaf | element-rewrite | Same charts-core Lit path as `area-chart`                                                                                                                                                                     |
| bottom-tab-bar        | new (added for app-layout phone mode); fs 0 · dash 0 (composed by `app-layout`) | interactive | keep-own        | Phone navigation for `app-layout` below md: primary tabs plus a More sheet (CDK focus trap, badge support); app-shell concern, moves with the shell                                                           |
| button                | fs 45 · dash 2                                                                  | interactive | element-rewrite | No Angular CDK deps; variants + slots model maps cleanly to Lit; high-value early pilot — button is the most reused primitive                                                                                 |
| card                  | fs 18 · dash 4                                                                  | simple-leaf | element-rewrite | Wrapper div + slot + token CSS; no logic beyond host-binding                                                                                                                                                  |
| chat                  | fs 7 · dash 0                                                                   | interactive | wrap-base       | Shell wraps the Deep Chat web component (already framework-agnostic); Angular glue should thin to a Lit micro-wrapper once the host migrates                                                                  |
| checkbox              | new (added for login/register forms); fs 0 · dash 0                             | interactive | element-rewrite | Button + `role=checkbox` + `aria-checked` (incl. mixed) + projected label; same shape as `chip`/`toggle`, no Angular forms integration                                                                        |
| chip                  | fs 13 · dash 0                                                                  | simple-leaf | element-rewrite | Button + `aria-pressed` + CSS; simpler than `button`, same Lit path                                                                                                                                           |
| command-palette       | fs 1 · dash 1                                                                   | interactive | keep-own        | Grouped keyboard navigation + real-time search; CDK Dialog integration; bespoke interaction model for lifekit navigation                                                                                      |
| data-table            | fs 3 · dash 0                                                                   | templated   | keep-own        | CDK table is the correct foundation; column projection via `contentChildren` is Angular-idiomatic; see §"Expensive components" below                                                                          |
| dialog                | fs 24 · dash 2                                                                  | templated   | keep-own        | Extends `CdkDialogContainer`; focus-trap, `aria-modal`, keyboard dismiss come from CDK; see §"Expensive components"                                                                                           |
| date-range            | new (added for ledger filter bar); fs 0 · dash 0                                | interactive | keep-own        | `ControlValueAccessor` over two native `type=date` inputs emitting `{from, to}`; Angular forms integration, same native-control rationale as `input`/`select`                                                 |
| disclosure-row        | fs 2 · dash 0                                                                   | templated   | keep-own        | Named `ng-content` slots (status/actions) over native `<details>`; institution+amount is a finance-domain pattern; reasonable Lit target later once slot API is stable                                        |
| donut-chart           | fs 3 · dash 0                                                                   | simple-leaf | element-rewrite | charts-core Lit path; chrome/legend variants map to attributes and slots                                                                                                                                      |
| drawer                | fs 0 · dash 0                                                                   | templated   | keep-own        | CDK portal + entering/open/closing state machine + `beforeClose$` subscription; a11y focus management via CDK; see §"Expensive components"                                                                    |
| empty-state           | fs 20 · dash 3                                                                  | simple-leaf | element-rewrite | Icon + text + CTA slot; purely presentational                                                                                                                                                                 |
| form-field            | fs 26 · dash 0                                                                  | templated   | keep-own        | `ControlValueAccessor` integration with `ReactiveFormsModule`; `contentChild` of `input` or `textarea`; no Lit forms pattern decided                                                                          |
| google-sign-in-button | fs 2 · dash 0                                                                   | simple-leaf | keep-own        | Wraps Google Accounts library via `NgZone.runOutsideAngular`; framework-glue concerns outweigh conversion cost                                                                                                |
| icon                  | fs 13 · dash 0                                                                  | simple-leaf | element-rewrite | Lucide + custom SVG registry; high-value early pilot — icon is a foundational leaf depended on by many other components                                                                                       |
| input                 | fs 30 · dash 0                                                                  | interactive | keep-own        | `ControlValueAccessor`; signal-based value/disabled; integrates with `form-field` and `ReactiveFormsModule`                                                                                                   |
| institution-avatar    | fs 6 · dash 0                                                                   | simple-leaf | element-rewrite | Image-with-fallback-to-initials; token-based sizing; no framework deps                                                                                                                                        |
| line-chart            | fs 0 · dash 0                                                                   | simple-leaf | element-rewrite | Lit replacement `lk-line-chart` already exists in `projects/elements` (#10); this Angular wrapper is the primary strangler target                                                                             |
| list-item-row         | fs 8 · dash 0                                                                   | templated   | keep-own        | Four named `ng-content` slots (avatar/meta/amount/actions); finance-specific layout; slot combinatorics map awkwardly to Lit today                                                                            |
| menu                  | fs 8 · dash 0                                                                   | interactive | keep-own        | `CdkConnectedOverlay` for smart positioning + viewport clamping; keyboard escape; overlay lifecycle                                                                                                           |
| multi-select          | new (added for ledger filter bar); fs 0 · dash 0                                | interactive | keep-own        | `ControlValueAccessor` with `CdkConnectedOverlay` checklist panel; overlay + forms integration is Angular-specific, same CDK reasoning as `menu`; revisit with a Lit combobox per §"select"                   |
| month-stepper         | new (added for Budgets and Flow breakdown); fs 4 · dash 0                       | interactive | keep-own        | `model()` two-way `Date` binding with min/max clamping and arrow-key stepping; depends on `icon`                                                                                                              |
| page-container        | fs 0 · dash 5                                                                   | simple-leaf | element-rewrite | Layout wrapper + token CSS; no logic                                                                                                                                                                          |
| page-header           | fs 15 · dash 5                                                                  | interactive | keep-own        | Depends on `ButtonComponent` internally; action button with loading/disabled state                                                                                                                            |
| password-strength     | fs 0 · dash 0                                                                   | simple-leaf | element-rewrite | Four-segment progress bar; pure CSS, no framework logic                                                                                                                                                       |
| search-input          | new (added for ledger filter bar); fs 0 · dash 0                                | interactive | keep-own        | `ControlValueAccessor` over native `type=search` with leading icon and clear button; Angular forms integration, depends on `icon`                                                                             |
| select                | fs 4 · dash 0                                                                   | interactive | keep-own        | Deliberate native `<select>` — see §"finance-sentry#319 history"                                                                                                                                              |
| selectable-card       | fs 8 · dash 1                                                                   | interactive | element-rewrite | Button + named slots (leading/body/trailing) + `aria-pressed`; maps cleanly to Lit                                                                                                                            |
| sidebar-nav           | fs 0 · dash 0 (composed by `app-layout`)                                        | interactive | keep-own        | Collapsible nav with collapsed signal, badge support, responsive width transition; app-shell concern                                                                                                          |
| skeleton              | fs 17 · dash 0                                                                  | simple-leaf | element-rewrite | Animate-pulse div; trivially simple                                                                                                                                                                           |
| stat-card             | fs 4 · dash 1                                                                   | interactive | keep-own        | Depends on `SkeletonComponent`; delta formatting with trending icons; child-component dependency                                                                                                              |
| status-indicator      | fs 0 · dash 0                                                                   | simple-leaf | element-rewrite | Status badge + dot + optional timestamp; pure token CSS                                                                                                                                                       |
| stepper-dialog        | new (added for multi-step flows, #39); fs 0 · dash 0                            | interactive | keep-own        | `contentChildren` of `cmnStep` templates with `model()` step index, progress list and Back/Next/Finish actions; depends on `button` and `dialog-actions`; Angular template-outlet composition                 |
| tab-group             | fs 0 · dash 0                                                                   | interactive | keep-own        | `model()` two-way binding for `activeTab`; `aria-selected`; Angular-idiomatic tab panel; routed mode (`routerLink` tabs in a `nav`, `aria-current`) uses `RouterLink`/`RouterLinkActive`, so it stays Angular |
| tag                   | fs 15 · dash 1                                                                  | simple-leaf | element-rewrite | Five-variant badge; trivially simple                                                                                                                                                                          |
| textarea              | new (added for the problem-report sheet); fs 0 · dash 0                         | interactive | keep-own        | `ControlValueAccessor` over a native `<textarea>` with `rows` and a `maxlength` counter; same API and native-control rationale as `input`, projects into `form-field`                                         |
| toast                 | fs 5 · dash 0                                                                   | interactive | keep-own        | Dismiss event + aria role + `toast.service.ts` service layer; keep Angular until service strategy is decided                                                                                                  |
| toggle                | fs 2 · dash 1                                                                   | interactive | element-rewrite | Switch button + thumb animation + `aria-checked`; `role="switch"` + boolean attribute = clean Lit mapping                                                                                                     |
| top-bar               | fs 0 · dash 0 (composed by `app-layout`)                                        | interactive | keep-own        | Uses `MenuComponent`; event orchestration (back/page actions/search/theme/avatar); app-shell concern                                                                                                          |
| usage-chip            | new (added for usage meter chip, #37); fs 0 · dash 0                            | simple-leaf | element-rewrite | `role="meter"` pill with token-coloured fill and readout; pure token CSS, no framework logic                                                                                                                  |

**Summary:** 28 keep-own · 20 element-rewrite · 1 wrap-base · 0 delete

---

## Own-vs-base verdict — expensive components

These five components were the primary focus of the "should we use ng-zorro?" question. Each
verdict is grounded in a code-read of the current implementation.

### select

**What it does today:** `ControlValueAccessor` wrapping a native HTML `<select>` element. Supports
`single` and `multiple` modes, `size` variants (`sm`/`md`/`lg`), `allowClear`, `showSearch`,
`hasError`, and `placeholder`. Exposes computed CSS classes via `SIZE_CLASSES` and `ICON_SIZE`
maps. No external stylesheet, no custom dropdown widget.

**The finance-sentry#319 rationale — fetched verbatim from the PR body via unauthenticated
GitHub REST API (`GET https://api.github.com/repos/lifekit-hq/finance-sentry/pulls/319`,
2026-08-26; repo is public).
[finance-sentry#319](https://github.com/lifekit-hq/finance-sentry/pull/319) — title:
"fix(ui): UI hardening sweep — native cmn-select (drop ng-zorro), chart labels, dev-cache":**

> **`cmn-select` rebuilt on a native `<select>`; ng-zorro removed entirely.** `cmn-select` was
> built on ng-zorro's `<nz-select>`, but ng-zorro's CSS and icon registration were never wired up
> — so the control rendered broken _and_ threw an unregistered-icon runtime error. ng-zorro had
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
controls (previous/next), empty-row handling, a sticky header, and row-click events (rows are
keyboard-activatable and highlighted only when `rowsActionable` is set). Generic over the row type `T`.
Below `md` (768px), columns that declare a `listSlot` render as stacked list rows (leading,
primary, secondary, trailing, trailing-secondary) instead of table rows; `mode` pins either layout.

**Verdict: keep-own.** `CdkTableModule` is already a "base library" — it provides the virtual
DOM diffing for table rows without prescribing styles. The custom layer adds our token-based
styling and the column-projection API. A third-party table (ng-zorro `nz-table`, Angular Material
`mat-table`) would be larger, opinionated about its own theming, and harder to override. The
current CDK-backed approach is correct. It stays Angular under the layered rule; a port is revisited only once a second framework consumer is real,
and would need a slot/content-query model for column definitions that does not exist in the Lit ecosystem yet.

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
before the overlay is removed. Title is a `signal()` set by the opening call. Below `md` it opens
as a bottom sheet (drag handle with drag-to-dismiss, 90dvh max height, safe-area padding) and
re-lays out if the viewport crosses `md` while open; `mode` pins the side panel or the sheet.

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
PR body, fetched via unauthenticated GitHub REST API
(`GET https://api.github.com/repos/lifekit-hq/finance-sentry/pulls/319`, 2026-08-26; repo is
public; no comments — body is the complete decision record):

> **`cmn-select` rebuilt on a native `<select>`; ng-zorro removed entirely.** `cmn-select` was
> built on ng-zorro's `<nz-select>`, but ng-zorro's CSS and icon registration were never wired up
> — so the control rendered broken _and_ threw an unregistered-icon runtime error. ng-zorro had
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

## UX continuity policy

Every lifekit product applies one policy for how a screen behaves while data loads, refreshes or
is absent. The policy lives here; the primitives (`cmn-skeleton`, `cmn-async-state`,
`cmn-empty-state`, `cmn-page-container`) enforce some rules today and the rest are targets they
grow into (see the status table below).

1. **Skeletons, not spinners or "Loading…" text.** A first load shows a skeleton shaped like the
   final content, so the page does not reflow when data arrives.
2. **Loading is not empty.** An empty state is shown only after a load has succeeded with no
   results. Never flash "nothing here" before the data lands.
3. **Keep cached data while refreshing.** A refetch, poll or revalidation keeps the previous
   data on screen and signals progress unobtrusively. Replace content with a skeleton only when
   there is nothing to show yet.
4. **No micro-flashes.** Delay a loading indicator briefly so a fast response never flickers
   in, and once shown keep it for a minimum time so it does not blink away.
5. **No layout shift.** Reserve space for async content (skeleton dimensions, fixed row heights,
   stable page width) so nothing jumps as it resolves.
6. **Errors keep context.** A failed refresh keeps the last good data and offers a retry; a
   failed first load shows an error state in place of the skeleton.
7. **One page frame.** Pages sit in `cmn-page-container` (1200px max width,
   `p-cmn-4 md:p-cmn-8`) so width and padding match across products.

| Rule                                 | Status   | Where                                                                             |
| ------------------------------------ | -------- | --------------------------------------------------------------------------------- |
| 1. Skeletons, not spinners           | Enforced | `cmn-async-state` renders `cmn-skeleton` or its `[skeleton]` slot                 |
| 2. Loading is not empty              | Enforced | `cmn-async-state` never shows empty while `idle` or `loading`                     |
| 3. Keep cached data while refreshing | Target   | `loading` always replaces content with a skeleton                                 |
| 4. No micro-flashes                  | Target   | no indicator delay or minimum display time                                        |
| 5. No layout shift                   | Partial  | stable page width via `cmn-page-container`; skeleton shape is caller-supplied     |
| 6. Errors keep context               | Partial  | `errorPlacement="above"` keeps content; `retryable` / `[error-action]` hold Retry |
| 7. One page frame                    | Enforced | `cmn-page-container` defaults                                                     |

Apps use `cmn-async-state` and `cmn-skeleton` rather than local loading markup; rules marked
Target are not yet guaranteed by the primitives and must be handled in the app until they are.

The phone chapter of this policy (what the shell guarantees and what a page declares on a phone)
is [PHONE-CONTRACT.md](PHONE-CONTRACT.md). Where the two overlap, the rules above win.

The reference registry, the named gaps and the per-pattern compare-against links are in
[design/patterns.md](design/patterns.md).

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

`input` · `textarea` · `select` · `checkbox` · `form-field`

Every data-entry flow depends on these. Polish them before touching any page that has a form.

### Tier 3 — content containers and feedback

`card` · `empty-state` · `toast` · `alert` · `alert-item` · `async-state` · `password-strength`

### Tier 4 — navigation shell

`sidebar-nav` · `top-bar` · `bottom-tab-bar` · `app-layout` · `tab-group` · `page-container` · `page-header`

### Tier 5 — data and overlays

`dialog` · `drawer` · `menu` · `data-table` · `command-palette`

### Tier 6 — domain-specific

`disclosure-row` · `list-item-row` · `stat-card` · `google-sign-in-button` ·
`selectable-card` · `institution-avatar` · `month-stepper` · `chat`

Within each tier, order is the author's call. `selectable-card` has an
`element-rewrite` decision but carries `interactive` complexity — it is included in Tier 6 as a
coordination reminder, not as a look-and-feel target.
