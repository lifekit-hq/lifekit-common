# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the lifekit product apps and the agents that build them.** This repo is a design system, not an end-user product. The people who touch it are the sole developer (Denys) and the coding agents working on finance-sentry, lifekit-dashboard, xui and devclaw. Their job is to put a correct, on-brand screen together quickly from shared parts, without re-deciding colour, type or spacing. [inferred: CLAUDE.md, docs/CONSUMER-GAP-AUDIT.md]
- **End users reached through the apps:** one household. The owner plus invited family members use finance-sentry daily on desktop and phone, in light and dark, to check balances, transactions, budgets, subscriptions and net worth across EU banks (TrueLayer, Monobank) and investment venues (Binance, IBKR). [inferred: finance-sentry `settings/people` route, owner/invite permissions, vault projects/finance-sentry/plan.md]

## Product Purpose

One shared design language and component set for every lifekit frontend, so the apps read as one family and a fix lands once. It works when a consumer ships a screen using only tokens and library components, and the browser-chrome drift check passes. [inferred: CLAUDE.md, docs/BROWSER-CHROME.md]

## Positioning

The source of truth for lifekit's look: `@lifekit-hq/tokens` is the theming contract for Angular and React consumers alike, and framework-free Lit elements (`lk-*`) are the long-term substrate. It is not a general-purpose UI kit and does not chase external adoption. [inferred: docs/STRATEGY.md "What is already settled"]

## Operating Context

- Storybook-first: components are built and reviewed in Storybook. The hosted catalog (https://lifekit-hq.github.io/lifekit-common/) is what other lifekit projects design against.
- Six packages release in lockstep every week through release-please. Consumers bump versions on their own schedule, and finance-sentry lags (^0.6.1 against library 0.8.0 on 2026-10-05).
- Mandatory gates on every change: ESLint, Vitest in headless Chromium, and a Storybook build. Every component ships with a spec and a story.
[inferred: CLAUDE.md, README.md]

## Capabilities and Constraints

- Packages: tokens (CSS custom properties, light and dark, a Tailwind preset, self-hosted font, brand mark and the browser-chrome standard), charts-core (Chart.js configuration), elements (Lit `lk-*`), ui (Angular `cmn-*`), core (signal-store helpers), config (lint and format presets).
- `projects/tokens/theme.css` stays framework-agnostic: pure custom properties and keyframes.
- Two of the three consumers are React, so anything that has to cross frameworks lives in tokens or elements.
- Brand assets (icons, theme colour, manifest) are generated from the tokens and verified by `lifekit-chrome-check`.
- Open: how far the strangler conversion of Angular components to Lit elements goes. Each component's row is decided in docs/STRATEGY.md.
[inferred: CLAUDE.md, docs/STRATEGY.md, projects/tokens/brand/]

## Brand Commitments

- The name "lifekit". App names are "Finance Sentry" and "lifekit dashboard". The brand mark is a two-letter monogram on a rounded tile whose colours are read from the tokens. Page titles take the form `{Page} · {App}`. [inferred: docs/BROWSER-CHROME.md]
- Binding owner direction (2026-10-05): the current typeface choice is explicitly rejected as the problem ("we have inter now - this is the problem"). The system must get a better, more distinctive design language. [owner words, relayed by firstmate brief]

## Evidence on Hand

- The Storybook catalog has 278 stories on 2026-10-05 (`docs/design-baseline.json` records the count at each baseline).
- finance-sentry's frontend is the only consumer with real usage data. Its e2e fixtures provide demo data, so screenshots never need real financial data.
- None of the following exists: user research, analytics, or testimonials. Do not fabricate them.

## Product Principles

1. Fix it once in the library. A consumer-local style override is a bug report against the library. [inferred: CLAUDE.md "UI components MUST be built in the lib first"]
2. Tokens are the contract. Brand assets, charts and both frameworks read colour and type from the same tokens. [inferred: brand/tokens.mjs reads theme.css]
3. Money must be read correctly at a glance. Density serves daily checking, and decoration never competes with numbers. [inferred: finance-sentry domain]
4. Prove it in Storybook. A change that cannot be shown in a story does not land. [CLAUDE.md]

## Accessibility & Inclusion

Target WCAG 2.2 AA in light and dark for every component story. No product-specific requirement beyond that has been established. [inferred: no explicit standard found in the repo]
