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

A page built on `cmn-page` marks itself `data-cmn-page="<kind>"` and its content column
`data-cmn-page-column`. The check reads those to know the columns content may start on, so "one
left edge" (C1) is measured against the template rather than guessed from the title: a list page
has one column, and a notice, the title or a top-level block that starts anywhere else fails. A
route without a template fails C0 and is checked against its title's left edge instead.

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

## The golden screens

`Templates/List` in Storybook is the list template at 390 and 1280, light and dark, built from
real components with realistic content. It passes the check with no findings, and it is what the
owner approves once per template. Check it against a built catalog with:

```bash
npx lifekit-chrome-check screen \
  "http://127.0.0.1:6006/iframe.html?id=templates-list--phone&viewMode=story" \
  "http://127.0.0.1:6006/iframe.html?id=templates-list--desktop-dark&viewMode=story"
```

## What it caught first

Against basket's list route before it adopted the template, the check reported the defects the
owner saw on the phone: a 0px gap under the title (C2), content at 256px under a title at 272px
(C1), a 44px field next to a 40px button on the phone and 42px next to 40px on the desktop (C4),
uppercase section labels (C7), a 915px field on the desktop (C5) and a bordered "More" button on
all six rows (C9). The impeccable scan of the same route found nothing.
