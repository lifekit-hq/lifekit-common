---
name: lifekit
description: Shared design system for lifekit frontends (tokens, Angular cmn-*, Lit lk-*); direction A - Instrument (IBM Plex Sans, petrol accent, cool graphite)
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
    fontSize: '2.25rem'
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', system-ui, sans-serif"
    fontSize: '0.75rem'
    fontWeight: 600
    lineHeight: 1.3
  mono:
    fontFamily: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', monospace"
    fontSize: '0.875rem'
rounded:
  sm: '3px'
  md: '6px'
  lg: '8px'
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
    padding: '8px 16px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  card:
    backgroundColor: '{colors.surface-card}'
    rounded: '{rounded.md}'
    padding: '16px'
  input:
    backgroundColor: '{colors.surface-card}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.md}'
    padding: '8px 12px'
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
- Tight radii: 3 / 6 / 8px.

## Colors

Cool graphite neutrals with a single petrol voice (restrained: accent only for the primary action, selection, focus and state). Dark graphite is `#0c1113` with cards at `#141b1e`; petrol stays legible without glow.

### Named Rules

**The Token-Only Rule.** Components use only `--color-*` tokens; no colour literals in components.
**The Text-Grade Rule.** Body and placeholder text reach 4.5:1 in both themes, and status colours reach 4.68:1 as text on their own 15% tint. Text on accent or status fills uses `text-inverse`, never hard-coded white.
**The Placeholder Rule.** Placeholder text uses `text-placeholder` (at least 4.5:1 in both themes), never `text-disabled`.

## Typography

**Family:** IBM Plex Sans for display, headline, title, body and label. Hierarchy is carried by size and weight.

- **Display** (700, 2.25rem, 1.1): page titles in large layouts.
- **Headline** (600, 1.5rem, 1.3): stat values and section titles.
- **Title** (600, 1.125rem, 1.5): card titles.
- **Body** (400, 0.875rem, 1.5): default UI text.
- **Label** (600, 0.75rem, 1.3): sentence case, 12px minimum. No uppercase or tracked micro-labels.

### Named Rules

**The rem Contract Rule.** The scale is in rem and assumes a 16px root. A consumer that overrides the root font size silently rescales every token, so none may.
**The 12px Floor.** No text below 12px. No `text-[10px]` or `text-[11px]`; use the ramp.

## Layout

A 4px spacing base (`cmn-1` to `cmn-16`), a subset of Carbon's 8px scale with its 2px and 4px mini-units; an arbitrary length off that scale fails the drift check. App chrome comes from `cmn-app-layout`: a collapsible sidebar with a top bar on desktop, and a bottom tab bar on phones whose last tab, More, is a page the app builds. The shell owns the bars; the page template owns the screen between them. Data tables become list rows on phones. More space above a heading than below it.

### Page templates

Every routed page sits in a page template, `cmn-page`. Its `kind` names the archetype of the screen (`list`, `detail`, `form`, `settings` or `overview`), and the template, not the page, owns the composition:

- **One left edge.** The title, the notices and the content share the page's left edge, inset from main by the page gutter. A template's kind names the columns content may start on: a list, a detail, a form and a settings page each have one; an overview has a main column and a rail, a deliberate second column beside it.
- **Reading width.** Each kind sets its column's width: a list and a form read at 640px, a detail and a settings page at 720px (a key-value list's values, and a settings section's heading column beside its controls, need the room). An overview runs the page's 1200px: its main column takes the frame's width less a 320px rail, which sits beside it from 1280px and under it below that. A text field keeps a reading width (at most 640px), never a phone layout stretched to the desktop.
- **The title.** The large title the route declares is drawn inside the page frame, and the title gap (at least 16px) sits under the large title. The shell still collapses it into the top bar on scroll.
- **Rhythm.** Top-level blocks sit a section gap apart; inside a group (a heading and its rows, a field and its button) the gap is the group gap. Stacked surfaces keep at least the group gap (8px) apart.
- **Controls side by side share one height** (`--cmn-control-h`): the md input, button, select and search field.

A page sets no padding, margin or width of its own; it projects its blocks. `cmn-page-container` is deprecated for `cmn-page` and keeps working for the pages that still use it.

The rhythm is five tokens in `theme.css`, read through the preset's `cmn-*` spacing steps:

| Token               | Phone | From 768px | Tailwind              |
| ------------------- | ----- | ---------- | --------------------- |
| `--cmn-page-gutter` | 16px  | 32px       | `px-cmn-page-gutter`  |
| `--cmn-title-gap`   | 16px  | 24px       | `mb-cmn-title-gap`    |
| `--cmn-section-gap` | 24px  | 24px       | `gap-cmn-section-gap` |
| `--cmn-group-gap`   | 8px   | 8px        | `gap-cmn-group-gap`   |
| `--cmn-control-h`   | 44px  | 40px       | `h-cmn-control-h`     |

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
| C8   | heading-rhythm    | a heading has less space above it than below                               |
| C9   | row-action-noise  | a bordered text button repeats on three or more rows                       |
| C10  | text-escapes      | text runs past its surface                                                 |

Every app runs it on every route at 390 and 1280, once the data has settled, from its own Playwright e2e ([docs/SCREEN-CHECK.md](docs/SCREEN-CHECK.md)). Enforcement lands per app: an app adopts `cmn-page` and turns the check on in the same pull request. Once every app has adopted, a major release removes Tailwind's off-scale default spacing and type steps from the preset, so page spacing stops being a call-site choice.

## Elevation & Depth

Flat by default: hairline border on `surface-card`. Shadows are for overlays only (menu, popover, tooltip, dialog, bottom sheet). A surface is held by its border or its shadow, never both, with one exception: the menu, tooltip, dialog and command palette carry a shadow and a hairline `border-default`, because a shadow alone is invisible on near-black dark surfaces. The select's multiple-choice panel floats on its shadow alone. Backdrop blur is allowed in exactly one place: the fixed bars that scroll content passes under (the bottom tab bar and the top bar), at `backdrop-blur-md` over an 80% `surface-card` mix. Nothing else blurs, and a card, sheet or menu stays an opaque surface.

## Shapes

Radius 3 / 6 / 8px by role (`--radius-sm/md/lg`); full pills for chips, tags and badges. No off-scale literals.

## Motion

Animate transform and opacity only, never layout properties (no `transition` on width or height). Every animation has a `prefers-reduced-motion` path: movement becomes a fade or nothing, and only a spinner keeps turning.

Durations and easings are tokens (M3 values), never literals: `--cmn-duration-short` (150ms: a toggle, a fade, a small state change), `--cmn-duration-medium` (250ms: a surface entering or leaving, a crossfade) and `--cmn-duration-long` (400ms: a large or full-screen move); `--cmn-ease-standard` for anything that stays on screen, `--cmn-ease-emphasized-decelerate` for what arrives, `--cmn-ease-emphasized-accelerate` for what leaves. Tailwind reads them as `duration-cmn-*` and `ease-cmn-*`. A leaving surface is faster than an arriving one. A skeleton's sheen is the one decorative loop: it sweeps by transform, in `--color-skeleton-sheen` over `--color-skeleton`, and stops under Reduce Motion.

### View transitions

A route change that moves between tab destinations or into a detail page is a View Transition, enabled once in the app config:

```ts
provideRouter(APP_ROUTES, withPreloading(TabPreloadStrategy), withLkViewTransitions());
```

`withLkViewTransitions()` (`@lifekit-hq/core`) crossfades only when the matched route changes: a navigation that changes only params, query params or the fragment (a filter chip, a search, a URL-synced store's `replaceUrl` write) skips the transition, so the page never fades as a frozen snapshot that swallows taps. It also skips under `prefers-reduced-motion`. The crossfade is opacity only, timed by `--cmn-duration-medium` and `--cmn-ease-standard` (`::view-transition-old/new(root)` in `theme.css`). Where a page shares an element with the next (a row and its detail header), name it with `view-transition-name` on both sides, never on a repeated element. Browsers without View Transitions (older Safari) navigate without one, so nothing may depend on it.

### Blur

The D16 decision: the tab bar and the top bar blur what scrolls under them (`backdrop-blur-md`), and this document used to say "no backdrop blur". The code stays and the rule changes. The fixed bars sit over scrolling content on every page, an opaque bar would hide that the page continues under the thumb, and the translucent tab bar is how iOS draws its own, which is what the installed app is meant to feel like. Blur is confined to those two surfaces so it stays cheap to paint: no blur on cards, sheets or lists, and no stacking of blurred layers. The bars should drop to an opaque `surface-card` under `prefers-reduced-transparency: reduce`; they do not yet, so add it with the next change to either bar.

## Components

- **Buttons:** accent fill with `text-inverse` label; secondary bordered; destructive uses the error colour; ghost text-only. Focus is a 2px ring in `border-focus`.
- **Chips:** pill, `surface-raised` fill; selected fills with the accent.
- **Cards:** hairline border, `surface-card`, 12/16/24px padding. Never nested.
- **Inputs:** `border-strong` border (3:1), accent focus ring, red border plus helper text for errors. Errors show when the form is submitted and clear as soon as the field is fixed (GOV.UK); the text says what went wrong and how to fix it, with no "please", "sorry", "valid" or "invalid".
- **Data table / list rows:** sentence-case headers, hairline dividers, right-aligned tabular numbers. A row's action is a quiet trailing icon (`cmn-list-item-row` `trailingIcon`), not a bordered text button repeated on three or more rows.
- **List sections:** the heading is body size, semibold, in the secondary text colour, sentence case, with the group gap under it.
- **Stat card:** the value is the content. Value in the text face with tabular figures; no uppercase label, no decorative accent.
- **Navigation:** sidebar rows with accent-subtle active fill; bottom tab bar on phones.

## Do's and Don'ts

### Do:

- **Do** use only `--color-*`, `--font-*`, `--radius-*`, `--shadow-*` and `cmn-*` tokens.
- **Do** check every story in light and dark.

### Don't:

- **Don't** change the root font size in a consumer.
- **Don't** put white text on status or dark-accent fills.
- **Don't** use a border and a shadow on the same container (menu, tooltip, dialog and command palette excepted), or nest cards.
- **Don't** use monospace outside code, or uppercase tracked labels.
