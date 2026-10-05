---
name: lifekit
description: Shared design system for lifekit frontends (tokens, Angular cmn-*, Lit lk-*), token values as implemented at 0.8.0; target direction A - Instrument
colors:
  accent: "#4f46e5"
  accent-hover: "#4338ca"
  accent-active: "#3730a3"
  accent-subtle: "#ede9fe"
  surface-bg: "#f7f8fa"
  surface-card: "#ffffff"
  surface-raised: "#eef0f4"
  text-primary: "#101828"
  text-secondary: "#556070"
  text-disabled: "#98a2b3"
  text-inverse: "#ffffff"
  border-default: "#e4e7ec"
  border-strong: "#98a2b3"
  status-info: "#6366f1"
  status-success: "#10b981"
  status-warning: "#f59e0b"
  status-error: "#ef4444"
  dark-surface-bg: "#0e1120"
  dark-surface-card: "#1a1f35"
  dark-surface-raised: "#1e2438"
  dark-text-primary: "#e2e3e4"
  dark-text-secondary: "#c5c5d3"
  dark-text-disabled: "#6b6b7d"
  dark-accent: "#818cf8"
  dark-border-default: "#2e3452"
typography:
  display:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter Variable', Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0.025em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, 'Fira Code', monospace"
    fontSize: "0.875rem"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-inverse}"
---

# Design System: lifekit

## Overview

**Creative North Star: "The Instrument"**

lifekit's interface is a precision instrument for reading money: flat, quiet surfaces, one engineered sans family, a single petrol accent, and figures that line up. Nothing decorates; every pixel serves reading a balance, a transaction or a status correctly at a glance. Density serves daily checking on desktop and phone, in light and dark.

**Status of this document.** The token front matter above records the values shipped in 0.8.0 (Inter, indigo accent, 8px radius). The direction chosen on 2026-10-05 is A - Instrument, and the rules below describe that target. The token values change in a later step (IBM Plex Sans, petrol accent), not in the PR that introduces this file. Until then, treat the front matter as "today" and this prose as "where we are going".

**Target characteristics:**
- One family: IBM Plex Sans (variable 100-700, self-hosted, Cyrillic) for every role; Plex Mono for code only. Money is set in the text face.
- Tabular figures everywhere, so amount columns align even where a component forgets `tabular-nums`.
- Petrol accent (`#175a6d`, dark `#5aa9bb`) on cool graphite; status colours at text grade: blue `#2557b0`, green `#0e7446`, amber `#955400`, red `#bb2530`. Info has its own hue and never reads as a second accent.
- Flat surfaces: a hairline border or a shadow, never both. Shadow is reserved for overlays (menu, dialog, sheet).
- Tight radii: 3 / 6 / 8px.

## Colors

Cool graphite neutrals with a single petrol voice (restrained: accent only for the primary action, selection, focus and state). Dark graphite is `#0c1113` with cards at `#141b1e`; petrol stays legible without glow.

### Named Rules
**The Token-Only Rule.** Components use only `--color-*` tokens; no colour literals in components.
**The Text-Grade Rule.** Body and placeholder text reach 4.5:1 in both themes. Text on accent or status fills uses `text-inverse`, never hard-coded white.
**The Placeholder Rule.** `text-disabled` is never placeholder or secondary text; a dedicated placeholder token carries at least 4.5:1.

## Typography

**Family:** IBM Plex Sans for display, headline, title, body and label. Hierarchy is carried by size and weight.

- **Display** (700, 2.25rem, 1.1): page titles in large layouts.
- **Headline** (600, 1.5rem, 1.25): stat values and section titles.
- **Title** (600, 1.125rem, 1.5): card titles.
- **Body** (400, 0.875rem, 1.5): default UI text.
- **Label** (600, 0.75rem, 1.25): sentence case, 12px minimum. No uppercase or tracked micro-labels.

### Named Rules
**The rem Contract Rule.** The scale is in rem and assumes a 16px root. A consumer that overrides the root font size silently rescales every token, so none may.
**The 12px Floor.** No text below 12px. No `text-[10px]` or `text-[11px]`; use the ramp.

## Layout

A 4px spacing base (`cmn-1` to `cmn-16`). App chrome comes from `cmn-app-layout`: a collapsible sidebar with a top bar on desktop, and a bottom tab bar with a "More" overflow on phones. Content sits in `cmn-page-container`. Data tables become list rows on phones. More space above a heading than below it.

## Elevation & Depth

Flat by default: hairline border on `surface-card`. Shadows are for overlays only (menu, popover, dialog, bottom sheet). Dialogs do not stack border, shadow and blur.

## Shapes

Radius 3 / 6 / 8px by role; full pills for chips, tags and badges. No off-scale literals.

## Motion

Animate transform and opacity only, never layout properties (no `transition` on width or height). Every animation has a `prefers-reduced-motion` path.

## Components

- **Buttons:** accent fill with `text-inverse` label; secondary bordered; destructive uses the error colour; ghost text-only. Focus is a 2px ring in `border-focus`.
- **Chips:** pill, `surface-raised` fill; selected fills with the accent.
- **Cards:** hairline border, `surface-card`, 12/16/24px padding. Never nested.
- **Inputs:** hairline border, accent focus ring, red border plus helper text for errors.
- **Data table / list rows:** sentence-case headers, hairline dividers, right-aligned tabular amounts.
- **Stat card:** the balance is the content. Value in the text face with tabular figures; no uppercase label, no decorative accent. The hero-metric layout is deliberately kept for this product.
- **Navigation:** sidebar rows with accent-subtle active fill; bottom tab bar on phones.

## Do's and Don'ts

### Do:
- **Do** use only `--color-*`, `--font-*`, `--radius-*`, `--shadow-*` and `cmn-*` tokens.
- **Do** check every story in light and dark.
- **Do** keep money in the text face with tabular figures.

### Don't:
- **Don't** change the root font size in a consumer.
- **Don't** put white text on status or dark-accent fills.
- **Don't** use a border and a shadow on the same container, or nest cards.
- **Don't** use monospace for money, or uppercase tracked labels.
