---
name: lifekit
description: Shared design system for lifekit frontends (tokens, Angular cmn-*, Lit lk-*); direction A - Instrument (IBM Plex Sans, petrol accent, cool graphite) on IBM Carbon's geometry, type scale and motion
colors:
  accent: '#175a6d'
  accent-hover: '#134858'
  accent-active: '#0f3846'
  accent-subtle: '#e3f1f4'
  surface-bg: '#f3f5f6'
  surface-card: '#ffffff'
  surface-raised: '#e8edef'
  surface-hover: '#dce3e6'
  text-primary: '#0f1a1f'
  text-secondary: '#46565e'
  text-disabled: '#66757c'
  text-placeholder: '#5c6b72'
  text-inverse: '#ffffff'
  border-default: '#d9e0e3'
  border-strong: '#7d8c93'
  border-focus: '#1d6f85'
  status-info: '#2557b0'
  status-success: '#0e7446'
  status-warning: '#955400'
  status-error: '#bb2530'
  dark-surface-bg: '#0c1113'
  dark-surface-card: '#141b1e'
  dark-surface-raised: '#1b2428'
  dark-surface-hover: '#243036'
  dark-text-primary: '#e4ebed'
  dark-text-secondary: '#a7b5bb'
  dark-text-disabled: '#8a989e'
  dark-text-placeholder: '#8a989e'
  dark-text-inverse: '#0a2830'
  dark-accent: '#5aa9bb'
  dark-accent-hover: '#93cad6'
  dark-border-default: '#27333a'
  dark-border-strong: '#62727a'
  dark-border-focus: '#5aa9bb'
  dark-status-info: '#8ab4f8'
  dark-status-success: '#4cc38a'
  dark-status-warning: '#e8a33c'
  dark-status-error: '#f27b83'
typography:
  display:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '2.625rem'
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '1.75rem'
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.33333
  mono:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace"
    fontSize: '0.875rem'
rounded:
  sm: '0px'
  md: '0px'
  lg: '0px'
  full: '9999px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '6': '24px'
  '8': '32px'
  '12': '48px'
  '16': '64px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.text-inverse}'
    rounded: '{rounded.md}'
    height: '48px'
    padding: '0 16px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  card:
    backgroundColor: '{colors.surface-card}'
    rounded: '{rounded.md}'
    padding: '16px'
  input:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
    height: '48px'
    padding: '0 16px'
  chip:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.text-secondary}'
    rounded: '{rounded.full}'
    padding: '4px 12px'
  chip-selected:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.text-inverse}'
---

# Design System: lifekit

## Overview

**Creative North Star: "The Instrument"**

lifekit's interface is a precision instrument for reading your own data: flat, quiet surfaces, one engineered sans family, a single petrol accent, and figures that line up. Nothing decorates; every pixel serves reading a value, a record or a status correctly at a glance. Density serves daily checking on desktop and phone, in light and dark.

This page is the look, for every lifekit app: templates, rhythm tokens and components. How the interface behaves (loading and empty states, feedback, form validation, tables, keyboard, charts and number formatting) follows the published sources adopted in [docs/design/guardrails.md](docs/design/guardrails.md), which also names the check behind each rule. What a domain's figures mean and how they read belongs to that app's own pattern page, not here; money is Finance Sentry's, [docs/design/patterns.md](https://github.com/lifekit-hq/finance-sentry/blob/main/docs/design/patterns.md) in its repository.

**Characteristics:**

- One family: IBM Plex Sans (variable 100-700, self-hosted, Cyrillic) for every role; Plex Mono for code only.
- Tabular figures everywhere, so number columns align even where a component forgets `tabular-nums`.
- Petrol accent (`#175a6d`, dark `#5aa9bb`) on cool graphite; status colours at text grade: blue `#2557b0`, green `#0e7446`, amber `#955400`, red `#bb2530`. Info has its own hue and never reads as a second accent.
- Flat surfaces: a hairline border or a shadow, never both. Shadow is reserved for overlays (menu, tooltip, dialog, sheet); the menu, tooltip, dialog and command palette also carry a hairline border so they keep an edge on dark surfaces.
- Square corners: controls, cards, menus and sheets have no radius (Carbon's geometry); only the pill (chips, tags, badges, avatars) is round.

## Colors

Cool graphite neutrals with a single petrol voice (restrained: accent only for the primary action, selection, focus and state). Dark graphite is `#0c1113` with cards at `#141b1e`; petrol stays legible without glow.

### Carbon bridge

The owner chose IBM Carbon as the design system (epic #279): "true Carbon, align first, keep Lucide." Step 1 (this page's type, size, shape and motion values) aligns our tokens to Carbon's; the colour layer came first, in step 0, without changing a pixel: `@lifekit-hq/tokens/carbon-bridge.css` points Carbon's semantic `--cds-*` names (layers, fields, borders, text, icons, links, focus, status, buttons, tags) at our `--color-*` roles. Carbon reads colour only as `var(--cds-NAME, fallback)`, so the bridge needs no Sass theme per app: a Carbon-specced value follows each app's seed palette, and `[data-theme]` flips light and dark because the roles already do. Our look is Carbon's g10 shape (grey ground, white layers and fields), so the mapping is near one-to-one. The file is generated from `theme.css` and `scripts/carbon-bridge-map.mjs`, never hand-edited, and its test covers light and dark for two seeds. `@carbon/styles` is a devDependency of the tokens package only, so no app ships Carbon. Carbon's cyan, teal, purple, cool-gray and warm-gray tags are not mapped (we have four status hues) and keep Carbon's colours until a decision is taken.

### Named Rules

**The Token-Only Rule.** Components use only `--color-*` tokens; no colour literals in components.
**The Text-Grade Rule.** Body and placeholder text reach 4.5:1 in both themes, and status colours reach 4.68:1 as text on their own 15% tint. Text on accent or status fills uses `text-inverse`, never hard-coded white.
**The Placeholder Rule.** Placeholder text uses `text-placeholder` (at least 4.5:1 in both themes), never `text-disabled`.

## Typography

**Family:** IBM Plex Sans for display, headline, title, body and label. Hierarchy is carried by size and weight.

The sizes are Carbon's productive type scale (`@carbon/type`), the only sizes the ramp has, with two things kept as ours: the 12px floor and the 14/21 body line height (Carbon's compact body is 14/18). A heading takes Carbon's line height where it clears 1.3 and 1.3 where Carbon's is tighter, the floor the design judge holds multi-line text to.

- **Display** (700, 2.625rem, 1.2; Carbon heading-06, 42px): page titles in large layouts. `text-cmn-4xl`.
- **Headline** (600, 1.75rem, 1.3; heading-04, 28px): stat values and section titles. `text-cmn-2xl`. Page titles use `text-cmn-3xl` (heading-05, 32px).
- **Title** (600, 1.25rem, 1.4; heading-03, 20px): card titles. `text-cmn-lg`. `text-cmn-xl` is the same size, kept as a deprecated alias for the old second 20px step and removed in the next major.
- **Body** (400, 0.875rem, 1.5; body-compact-01 size, 14/21): default UI text. `text-cmn-sm`; `text-cmn-md` is 1rem / 1.5 (body-02).
- **Label** (600, 0.75rem, 1.33333; label-01, 12/16): sentence case, 12px minimum. No uppercase or tracked micro-labels. `text-cmn-xs`.

The old 18, 24, 30 and 36px steps are gone because Carbon has no such sizes: 18 becomes 20, 24 becomes 28, 30 becomes 32 and 36 becomes 42. Weights stay ours; Carbon sets its large headings light (300), and that is a later call.

### Named Rules

**The rem Contract Rule.** The scale is in rem and assumes a 16px root. A consumer that overrides the root font size silently rescales every token, so none may.
**The 12px Floor.** No text below 12px. No `text-[10px]` or `text-[11px]`; use the ramp.

## Layout

A 4px spacing base (`cmn-1` to `cmn-16`), a subset of Carbon's 8px scale with its 2px and 4px mini-units; an arbitrary length off that scale fails the drift check. Control heights are Carbon's layout sizes, `--cmn-size-xs/sm/md/lg` = 24 / 32 / 40 / 48px (`h-cmn-size-*`), and the default is 48px. App chrome comes from `cmn-app-layout`: a collapsible sidebar with a top bar on desktop, and a bottom tab bar on phones whose last tab, More, is a page the app builds. The shell owns the bars; the page template owns the screen between them. Data tables become list rows on phones. More space above a heading than below it.

### Page templates

Every routed page sits in a page template, `cmn-page`. Its `kind` names the archetype of the screen (`list`, `detail`, `form`, `settings` or `overview`), and the template, not the page, owns the composition:

- **One left edge.** The title, the notices and the content share the page's left edge, inset from main by the page gutter. A template's kind names the columns content may start on: a list, a detail, a form and a settings page each have one; an overview has a main column and a rail, a deliberate second column beside it.
- **Reading width.** Each kind sets its column's width: a list and a form read at 640px, a detail and a settings page at 720px (a key-value list's values, and a settings section's heading column beside its controls, need the room). An overview runs the page's 1200px: its main column takes the frame's width less a 320px rail, which sits beside it from 1280px and under it below that; a body that runs several screens beside the short rail is the template as drawn, not an unbalanced opening row, and the route scan accepts it. A text field keeps a reading width (at most 640px), never a phone layout stretched to the desktop.
- **The title.** The large title the route declares is drawn inside the page frame, and the title gap (at least 16px) sits under the large title. The shell still collapses it into the top bar on scroll.
- **Rhythm.** Top-level blocks sit a section gap apart; inside a group (a heading and its rows, a field and its button) the gap is the group gap. Stacked surfaces keep at least the group gap (8px) apart.
- **Controls side by side share one height** (`--cmn-control-h`): the md input, button, select and search field. It is Carbon's 48px default on the phone and the desktop alike, so it is also above the 44px touch target (`--size-touch`) a phone control must keep; a smaller control (a 24 or 32px icon button, a 32px chip) keeps its drawn size and gets a 44px hit area below md.

A page sets no padding, margin or width of its own; it projects its blocks. `cmn-page-container` is deprecated for `cmn-page` and keeps working for the pages that still use it.

The rhythm is five tokens in `theme.css`, read through the preset's `cmn-*` spacing steps:

| Token               | Phone | From 768px | Tailwind              |
| ------------------- | ----- | ---------- | --------------------- |
| `--cmn-page-gutter` | 16px  | 32px       | `px-cmn-page-gutter`  |
| `--cmn-title-gap`   | 16px  | 24px       | `mb-cmn-title-gap`    |
| `--cmn-section-gap` | 24px  | 24px       | `gap-cmn-section-gap` |
| `--cmn-group-gap`   | 8px   | 8px        | `gap-cmn-group-gap`   |
| `--cmn-control-h`   | 48px  | 48px       | `h-cmn-control-h`     |

Each template has golden screens in Storybook (`Templates/List`, `Templates/Detail`, `Templates/Form`, `Templates/Settings`, `Templates/Overview`), at 390 and 1280, light and dark, built from real components with realistic content. The owner approves them once per template; they are the reference an app copies, and the screen check holds every app to them.

### The screen check

`@lifekit-hq/tokens/screen` checks the composed screen, the unit the owner looks at, on a rendered route rather than an isolated story. Each rule enforces a sentence on this page or in the HIG:

| Rule | Name              | Fails when                                                                 |
| ---- | ----------------- | -------------------------------------------------------------------------- |
| C0   | page-template     | the route is not built on `cmn-page`                                       |
| C1   | one-left-edge     | the title, a notice or a top-level block starts off the template's columns |
| C2   | title-clearance   | less than 16px sits under the large title                                  |
| C3   | touching-blocks   | two stacked surfaces are less than 8px apart                               |
| C4   | row-height-parity | controls side by side differ in height                                     |
| C5   | stretched-input   | a text field is wider than 640px                                           |
| C6   | nested-surface    | a bordered surface sits inside another                                     |
| C7   | uppercase-label   | a label is set in uppercase                                                |
| C8   | heading-rhythm    | a heading has less space above it than below the content it heads          |
| C9   | row-action-noise  | a bordered text button repeats on three or more rows of a list             |
| C10  | text-escapes      | text runs past its surface                                                 |

Every app runs it on every route at 390 and 1280, once the data has settled, from its own Playwright e2e ([docs/SCREEN-CHECK.md](docs/SCREEN-CHECK.md)). Enforcement lands per app: an app adopts `cmn-page` and turns the check on in the same pull request. Once every app has adopted, a major release removes Tailwind's off-scale default spacing and type steps from the preset, so page spacing stops being a call-site choice.

## Elevation & Depth

Flat by default: hairline border on `surface-card`. Shadows are for overlays only (menu, popover, tooltip, dialog, bottom sheet). A surface is held by its border or its shadow, never both, with one exception: the menu, tooltip, dialog and command palette carry a shadow and a hairline `border-default`, because a shadow alone is invisible on near-black dark surfaces. The select's multiple-choice panel floats on its shadow alone. Backdrop blur is allowed in exactly one place: the fixed bars that scroll content passes under (the bottom tab bar and the top bar), at `backdrop-blur-md` over an 80% `surface-card` mix. Nothing else blurs, and a card, sheet or menu stays an opaque surface.

## Shapes

Square. `--radius-sm`, `--radius-md` and `--radius-lg` are all `0px`; the only round shape is the full pill (`--radius-full`) for chips, tags, badges and avatars, which is where Carbon rounds too (its tag). No off-scale literals: a radius is `0`, the pill, a circle (`50%`) or a `--radius-*` token.

**Why the radii changed.** They were 3 / 6 / 8px, Instrument's own softening. The owner chose IBM Carbon as the design system and asked for it true ("true Carbon, align first"), and square corners on controls, cards, menus and sheets are the part of Carbon you see first. Keeping the old radii over Carbon's colour and type would have been a lookalike, not an alignment. The three token names stay, set to `0px`, so every `rounded-cmn-*` and `var(--radius-*)` in the library and in the apps follows from one edit and no template changes; a bottom sheet is square-cornered too (the phone pieces take Carbon's geometry, not only the desktop).

## Motion

Animate transform and opacity only, never layout properties (no `transition` on width or height). Every animation has a `prefers-reduced-motion` path: movement becomes a fade or nothing, and only a spinner keeps turning.

Durations and easings are tokens (Carbon's values, `@carbon/motion`), never literals: `--cmn-duration-short` (150ms, moderate-01: a toggle, a fade, a small state change), `--cmn-duration-medium` (240ms, moderate-02: a surface entering or leaving, a crossfade) and `--cmn-duration-long` (400ms, slow-01: a large or full-screen move). Two curve families: the productive ones for the everyday, `--cmn-ease-standard` for anything that stays on screen, `--cmn-ease-decelerate` for what arrives, `--cmn-ease-accelerate` for what leaves; and the expressive ones, `--cmn-ease-expressive-standard`, `-decelerate` and `-accelerate`, for the larger surfaces that carry the screen (the bottom sheet, the drawer). Tailwind reads them as `duration-cmn-*` and `ease-cmn-*` (`ease-cmn-expressive*`). The old `--cmn-ease-emphasized-*` names are deprecated aliases of the productive curves, removed in the next major. A leaving surface is faster than an arriving one. A skeleton's sheen is the one decorative loop: it sweeps by transform, in `--color-skeleton-sheen` over `--color-skeleton`, and stops under Reduce Motion.

### Overlays and toasts

Each follows the Carbon pattern for its kind, on the tokens above and nothing else. A surface arrives on `--cmn-duration-medium` with a decelerate curve and leaves on `--cmn-duration-short` with an accelerate one, faster than it came; the scrim fades on the same two timings, so it never lingers after its surface (CDK's own 400ms backdrop fade is overridden).

- **Bottom sheet, action sheet, full-screen sheet and side drawer** (Carbon's side panel and iOS sheet): slide their own height or width on the expressive curves, as before. The scrim now fades with them, and the drawer waits `--cmn-duration-short` before it is taken down, the length of its own exit.
- **Centred dialog** (Carbon's modal): fades in while settling down `--cmn-motion-distance-md` (24px, Carbon's modal offset), and fades out the same way on close. A close predicate that vetoes the close brings it back.
- **Toast** (Material 3's snackbar, since Carbon's notifications are static): rises `--cmn-motion-distance-sm` (8px) while it fades in, and fades out the same way. The stack keeps a removed toast drawn, inert, for the length of its exit, then takes the overlay down; its timer and pause rules are unchanged. A toast drawn alone, outside the stack, does not move.

Under Reduce Motion the exits are skipped as well as the movement: the surface, its scrim and the toast go at once.

### View transitions

A route change that moves between tab destinations or into a detail page is a View Transition, enabled once in the app config:

```ts
provideRouter(APP_ROUTES, withPreloading(TabPreloadStrategy), withLkViewTransitions());
```

`withLkViewTransitions()` (`@lifekit-hq/core`) crossfades only when the matched route changes: a navigation that changes only params, query params or the fragment (a filter chip, a search, a URL-synced store's `replaceUrl` write) skips the transition, so the page never fades as a frozen snapshot that swallows taps. It also skips under `prefers-reduced-motion`. The crossfade is opacity only, timed by `--cmn-duration-medium` and `--cmn-ease-standard` (`::view-transition-old/new(root)` in `theme.css`). Where a page shares an element with the next (a row and its detail header), name it with `view-transition-name` on both sides, never on a repeated element. Browsers without View Transitions (older Safari) navigate without one, so nothing may depend on it.

### Blur

The D16 decision: the tab bar and the top bar blur what scrolls under them (`backdrop-blur-md`), and this document used to say "no backdrop blur". The code stays and the rule changes. The fixed bars sit over scrolling content on every page, an opaque bar would hide that the page continues under the thumb, and the translucent tab bar is how iOS draws its own, which is what the installed app is meant to feel like. Blur is confined to those two surfaces so it stays cheap to paint: no blur on cards, sheets or lists, and no stacking of blurred layers. The bars should drop to an opaque `surface-card` under `prefers-reduced-transparency: reduce`; they do not yet, so add it with the next change to either bar.

## Components

- **Buttons:** Carbon's kinds. `primary` is the accent fill with a `text-inverse` label; `secondary` is the ink fill (`text-primary`, so it flips in dark); `tertiary` is outlined in the accent; `ghost` is accent text with no box; `destructive` is the error fill (Carbon's danger), with `danger-tertiary` and `danger-ghost` beside it. Sizes are Carbon's layout sizes, `sm` 32px, `md` 48px (the default, `--cmn-control-h`) and `lg` 64px, always square, with a 14px label and 16px side padding. Every kind has a 1px border (transparent unless the kind draws one), so kinds never change the box. Focus is Carbon's inset ring (`shadow-cmn-focus-inset`: the border turns to `border-focus`, then a 1px ground-coloured line inside it). A disabled button is drawn in its own greys, never dimmed. The outlined button earlier versions called `secondary` is now `tertiary`; a call site that meant the outline moves to `tertiary`.
- **Chips:** pill, `surface-raised` fill; selected fills with the accent.
- **Tags:** Carbon's read-only tag, a pill in label-01 (12px, regular), 24px tall (`size="lg"` 32px). The four status hues plus neutral: a `status-*-subtle` fill with text in the hue (blue info, green success, amber warning, red error), `surface-raised` and `text-secondary` for neutral. Carbon's other tag colours are not used.
- **Cards:** hairline border, `surface-card`, 12/16/24px padding, square (Carbon's tile, whose 16px default padding is the `md` step). Never nested.
- **Checkbox and toggle:** Carbon's. The checkbox is a 16px square with a 1px ink border, filled with the ink (`text-primary`) and a check when on; its focus is a 2px outline offset by 1px. The toggle is a 48 x 24px pill track: `border-strong` grey off, the success hue (`status-success`, Carbon's support-success) on, with a 16px white thumb; the thumb's position, not only the colour, says which. Both press at 44px on a phone. A disabled one greys out instead of dimming.
- **Alerts:** Carbon's inline notification: the kind's `status-*-subtle` fill, a 3px stripe in the kind's colour on the leading edge (`border-l-cmn-bar`) and a 1px hairline of it on the other edges, at least 48px tall, with a 16px icon in the kind's colour and a 32px dismiss button that presses at 44px on a phone.
- **Field geometry (token):** Carbon's filled field is three tokens, `--cmn-field-bg` (the `surface-raised` fill, `bg-cmn-field`), `--cmn-field-border-bottom` (1px `border-strong` on the bottom edge only) and `--cmn-field-focus` (a 2px `border-focus` ring). `cmn-input`, `cmn-textarea` and `cmn-search-input` are on them (steps 2 and 3 of epic #279); the select follows.
- **Inputs:** Carbon's filled field: the `bg-cmn-field` fill, a 1px `border-strong` bottom border only (3:1), 48px tall by default (32 and 64 for `sm` and `lg`), 16px side padding. Hover moves the fill to `surface-hover`; focus draws a 2px `border-focus` outline inset in the box; an error draws the same outline in the error colour, with the message below it. A disabled field greys its text and border and keeps its fill (never dimmed); a read-only one drops the fill, so it reads as text. The label above is label-01 (12px, regular, `text-secondary`), the hint and the error below are 12px, and the error carries an icon so colour is not its only signal. Errors show when the form is submitted and clear as soon as the field is fixed (GOV.UK); the text says what went wrong and how to fix it, with no "please", "sorry", "valid" or "invalid".
- **Data table:** Carbon's table on desktop: a 48px header row on the `surface-raised` fill, sentence case in primary text, 14px semibold (heading-compact-01); 48px body rows divided by a hairline, right-aligned tabular numbers; an actionable row fills with `surface-hover` and takes the inset focus outline. Tables stay desktop only; on a phone the same data is list rows (C5).
- **List rows:** Carbon's contained-list item, at least 48px tall with hairline dividers. A row that only shows data does not answer the pointer; a pressable row (`action`) fills with `surface-hover` on hover and `surface-raised` when pressed. A row's action is a quiet trailing icon (`cmn-list-item-row` `trailingIcon`), not a bordered text button repeated on three or more rows.
- **List sections:** Carbon's contained-list header (heading-compact-01): sentence case, 14px semibold in the primary text colour, at least 40px tall, with the group gap under it.
- **Structured list:** `cmn-description-list` is Carbon's structured list: hairline-divided rows, the label regular-weight in the secondary text colour beside a primary-text value (stacked on a phone).
- **Expandable row:** `cmn-disclosure-row` takes Carbon's expandable-row anatomy: at least 48px tall, a hover fill, a chevron that turns a quarter turn from right to down, and the open content on the page ground. The chevron leads the row from `md` and trails on a phone, where an iOS disclosure indicator sits; the turn is a transform and holds still under Reduce Motion. The desktop expandable table (a `cmn-data-table` with expandable rows) is a later step; until then a disclosure row inside a `cmn-card` is the pattern.
- **Tabs:** Carbon's line tabs: 40px tall, side by side with no gap, each with its own 2px bottom border (hairline grey, `border-strong` on hover, the accent when selected), 14px with the selected label semibold in primary text, and the 2px inset focus outline. A tab presses at 44px on a phone.
- **Segmented control:** Carbon's content switcher: one square box with a 1px ink outline, cells 40px tall (44px on a phone), the chosen cell filled with the ink (`text-primary`) and a `text-inverse` label, hover on `surface-hover`. A disabled chosen cell moves to the neutral `surface-raised` so its disabled text stays legible. Cell padding stays 4px, not Carbon's 16px, so a row of seven period labels still fits a 390px phone card; `lk-segmented` draws the same.
- **Search:** Carbon's search is the filled field: `bg-cmn-field`, a 1px `border-strong` bottom border only, 48px by default (32 and 64 for `sm` and `lg`), a 16px glyph inset 16px and a 32px clear button (44px on a phone), hover on `surface-hover`, a 2px inset focus outline, greyed (never dimmed) when disabled.
- **Skeleton and loading:** the skeleton presets draw the footprint of the component they stand in for (the list section's 40px heading, the 48px row), so the page does not shift when data arrives; the sheen keeps to transform and opacity. A retry action in an alert is Carbon's ghost button: accent text on a transparent box, no border until focused.
- **Stat card:** the value is the content. Value in the text face with tabular figures; no uppercase label, no decorative accent.
- **Desktop shell:** Carbon's UI Shell. The header is 48px (`h-cmn-size-lg`) from `md`, its buttons are 48px squares that abut each other and the right edge, hover on `surface-hover`, the 2px inset focus outline; the avatar disc stays 32px in a 48px cell. The side nav is 256px (`w-cmn-nav`, mini-units 32) and collapses to a 48px rail (`w-cmn-nav-rail`, mini-units 6), its header band the header's 48px. Its links are 32px tall (44px on a coarse pointer below `md`), a 16px glyph on a 16px inset so it centres in the rail, 14px label in the secondary text colour; hover on `surface-hover`; the selected link fills with `accent-subtle`, takes the primary text colour in semibold and draws a 3px accent bar on its leading edge (`shadow-cmn-nav-active`, drawn inside the box so the label does not move) and `aria-current="page"`. Everything is square. The phone shell is untouched in structure: no hamburger side nav (C4), the 44pt top bar and the 49pt bottom tab bar stay (iOS sizes, which the shell's measured insets depend on), and the tab bar's active fill is square like every other Carbon surface.

## Do's and Don'ts

### Do:

- **Do** use only `--color-*`, `--font-*`, `--radius-*`, `--shadow-*` and `cmn-*` tokens.
- **Do** check every story in light and dark.

### Don't:

- **Don't** change the root font size in a consumer.
- **Don't** put white text on status or dark-accent fills.
- **Don't** use a border and a shadow on the same container (menu, tooltip, dialog and command palette excepted), or nest cards.
- **Don't** use monospace outside code, or uppercase tracked labels.
