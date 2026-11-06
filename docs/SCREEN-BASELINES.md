# Screen baselines

The screen check ([SCREEN-CHECK.md](SCREEN-CHECK.md)) judges how a page is composed. This holds the
look still: every route of an app is captured at the phone (390) and the desktop (1280) size, in the
light and the dark scheme, and compared with a committed image. A change that moves a pixel fails CI
until someone says it is meant, and the pull request that says so carries the screen before and
after, so a change to the look is never silent.

It ships in `@lifekit-hq/tokens` as `@lifekit-hq/tokens/screen`, next to `checkScreen`, and extends
the pattern finance-sentry grew for its own screens (route-mocked data, a pinned clock and zone,
Linux baselines) into one fixture any app calls.

## The rules

1. **Linux only.** A baseline is rendered on the machine CI runs on. Off Linux the tests skip, saying
   why, instead of comparing against pixels another renderer drew. Fonts are self-hosted
   (`@lifekit-hq/tokens/fonts.css`), so the text does not depend on the machine's.
2. **The first baseline is the owner's.** A screen with no baseline fails the run; nothing writes
   one on its own. The first image per template and screen is committed through the update step
   below and reviewed by the owner: `.github/CODEOWNERS` asks for their review on any
   `*-linux.png`, and the pull request comment marks it as a new screen.
3. **After that CI diffs, exactly.** A screen that differs from its baseline by a single pixel fails
   (`maxDiffPixelRatio: 0`, `threshold: 0`), and the run uploads the actual, expected and diff
   images. A baseline is drawn and compared on the same CI runner image, so a changed word or shade
   is never under a tolerance and never silent.
4. **Updating is a step you take.** Nothing in CI or in a plain test run rewrites a baseline
   (`updateSnapshots: 'none'`). See "Updating a baseline".

## Wiring it into an app

The app serves its build to its Playwright e2e with fixture data (route mocks or a seeded backend),
as for the screen check. Spread the fixture's config into the Playwright config and list the
routes once:

```ts
// playwright.config.ts
import {screenBaselineConfig} from '@lifekit-hq/tokens/screen';
import {defineConfig} from '@playwright/test';

export default defineConfig({
  ...screenBaselineConfig(), // updateSnapshots: 'none', animations off, exact comparison
  testDir: './e2e/screens',
  // …the app's own webServer / baseURL
});
```

```ts
// e2e/screens/screens.spec.ts
import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

import {mockApi, FROZEN_NOW} from '../support/mock-api'; // the app's own fixture data

defineScreenBaselines(
  {test, expect},
  {
    routes: [
      {
        name: 'list',
        url: '/list',
        prepare: async page => {
          await page.clock.install({time: FROZEN_NOW}); // dates and "x minutes ago" must not move
          await mockApi(page);
        },
        ready: page => page.getByRole('heading', {name: 'Tasks'}).waitFor(),
        mask: page => [page.locator('[data-app-version]')], // whatever changes between runs
      },
    ],
  }
);
```

For each route it registers one test per size and scheme (`list light`, `list dark`, under
`screen baseline phone` and `screen baseline desktop`), and each test:

- sets the viewport from `SCREEN_VIEWPORTS` (390x844 on a touch phone, 1280x800), the scheme with
  `colorScheme` (and `reducedMotion`), and pins the zone to UTC and the locale to `en-US`;
- runs `prepare(page, {size, scheme})`, opens `url` (a string, or a function of the same argument
  when the URL carries the scheme), then runs `ready(page, {size, scheme})`;
- settles the screen exactly as `checkScreen` does (fonts loaded, no skeleton or busy region, the
  DOM quiet) and compares it with `<name>-<size>-<scheme>-chromium-linux.png` beside the spec.

Options per route: `fullPage` for a page that scrolls (default is the viewport, the screen as
shown), `mask` for what legitimately changes, and `maxDiffPixelRatio` to loosen one screen. The fixture
never loosens by default; a loosened ratio is an exception and needs a one-line reason next to it,
like a screen-check exception. `sizes` and `schemes` on the call narrow the matrix.

If the `screens` job on the CI runner is flaky with no source change (regenerate and compare twice
to tell), do not widen the default. Set the smallest ratio that is stable on that screen, at most 20
pixels' worth (`20 / (width * height)`), on the route that needs it, with the reason beside it.

Images are CSS pixels (`scale: 'css'`): 390 and 1280 wide whatever the device scale factor.

### What a baseline must not contain

Anything that is not the design: a clock, a relative time, a version number, a random id, an image
from someone else's server, the machine's zone. Pin the clock in `prepare`, stub third-party images,
and mask the rest. A baseline that depends on the day it was taken fails on the next one.

## The reference app: lifekit-common

The golden screens of the page templates (today `Templates/List` in Storybook; Detail, Form,
Settings and Overview follow once their baselines are added) are the reference app. Their
spec is `projects/ui/e2e/screens/templates.spec.ts`, their config `projects/ui/playwright.screens.config.ts`,
and their baselines sit in `projects/ui/e2e/screens/templates.spec.ts-snapshots/`.

```bash
npm run build-storybook
npm run test:screens          # compares; this is what CI runs (the `screens` job)
```

Each new template adds its golden story to `templates.spec.ts` and its first baselines to the same
pull request, for the owner to approve.

## Updating a baseline

A baseline changes only when you run the update step on the branch that changes the screen.

- **On the CI renderer (preferred).** Run the **Update screen baselines** workflow from the Actions
  tab on the branch. It renders the screens on the runner every later comparison runs on, commits
  the changed `*-linux.png` files to the branch, starts CI on it and posts the before and after
  comment on the branch's pull request (see below). It refuses to run on `main`.
- **On a Linux machine.** `npm run build-storybook && npm run test:screens:update` rewrites the
  baselines that differ and writes the ones that are missing. A different CPU or distribution may
  anti-alias text a little differently from CI; if the `screens` job then disagrees with your
  images, use the workflow.

Review the images before you commit them: an update is a decision that the screen should look like
this from now on.

## Before and after on the pull request

The `baseline-report` job in CI (and the **Update screen baselines** workflow, through the same
`.github/actions/baseline-report` action, because a push made with the workflow token does not start
the pull request run) compares the baselines on the branch with those at the point it
left the base branch. When any `*-linux.png` was added, changed or removed, it posts (and on every
push edits, and when the difference goes away deletes) one comment on the pull request:

| Screen                                 | Before           | After               |
| -------------------------------------- | ---------------- | ------------------- |
| `templates-list-phone-light` (changed) | the base's image | this branch's image |

A new screen shows "new screen" in place of a before image; a removed one shows "removed". The images
are linked from the commits that hold them, so they render for anyone who can read the repository.
The report is also written to the job summary. It runs for branches of this repository; a fork's
token cannot comment.

A pull request that changes the look without updating a baseline fails the `screens` job instead,
with the diff images attached to the run. Either way the change is visible.

## Owner approval

Review of the images is the approval. `.github/CODEOWNERS` lists the baselines under the owner, so
GitHub requests their review whenever one changes. It becomes a requirement when the repository's
branch protection turns on "Require review from Code Owners"; that setting is the repository's, not
this change's.

## Component VRT baselines (Windows)

The component VRT baselines under `projects/ui/e2e/screenshots` are `*-win32.png` files captured on
the owner's Windows machine. They cannot be regenerated on CI or Linux. The `md` button's block
padding is now `py-cmn-1`, so a bordered secondary `md` button is 40px, not 42px, on the desktop:
the `button-*-chromium-win32.png` baselines are stale and need regenerating on the owner's Windows
machine.
