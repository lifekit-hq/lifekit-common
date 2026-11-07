# The route scan

The screen check ([SCREEN-CHECK.md](SCREEN-CHECK.md)) judges how a page is composed and the
baselines ([SCREEN-BASELINES.md](SCREEN-BASELINES.md)) hold its look still. The route scan asks the
two questions neither does, of the same real screens: does the design judge (the impeccable
detector) find anything wrong with the page the owner sees, and does axe-core find an accessibility
barrier in it? It runs on an app's own routes, at 390 and 1280, in the light and the dark scheme,
once the data has settled. The design scan over Storybook judges components one story at a time;
this judges the composed screen.

It ships in `@lifekit-hq/tokens` as `@lifekit-hq/tokens/screen`, next to `checkScreen` and
`defineScreenBaselines`, and promotes the scan devclaw grew in its `quality.spec.ts` into one
fixture any app calls.

## What a scan does

For each route, size and scheme the fixture:

1. emulates the scheme (and reduced motion), runs the route's `prepare`, opens its `url` and runs its
   `ready`, exactly as the baselines fixture does;
2. **settles** the screen as `checkScreen` does: fonts loaded, no `cmn-skeleton`, `aria-busy` or
   `data-cmn-loading` region on screen, the DOM quiet for a moment;
3. **freezes** it: the settled DOM, with its shadow roots, adopted stylesheets and form state, as a
   static document with every script removed. A frozen screen that still shows a skeleton is
   thrown away and the screen settled again, until the timeout: a skeleton is retried, never
   judged;
4. has the **design judge** read the frozen document at the size's viewport (the impeccable
   engine, `--no-config --no-advisory`, so no project file changes what it reports);
5. runs **axe-core** over the live page (WCAG 2.2 AA: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
   `wcag22aa`). Only serious and critical violations fail a route; lesser ones are axe's advice.

The judge opens a URL in a browser of its own, so it would never see the route mocks, the stored
theme or the login the app's Playwright page holds. Freezing is what lets it judge _that_ page: the
fixture serves the frozen document at the page's own path from a throwaway local server, and passes
every other request (stylesheets, fonts, images) through to the app. The frozen page is the live
page: the fixture's own test checks that the shadow roots, their adopted stylesheets and the form
state come through.

A route fails with one block naming the screen, its design findings (`rule: snippet`) and its axe
violations (rule, impact, failing selectors).

## Wiring it into an app

The app serves its build to its Playwright e2e with fixture data, as for the screen check. List the
routes once:

```ts
// e2e/routes.spec.ts
import {defineRouteScans} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

import {mockApi} from './support/mock-api'; // the app's own fixture data

defineRouteScans(
  {test, expect},
  {
    routes: [
      {name: 'list', url: '/list', prepare: mockApi},
      {
        name: 'task',
        url: '/list/t-1',
        prepare: mockApi,
        ready: page => page.locator('h1').waitFor(),
      },
    ],
  }
);
```

For each route it registers one test per size and scheme (`list light`, `list dark`, under `route
scan phone` and `route scan desktop`), sets the viewport from `SCREEN_VIEWPORTS`, the scheme with
`colorScheme`, and pins the zone to UTC and the locale to `en-US`. Route options are the baselines'
`name`, `url` (a string, or a function of `{size, scheme}` when the URL carries the scheme),
`prepare` and `ready`. `sizes` and `schemes` on the call narrow the matrix; `timeout` bounds the
settle (default 30s); one route, size and scheme may take two minutes in all.

The scheme is emulated with `colorScheme`, which the live page and axe see. The design judge does
not: it reads the frozen DOM in a Chromium of its own, with no colour-scheme preference. So an app
must write its scheme into the DOM, `<html data-theme="light">` or `"dark"` by default (name another
attribute with the route's `schemeAttribute`), and the fixture checks it after the screen has
settled, before the judge runs: a missing or different value fails the route, naming the route, the
scheme asked for, the attribute and what it held. An app whose dark styles live only in a
`prefers-color-scheme` media query cannot be judged in dark until it writes the attribute too. An
app that stores its theme sets it in `prepare`.

### The judge

The engine is a release asset of impeccable, not an npm package. The fixture takes it from, in order,
the `engine` option, `$IMPECCABLE_BIN`, then the version it pins (`IMPECCABLE_VERSION`, the one
lifekit-common's own design scan uses), which it downloads once into `~/.impeccable` (or
`$IMPECCABLE_HOME`) and runs only when the file matches the sha256 pinned for the platform. Linux
x64 and arm64 are pinned; on another platform name an engine with `IMPECCABLE_BIN`. It needs network
access the first time, so a CI job that caches `~/.impeccable` saves the download.

The engine renders in the Chromium of the page that is being scanned. A container that cannot build
Chromium's sandbox sets `IMPECCABLE_BROWSER` to a wrapper that starts the browser with the sandbox
off; a value already in the environment is never overridden.

### Exceptions

A finding the app accepts is named, scoped and given a reason. An entry with no reason is refused
when the routes are defined, and so is one naming a route that does not exist.

```ts
defineRouteScans(
  {test, expect},
  {
    routes,
    exceptions: {
      impeccable: [
        {
          rule: 'tight-leading', // the finding's rule (`antipattern`)
          routes: ['task'], // route names, or '*'
          match: 'cmn-list-item-row', // optional: a substring of the finding's snippet
          max: 4, // findings it covers per scan (default 1)
          reason: 'Detector false positive: the sublabel is one truncated line.',
        },
      ],
      axe: [
        {
          rule: 'label-content-name-mismatch', // an axe rule id
          routes: ['*'],
          match: 'aria-label="Search"', // optional: a substring of the failing node's HTML
          reason: 'The button’s visible text adds a key hint to its name.',
        },
      ],
    },
  }
);
```

An exception is a decision about the app, not a fix: a finding in the library's components, tokens
or page templates is fixed once in lifekit-common and never accepted app by app, so an exception
that names a library component belongs in this repository's backlog instead.

## What it does not see

The frozen document is the DOM, not the running page: scripts are gone, so a hover state, an open
`<dialog>` in the top layer or a canvas's drawing is not part of it, and an `<iframe>` is left out
(its document would load live). Assets are fetched without the page's cookies. The judge's browser
is sized to the viewport but does not emulate touch, so a `(pointer: coarse)` rule is read as on the
desktop. Axe runs on the live page and has none of these limits.

## Running it

```bash
npm run build-storybook
npm run test:routes   # the reference app below; this is what CI runs (the `routes` job)
```

## The reference app: lifekit-common

The golden screens of the page templates ([SCREEN-CHECK.md](SCREEN-CHECK.md#the-golden-screens))
are the reference app. `projects/ui/e2e/routes/goldens.spec.ts` reads the built catalog and scans
every `Templates/*` story, and checks them against the spec's own list of golden screens, so a
story that is merged into another screen, or that no one meant to scan, fails instead of passing
quietly.
The phone, desktop and dark variants of one story are one screen here, since the scan runs each at
both sizes and both schemes itself; a named state (`Templates/List` with a notice) is a screen of
its own. Its config is `projects/ui/playwright.routes.config.ts`.

The shell is also scanned the way an app wires it: `Templates/List` has an `AppChrome` state, a
nav item that carries a badge and the offline banner, update prompt and install hint in the notices
slot with none of them showing. The phone shell hides the sidebar and the desktop shell hides the
tab bar with `display: none`, and the judge reads a positioned child with negative insets inside a
hidden subtree as escaping the shell's clip (`clipped-overflow-container`). The badge therefore
hangs off its corner with a transform (`right-0 top-0 translate-x-1.5 -translate-y-1.5`, the same 6px),
not with negative `right` and `top`, so a nav badge is never a finding and no app takes an exception
for it.

It takes **no exceptions**: a finding on a golden is a defect of a component, a token or a template,
and is fixed there. The first run found two on `Templates/Settings`, both fixed in the library:

- **`clipped-overflow-container`** on the shell: the select's chevron was absolutely positioned,
  and below the fold the judge read it as clipped by the shell. The chevron now shares the select's
  grid cell instead of floating over it.
- **`low-contrast` on `Save name`**: a disabled button was its variant dimmed with `opacity-50`,
  which left its label at 1.2:1 on an accent fill. A disabled button is now drawn in its own colours
  (a grey fill, or the quiet border for the secondary, and the secondary text colour), which hold 4.5:1
  on every surface in both themes.

Both findings had been accepted for the Settings stories in
[design-baseline.json](design-baseline.json); those entries are gone.

## Moving an app's own scan over

devclaw's `quality.spec.ts` becomes one `defineRouteScans` call: its `ROUTES` become `routes`, its
`quality-exceptions.json` becomes `exceptions` (the same `rule`, `routes`, `match`, `max` and
`reason`), and `settle.ts` and `impeccable-engine.sh` are deleted, since settling, retrying and the
pinned engine are the fixture's. Its check that the list stays in step with the router stays with the
app: only the app knows its router.
