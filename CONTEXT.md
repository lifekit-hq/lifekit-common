# lifekit-common

The shared lifekit design system and component library: design tokens, framework-free Lit elements, Angular components and signal-store helpers that every lifekit frontend consumes. The glossary covers the library's own vocabulary (packages, component families, page templates, preference tiers, checks), not any consuming app's domain.

## Language

**Consumer**:
A lifekit frontend app that installs the `@lifekit-hq/*` packages (finance-sentry, lifekit-dashboard, devclaw, backstage, basket). Each owns its own app name, routes and server config.

**Tokens**:
The `@lifekit-hq/tokens` package: the canonical `theme.css` custom properties (light/dark), Tailwind preset, fonts, brand mark and browser-chrome tooling. Framework-agnostic and the theming contract for every consumer.

**cmn component**:
An Angular component in `@lifekit-hq/ui` with the `cmn-` selector prefix (`cmn-page`, `cmn-app-layout`). Behavioural and templated components stay Angular.

**lk element**:
A framework-free Lit custom element with the `lk-` prefix in `@lifekit-hq/elements` (`lk-line-chart`, `lk-offline-banner`). New simple leaf components are born here.

**Simple leaf**:
A presentational-only component (inputs and slots, token CSS, no forms, overlay, focus management, service or router use). Contrasted with an `interactive` component in the strategy audit.
_Avoid_: dumb component

**charts-core**:
The `@lifekit-hq/charts-core` package of framework-free Chart.js config builders that the Angular and Lit chart components wrap.

**Storybook-first**:
The rule that components are developed and reviewed in Storybook, not in a consuming app. Every component ships a `*.stories.ts` and a `*.spec.ts`; the hosted catalog is what other projects design against.

**App shell**:
The frame around every app's pages: `cmn-app-layout`, the top bar, the tab bar, the sidebar and sheets. The shell owns the scroller, navigation memory and pull to refresh.

**Phone contract**:
`docs/PHONE-CONTRACT.md`: what the app shell guarantees on a phone and what a page must declare (title, parent, actions, sheet vs page, state pattern). Checked by the phone conformance suite.

**Tab root**:
A page that is a top-level destination of the shell (a tab or the More page). It shows no back chevron, remembers its scroll and is the only place pull to refresh applies.

**More tab**:
The last tab of the phone tab bar, set with `moreRoute`. It opens an ordinary page the app builds, usually `cmn-more-page`, never a sheet.

**Page kind**:
One of `list`, `detail`, `form`, `settings`, `overview` or `chat` (`PageKind`), chosen with `cmn-page`'s `kind`. Each kind fixes a reading width and the columns content may start on (`PAGE_TEMPLATES`).
_Avoid_: page type, page archetype

**Rail**:
The optional second column of the `overview` page kind, 320px beside the main column from 1280px and under it below that.

**Golden screens**:
The reference Storybook compositions for each page kind (`Templates/List`, `Detail`, `Form`, `Settings`, `Overview`, `Chat`) that the phone and screen checks run against.

**State pattern**:
The shared way a page shows loading, empty, error and offline, implemented by `cmn-async-state` with calm-loading timings and a "Last synced" notice.

**Pull to refresh**:
The shell's gesture that reloads a tab root when pulled down from the top. The gesture is the shell's; the reload is a hook the page's store provides (`[reload]` or `registerPullRefresh()`).

**Preference tier**:
One of three places an option can live: Device, Account or Workspace. Each option belongs to exactly one tier, which fixes where it is stored and how it saves.

**Device preference**:
A preference true of this browser, kept in `localStorage` through `devicePreference` (keys `cmn-*` or `lk.<app>.*`).

**Account preference**:
A per-user preference stored on the app's own server behind `GET`/`PATCH /api/me/preferences`, through `accountPreferencesStore`. It does not cross apps.

**Workspace**:
Admin-only configuration that affects everyone in an app or instance (backstage Agency, devclaw Dispatch, finance-sentry People), saved per section.

**Seed**:
The accent colour (`#rrggbb`) an app derives its palette from; each app has its own default in `APP_SEEDS`, stored alongside an intensity (0-1), never the derived CSS.

**Instrument**:
The library's creative north star and visual direction: IBM Plex Sans, a petrol accent and cool graphite, on IBM Carbon's geometry, type scale and motion (`DESIGN.md`).

**Guardrails**:
`docs/design/guardrails.md`: the numbered UI/UX rules, each adopting a published source and naming the check that enforces it.

**Drift check**:
`npm run check:drift`, the static scan for font, colour, size, radius and transition literals outside the tokens; CI fails on any finding.

**Screen check**:
The composition check (rules C0 to C10) run on an app's real routes at phone and desktop size, via `@lifekit-hq/tokens/screen` or `lifekit-chrome-check screen`.

## Relationships

- A **Consumer** installs the packages and builds its screens only from **Tokens**, **cmn components** and **lk elements**.
- **cmn components** and **lk elements** both take their theming from **Tokens**; **charts-core** feeds the chart components of both.
- A new **Simple leaf** must be an **lk element**; behavioural components stay **cmn components**.
- Every routed page is built on one **Page kind**, and only the `overview` kind has a **Rail**.
- Each **Page kind** has **Golden screens** that the **Phone contract** and **Screen check** run against.
- A **Tab root** is a destination of the **App shell**; only a **Tab root** gets **Pull to refresh**, and a failed reload is shown by the **State pattern**.
- Each option belongs to exactly one **Preference tier**: **Device preference**, **Account preference** or **Workspace** (docs/APP-SHELL-STANDARD.md names the tiers Account and Workspace).
- The **Guardrails** name the **Drift check** and **Screen check** that hold each rule.

## Flagged ambiguities

- Page "kind" vs component "Complexity" class: `docs/STRATEGY.md` classes components as `simple-leaf` or `interactive`, while `projects/ui/src/lib/components/page/page.component.ts:30` uses `kind` for the six page templates, and `empty-state` has its own `EmptyStateKind` (`first-use | no-results | error`). Three unrelated meanings of "kind".
- "Consumer" counts differ: `docs/CONSUMER-GAP-AUDIT.md` lists three consumers while `AGENTS.md` lists five (noted as stale in AGENTS.md "Key conventions").
