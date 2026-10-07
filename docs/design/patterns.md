# Design patterns

How lifekit apps use the design system: which token or component a situation calls for, where the
line sits, and which reference app each pattern is judged against. Each section covers one
pattern. The tokens themselves live in `@lifekit-hq/tokens` (`projects/tokens/theme.css`); the
components in Storybook.

This page is the single compare-against list. The captain's rule (2026-10-07): keep the reference
resources and compare with them as we go. So every pattern section names its reference with a
**Compare against** link, the lifekit-common piece that owns it (or "gap"), and its consumer.
A review of a screen or component built from a pattern checks back against that source, not
against memory of it.

## Reference registry

The app list is pinned to the registry below (1-12 plus 9a). Binance, OKX and Bitget were skipped
on 2026-10-07. Copilot Money is not in the registry. It is the clearest public example of upcoming
recurring charges (dashboard "Upcoming" recurrings, [Copilot Money, Dashboard
tab](https://intercom.help/copilotmoney/en/articles/6045480-dashboard-tab)), but finance-sentry's
subscriptions page already covers that, so it stays an outside example rather than a registry
entry. Capitellas and Dapper Dividends are cited for the digest format only.

| #   | Reference                       | Best single borrow                                                                                                            | Not borrowed                                                          |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Taras Guk                       | Per-share layout: verdict header, one-line thesis, perf strip, benchmarked chart with period tabs, 2-column fundamentals      | His opaque badge                                                      |
| 2   | Simply Wall St                  | A plain-English "what this means" line per section                                                                            | The Snowflake radar, the "6/6 passed" checklist                       |
| 3   | Finviz                          | Treemap heatmap of the book (reference only for now)                                                                          | Coverage-maximalism                                                   |
| 4   | Yahoo Finance                   | Per-ticker IA as a completeness checklist: header, chart, key stats, news, compare mode                                       | Ad density                                                            |
| 5   | Revolut                         | One clear number per screen; predicted month-end spend                                                                        | Shallow-by-design                                                     |
| 6   | Seeking Alpha                   | Factor grades kept separate, never averaged; a Bull/Bear two-column layout                                                    | The Quant Rating composite, the paywall                               |
| 7   | Webull                          | Chart UX: timeframe switch, benchmark overlay, opt-in technicals                                                              | Fifteen-indicator overload                                            |
| 8   | Robinhood                       | Positions row (day change plus sparkline); stock-page order (chart, position, stats); scrub-to-read; "why it's moving" digest | Gamified nudges, the whole-UI red/green repaint                       |
| 9   | Interactive Brokers             | Notifications scoped to held positions; statements as period reports; the period picker                                       | Mail-blast cadence, legalese                                          |
| 9a  | Trading Central ETF Trade Ideas | Idea-card shape: instrument, call, what would change it, horizon                                                              | Pattern signals as an input, sponsored placement                      |
| 10  | StockAnalysis.com               | Fair value with visible assumptions and a sensitivity table; compare table; terse daily bullets                               | Coverage-maximalism                                                   |
| 11  | Zacks                           | Per-style letter grades; earnings-surprise history                                                                            | The composite Rank                                                    |
| 12  | monobank                        | Fast transaction-list filters (period, category, search)                                                                      | Bank-only surfaces, gamification, statement export (product boundary) |

Taras Guk's screens are paywalled (Telegram @tarasguk, tarasguk.com), so the registry entry is the
primary record for #1.

Two registry borrows lose to the product boundary (a finance-sentry app is not a trading venue, and
where the source already does the job well it links to it): monobank statement export, and
Robinhood-style percent-move price alerts, which IBKR and Binance already send.

## Picks and named gaps

The captain's picks (2026-10-07, reference round 1) and what each means for this library.

| #   | Pick          | Pattern it chose                                                                                                            | Owner in lifekit-common                                  | Consumer                               |
| --- | ------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| 1   | 1-charts-a    | [Chart period and scrub](#chart-period-and-scrub): one-row period control, scrub-to-read, delta-only colour                 | `cmn-segmented` (gap), charts-core scrub (gap)           | dashboard, events, dossier             |
| 2   | 2-dashboard-a | [Hero card](#hero-card): number and delta, then chart, then the period control under it                                     | `cmn-card`, `cmn-stat-card`, chart pieces (gap)          | finance-sentry dashboard               |
| 3   | 3-holdings-a  | [Positions row](#positions-row): day change per row, 1M sparkline later                                                     | sparkline mode (gap)                                     | finance-sentry holdings                |
| 4   | 4-dossier-a   | [Entity page order](#entity-page-order): Robinhood/Taras order                                                              | `cmn-card`, `cmn-key-value-grid` (gap), stat strip (gap) | finance-sentry asset dossier (#824)    |
| 5   | 5-verdict-a   | [Verdict idea card](#verdict-idea-card): STRONG BUY / BUY / WAIT / AVOID word, four raw axis facts, what would change it    | verdict badge and axis strip (gap)                       | dossier header, ranked universe (#726) |
| 6   | 6-notify-a    | [Scoped notifications](#scoped-notifications): held names on by default, watchlist opt-in, consensus and timing on earnings | `cmn-alert-item`, `cmn-chip`                             | finance-sentry alerts (#466)           |
| 7   | 7-nav-a       | [Search lands on the entity](#search-lands-on-the-entity): held names, watchlist and accounts as palette items              | `cmn-command-palette`                                    | finance-sentry shell                   |
| 8   | 8-tx-b        | [Transaction period chips](#transaction-period-chips): monobank-style period chip row beside the restored filters           | `cmn-chip`, `cmn-segmented` (gap)                        | finance-sentry transactions            |
| 9   | 9-digest-a    | [Terse digest](#terse-digest): bullets, one headline number each, every bullet linked to its entity                         | none, a content rule                                     | finance-sentry Ledger digests          |
| 10  | 10-playbook-a | This page                                                                                                                   | `docs/design/patterns.md`                                | all lifekit apps                       |

Pick 8 went against the scout's recommendation (keep the restored bar as is). It is the captain's
explicit word on a filter he uses, so the standing rule (no redesign of a filter or selection
control he uses without his word) is met for this change only. The rest of the restored bar stays.

### Gap table

What the library does not have yet, named so a PR can say which row it closes.

| Missing piece                                               | Pattern source                    | First consumer                                     | When                               |
| ----------------------------------------------------------- | --------------------------------- | -------------------------------------------------- | ---------------------------------- |
| `cmn-segmented` (radiogroup, one row, 44px cells or wider)  | Robinhood / IBKR span selector    | dashboard range, events 7/30/90, dossier chart     | with the first picked chart change |
| charts-core crosshair / scrub plus hover and select outputs | Robinhood scrub                   | dashboard hero, dossier chart; pairs with #466 L-1 | same                               |
| charts-core multi-series line (benchmark overlay)           | Webull, Taras                     | dossier chart (C2a)                                | November                           |
| sparkline mode (`lk-line-chart` minimal or `cmn-sparkline`) | Robinhood positions row           | holdings rows                                      | November                           |
| verdict badge plus axis strip                               | Trading Central card, #726 FR-009 | dossier header, ranked universe                    | November (#726)                    |
| key/value definition grid                                   | Yahoo Statistics, Taras           | dossier key stats                                  | with #824                          |
| compact stat strip                                          | Taras perf strip                  | dossier                                            | with #824                          |
| bull/bear split list                                        | Seeking Alpha                     | dossier thesis                                     | later (C5a)                        |
| treemap                                                     | Finviz                            | book heatmap                                       | not now (C4a)                      |

Already covered by existing components (no new work): `cmn-chip`, `cmn-command-palette`,
`cmn-alert-item`, `cmn-card`, `cmn-stat-card`, `cmn-tag`, `cmn-disclosure-row`, `cmn-date-range`,
`cmn-month-stepper`, `cmn-donut-chart`, `cmn-area-chart`.

Each pattern section below has the same shape: what it is, **Compare against**, **Owner**,
**Consumer**, and what is explicitly not copied.

## Chart period and scrub

The span selector sits directly under the chart, as one row, and holding a finger on the chart
reads a past point.

- **What it is:** a one-row segmented control (1W / MTD / 1M / 3M / YTD / 1Y / ALL) with radiogroup
  semantics and arrow-key roving, plus a crosshair that updates the card's headline number and
  delta while held and snaps back on release. A period is a parameter, not a panel, so it is not
  `cmn-tab-group` (an underline tablist that swaps panels).
- **Fit:** seven segments fit at 390px (326px inside gutter and card padding is about 46px per
  segment, above the 44px target in [PHONE-CONTRACT.md](PHONE-CONTRACT.md)).
- **Colour:** the delta text is coloured, not the whole chart. See
  [Delta-only colour](#delta-only-colour).
- **Compare against:** [Robinhood, Using
  charts](https://robinhood.com/us/en/support/articles/using-charts/) and [Viewing stock
  details](https://robinhood.com/us/en/support/articles/viewing-stock-detail-pages/) (scrub);
  [IBKR Campus, Customizing Charts
  (iPhone)](https://www.interactivebrokers.com/campus/trading-lessons/customizing-charts-iphone/)
  (menu along the bottom of the chart).
- **Owner:** `cmn-segmented` (gap), charts-core crosshair / scrub plugin and hover/select outputs (gap).
- **Consumer:** finance-sentry dashboard range, events 7/30/90 chips, dossier chart. Pairs with
  finance-sentry #466 L-1 (chart click outputs), which touches the same plugin layer.
- **Not copied:** Robinhood's whole-screen red/green repaint. A 0.02% dip gets the same red as a
  20% loss, and the red screen is tied to panic selling ([Pratt IxD
  critique](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/)), a trading nudge
  the registry rejects for a hold-and-reason tool.

## Hero card

One card holds the figure: number and delta, then the chart, then the period control under it.

- **What it is:** the Robinhood / IBKR portfolio hero with Revolut's one number per screen. The
  period control still drives the tiles and category widgets below, so it stays a page-level
  control. Scrub updates the number.
- **Compare against:** [Robinhood, Using
  charts](https://robinhood.com/us/en/support/articles/using-charts/); [Revolut, spending and
  income
  analytics](https://help.revolut.com/en-US/help/accounts/budget-and-analytics/how-can-i-see-my-spending-and-income-analytics/).
- **Owner:** `cmn-card`, `cmn-stat-card`, `cmn-area-chart`, plus the chart pieces from
  [Chart period and scrub](#chart-period-and-scrub) (gap).
- **Consumer:** finance-sentry dashboard. Lands after the chart pieces.
- **Not copied:** a separate chart block below the hero.

## Positions row

A holdings row carries logo, symbol, shares, day change and a sparkline.

- **What it is:** the Robinhood positions row. Day change per row comes first (the quote already
  has `ChangePct`); the 1M sparkline follows when a daily-bars read exists.
- **Compare against:** [Robinhood, Viewing stock
  details](https://robinhood.com/us/en/support/articles/viewing-stock-detail-pages/).
- **Owner:** `cmn-tag` and row primitives today; sparkline mode (gap).
- **Consumer:** finance-sentry holdings.
- **Not copied:** gamified nudges.

## Entity page order

A holding's page runs: header with price, day % and verdict; perf strip; chart; your position;
why it moved; thesis; key stats; analysts and earnings; events; news.

- **What it is:** the Robinhood / Taras order, with Yahoo's key-stats grid as the completeness
  checklist, StockAnalysis's fair value with its assumptions visible (never a bare number), and
  Zacks's earnings-surprise history once a provider supplies it. Where the page explains a
  figure, it does so in a plain-English line (Simply Wall St).
- **Compare against:** [Robinhood, Viewing stock
  details](https://robinhood.com/us/en/support/articles/viewing-stock-detail-pages/) and [Cortex
  Digests](https://robinhood.com/us/en/support/articles/cortex-digests/); [StockAnalysis, DCF
  calculator tutorial](https://stockanalysis.com/tools/dcf-calculator/tutorial/); [Zacks, Price,
  Consensus and EPS Surprise
  chart](https://www.zacks.com/stock/chart/E/price-consensus-eps-surprise-chart); [Simply Wall
  St, how the Snowflake
  works](https://support.simplywall.st/hc/en-us/articles/360001740916) (the plain-English line
  only); Yahoo Finance ([2023
  redesign](https://www.businesswire.com/news/home/20231107696257/en/Yahoo-Finance-Debuts-New-Design-and-Features-to-Empower-Everyday-Investors));
  Taras Guk (registry #1).
- **Owner:** `cmn-card`, `cmn-stat-card`, `cmn-tag`, `cmn-disclosure-row`; `cmn-key-value-grid`
  (gap), compact stat strip (gap), bull/bear split list (gap, later).
- **Consumer:** finance-sentry asset dossier (#824).
- **Not copied:** the Snowflake radar, Yahoo's ad density, coverage-maximalism.

## Verdict idea card

One instrument, one call, what would change it, a horizon.

- **What it is:** Trading Central's idea card, combined with per-axis transparency:
  1. **Call:** the verdict word (STRONG BUY / BUY / WAIT / AVOID; NOT SCORED in neutral grey).
  2. **Facts:** the four raw axis facts beside it (structure, fundamentals, crowding, valuation),
     each expandable to its evidence.
  3. **What would change it:** generated from the ordered rule list, the unmet conditions of the
     next rule up and the nearest AVOID trigger.
  4. **Horizon:** the thesis horizon when a thesis exists, otherwise omitted, never invented.
  5. **Why this word:** the fired rule, its facts and the rules version.
- **Compare against:** [Trading Central ETF Trade
  Ideas](https://newsletters.tradingcentral.com/direxion/etf_en.html) and [trading
  horizons](https://investor.tradingcentral.com/technical-insight); [Seeking Alpha, Quant Ratings
  and Factor Grades
  FAQ](https://help.seekingalpha.com/premium/quant-ratings-and-factor-grades-faq) (axes kept
  separate, and the warning about a weighted composite).
- **Owner:** verdict badge variant set with a NOT SCORED neutral (gap), axis strip of chips plus
  `cmn-disclosure-row` (gap). The card composes from `cmn-card`.
- **Consumer:** finance-sentry dossier header and ranked universe (#726).
- **Not copied:** pattern signals as an input, sponsored placement, any composite or weighted
  score, A-F letter grades and radar visuals (out of scope in the #726 spec).

## Scoped notifications

An alert is about something you hold, says why it matters, and opens its entity.

- **What it is:** IBKR's scoping and content. Earnings alerts carry consensus EPS and
  before-open/after-close timing; one deduplicated rating-change alert per held name per day links
  to the dossier's analyst card. Held names are on by default, the watchlist is opt-in (Robinhood
  does the same). Push text stays amount-free ([PHONE-CONTRACT.md](PHONE-CONTRACT.md)).
- **Compare against:** [IBKR, For You
  notifications](https://www.interactivebrokers.com/en/trading/for-you-notifications.php) and
  [FYI notifications](https://www.ibkrguides.com/traderworkstation/fyi-notifications.htm);
  [Robinhood, Price
  alerts](https://robinhood.com/us/en/support/articles/price-alerts/) (watchlist off by default)
  and [Smart Notifications](https://robinhood.com/us/en/newsroom/smart-notifications/).
- **Owner:** `cmn-alert-item`, `cmn-chip`. Nothing missing.
- **Consumer:** finance-sentry alerts, on top of #466 (every notification links to its entity).
- **Not copied:** mail-blast cadence, legalese, percent-move price alerts (IBKR and Binance
  already alert on price).

## Search lands on the entity

Typing a ticker, an account or a budget opens its page.

- **What it is:** held names, watchlist names and accounts passed to the command palette as items
  at open time, each landing on its entity page. The palette filters client-side by label and
  group. No new screen; names you do not hold are out (curated universe).
- **Compare against:** [Robinhood, A New Way to Navigate
  Robinhood](https://robinhood.com/us/en/newsroom/a-new-way-to-navigate-robinhood/); Yahoo
  Finance ([2023
  redesign](https://www.businesswire.com/news/home/20231107696257/en/Yahoo-Finance-Debuts-New-Design-and-Features-to-Empower-Everyday-Investors)).
- **Owner:** `cmn-command-palette`. A per-item subtitle or avatar slot (ticker plus broker) is an
  optional later addition.
- **Consumer:** finance-sentry shell (`PALETTE_ITEMS`). No lifekit-common change needed now.
- **Not copied:** async server search for names you do not hold.

## Transaction period chips

A fast period chip row (This month / Last month / 3M) beside the transaction filters.

- **What it is:** the monobank list filters (period, category, search), met by the restored
  filter bar, with a period chip row added by the captain's pick (8-tx-b), reusing the dashboard
  presets. `cmn-segmented` is the candidate control once it exists.
- **Compare against:** monobank statement and transaction filters ([monobank knowledge
  base](https://monobank.ua/en/knowledge-base/acquiring/online/website/platforms/statement)).
- **Owner:** `cmn-chip`, `cmn-date-range`; `cmn-segmented` (gap).
- **Consumer:** finance-sentry transactions.
- **Not copied:** statement export (monobank already exports statements), bank-only surfaces,
  gamification.

## Terse digest

A digest is short bullets, one headline number each, every bullet linked to its entity.

- **What it is:** StockAnalysis "Market Bullets" and the Capitellas / Dapper Dividends format:
  short sections, link-outs, no prose essay. A content rule, not a component.
- **Compare against:** StockAnalysis.com (registry #10); Robinhood [Cortex
  Digests](https://robinhood.com/us/en/support/articles/cortex-digests/) for the "why it moved"
  shape.
- **Owner:** none (a writing rule for the consumer's brief generators).
- **Consumer:** finance-sentry Ledger digests (PerformanceBrief, FireBrief).
- **Not copied:** coverage-maximalism.

## Period reports

A period report is a month stepper, a few headline tiles and a table, not a new screen.

- **What it is:** IBKR statements as period reports and the period picker, with Revolut's
  predicted month-end spend on budgets.
- **Compare against:** [IBKR, FYI
  notifications](https://www.ibkrguides.com/traderworkstation/fyi-notifications.htm); [Revolut,
  spending and income
  analytics](https://help.revolut.com/en-US/help/accounts/budget-and-analytics/how-can-i-see-my-spending-and-income-analytics/).
- **Owner:** `cmn-month-stepper`, `cmn-date-range`, `cmn-stat-card`. Nothing missing.
- **Consumer:** finance-sentry flow breakdown and budgets (no change planned).

## Book heatmap

- **What it is:** Finviz's treemap of the book. Reference only until November.
- **Compare against:** [Finviz heatmap
  explainer](https://fffinstill.com/learning/concepts/s-p-500-heatmap).
- **Owner:** treemap (gap, not now).
- **Consumer:** none yet.
- **Not copied:** coverage-maximalism.

## Colour

Each app has one colour, its **seed**. The `@lifekit-hq/tokens` engine derives the whole
`--color-*` palette from it: surfaces, text, accent, borders, status and chart series, for light
and dark and for `prefers-contrast: more`. Components only ever read the role tokens below, so
a different seed reshapes an app without touching a component.

**Compare against:** none; this is lifekit's own system, with Robinhood's red/green repaint as the
counter-example (see [Chart period and scrub](#chart-period-and-scrub)). **Owner:**
`@lifekit-hq/tokens`. **Consumer:** every lifekit app.

### Roles

| Role         | Tokens                                                                                         | Rule                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces     | `surface-bg`, `surface-card`, `surface-raised`, `surface-hover`                                | Grouped: cards sit on the page ground. In dark, a raised surface is lighter. Tinted by the seed only as far as the intensity says. |
| Text         | `text-primary`, `text-secondary`, `text-disabled`, `text-placeholder`                          | Primary is 7:1 on every surface, the rest 4.5:1 (10:1 and 7:1 with more contrast).                                                 |
| Text on fill | `text-inverse`                                                                                 | The label on an accent fill (primary button), 4.5:1.                                                                               |
| Accent       | `accent-default`, `accent-hover`, `accent-active`, `accent-subtle`, `accent-100`…`accent-1000` | The seed. Accent text is 4.5:1 on the surfaces and on `accent-subtle`.                                                             |
| Borders      | `border-default`, `border-strong`, `border-focus`                                              | `border-default` is a decorative hairline. A boundary that must be seen (an input) uses `border-strong`, 3:1. Focus is 3:1.        |
| Status       | `status-{info,success,warning,error}`, `status-…-subtle`                                       | Fixed hues whatever the seed, so red always means a problem. Status text is 4.5:1 on the surfaces and on its own `-subtle` tint.   |
| Delta        | `delta-up`, `delta-down`                                                                       | A value's change. Aliases of success and error.                                                                                    |
| Chart        | `chart-series-1`…`chart-series-8`, `chart-series-9`, `chart-grid`                              | Series 1 is the accent, 2-8 are categories, 9 is the neutral (an "other" or a baseline). Every mark is 3:1 on the card and page.   |

### Where the accent may appear

The seed marks where you act or where you are, and nowhere else:

- the app's brand tile;
- the selected navigation item (`accent-subtle` behind `text-primary`);
- the primary button, at most one per view;
- links;
- the focus ring;
- chart series 1.

Not on headings, body text, decorative icons, card or page backgrounds, borders, secondary
buttons or status. If a second thing on the screen wants the accent, it is a secondary action.
With a higher intensity the surfaces carry the seed's hue too, but that is the engine's job: a
component never paints a surface with an accent token to get the same effect.

### Delta-only colour

Green and red mean "went up" and "went down" (`delta-up`, `delta-down`), and the matching status.
They are never a category:

- A chart's categories use the series tokens. The engine walks series 2-8 around the colour wheel
  from the seed and skips the red and green arcs, so a category never reads as a gain or a loss.
  `@lifekit-hq/charts-core` defaults to that order (`CATEGORICAL_STEPS`).
- A chart that shows one gain or loss, such as a sparkline coloured by its trend, uses the delta
  tokens.
- Colour is never the only signal: a change also carries its sign or an arrow.

### Seeds and intensity

| App            | Seed             | Default intensity |
| -------------- | ---------------- | ----------------- |
| finance-sentry | Petrol `#175a6d` | Quiet (0.12)      |
| lifekit        | Indigo `#4f46e5` | Quiet (0.12)      |
| devclaw        | Plum `#8e3b8a`   | Quiet (0.12)      |

Intensity is how far the seed tints the surfaces: Quiet 0.12 (the default: near-neutral
surfaces, colour only where you act), Tinted 0.45, Immersive 0.85.

- `theme.css` ships finance-sentry's palette as the default. Each app imports its own generated
  stylesheet after it: `@import '@lifekit-hq/tokens/seeds/<app>.css';` (`fs`, `lk`, `dc`). With
  no seed stylesheet an app renders as finance-sentry does.
- A user can pick another colour and intensity on their device, in Settings > Appearance with
  `<lk-theme-picker>`. In an Angular app the picker's `lk-theme-picker-change` goes to
  `ThemeService.setSeed()` (or `resetSeed()` for the app's own colour). The service sets the
  derived palette inline on `<html>` and caches it under `cmn-theme-seed`, which the pre-paint
  script applies before first paint. That script's CSP hash changed with seed support; see
  [`BROWSER-CHROME.md`](../BROWSER-CHROME.md).
- Any seed is safe. The engine solves each role's lightness to its WCAG floor rather than
  trusting the colour, and `npm run test:tokens` checks every pair over a sweep of seeds
  (`SEED_AA_FULL=1` runs the full design-time sweep). A seed close to a status hue still works,
  but the picker says the accent may be read as that status.
- The installed app icon and the manifest `theme_color` stay the app's own. A user's colour never
  changes the app's identity at OS level.
- Never write a hex in a component. Read the role token; a seed reaches every token, not a
  literal.
