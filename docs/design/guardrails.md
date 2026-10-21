# UI/UX guardrails

lifekit's UI/UX policy, in one page. lifekit adopts published best practice rather than inventing
its own: each area below takes one published source as published, with at most two deviations,
and each deviation gives its reason in one line. The rules that follow from them are numbered, and
each names the check that holds it.

The owner accepted this policy on 2026-10-21 (issue #182, decided in #183): the twelve sources
and their deviations, and the board answers Q1 to Q8. Where another page goes into more detail,
it applies this one:

- [STRATEGY.md](../STRATEGY.md): the UX continuity policy (loading, empty, error, page frame);
- [PHONE-CONTRACT.md](../PHONE-CONTRACT.md): the phone chapter (shell, sheets, targets, paging);
- [patterns.md](patterns.md): which component and reference app each screen pattern uses;
- [DESIGN.md](../../DESIGN.md): the Instrument look (tokens, type, colour, motion);
- [BROWSER-CHROME.md](../BROWSER-CHROME.md): the drift rules that hold tokens in source.

To change a rule, change this page in the same PR as the code and its check. A rule is never
dropped quietly: a rule with no check yet stays here, marked **planned** with the check it needs.

## Adopted sources

| Area                   | Adopt (as published)                                            | Deviations                                                                                              |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| States                 | Carbon loading, empty and disabled patterns                     | Continuity timings (200 / 400ms) and cached data kept on refresh                                        |
| Feedback               | Carbon notification pattern                                     | Toasts sit bottom-centre above the tab bar                                                              |
| Forms and validation   | GOV.UK Design System (validation, error message, error summary) | Short sheet forms focus the first invalid field; a shown error clears as soon as it is fixed            |
| Tables and lists       | Ant Design Table behaviour (not its look)                       | On a phone, tables become HIG lists with continuous paging                                              |
| Navigation and shell   | Apple HIG, through APP-SHELL-STANDARD.md                        | Breakpoints from the M3 window size classes                                                             |
| Responsive and phone   | Material 3 window size classes and canonical layouts            | Compact-width structure and targets follow HIG                                                          |
| Keyboard and focus     | WCAG 2.2 AA plus the W3C ARIA APG patterns                      | Cmd/Ctrl+K opens the command palette in every app                                                       |
| Motion                 | Material 3 easing and duration tokens                           | Capped at 400ms; only transform and opacity animate                                                     |
| Typography and spacing | Carbon typography and spacing                                   | The five Instrument sizes; phone floors of 12px text and 16px inputs                                    |
| Colour and theming     | Material 3 dynamic colour (seed to roles)                       | OKLCH contrast solving instead of HCT; fixed-meaning colours never seed-derived                         |
| Charts                 | Carbon data visualization                                       | Scrub-to-read on touch; fixed asset and category colours                                                |
| Money and numbers      | Unicode CLDR through ECMA-402 `Intl`                            | Symbol first, ISO code when two same-symbol currencies share a screen; sign, arrow and colour on deltas |

### 1. States

**Adopt** the Carbon [loading](https://carbondesignsystem.com/patterns/loading-pattern/),
[empty state](https://carbondesignsystem.com/patterns/empty-states-pattern/) and
[disabled state](https://carbondesignsystem.com/patterns/disabled-states/) patterns: a skeleton on
a first load only, never on buttons, inputs, toasts, menus or modals; an empty state for first
use, for no results and for an error, each with a title and a body, in place of the element;
disable for an unmet prerequisite, hide for no permission, keep read-only distinct, and say inline
why a disabled control blocks the primary action.

- **Deviation:** keep the continuity policy. No indicator before 200ms, held 400ms once shown;
  cached data stays on screen during a refresh; offline beats error, and error beats empty.
  **Why:** Carbon is silent on refreshing over cached data, the daily case in a finance app; the
  numbers are the [NN/g response-time limits](https://www.nngroup.com/articles/response-times-3-important-limits/).

### 2. Feedback

**Adopt** the [Carbon notification pattern](https://carbondesignsystem.com/patterns/notification-pattern/):
inline, toast, actionable, banner and modal types; a toast with an action stays until dismissed
and a critical one never times out; toasts stack newest first; one action of two words or fewer;
one banner or modal at a time. Success and info toasts keep 3s, where Carbon gives no number, and
pause while hovered or focused ([WCAG 2.2.1](https://www.w3.org/TR/WCAG22/#timing-adjustable)).
Destructive confirmation is an action sheet on a phone and a dialog on desktop, labelled with the
verb (HIG, ruled 2026-10-16).

- **Deviation:** toasts sit bottom-centre, above the tab bar and the bottom inset, at every width.
  **Why:** the thumb zone, PHONE-CONTRACT.md rule 2, and one position that never moves between
  layouts.

### 3. Forms and validation

**Adopt** the GOV.UK Design System [validation](https://design-system.service.gov.uk/patterns/validation/),
[error summary](https://design-system.service.gov.uk/components/error-summary/),
[error message](https://design-system.service.gov.uk/components/error-message/) and
[button](https://design-system.service.gov.uk/components/button/) guidance: no validation when
someone leaves a field; validate on submit and keep their input; an error summary at the top that
takes focus; an error says what went wrong and how to fix it, with no "please", "sorry", "valid"
or "invalid", in the same words inline and in the summary; avoid disabled buttons. "Nothing to
save yet" is an unmet prerequisite (area 1) and may disable Save; invalid input never does.

- **Deviation:** a sheet form whose fields all fit on one screen (three or fewer) moves focus to
  the first invalid field instead of drawing a summary. **Why:** on a phone sheet the summary
  repeats the same viewport and pushes the fields under the keyboard.
- **Deviation:** after a submit, a shown error is re-checked as the person types and clears the
  moment the field is valid; no new error appears before the next submit. **Why:** on a phone the
  submit button is often under the keyboard, so clearing live confirms the fix without another
  round trip. A result that arrives after the submit (an async validator finishing, a server
  error set after the submit handler) belongs to that submit and shows, unless the value was edited
  since; a result for an edit waits for the next submit.
- **Deviation:** a field whose form is not bound to a `[formGroup]` or `ngForm` (a parentless
  control, or a group saved by a button calling `markAllAsTouched()`) shows its error once
  touched. **Why:** no submit event can reach it, so waiting for one would hide the error for good.

### 4. Tables and lists

**Adopt** the behaviour of Ant Design's [Table](https://ant.design/components/table) and
[data-display spec](https://ant.design/docs/spec/data-display), not its look: sorting through
ascending, descending and none with `aria-sort`; filters, pagination and an empty text; loading;
a sticky header; ellipsis with the full value on hover; a summary row and per-column alignment; "-"
in an empty cell; time, status and action cells on one line.

- **Deviation:** below 600px a table renders as HIG list rows (`cmn-list-item-row` in a
  `cmn-list-section`), loaded continuously by `lk-infinite-list`, with no pager. **Why:** ruled
  2026-10-16 and held by PHONE-CONTRACT.md rules 8 and 8a.

### 5. Navigation and app shell

**Adopt** Apple HIG tab bars, navigation bars, sheets and the More tab, as
[APP-SHELL-STANDARD.md](../APP-SHELL-STANDARD.md) and PHONE-CONTRACT.md rule 11 build them: five
tab destinations or fewer with one-word labels, badges only for critical information, a large
title that collapses on root pages, a back chevron on child pages.

- **Deviation:** the tab bar, rail and sidebar switch at 600 and 840px, the M3
  [window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes).
  **Why:** HIG publishes no web breakpoints, and these are already built and checked.

### 6. Responsive and phone

**Adopt** Material 3 adaptive layout: the window size classes and the
[canonical layouts](https://m3.material.io/foundations/layout/canonical-layouts/overview)
(list-detail, supporting pane, feed).

- **Deviation:** at compact width, structure and targets follow HIG: sheets instead of dialogs,
  44pt targets instead of 48dp, and 16px input text. **Why:** the 2026-10-16 ruling, held by
  PHONE-CONTRACT.md rules 3, 9 and 10.

### 7. Keyboard and focus

**Adopt** [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) as the floor and the
[W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/) keyboard contract for
each composite widget: tabs, menu button, listbox, radio group and dialog.

- **Deviation:** Cmd/Ctrl+K opens `cmn-command-palette` in every app. **Why:** one shortcut
  across the suite beats one per app, and APG does not cover app-level shortcuts.

### 8. Motion

**Adopt** [Material 3 easing and duration](https://m3.material.io/styles/motion/easing-and-duration);
the `--cmn-ease-*` tokens are the M3 curves.

- **Deviation:** the longest duration is `--cmn-duration-long`, 400ms; M3 goes to 1000ms. **Why:**
  the [Doherty threshold](https://lawsofux.com/doherty-threshold/), and a money app has no hero
  transitions to justify more.
- **Deviation:** only `transform` and `opacity` animate, and under Reduce Motion movement becomes
  a fade or nothing. **Why:** the no-page-jumps ruling (2026-10-07) and
  [WCAG 2.3.3](https://www.w3.org/TR/WCAG22/#animation-from-interactions).

### 9. Typography and spacing

**Adopt** Carbon typography and [spacing](https://carbondesignsystem.com/elements/spacing/overview/),
written for IBM Plex, our face: productive (dense, task-focused) type for product UI, and an 8px
base with 2px and 4px mini-units. The `cmn-*` spacing steps are a subset of Carbon's scale.

- **Deviation:** keep the five Instrument sizes (DESIGN.md: display, headline, title, body 14px,
  label 12px) instead of Carbon's dozen productive tokens. **Why:** fewer sizes hold "one clear
  number per screen", and body and label already match Carbon's.
- **Deviation:** phone floors of 12px for any text and 16px for input text. **Why:**
  PHONE-CONTRACT.md rules 9 and 10. HIG's 17pt body is not adopted, because HIG governs structure
  and not look; 200% text resize ([WCAG 1.4.4](https://www.w3.org/TR/WCAG22/#resize-text)) stays.

### 10. Colour and theming

**Adopt** [Material 3 dynamic colour](https://m3.material.io/styles/color/dynamic/choosing-a-source):
one source colour becomes tonal palettes, the palettes become roles (surface, text, accent,
border, status), and the roles are solved to contrast (`projects/tokens/engine/derive.mjs`).

- **Deviation:** lightness is solved in OKLCH against the WCAG floors instead of HCT tone steps.
  **Why:** AA then holds by construction, and OKLCH is CSS-native.
- **Deviation:** fixed-meaning colours (gain, loss, flow, asset classes, `category-1` to
  `category-14`) are never seed-derived, and colour is never the only signal
  ([WCAG 1.4.1](https://www.w3.org/TR/WCAG22/#use-of-color)). **Why:** ruled 2026-10-07.

### 11. Charts

**Adopt** Carbon data visualization: [axes and labels](https://carbondesignsystem.com/data-visualization/axes-and-labels/)
(bars and areas start at zero, a line may not; never interpolate gaps; consistent ticks and
localized dates) and [colour palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
(an ordered categorical sequence, alert colours kept apart). Every chart carries a text
alternative ([WCAG 1.1.1](https://www.w3.org/TR/WCAG22/#non-text-content)).

- **Deviation:** scrub-to-read on touch: hold a finger to read a past point, the headline number
  follows and snaps back on release; arrow keys do the same. **Why:** phone-first finance has no
  hover; it is the pattern picked in patterns.md "Chart period and scrub".
- **Deviation:** the fixed asset and `category-N` colours replace Carbon's sequence, keeping its
  count of 14. **Why:** ruled 2026-10-07, so a category keeps one colour across screens.

### 12. Money and numbers

**Adopt** Unicode CLDR through ECMA-402 `Intl.NumberFormat` and `Intl.DateTimeFormat`, in the
app's `LOCALE_ID`: CLDR decides symbol placement, separators, the minus sign and compact notation.
The library holds one formatter, `formatMoney` and `formatNumber` in `@lifekit-hq/core/format`,
and the `cmnMoney` and `cmnNumber` pipes over it in `@lifekit-hq/ui`.

- **Deviation:** `currencyDisplay: 'narrowSymbol'` ("₴18,981.48", not "UAH 18,981.48"), except on
  a screen that shows two currencies sharing a narrow symbol (USD and CAD), which shows the ISO
  code. **Why:** the symbol-first ruling (2026-10-01), plus Polaris's rule for the ambiguous case.
- **Deviation:** deltas use `signDisplay: 'exceptZero'` plus an arrow plus the fixed gain or loss
  colour, never colour alone. **Why:** WCAG 1.4.1 and patterns.md "Delta-only colour".

### Across every area

- The [NN/g ten heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) are the
  review rubric for any new screen or flow.
- The [Laws of UX](https://lawsofux.com/) justify the numbers rather than adding rules: Fitts's
  law gives 44pt targets, Hick's law five or fewer tabs and segments, the Doherty threshold
  400ms, and Jakob's law adopting platform conventions at all.
- Information restraint (the Revolut bar): one primary number per screen, detail behind
  [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/).
- One policy, shared primitives, zero local copies (2026-10-12): apps use `cmn-*` and `lk-*`
  rather than rebuilding them, held by the consumer lint rules below.

## Rules and their checks

Enforcement labels:

| Label           | Meaning                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| **exists**      | A CI gate held it before this policy.                                                 |
| **enforced**    | Its check landed with this policy (#183) or since.                                    |
| **planned**     | It is the rule; the named check is still to build, with the feature it needs.         |
| **review-only** | No check can decide it, for the reason given; PR review holds it.                     |
| phone           | `npm run test:phone`, the phone conformance gate.                                     |
| axe             | The WCAG 2.2 AA story gate, light and dark.                                           |
| drift           | `npm run check:drift` ([BROWSER-CHROME.md](../BROWSER-CHROME.md#design-drift-check)). |
| scan            | `npm run design:scan`, the impeccable ratchet.                                        |
| story-state     | `npm run check:story-states` (categories below).                                      |
| consumer-lint   | The `lifekit/*` rules in `@lifekit-hq/config` (below).                                |

| #   | Rule                                                                                                                             | Enforcement                                                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | A first load shows a skeleton shaped like the content; no spinners for regions                                                   | **exists**: phone (skeleton geometry within 8px), async-state spec                                                                                     |
| S2  | Loading is never shown as empty; empty only after a successful load                                                              | **exists**: async-state spec                                                                                                                           |
| S3  | A refresh keeps cached data on screen (`keepContent` on by default)                                                              | **enforced**: the default, and the async-state spec "calm-loading defaults"                                                                            |
| S4  | No indicator before 200ms; once shown, held for 400ms                                                                            | **enforced**: `showDelay` 200 and `minDisplay` 400 by default, fake-timer async-state spec                                                             |
| S5  | Offline, then error, then empty; a failed refresh keeps the last data and offers a retry                                         | **exists**: phone (state pattern at 320 and 390), async-state spec                                                                                     |
| S6  | Empty states carry a title and a body; first-use, no-results and error variants                                                  | **enforced**: story-state (`FirstUse`, `NoResults`, `Error` on `cmn-empty-state`)                                                                      |
| S7  | Disable only for an unmet prerequisite and say why; hide for no permission; read-only is distinct                                | **enforced**: story-state (`Disabled` and `ReadOnly` on every field). Why a control is disabled is **review-only**: the prerequisite is app logic      |
| F1  | Error toasts and toasts with an action never auto-dismiss                                                                        | **enforced** for errors: `toast.service.spec.ts`. **planned** for actions: the same spec, when toasts gain an action (F4)                              |
| F2  | Timed toasts pause while hovered or focused (WCAG 2.2.1)                                                                         | **planned**: a toast spec, with the pause                                                                                                              |
| F3  | Toasts stack with the newest nearest the thumb; at most three visible                                                            | **planned**: a toast spec and a `Stacked` story, with stacking                                                                                         |
| F4  | One action, two words or fewer; Undo rather than a confirm where the action is reversible                                        | **planned**: the API shape (one optional `action`). The wording is **review-only**: copy needs judgement                                               |
| F5  | A toast sits above the bottom inset and the tab bar on a phone                                                                   | **planned**: phone's notices check extended to toasts                                                                                                  |
| F6  | Persistent conditions (offline, sync failed) use an inline alert or banner, never a toast                                        | **review-only**: whether a condition persists is app knowledge                                                                                         |
| F7  | Destructive confirmation is an action sheet on a phone and a dialog on desktop, labelled with the verb                           | **exists**: the dialog's phone presentations, the `ConfirmActionSheet` story, phone (sheets)                                                           |
| V1  | No validation on blur; errors appear on submit. A field with no `[formGroup]`/`ngForm` to submit it shows its error once touched | **enforced**: form-field spec "validation timing"                                                                                                      |
| V2  | Submit shows an error summary and moves focus to it; a short sheet focuses the first invalid field                               | **enforced**: error-summary spec, and the phone suite's `error-summary.spec.ts` focus check                                                            |
| V3  | Error copy says what went wrong and how to fix it; no "please", "sorry", "valid", "invalid"                                      | **enforced**: drift `error-copy`                                                                                                                       |
| V4  | A shown error clears once valid; an async or server error after the submit shows unless the value was edited since               | **enforced**: form-field spec "validation timing"                                                                                                      |
| V5  | Fields carry `autocomplete`, `inputmode` and `enterkeyhint`; 16px on a phone                                                     | 16px **exists**: phone rule 9. Forwarding is **enforced**: input spec "forwards the phone keyboard hints"                                              |
| V6  | Invalid input never disables submit                                                                                              | **review-only**: the disabling condition is app logic, and the library ships no API for it                                                             |
| V7  | Every field has a visible label; a placeholder is never the label                                                                | **exists**: axe label rules                                                                                                                            |
| V8  | Every form control works with Angular forms                                                                                      | **enforced**: a forms spec per control ("Angular forms" in the checkbox and toggle specs)                                                              |
| T1  | Amounts are right-aligned with tabular figures                                                                                   | **exists**: the `AlignedColumns` story; Plex figures are tabular by default                                                                            |
| T2  | An empty cell shows "-"                                                                                                          | **planned**: a spec on the cell formatter                                                                                                              |
| T3  | Table loading uses skeleton rows; empty and error sit inside the table frame                                                     | Loading and empty **exist** (stories). Error is **enforced** by story-state, with data-table `Error` a recorded gap until the table has an error state |
| T4  | Sortable headers cycle through ascending, descending and none with `aria-sort`                                                   | **planned**: a data-table spec plus axe                                                                                                                |
| T5  | Overflowing text truncates, with the full value on hover and focus                                                               | **enforced** for text: `cmnTooltipTruncatedOnly`, its `Truncated` story and the tooltip spec. **planned** for table cells: data-table ellipsis         |
| T6  | Below 600px, tables are list rows with continuous paging and no pager                                                            | **exists**: phone rule 8                                                                                                                               |
| N1  | Five or fewer tabs, one-word labels, badges only for critical items                                                              | **exists**: phone (tab labels, shell by device)                                                                                                        |
| N2  | Root pages have a collapsing large title; child pages have back and the parent's title                                           | **exists**: phone (title at 320, scroll edge)                                                                                                          |
| N3  | Settings sections follow the APP-SHELL-STANDARD.md §4 order and save model                                                       | **review-only**: which sections apply differs per app                                                                                                  |
| N4  | Tab bar, rail and sidebar switch at 600 and 840px                                                                                | **exists**: phone ("Layout by size")                                                                                                                   |
| P1  | Nothing scrolls sideways from 320 to 430 wide                                                                                    | **exists**: phone sweep                                                                                                                                |
| P2  | Targets are at least 44pt                                                                                                        | **exists**: phone                                                                                                                                      |
| P3  | Content clears fixed chrome                                                                                                      | **exists**: phone (content insets)                                                                                                                     |
| K1  | Every story passes WCAG 2.2 AA in light and dark                                                                                 | **exists**: axe                                                                                                                                        |
| K2  | Composite widgets meet their APG keyboard contract (tabs, menu, listbox, radio group, dialog)                                    | **planned**: Playwright keyboard specs per pattern, run like the phone suite                                                                           |
| K3  | A clickable element is keyboard-reachable and has key handlers                                                                   | **enforced**: `@angular-eslint/template/click-events-have-key-events` and `interactive-supports-focus` at error in `@lifekit-hq/config`                |
| K4  | Overlays trap focus and return it on close                                                                                       | **exists**: phone (overflow menu returns focus), CDK dialog                                                                                            |
| M1  | Durations and easings come only from tokens; only transform and opacity animate                                                  | **exists**: drift (`layout-transition`)                                                                                                                |
| M2  | Under Reduce Motion, movement becomes a fade or nothing                                                                          | **exists**: phone (skeleton, sheet)                                                                                                                    |
| Y1  | One family and the five type roles only                                                                                          | **exists**: drift (`font-family`, `text-size`), scan                                                                                                   |
| Y2  | Spacing comes from the 4/8 scale                                                                                                 | **enforced**: drift `spacing`                                                                                                                          |
| Y3  | Text is 12px or larger; inputs are 16px on a phone                                                                               | **exists**: phone                                                                                                                                      |
| C1  | Each app's roles come from one seed and meet AA by construction                                                                  | **exists**: `seed-aa.spec.mjs`                                                                                                                         |
| C2  | Fixed-meaning colours are never seed-derived                                                                                     | **exists**: `fixed-colours.spec.mjs`                                                                                                                   |
| C3  | No colour literals outside tokens                                                                                                | **exists**: drift (`color`)                                                                                                                            |
| C4  | Colour is never the only signal                                                                                                  | **review-only**: axe cannot see meaning. Stat-card deltas carry an icon, and money deltas a sign ($2)                                                  |
| Ch1 | Every chart has an accessible name stating the trend, plus a data-table view                                                     | **planned**: a chart spec (canvas `role="img"` with a non-empty label) and a `DataTable` story                                                         |
| Ch2 | Bars and areas start at zero; gaps are never interpolated                                                                        | **enforced**: charts-core specs on the bar, area and line builders                                                                                     |
| Ch3 | Scrub works by touch and by arrow keys                                                                                           | **planned**: a K2-style Playwright spec                                                                                                                |
| $1  | All money and number display goes through one library formatter                                                                  | **enforced**: `formatMoney`, `cmnMoney` and `cmnNumber`, plus consumer-lint `lifekit/no-local-currency-format`                                         |
| $2  | Deltas carry a sign; an ISO code appears when same-symbol currencies share a screen                                              | **enforced**: `money.spec.ts` across en-IE and uk-UA                                                                                                   |
| X1  | Zero local copies: no raw `<button>`, `<input>`, `<select>`, `<textarea>` or `<table>` where a `cmn-*` exists                    | **enforced**: consumer-lint `lifekit/no-raw-controls`, a warning for one release and then an error; a disable comment gives its reason                 |
| X2  | Every component has a story for each state its category needs                                                                    | **enforced**: story-state                                                                                                                              |
| X3  | One primary number per screen; detail behind disclosure                                                                          | **review-only**: which number is primary is a product decision                                                                                         |
| X4  | The NN/g heuristics pass on every new flow                                                                                       | **review-only**: they judge whole flows                                                                                                                |

The count: 22 **exists**; 20 **enforced** (S3, S4, S6, S7, F1 in part, V1 to V4, V5 forwarding,
V8, T3 in part, T5 in part, K3, Y2, Ch2, $1, $2, X1, X2); 9 **planned** (F2 to F5, T2, T4, K2,
Ch1, Ch3); 6 **review-only** (F6, V6, N3, C4, X3, X4), plus the wording in F4 and the reason in
S7. Every planned check waits on a feature that is its own issue: toast actions and stacking,
data-table features (T5's cell ellipsis among them), keyboard patterns and chart text
alternatives.

### Story-state categories (X2)

`scripts/check-story-states.mjs` holds each component in a category to a story per state, by
export name. A state a component cannot show yet is listed, with its reason, in
[`docs/story-states-baseline.json`](../story-states-baseline.json); the list only shrinks, and an
entry whose story lands fails the check until it is removed.

| Category      | Components                                                   | Required stories                                                  |
| ------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Field         | input, textarea, select, date-range, search-input            | `Default`, `Filled`, `Disabled`, `ReadOnly`, `Error`              |
| Choice        | checkbox, toggle, segmented, chip                            | `Off` (or `Unchecked`), `On` (or `Checked`, `Chosen`), `Disabled` |
| Async surface | data-table (and its list rows), every chart, stat-card, chat | `Loading`, `Empty`, `Error`, populated, long content              |
| Feedback      | toast, alert                                                 | `Info`, `Success`, `Warning`, `Error`, `WithAction`, long content |
| Empty state   | empty-state                                                  | `FirstUse`, `NoResults`, `Error`                                  |
| Overlay       | dialog, drawer, command palette                              | one launcher story per service                                    |

### Consumer lint (X1, $1, K3)

`@lifekit-hq/config`'s ESLint preset carries the `lifekit` plugin for apps:

- `lifekit/no-raw-controls` flags a raw `<button>`, `<input>`, `<select>`, `<textarea>` or
  `<table>` in a template where a `cmn-*` exists, and names the component to use. Input types with
  no component yet (`file`, `date`, `range` and the like) pass.
- `lifekit/no-local-currency-format` flags `Intl.NumberFormat` and `toLocaleString` with
  `style: 'currency'`, and the Angular `currency` pipe.
- `lifekit/require-disable-reason` asks a comment that disables a `lifekit/*` rule to say why
  after `--`, so each exception can be reviewed.

All three are warnings for one release, then errors. The library lints its own source with
`createEslintConfig({consumerGuardrails: false})`, since that is where the components themselves
are built. K3's two template rules are errors
from the start.
