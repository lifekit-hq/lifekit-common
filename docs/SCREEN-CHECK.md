# The screen check

The screen-composition check measures the composed screen: the page between the shell's bars,
the unit the owner looks at. The drift check measures tokens in source, impeccable and axe measure
isolated stories, and phone conformance measures the shell's geometry; none of them sees how a
page is put together. This one runs on an app's real routes, at the phone and the desktop size,
once the data has settled.

It ships in `@lifekit-hq/tokens` as `@lifekit-hq/tokens/screen` (a Playwright helper) and as
`lifekit-chrome-check screen` (the same check against URLs). Its rules, C0 to C10, each enforce a
sentence in [DESIGN.md](../DESIGN.md) (Layout, "The screen check") or the HIG.

## Templates make it exact

A page built on `cmn-page` marks itself `data-cmn-page="<kind>"` and each of its content columns
`data-cmn-page-column`. The check reads those to know the columns content may start on, so "one
left edge" (C1) is measured against the template rather than guessed from the title, and a page
is held to the columns its kind intends. A column is `main` unless its `data-cmn-page-column` names
another; the overview's second column is its `rail`:

| Kind       | Columns               | Reading width                    | Golden screens       |
| ---------- | --------------------- | -------------------------------- | -------------------- |
| `list`     | main                  | 640px                            | `Templates/List`     |
| `detail`   | main                  | 720px                            | `Templates/Detail`   |
| `form`     | main                  | 640px                            | `Templates/Form`     |
| `settings` | main                  | 720px                            | `Templates/Settings` |
| `overview` | main, rail (optional) | 1200px; the rail 320px from 1280 | `Templates/Overview` |

A page with more columns than its kind has, without one its kind requires, or with a column its
kind does not name fails C1, as does a notice, the title or a top-level block that starts off a
declared column; a block in the rail is measured against the rail's edge, not the title's. The
overview's rail sits beside the main column from 1280px and under it on the same edge below that,
so a dashboard's rail is read as the deliberate second column it is, never as a block off the one
left edge. A kind the check does not know yet is still held to the columns its page declares, only
without a count. Stacked surfaces (C3) are measured within a column, so a rail's cards never stand
between two of the main column's. A route without a template fails C0 and is checked against its
title's left edge instead.

## Wiring it into an app's CI

The app serves its build to its Playwright e2e with fixture data (route mocks or a seeded
backend). Add one spec that visits every route at both sizes:

```ts
// e2e/screen.spec.ts
import {expect, test} from '@playwright/test';
import {checkScreen, formatScreen, SCREEN_VIEWPORTS} from '@lifekit-hq/tokens/screen';

import {mockApi} from './support/mock-api'; // the app's own fixture data

const ROUTES = ['/list', '/people', '/settings'];

for (const [size, viewport] of Object.entries(SCREEN_VIEWPORTS)) {
  test.describe(`screen ${size}`, () => {
    test.use(viewport);

    for (const route of ROUTES) {
      test(route, async ({page}) => {
        await mockApi(page);
        await page.goto(route);
        const result = await checkScreen(page);
        expect(result.findings, formatScreen(result)).toEqual([]);
      });
    }
  });
}
```

- **Sizes.** `SCREEN_VIEWPORTS.phone` is 390x844 at DPR 2 with touch; `SCREEN_VIEWPORTS.desktop`
  is 1280x800.
- **Settling.** `checkScreen` waits for web fonts, for every `cmn-skeleton`, `[aria-busy="true"]`
  or `[data-cmn-loading]` to leave the screen, and for the DOM to stay quiet for 300ms, so it
  judges the page, not its loading state. `timeout` (default 10s) bounds the wait.
- **Exceptions.** `checkScreen(page, {ignore: ['C6']})` skips a rule. Keep the list next to the
  route with a one-line reason, as `docs/design-baseline.json` does for impeccable here; an
  exception is a design decision, not a fix.
- **Theme.** Run the light and the dark scheme the way the app's e2e already does (Playwright's
  `colorScheme`, or the app's stored choice).

Run it in the same CI job as the app's other e2e. When the app adopts `cmn-page` it turns the
check on for every route in that pull request; from then on a page that sets its own padding,
drifts off the left edge or stacks a bordered button on every row fails CI.

## Running it ad hoc

```bash
npx lifekit-chrome-check screen http://localhost:4200/list
npx lifekit-chrome-check screen --viewport phone --color-scheme dark --ignore C6 <url>…
```

It needs `@playwright/test` (or `playwright`) installed in the current project, exits 1 with
the findings when a screen fails, and 2 on misuse. It cannot log in or mock an API: point it at a
served build with fixture data, a public demo, or a Storybook story's `iframe.html` URL.

## The skeleton check

The screen check judges the loaded page. `checkSkeleton` judges the loading state against it: a
page's skeleton must lay out like the page it stands in for, so nothing jumps when the data lands.
The presets are held to this one at a time (`skeleton-conformance.stories.ts`, guardrail S1); this
holds a whole route, which until now was only caught by eye.

For a route it visits the page with its data requests held, so the page stays in its skeleton
state, and measures the page's top-level sections. It then releases the requests, waits for the
page to settle (the same settling as `checkScreen`) and measures the sections again. A section
whose `top`, `left`, `width` or `height` differs by more than 8px, or a section one state has and
the other lacks, fails.

```ts
// e2e/skeleton.spec.ts
import {expect, test} from '@playwright/test';
import {checkSkeleton, formatSkeleton, SCREEN_VIEWPORTS} from '@lifekit-hq/tokens/screen';

import {mockApi} from './support/mock-api'; // the app's own fixture data

const ROUTES = ['/now', '/people'];

for (const [size, viewport] of Object.entries(SCREEN_VIEWPORTS)) {
  test.describe(`skeleton ${size}`, () => {
    test.use(viewport);

    for (const url of ROUTES) {
      test(url, async ({page}) => {
        await mockApi(page); // register the app's mocks first
        const result = await checkSkeleton(page, {url, hold: '**/api/**'});
        expect(result.findings, formatSkeleton(result)).toEqual([]);
      });
    }
  });
}
```

- **Holding the data.** `hold` is any Playwright URL matcher (a glob, a `RegExp` or a predicate)
  for the requests the route waits on. They are parked until the skeleton is measured, then
  released to whatever would have answered them: the app's own `page.route` mocks, which must be
  registered before the call, or the network. Hold only data requests, never the document or its
  scripts.
- **Sections.** On a `cmn-page` route they are the children of each `[data-cmn-page-column]`;
  without a template, the visible children of `main`. `sections: '<css selector>'` names them
  instead. A section is paired across the two states by its `data-cmn-section="<name>"` when it
  has one, else by its position, so name sections whose count differs between the states.
- **Rules.** K0 skeleton-state: something on screen was loading while the data was held (a
  `cmn-skeleton`, `[aria-busy="true"]` or `[data-cmn-loading]`), at least one request matched
  `hold`, and the page finished loading once released. K1 section-set: the skeleton stands in for
  every section the page has and draws none it lacks. K2 section-box: each pair is within
  `tolerance` (default 8px) per edge.
- **Exceptions.** `checkSkeleton(page, {..., ignore: ['K2']})` skips a rule and `tolerance`
  tightens or loosens the bar. Keep either next to the route with a one-line reason; a list whose
  loaded height depends on its data is a reason to compare the sections above it with `sections`,
  not to widen the bar.
- **Sizes and theme.** The viewport is the caller's, as for `checkScreen`: run it at
  `SCREEN_VIEWPORTS.phone` and `.desktop`.

The self-test (`projects/tokens/test/skeleton.spec.mjs`) runs the check against a fixture route
and shows it pass on a skeleton drawn to the page's sections and fail on one drifted by a taller
section, a missing section, an extra section, a page that never shows a skeleton and a page that
keeps loading after its data lands.

## The golden screens

Each kind has golden screens in Storybook (`Templates/List`, `Templates/Detail`, `Templates/Form`,
`Templates/Settings` and `Templates/Overview`): the template at 390 and 1280, light and dark, in the real shell, built
from real components with realistic content. Every golden passes the check with no findings, and
they are what the owner approves once per template. Check them against a built catalog with:

```bash
npx lifekit-chrome-check screen \
  "http://127.0.0.1:6006/iframe.html?id=templates-list--phone&viewMode=story" \
  "http://127.0.0.1:6006/iframe.html?id=templates-detail--desktop-dark&viewMode=story" \
  "http://127.0.0.1:6006/iframe.html?id=templates-form--phone-dark&viewMode=story" \
  "http://127.0.0.1:6006/iframe.html?id=templates-settings--desktop&viewMode=story" \
  "http://127.0.0.1:6006/iframe.html?id=templates-overview--desktop&viewMode=story"
```

`Templates/List` is also held pixel for pixel, so a change that moves it is visible on the pull
request that makes it: [SCREEN-BASELINES.md](SCREEN-BASELINES.md). Every golden also goes through
the design judge and axe-core at both sizes and both schemes, with no exceptions:
[ROUTE-SCAN.md](ROUTE-SCAN.md). Detail, Form, Settings and Overview join it when their first
baselines are added.
The story ids are `templates-<kind>--<phone|phone-dark|desktop|desktop-dark>`.

## Two rules that read structure

- **C8 heading rhythm** measures the space under a heading to the content it heads: the first
  element below it in its own section (`section`, `fieldset`, `[role=group]`, `[role=region]`,
  `cmn-settings-section`, `cmn-list-section`), never to whatever sits under it on the page. The
  `settings` template puts each heading in a column beside its controls from md up; the next thing
  under it in that column is the next section's heading, which is not its content, so a section
  taller than its heading column is not a finding. A heading outside any such section is measured
  against the next element under it on the page, as before.
- **C9 row-action noise** counts rows, not ancestors: a row is a list item, a table row, a
  `role=listitem` / `role=row` or a `cmn-list-item-row`, and the rule fires when three or more
  rows of one list each hold a bordered text button. One card with several actions (a decision's
  option group, then Decide and Cancel) is one row's actions, or no row's, and is not a finding. If
  a card should hold fewer bordered buttons, that is a different rule and DESIGN.md says so.

## What it caught first

Against basket's list route before it adopted the template, the check reported the defects the
owner saw on the phone: a 0px gap under the title (C2), content at 256px under a title at 272px
(C1), a 44px field next to a 40px button on the phone and 42px next to 40px on the desktop (C4),
uppercase section labels (C7), a 915px field on the desktop (C5) and a bordered "More" button on
all six rows (C9). The impeccable scan of the same route found nothing.
