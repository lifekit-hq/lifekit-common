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
  The images land beside the spec that calls `defineScreenBaselines`
  (`<spec>-snapshots/`), even though the fixture registers its tests from the installed package:
  Playwright takes the folder from the spec file it loaded, not from `node_modules`. An app that wants
  them in another folder sets Playwright's `snapshotPathTemplate` and names that folder as
  `baselines` when it calls the update workflow.

Options per route: `fullPage` for a page that scrolls (default is the viewport, the screen as
shown), `mask` for what legitimately changes, `maxDiffPixelRatio` to loosen every screen of the
route, and `screenMaxDiffPixelRatio` to loosen single screens, keyed by baseline name without
`.png` (`{'templates-overview-desktop-dark': ratio}`); a screen's own key wins over the route's
ratio, and every unkeyed screen stays exact. The fixture never loosens by default; a loosened ratio
is an exception and needs a one-line reason next to it, like a screen-check exception. `sizes` and `schemes` on the call narrow the matrix.

No screen is loosened today. If a screen is flaky with no source change, find what differs between
two renders (the actual and expected images of a failed run, diffed pixel by pixel) before reaching
for a ratio: the raster is already pinned (below), so what is left is something on the page that
moves, a clock, an animation or a late image, and that is fixed in the page or masked.

### Why the raster is pinned

A baseline used to flake by 1 to 33 pixels between two renders of the same build: on one machine
(6 to 8 of 44 screens between two runs in devclaw), and between the **Update screen baselines**
workflow and the next CI run (2 of 36 screens in basket, 2 of 20 here, which carried a 20-pixel
tolerance, [#247](https://github.com/lifekit-hq/lifekit-common/issues/247)). The differing pixels
were always anti-aliased edges (rounded card corners, circular swatches, the avatar initials), 1 to
a few colour levels apart, never a fill.

The cause is Chromium's partial raster. A tile that already holds a rendering and then has part of
it invalidated is not painted again whole: only the damaged rectangle is painted over what is
there. An anti-aliased edge painted twice comes out a little different from one painted once.
Whether a tile was painted whole or in parts depends on when the page's last invalidation landed
relative to the frame the screenshot reads, which is timing, so a busy machine draws the same page
as several images. It needs no particular hardware (one aarch64 machine reproduces it, and it shows
at device scale factor 1 and 2), no GPU (compositing and raster are software, `chrome://gpu` says
`disabled_software`) and no component: the same page, rendered 50 times in separate browsers while
ten other processes kept the cores busy, gave:

| Screen (rendered 50 times) | Chromium as launched | `--disable-partial-raster` |
| -------------------------- | -------------------- | -------------------------- |
| `settings` desktop dark    | 4 different images   | 1 (100 renders: still 1)   |
| `overview` phone dark      | 3 different images   | 1                          |
| `overview` desktop dark    | 5 different images   | 1                          |
| `list` desktop light       | not rendered         | 1                          |
| `detail` phone dark        | not rendered         | 1                          |
| `form` desktop dark        | not rendered         | 1                          |

`--num-raster-threads=1`, `--disable-gpu --disable-software-rasterizer`,
`--disable-threaded-animation --disable-threaded-scrolling` and `--disable-skia-runtime-opts` each
still drew more than one image (`--disable-threaded-compositing` hangs the screenshot). So the fixture
launches the baseline browser with `SCREEN_BROWSER_ARGS` (`--disable-partial-raster`), through
`test.use({launchOptions})` in the spec file that calls `defineScreenBaselines`. It replaces any
`launchOptions` the app sets for the project, for that file only, so keep the baselines in a spec
file of their own (as `e2e/screens/screens.spec.ts` above); the rest of the app's e2e runs as before.

Because the switch changes how the edges are painted, baselines drawn before it carry the old,
partly painted edges: regenerate them once with the **Update screen baselines** workflow when an
app takes this version, and review the images (expect differences at anti-aliased edges).

Images are CSS pixels (`scale: 'css'`): 390 and 1280 wide whatever the device scale factor.

### What a baseline must not contain

Anything that is not the design: a clock, a relative time, a version number, a random id, an image
from someone else's server, the machine's zone. Pin the clock in `prepare`, stub third-party images,
and mask the rest. A baseline that depends on the day it was taken fails on the next one.

## The reference app: lifekit-common

The golden screens of the page templates (`Templates/List`, `Templates/Detail`, `Templates/Form`,
`Templates/Settings` and `Templates/Overview` in Storybook) are the reference app. Their
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
  comment on the branch's pull request (see below). It refuses to run on `main`. It is the
  reusable workflow below with this repository's commands; an app calls the same one.
- **On a Linux machine.** `npm run build-storybook && npm run test:screens:update` rewrites the
  baselines that differ and writes the ones that are missing. A different CPU or distribution may
  anti-alias text a little differently from CI; if the `screens` job then disagrees with your
  images, use the workflow.

Review the images before you commit them: an update is a decision that the screen should look like
this from now on.

## Rendering baselines in an app

An app cannot draw its own baselines on a laptop: they are the Linux x64 renders of the CI runner (an
arm64 or macOS machine anti-aliases differently), so an app without a way to run Playwright on that
runner cannot produce them at all. lifekit-common publishes that step as a reusable workflow,
`.github/workflows/screen-baselines.yml`, and the pull request comment as a composite action,
`.github/actions/baseline-report`. Both take the app's own commands; nothing in them knows about
Storybook or about this repository's layout.

The app adds one workflow file. Call it at the lifekit-common tag the app's `@lifekit-hq/*`
packages are on, and pass the same tag as `lifekit-common-ref` (that is where it takes the report
action from; it defaults to `main`):

```yaml
# .github/workflows/update-screen-baselines.yml
name: Update screen baselines
on:
  workflow_dispatch: # from the Actions tab, once this file is on the default branch
  pull_request:
    types: [labeled] # from the branch itself, before this file is on the default branch
jobs:
  render:
    if: github.event_name == 'workflow_dispatch' || github.event.label.name == 'update-baselines'
    permissions: {contents: write, actions: write, pull-requests: write, packages: read}
    uses: lifekit-hq/lifekit-common/.github/workflows/screen-baselines.yml@v4.5.0
    with:
      lifekit-common-ref: v4.5.0
      working-directory: frontend # where package.json and the Playwright config live
      build-command: npm run build # what the Playwright webServer serves; blank when nothing
      command: npx playwright test e2e/screens --update-snapshots=changed
      baselines: frontend/e2e/screens # the folder the images are in, from the repository root
```

| Input                  | Default                                       | What                                                                                               |
| ---------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `command` (required)   |                                               | The app's Playwright command in update mode, run from `working-directory`                          |
| `baselines` (required) |                                               | The folder holding the images, from the repository root; every `*-linux.png` under it is committed |
| `working-directory`    | `.`                                           | Where `package.json` and the Playwright config live                                                |
| `install-command`      | `npm ci`                                      | Installs the app                                                                                   |
| `build-command`        | none                                          | Builds what the Playwright command serves                                                          |
| `playwright-install`   | `npx playwright install --with-deps chromium` | Installs the browser                                                                               |
| `ci-workflow`          | `ci.yml`                                      | The workflow started on the branch afterwards (it needs a `workflow_dispatch`)                     |
| `node-version`         | `22`                                          | Node on the runner                                                                                 |
| `commit-message`       | `test: update screen baselines`               | The commit the images land in                                                                      |
| `lifekit-common-ref`   | `main`                                        | The lifekit-common tag to take the report action from                                              |
| secret `token`         | the workflow token                            | A token whose push starts the pull request's own CI run, instead of `ci-workflow`                  |

The job renders on `ubuntu-latest`, commits the changed images to the branch, starts CI on it and
posts (or edits) the before and after comment on the branch's pull request. It does nothing on
`main` or on a fork's branch. The calling job grants the four permissions above; the workflow cannot
raise them, and `packages: read` is the one that lets the install step read the app's private
`@lifekit-hq/*` packages (without it `npm ci` fails with E403). The workflow hands its own token to
npm as `NODE_AUTH_TOKEN`, which is what the app's `.npmrc` reads
(`//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`), so the caller needs no secret and its
`install-command` stays plain `npm ci`. A repository can call the workflow without further setup
because lifekit-common is public.

### Landing the first baselines

A `workflow_dispatch` workflow appears in the Actions tab only once its file is on the default
branch, so an app adopting the fixture cannot press the button on the branch that adds the workflow.
A `pull_request` workflow does run from the branch it is on, so the file above also listens for the
`update-baselines` label:

1. In the pull request that adopts the fixture (the Playwright config, the spec that lists the
   routes, this workflow), open the pull request, then add the label `update-baselines`.
2. The workflow renders every screen, commits the images to the branch as
   `test: update screen baselines`, starts CI and posts the screens as "new screen" rows.
3. Review the images (they are the owner's to approve) and merge. From then on the button works, and
   so does the label, for any pull request that changes a screen on purpose.

A label added again re-renders; remove it and add it, or use the button. If the app's CI has no
`workflow_dispatch` trigger, give the workflow a `token` secret (a personal access token or a
GitHub App token) and set `ci-workflow: ''`: a push made with that token starts the pull request's
own checks.

To keep the before and after comment up to date on every push, not only on the update, the app's CI
calls the action itself, as this repository's does:

```yaml
- uses: actions/checkout@v4
  with: {ref: '${{ github.event.pull_request.head.sha }}', fetch-depth: 0}
- uses: lifekit-hq/lifekit-common/.github/actions/baseline-report@v4.5.0
  with:
    token: ${{ github.token }}
    repo: ${{ github.repository }}
    pr: ${{ github.event.pull_request.number }}
    base: ${{ github.event.pull_request.base.sha }}
    head: ${{ github.event.pull_request.head.sha }}
```

The report reads every `*-linux.png` the two commits differ by, wherever the app keeps them.

## Before and after on the pull request

The `baseline-report` job in CI (and the **Update screen baselines** workflow, through the same
`.github/actions/baseline-report` action, because a push made with the workflow token does not start
the pull request run; an app uses the action the same way, see above) compares the baselines on the branch with those at the point it
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
