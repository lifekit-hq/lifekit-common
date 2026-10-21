import {expect, type Page, test} from '@playwright/test';

import {
  type CheckMode,
  LAYOUT_READY,
  layoutStory,
  MIN_TARGET,
  openStory,
  report,
  settleFrames,
  TARGETS_READY,
  type Theme,
  undersizedTargets,
} from './phone-helpers';

// Checks docs/PHONE-CONTRACT.md against the built app-layout stories. Every violation becomes a
// `violation` annotation (collected by summary-reporter.ts). How it counts depends on the check:
// - `gate` (default): fails under PHONE_CONFORMANCE=gate, which CI runs; report-only without it.
// - `enforce`: always fails. The guarantee behind it is built, so it only ever raises the bar.
// - `advisory`: never fails, even under gate. Kept for what the contract does not yet promise
//   (touch-sized controls in the tablet and landscape chrome, which keeps desktop density).

const MIN_TEXT = 12;
const SCROLL_PROBE = 300;
const SURFACE_TOLERANCE = 1;

// `touchChrome`: the shell is in its phone layout with the phone's touch-sized top bar, so every
// control must be touch-sized. The landscape phone keeps the tab bar, but its top bar still has the
// desktop density at that width, so its controls stay report-only.
const VIEWPORTS = [
  {name: 'phone 390x844', width: 390, height: 844, tabs: true, touchChrome: true},
  {name: 'landscape 844x390', width: 844, height: 390, tabs: true, touchChrome: false},
  {name: 'tablet 820x1180', width: 820, height: 1180, tabs: false, touchChrome: false},
] as const;

// The narrowest phone still sold (iPhone SE): the tab bar must hold its labels at this width.
const NARROW_PHONE = {width: 320, height: 568};

// Room for roughly "Che…" beside the glyphs; a title narrower than this has collapsed.
const MIN_TOP_BAR_TITLE = 64;
const TOP_BAR_STORY = 'components-topbar--back-and-actions';
const TOP_BAR_MANY_STORY = 'components-topbar--many-actions';

const STORIES = ['phone', 'phone-overlay'] as const;
// Layout stories that differ in their tab labels (up to four tabs and More).
const TAB_STORIES = ['phone', 'phone-overlay', 'phone-default-tabs', 'phone-active-in-more'];

const THEME_COLOR_METAS = [
  {content: '#f3f5f6', media: '(prefers-color-scheme: light)'},
  {content: '#0c1113', media: '(prefers-color-scheme: dark)'},
];

/** Opens a story with the head carrying the browser chrome metas, as an app's index.html does. */
async function open(
  page: Page,
  storyId: string,
  theme: Theme = 'light',
  ready: string = LAYOUT_READY
): Promise<void> {
  await page.addInitScript(metas => {
    document.addEventListener('DOMContentLoaded', () => {
      for (const {content, media} of metas) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = content;
        meta.media = media;
        document.head.append(meta);
      }
    });
  }, THEME_COLOR_METAS);
  await openStory(page, storyId, theme, ready);
}

const ROUTED_STORY = 'conformance-routed-app-layout--routed';
// Chips and a link in a card: small controls the layout stories do not hold.
const TARGETS_STORY = 'conformance-touch-targets--targets';
const PALETTE_STORY = 'components-command-palette--playground';
/** Phone chrome enforces touch targets; the tablet and landscape chrome only advise them. */
const targetMode = (touchChrome: boolean): CheckMode => (touchChrome ? 'enforce' : 'advisory');

/** Keyboard hints (`kbd`) that are on screen. */
async function visibleKeyHints(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('kbd')]
      .filter(el => el.getClientRects().length > 0)
      .map(el => `kbd[${el.textContent?.trim()}]`)
  );
}

/** Opens the palette from its story's launcher. */
async function openPalette(page: Page) {
  await open(page, PALETTE_STORY, 'light', 'cmn-story-palette-launcher');
  await page.getByRole('button', {name: 'Open palette'}).click();
  await page.waitForSelector('input[placeholder^="Search pages"]', {state: 'visible'});
}

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({
      viewport: {width: vp.width, height: vp.height},
      hasTouch: true,
      isMobile: true,
    });

    for (const story of STORIES) {
      const id = `${vp.name} | ${story}`;

      test(`${id} | targets >= 44`, async ({page}) => {
        await open(page, layoutStory(story));
        const small = await undersizedTargets(page, MIN_TARGET);
        report(
          small.map(s => `target under ${MIN_TARGET}: ${s}`),
          targetMode(vp.touchChrome)
        );
      });

      test(`${id} | text >= 12px`, async ({page}) => {
        await open(page, layoutStory(story));
        const small = await page.evaluate(min => {
          const found = new Map<string, number>();
          for (const el of document.querySelectorAll('body *')) {
            const own = [...el.childNodes].some(
              n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
            );
            if (own && el.getClientRects().length) {
              const size = parseFloat(getComputedStyle(el).fontSize);
              if (size < min) {
                const key = `${size}px "${el.textContent?.trim().slice(0, 24)}"`;
                found.set(key, (found.get(key) ?? 0) + 1);
              }
            }
          }
          return [...found.keys()];
        }, MIN_TEXT);
        report(small.map(s => `text under ${MIN_TEXT}px: ${s}`));
      });

      test(`${id} | nothing covers the chrome`, async ({page}) => {
        await open(page, layoutStory(story));
        const covered = await page.evaluate(() => {
          const found: string[] = [];
          const bars: [string, string][] = [
            ['top bar', 'cmn-top-bar'],
            ['tab bar', 'cmn-bottom-tab-bar'],
          ];
          for (const [name, selector] of bars) {
            const bar = document.querySelector(selector);
            const rect = bar?.getBoundingClientRect();
            if (!bar || !rect || !rect.width || !rect.height) {
              continue;
            }
            const grid = 5;
            for (let i = 0; i < grid; i++) {
              for (let j = 0; j < grid; j++) {
                const x = rect.left + ((i + 0.5) * rect.width) / grid;
                const y = rect.top + ((j + 0.5) * rect.height) / grid;
                const top = document.elementFromPoint(x, y);
                if (top && !bar.contains(top)) {
                  found.push(
                    `${name} covered at ${Math.round(x)},${Math.round(y)} by ${top.tagName.toLowerCase()}.${String(top.className).slice(0, 40)}`
                  );
                }
              }
            }
          }
          return found;
        });
        report([...new Set(covered)]);
      });

      test(`${id} | tab bar by device`, async ({page}) => {
        await open(page, layoutStory(story));
        const tabs = page.locator('cmn-bottom-tab-bar nav');
        const visible = (await tabs.count()) > 0 && (await tabs.first().isVisible());
        const problems: string[] = [];
        if (vp.tabs && !visible) {
          problems.push(`tab bar missing at ${vp.width}x${vp.height}`);
        }
        if (!vp.tabs && visible) {
          problems.push(`tab bar shown at ${vp.width}x${vp.height}, expected the rail`);
        }
        report(problems, 'enforce');
      });
    }

    test(`${vp.name} | touch-targets | targets >= 44`, async ({page}) => {
      await open(page, TARGETS_STORY, 'light', TARGETS_READY);
      const small = await undersizedTargets(page, MIN_TARGET);
      report(
        small.map(s => `target under ${MIN_TARGET}: ${s}`),
        targetMode(vp.touchChrome)
      );
    });

    test(`${vp.name} | keyboard hints hidden on touch`, async ({page}) => {
      await open(page, layoutStory('phone-overlay'));
      const hints = await visibleKeyHints(page);
      await openPalette(page);
      hints.push(...(await visibleKeyHints(page)));
      report(
        hints.map(h => `keyboard hint shown on touch: ${h}`),
        'enforce'
      );
    });

    test(`${vp.name} | back restores scroll`, async ({page}) => {
      await open(page, ROUTED_STORY);
      const main = page.locator('cmn-app-layout main');
      await expect(main.getByRole('heading', {name: 'List'})).toBeVisible();
      await main.evaluate((el, y) => el.scrollTo(0, y), SCROLL_PROBE);
      const before = await main.evaluate(el => el.scrollTop);
      expect(before).toBeGreaterThan(0);
      await page.getByRole('link', {name: 'Open detail'}).evaluate(el => el.click());
      await expect(main.getByRole('heading', {name: 'Detail'})).toBeVisible();
      await page.goBack();
      await expect(main.getByRole('heading', {name: 'List'})).toBeVisible();
      await page.evaluate(
        () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      );
      const after = await main.evaluate(el => el.scrollTop);
      report(after === before ? [] : [`scrollTop ${after} after back, expected ${before}`]);
    });

    for (const theme of ['light', 'dark'] as const) {
      test(`${vp.name} | ${theme} | theme-color matches the surface`, async ({page}) => {
        await page.emulateMedia({colorScheme: theme});
        await open(page, layoutStory('phone'), theme);
        const state = await page.evaluate(() => {
          const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
          const surface = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-surface-bg')
            .trim();
          const probe = document.createElement('i');
          probe.style.color = surface;
          document.body.append(probe);
          const surfaceRgb = getComputedStyle(probe).color;
          probe.remove();
          const metaColors = metas.map(m => {
            probe.style.color = m.getAttribute('content') ?? '';
            document.body.append(probe);
            const c = getComputedStyle(probe).color;
            probe.remove();
            return c;
          });
          return {surfaceRgb, metaColors};
        });
        const channels = (rgb: string) => rgb.match(/\d+/g)?.map(Number) ?? [];
        const want = channels(state.surfaceRgb);
        const problems: string[] = [];
        for (const meta of state.metaColors) {
          const got = channels(meta);
          if (!got.every((c, i) => Math.abs(c - (want[i] ?? -99)) <= SURFACE_TOLERANCE)) {
            problems.push(`theme-color ${meta} != surface ${state.surfaceRgb} (${theme})`);
          }
        }
        expect(state.metaColors.length).toBeGreaterThan(0);
        expect(want.length).toBeGreaterThan(0);
        report(problems);
      });
    }
  });
}

test.describe(`phone ${NARROW_PHONE.width}x${NARROW_PHONE.height}`, () => {
  test.use({viewport: NARROW_PHONE, hasTouch: true, isMobile: true});

  for (const story of TAB_STORIES) {
    test(`${story} | tab labels never truncate`, async ({page}) => {
      await open(page, layoutStory(story));
      const cut = await page.evaluate(() => {
        const found: string[] = [];
        const nav = document.querySelector('cmn-bottom-tab-bar nav');
        const navBox = nav?.getBoundingClientRect();
        for (const label of document.querySelectorAll('cmn-bottom-tab-bar nav button > span')) {
          const box = label.getBoundingClientRect();
          const tab = label.parentElement?.getBoundingClientRect();
          const text = label.textContent?.trim() ?? '';
          const clipped = label.scrollWidth > label.clientWidth;
          const ellipsis = getComputedStyle(label).textOverflow === 'ellipsis';
          const outside =
            !!tab &&
            !!navBox &&
            (box.left < Math.max(tab.left, navBox.left) - 0.5 ||
              box.right > Math.min(tab.right, navBox.right) + 0.5);
          if (clipped || ellipsis || outside) {
            found.push(`tab label "${text}" is cut (${Math.round(box.width)}px in its tab)`);
          }
        }
        return found;
      });
      report(cut, 'enforce');
    });
  }

  // Back, two page actions, search, theme and avatar: the fullest bar a page declares. The title
  // gives way (ellipsis) but never to nothing, and no control gives up its touch target for it.
  test('top bar | title stays readable, targets stay >= 44', async ({page}) => {
    await open(page, TOP_BAR_STORY, 'light', 'cmn-top-bar header');
    const bar = await page.evaluate(() => {
      const title = document.querySelector('cmn-top-bar h1');
      const box = title?.getBoundingClientRect();
      return {
        titleWidth: box ? Math.round(box.width) : 0,
        ellipsis: !!title && getComputedStyle(title).textOverflow === 'ellipsis',
        overflowsBar: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(bar.titleWidth).toBeGreaterThanOrEqual(MIN_TOP_BAR_TITLE);
    expect(bar.ellipsis).toBe(true);
    expect(bar.overflowsBar).toBe(false);
    expect(await undersizedTargets(page, MIN_TARGET)).toEqual([]);
  });

  // Back, three page actions, search and avatar. Below 360px the actions past the first move into
  // the "More actions" menu and the title keeps >= MIN_TOP_BAR_TITLE. From 360px every action and the
  // theme toggle stay inline, so the title there is only measured and recorded, not asserted.
  for (const width of [320, 359, 360]) {
    test(`top bar | three actions at ${width}px stay within the bar`, async ({page}) => {
      await page.setViewportSize({width, height: NARROW_PHONE.height});
      await open(page, TOP_BAR_MANY_STORY, 'light', 'cmn-top-bar header');
      const bar = await page.evaluate(() => {
        const visible = (el: Element) => el.getClientRects().length > 0;
        const title = document.querySelector('cmn-top-bar h1')?.getBoundingClientRect();
        return {
          titleWidth: title ? Math.round(title.width) : 0,
          inline: [...document.querySelectorAll('cmn-top-bar header button')]
            .filter(visible)
            .map(b => b.getAttribute('aria-label')),
          overflowsBar: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      expect(bar.overflowsBar).toBe(false);
      if (width < 360) {
        expect(bar.titleWidth).toBeGreaterThanOrEqual(MIN_TOP_BAR_TITLE);
        expect(bar.inline).toEqual(['Back', 'Edit', 'More actions', 'Search', 'Account menu']);
      } else {
        test.info().annotations.push({
          type: 'title-width',
          description: `${width}px: ${bar.titleWidth}px`,
        });
        expect(bar.inline).toContain('Archive');
        expect(bar.inline).toContain('Toggle theme');
        expect(bar.inline).not.toContain('More actions');
      }
      expect(await undersizedTargets(page, MIN_TARGET)).toEqual([]);
    });
  }

  test('top bar | overflow menu opens by keyboard, keeps disabled, returns focus', async ({
    page,
  }) => {
    await open(page, TOP_BAR_MANY_STORY, 'light', 'cmn-top-bar header');
    const trigger = page.getByRole('button', {name: 'More actions'});
    await trigger.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu', {name: 'More actions'});
    await expect(menu).toBeVisible();
    await expect(page.getByRole('menuitem', {name: 'Share'})).toBeFocused();
    await expect(page.getByRole('menuitem', {name: 'Archive'})).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    const box = await menu.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= NARROW_PHONE.width).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});

// The shell follows the device: the tab bar for a phone (landscape too), the sidebar as a rail from
// 600px, the full sidebar from 840px. `isMobile` + `hasTouch` make Chromium report a coarse pointer.
const RAIL_WIDTH = 64;
const SIDEBAR_WIDTH = 240;
const SHELLS = [
  {name: 'phone 390x844', width: 390, height: 844, touch: true, shell: 'tabs'},
  {name: 'phone 599x900', width: 599, height: 900, touch: true, shell: 'tabs'},
  {name: 'landscape phone 844x390', width: 844, height: 390, touch: true, shell: 'tabs'},
  {name: 'landscape phone 932x430', width: 932, height: 430, touch: true, shell: 'tabs'},
  {name: 'tablet 600x900', width: 600, height: 900, touch: true, shell: 'rail'},
  {name: 'tablet portrait 820x1180', width: 820, height: 1180, touch: true, shell: 'rail'},
  {name: 'tablet 839x1000', width: 839, height: 1000, touch: true, shell: 'rail'},
  {name: 'tablet 840x1000', width: 840, height: 1000, touch: true, shell: 'sidebar'},
  {name: 'tablet landscape 1180x820', width: 1180, height: 820, touch: true, shell: 'sidebar'},
  {name: 'desktop 1440x900', width: 1440, height: 900, touch: false, shell: 'sidebar'},
  // A short window with a mouse is a small desktop window, not a phone.
  {name: 'short desktop window 844x390', width: 844, height: 390, touch: false, shell: 'sidebar'},
] as const;

for (const device of SHELLS) {
  test.describe(`shell by device | ${device.name}`, () => {
    test.use({
      viewport: {width: device.width, height: device.height},
      hasTouch: device.touch,
      isMobile: device.touch,
    });

    test(`shows ${device.shell}`, async ({page}) => {
      await open(page, layoutStory('phone'));
      const tabs = page.locator('cmn-bottom-tab-bar nav');
      const sidebar = page.locator('cmn-sidebar-nav aside');
      if (device.shell === 'tabs') {
        await expect(tabs).toBeVisible();
        await expect(sidebar).toBeHidden();
        return;
      }
      await expect(tabs).toBeHidden();
      await expect(sidebar).toBeVisible();
      const width = (await sidebar.boundingBox())?.width;
      expect(width).toBe(device.shell === 'rail' ? RAIL_WIDTH : SIDEBAR_WIDTH);
      // The rail is icons only: no toggle widens it.
      const toggle = page.getByRole('button', {name: /(Collapse|Expand) sidebar/});
      await expect(toggle).toHaveCount(device.shell === 'rail' ? 0 : 1);
    });

    test('keeps the page from scrolling sideways', async ({page}) => {
      await open(page, layoutStory('phone-overlay'));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      ).toBe(false);
    });
  });
}

const NOTICE_WIDTHS = [NARROW_PHONE, {width: 390, height: 844}] as const;

// Overlays never cover the chrome: notices sit between the top bar and the tab bar, toasts above
// the tab bar and the floating action, and the floating action hides while a bottom sheet is open.
for (const size of NOTICE_WIDTHS) {
  test.describe(`overlays ${size.width}x${size.height}`, () => {
    test.use({viewport: size, hasTouch: true, isMobile: true});

    test('notices | sit below the top bar and above the tab bar', async ({page}) => {
      await open(page, layoutStory('phone-overlay-notices'));
      await page.waitForSelector('lk-offline-banner .banner, lk-update-prompt .prompt', {
        state: 'visible',
      });
      for (const scroll of [0, SCROLL_PROBE]) {
        await page.evaluate(top => document.querySelector('main')?.scrollTo(0, top), scroll);
        // Locators pierce the elements' shadow roots, which querySelector cannot.
        const box = async (selector: string) => {
          const found = await page.locator(selector).boundingBox();
          return found ? {top: found.y, bottom: found.y + found.height} : null;
        };
        const boxes = {
          bar: await box('cmn-top-bar header'),
          tabs: await box('cmn-bottom-tab-bar nav'),
          banner: await box('lk-offline-banner .banner'),
          prompt: await box('lk-update-prompt .prompt'),
        };
        // Flush under the bar: no strip of scrolling content between them, no row hidden behind.
        expect(boxes.banner?.top).toBeLessThanOrEqual((boxes.bar?.bottom ?? 0) + SURFACE_TOLERANCE);
        for (const notice of [boxes.banner, boxes.prompt]) {
          expect(notice).not.toBeNull();
          expect(notice?.top).toBeGreaterThanOrEqual((boxes.bar?.bottom ?? 0) - SURFACE_TOLERANCE);
          expect(notice?.bottom).toBeLessThanOrEqual(
            (boxes.tabs?.top ?? Infinity) + SURFACE_TOLERANCE
          );
        }
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      ).toBe(false);
    });

    test('toasts | sit above the tab bar, the floating action and the bottom inset', async ({
      page,
    }) => {
      await open(page, layoutStory('phone-overlay-toast'));
      const toasts = page.locator('cmn-toast [role]');
      await expect(toasts).toHaveCount(2);
      const boxes = await toasts.evaluateAll(els =>
        els.map(el => {
          const {top, bottom} = el.getBoundingClientRect();
          return {top, bottom};
        })
      );
      const chrome = await page.evaluate(() => {
        const tabs = document.querySelector('cmn-bottom-tab-bar nav')?.getBoundingClientRect();
        const fab = document.querySelector('[cmnAppLayoutFab]')?.getBoundingClientRect();
        return Math.min(tabs?.top ?? Infinity, fab?.height ? fab.top : Infinity);
      });
      expect(chrome).toBeLessThan(Infinity);
      for (const box of boxes) {
        expect(box.bottom).toBeLessThanOrEqual(chrome + SURFACE_TOLERANCE);
      }
      // The newest (the error, shown last) sits at the bottom, nearest the thumb.
      expect(boxes[1].top).toBeGreaterThan(boxes[0].bottom);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      ).toBe(false);
    });

    test('floating action | visible, then hidden while a sheet is open', async ({page}) => {
      await open(page, layoutStory('phone-overlay-sheet-open'));
      await page.waitForSelector('cmn-drawer-container', {state: 'visible'});
      await expect(page.getByRole('button', {name: 'Ask Ledger'})).toBeHidden();
    });

    test('floating action | shown with no sheet open', async ({page}) => {
      await open(page, layoutStory('phone-overlay-notices'));
      await expect(page.getByRole('button', {name: 'Ask Ledger'})).toBeVisible();
    });
  });
}

// One state pattern: the offline cold start and an error are announced, never read as empty, and
// the Retry beside them is a touch-sized target that fits the narrowest phone.
const STATE_STORIES = [
  {name: 'offline cold start', story: 'components-async-state--offline-cold-start', role: 'status'},
  {
    name: 'error with retry',
    story: 'components-async-state--error-with-built-in-retry',
    role: 'alert',
  },
] as const;

for (const size of NOTICE_WIDTHS) {
  test.describe(`state pattern ${size.width}x${size.height}`, () => {
    test.use({viewport: size, hasTouch: true, isMobile: true});

    for (const state of STATE_STORIES) {
      test(`${state.name} | announced, not empty, Retry >= 44, no sideways scroll`, async ({
        page,
      }) => {
        await open(page, state.story, 'light', 'cmn-async-state');
        const region = page.locator(`cmn-async-state [role="${state.role}"]`);
        await expect(region).toBeVisible();
        await expect(page.locator('cmn-async-state')).not.toContainText('No data available');
        await expect(page.getByRole('button', {name: 'Retry'})).toBeVisible();
        expect(await undersizedTargets(page, MIN_TARGET)).toEqual([]);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        ).toBe(false);
      });
    }

    test('offline cold start | says when it last synced', async ({page}) => {
      await open(page, STATE_STORIES[0].story, 'light', 'cmn-async-state');
      await expect(page.locator('cmn-async-state')).toContainText(/Last synced .*2026/);
    });
  });
}

// A list page in a full-height page host (filter bar, chip row, segmented control, day groups), at
// the phone widths in use: iPhone SE, iPhone 15 and iPhone 16 Pro.
const LIST_WIDTHS = [
  {width: 375, height: 667},
  {width: 390, height: 844},
  {width: 402, height: 874},
] as const;
const LIST_STORIES = [
  {story: 'phone-overlay-list-page', notices: false},
  {story: 'phone-overlay-list-page-notices', notices: true},
] as const;
// The section whose heading is checked once it has scrolled up to the top bar.
const STICKY_SECTION = 2;
// How far past the pin point the section is scrolled, so its heading is held by sticky.
const STICKY_PROBE = 80;

/** The bottom edge of the pinned chrome: the top bar, or the notices stuck under it. */
async function pinnedChromeBottom(page: Page): Promise<number> {
  return page.evaluate(() => {
    const bar = document.querySelector('cmn-top-bar header')?.getBoundingClientRect().bottom ?? 0;
    const notices = document.querySelector('lk-offline-banner')?.parentElement;
    const stuck = notices?.getClientRects().length ? notices.getBoundingClientRect().bottom : 0;
    return Math.max(bar, stuck);
  });
}

/** Scrolls main to its end, then lists where `[data-last-content]` sits under the floating chrome. */
async function lastContentClash(page: Page): Promise<string[]> {
  await page.evaluate(() => {
    const main = document.querySelector('cmn-app-layout main');
    main?.scrollTo(0, main.scrollHeight);
  });
  await settleFrames(page);
  return page.evaluate(() => {
    const last = document.querySelector('[data-last-content]')?.getBoundingClientRect();
    const covers = [
      ['tab bar', document.querySelector('cmn-bottom-tab-bar nav')],
      ['floating action', document.querySelector('[cmnAppLayoutFab]')],
    ] as const;
    const found: string[] = [];
    if (!last) {
      return ['no [data-last-content] in the story'];
    }
    for (const [name, el] of covers) {
      const box = el?.getClientRects().length ? el.getBoundingClientRect() : null;
      if (box && last.bottom > box.top) {
        found.push(
          `last content bottom ${Math.round(last.bottom)} under the ${name} at ${Math.round(box.top)}`
        );
      }
    }
    return found;
  });
}

for (const size of LIST_WIDTHS) {
  test.describe(`list page ${size.width}x${size.height}`, () => {
    test.use({viewport: size, hasTouch: true, isMobile: true});

    for (const {story, notices} of LIST_STORIES) {
      test(`${story} | last content clears the tab bar`, async ({page}) => {
        await open(page, layoutStory(story));
        if (notices) {
          await page.waitForSelector('lk-offline-banner .banner', {state: 'visible'});
        }
        const clash = await lastContentClash(page);
        report(clash, 'enforce');
      });

      test(`${story} | no segmented or chip label overflows`, async ({page}) => {
        await open(page, layoutStory(story));
        const cut = await page.evaluate(() => {
          const found: string[] = [];
          const check = (label: Element, cell: Element, kind: string) => {
            const box = label.getBoundingClientRect();
            const holder = cell.getBoundingClientRect();
            const text = label.textContent?.trim() ?? '';
            if (
              label.scrollWidth > label.clientWidth + 0.5 ||
              box.left < holder.left - 0.5 ||
              box.right > holder.right + 0.5
            ) {
              found.push(`${kind} label "${text}" overflows (${Math.round(box.width)}px)`);
            }
          };
          // A segmented control never scrolls: every cell must also sit inside the viewport. A chip
          // row scrolls sideways by design, so only its labels are checked.
          const onScreen = (cell: Element, kind: string) => {
            const box = cell.getBoundingClientRect();
            if (box.left < -0.5 || box.right > window.innerWidth + 0.5) {
              found.push(`${kind} cell "${cell.textContent?.trim()}" runs off screen`);
            }
          };
          for (const cell of document.querySelectorAll('cmn-segmented [role=radio]')) {
            check(cell, cell, 'cmn-segmented');
            onScreen(cell, 'cmn-segmented');
          }
          for (const host of document.querySelectorAll('lk-segmented')) {
            for (const cell of host.shadowRoot?.querySelectorAll('.cell') ?? []) {
              check(cell, cell, 'lk-segmented');
              onScreen(cell, 'lk-segmented');
            }
          }
          for (const host of document.querySelectorAll('lk-chip-row')) {
            for (const chip of host.shadowRoot?.querySelectorAll('.chip') ?? []) {
              check(chip.querySelector('.pill') ?? chip, chip, 'lk-chip-row');
            }
          }
          if (document.documentElement.scrollWidth > window.innerWidth) {
            found.push('the page scrolls sideways');
          }
          return found;
        });
        report(cut, 'enforce');
      });

      test(`${story} | sticky section header pins flush under the top bar`, async ({page}) => {
        await open(page, layoutStory(story));
        if (notices) {
          await page.waitForSelector('lk-offline-banner .banner', {state: 'visible'});
        }
        const pin = await pinnedChromeBottom(page);
        await page.evaluate(
          ({index, pinAt, probe}) => {
            const main = document.querySelector('cmn-app-layout main');
            const section = document.querySelectorAll('cmn-list-section')[index];
            const top = section?.getBoundingClientRect().top ?? 0;
            main?.scrollBy(0, top - pinAt + probe);
          },
          {index: STICKY_SECTION, pinAt: pin, probe: STICKY_PROBE}
        );
        await settleFrames(page);
        const state = await page.evaluate(index => {
          const section = document.querySelectorAll('cmn-list-section')[index];
          const heading = section?.querySelector('h2')?.getBoundingClientRect();
          const box = section?.getBoundingClientRect();
          return {heading: heading?.top ?? -1, section: box?.top ?? -1};
        }, STICKY_SECTION);
        const problems: string[] = [];
        if (state.section >= pin) {
          problems.push(`section ${STICKY_SECTION} did not scroll past the pin point (${pin})`);
        }
        if (Math.abs(state.heading - pin) > SURFACE_TOLERANCE) {
          problems.push(
            `section header pinned at ${Math.round(state.heading)}, expected flush under the chrome at ${Math.round(pin)}`
          );
        }
        report(problems, 'enforce');
      });

      test(`${story} | targets >= 44`, async ({page}) => {
        await open(page, layoutStory(story));
        const small = await undersizedTargets(page, MIN_TARGET);
        report(
          small.map(s => `target under ${MIN_TARGET}: ${s}`),
          'enforce'
        );
      });
    }
  });
}

// A list that pages itself: scrolling to the end keeps loading until the end marker shows, and the
// marker, the last thing on the page, rests clear of the tab bar.
const INFINITE_STORY = 'phone-overlay-infinite-list';
const INFINITE_ROWS = 32;
const MAX_END_SCROLLS = 20;

for (const size of LIST_WIDTHS) {
  test.describe(`infinite list ${size.width}x${size.height}`, () => {
    test.use({viewport: size, hasTouch: true, isMobile: true});

    test(`${INFINITE_STORY} | scrolling reaches the end marker`, async ({page}) => {
      await open(page, layoutStory(INFINITE_STORY));
      const state = () =>
        page.evaluate(() => {
          const list = document.querySelector('lk-infinite-list');
          return {
            end: Boolean(list?.shadowRoot?.querySelector('[data-end]')),
            rows: document.querySelectorAll('cmn-list-item-row').length,
          };
        });
      let seen = await state();
      for (let i = 0; i < MAX_END_SCROLLS && !seen.end; i += 1) {
        await page.evaluate(() => {
          const main = document.querySelector('cmn-app-layout main');
          main?.scrollTo(0, main.scrollHeight);
        });
        await page.waitForTimeout(100);
        seen = await state();
      }
      const problems: string[] = [];
      if (!seen.end) {
        problems.push(`no end marker after ${MAX_END_SCROLLS} scrolls (${seen.rows} rows loaded)`);
      } else if (seen.rows !== INFINITE_ROWS) {
        problems.push(`end marker shows with ${seen.rows} of ${INFINITE_ROWS} rows loaded`);
      }
      report(problems, 'enforce');
      report(await lastContentClash(page), 'enforce');
    });
  });
}

// Page compositions the shell clears the chrome for, whatever the page is built from.
const COMPOSITION_STORIES = [
  'phone-overlay-content-after-container',
  'phone-overlay-sibling-containers',
  'phone-overlay-overflowing-host',
  'phone-overlay-chat-host',
] as const;
const WIDE_SEGMENTED_STORY = 'phone-overlay-wide-segmented';
const SHORT_PAGE_STORY = 'conformance-routed-app-layout--routed-short-page';
const SIBLING_STORY = 'phone-overlay-sibling-containers';
const CHAT_STORY = 'phone-overlay-chat-host';

for (const size of LIST_WIDTHS) {
  test.describe(`page composition ${size.width}x${size.height}`, () => {
    test.use({viewport: size, hasTouch: true, isMobile: true});

    for (const story of COMPOSITION_STORIES) {
      test(`${story} | last content clears the tab bar`, async ({page}) => {
        await open(page, layoutStory(story));
        report(await lastContentClash(page), 'enforce');
      });
    }

    test(`${SIBLING_STORY} | no gap opens between the containers`, async ({page}) => {
      await open(page, layoutStory(SIBLING_STORY));
      const gap = await page.evaluate(() => {
        const [first, second] = document.querySelectorAll('cmn-page-container');
        if (!first || !second) {
          return Number.NaN;
        }
        return second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
      });
      report(
        Math.abs(gap) <= SURFACE_TOLERANCE
          ? []
          : [`containers are ${gap}px apart, expected them flush`],
        'enforce'
      );
    });

    test(`${CHAT_STORY} | host fills the visible height, main does not scroll`, async ({page}) => {
      await open(page, layoutStory(CHAT_STORY));
      await settleFrames(page);
      const problems = await page.evaluate(() => {
        const main = document.querySelector('cmn-app-layout main');
        const host = document.querySelector('[data-chat-host]');
        const log = document.querySelector('[data-chat-log]');
        if (!main || !host || !log) {
          return ['chat story not rendered'];
        }
        const style = getComputedStyle(main);
        const visible =
          main.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        const found: string[] = [];
        if (Math.abs(host.getBoundingClientRect().height - visible) > 1) {
          found.push(
            `host is ${host.getBoundingClientRect().height}px, main shows ${visible}px of content`
          );
        }
        if (main.scrollHeight > main.clientHeight + 1) {
          found.push(`main scrolls: ${main.scrollHeight}px of content in ${main.clientHeight}px`);
        }
        if (log.scrollHeight <= log.clientHeight) {
          found.push('the chat log does not overflow, so the story proves nothing');
        }
        return found;
      });
      report(problems, 'enforce');
    });

    test('short page | a large title and a notice leave main nothing to scroll', async ({page}) => {
      await open(page, SHORT_PAGE_STORY);
      await page.waitForSelector('cmn-app-layout main h1', {state: 'visible'});
      await settleFrames(page);
      const state = await page.evaluate(() => {
        const main = document.querySelector('cmn-app-layout main');
        const notice = document.querySelector('cmn-app-layout [cmnAppLayoutNotice]');
        return {
          overflow: main ? main.scrollHeight - main.clientHeight : Number.NaN,
          notice: Boolean(notice?.getClientRects().length),
        };
      });
      const problems: string[] = [];
      if (!state.notice) {
        problems.push('the notice is not shown, so the story proves nothing');
      }
      if (!(state.overflow <= SURFACE_TOLERANCE)) {
        problems.push(`main scrolls ${state.overflow}px on a short page`);
      }
      report(problems, 'enforce');
    });

    test(`${WIDE_SEGMENTED_STORY} | an over-long row scrolls inside itself`, async ({page}) => {
      await open(page, layoutStory(WIDE_SEGMENTED_STORY));
      await settleFrames(page);
      const problems = await page.evaluate(() => {
        const found: string[] = [];
        const main = document.querySelector('cmn-app-layout main');
        const root = document.scrollingElement;
        if (main && main.scrollWidth > main.clientWidth) {
          found.push(`main scrolls sideways: ${main.scrollWidth}px in ${main.clientWidth}px`);
        }
        if (root && root.scrollWidth > root.clientWidth) {
          found.push(`the page scrolls sideways: ${root.scrollWidth}px in ${root.clientWidth}px`);
        }
        const rows: [string, Element, Element[]][] = [];
        const cmn = document.querySelector('cmn-segmented');
        if (cmn) {
          rows.push(['cmn-segmented', cmn, [...cmn.querySelectorAll('[role=radio]')]]);
        }
        const lk = document.querySelector('lk-segmented');
        if (lk) {
          rows.push(['lk-segmented', lk, [...(lk.shadowRoot?.querySelectorAll('.cell') ?? [])]]);
        }
        if (rows.length !== 2) {
          found.push('both segmented rows must render');
        }
        for (const [kind, host, cells] of rows) {
          if (host.scrollWidth <= host.clientWidth) {
            found.push(`${kind} fits, so the story proves nothing`);
          }
          const box = host.getBoundingClientRect();
          if (box.right > window.innerWidth + 0.5) {
            found.push(`${kind} runs off screen to ${Math.round(box.right)}px`);
          }
          for (const cell of cells) {
            if (cell.scrollWidth > cell.clientWidth + 0.5) {
              found.push(`${kind} cell "${cell.textContent?.trim()}" is clipped`);
            }
          }
        }
        return found;
      });
      report(problems, 'enforce');
    });
  });
}

// Skeleton presets copy the box of the component they stand in for, so the page does not shift
// when the content arrives (rule 5). Each pair sits in `Conformance/Skeleton Geometry`.
const SKELETON_STORY = 'conformance-skeleton-geometry--geometry';
const SKELETON_READY = 'cmn-skeleton-geometry';
const SKELETON_PAIRS = ['stat', 'chart', 'row', 'section'] as const;
const GEOMETRY_TOLERANCE = 8;
const SWEEP_PROBE_MS = 400;
const TRANSFORM_PROPERTIES = ['transform', 'translate', 'scale', 'rotate'];

for (const size of LIST_WIDTHS) {
  test.describe(`skeleton geometry ${size.width}x${size.height}`, () => {
    test.use({viewport: size, hasTouch: true, isMobile: true});

    for (const pair of SKELETON_PAIRS) {
      test(`${pair} | the skeleton is within ${GEOMETRY_TOLERANCE}px of the loaded component`, async ({
        page,
      }) => {
        await open(page, SKELETON_STORY, 'light', SKELETON_READY);
        await page.waitForSelector(`[data-pair="${pair}"] [data-loaded] > *`, {state: 'visible'});
        await settleFrames(page);
        const sizes = await page.evaluate(name => {
          // A custom element is inline by default: measure the box it draws, not its line box.
          const boxOf = (holder: Element | null) => {
            const first = holder?.firstElementChild ?? null;
            const el =
              first && getComputedStyle(first).display === 'inline'
                ? (first.firstElementChild ?? first)
                : first;
            const r = el?.getBoundingClientRect();
            return r ? {width: r.width, height: r.height} : null;
          };
          const pairEl = document.querySelector(`[data-pair="${name}"]`);
          return {
            skeleton: boxOf(pairEl?.querySelector('[data-skeleton]') ?? null),
            loaded: boxOf(pairEl?.querySelector('[data-loaded]') ?? null),
          };
        }, pair);
        const problems: string[] = [];
        if (!sizes.skeleton || !sizes.loaded) {
          problems.push(`${pair}: the skeleton or the loaded component did not render`);
        } else {
          for (const axis of ['width', 'height'] as const) {
            const gap = Math.abs(sizes.skeleton[axis] - sizes.loaded[axis]);
            if (gap > GEOMETRY_TOLERANCE) {
              problems.push(
                `${pair} skeleton ${axis} ${Math.round(sizes.skeleton[axis])}px, loaded ${Math.round(sizes.loaded[axis])}px`
              );
            }
          }
        }
        report(problems, 'enforce');
      });
    }
  });
}

/** Running animations that move something by transform, spinners excepted (they show work). */
async function runningTransformAnimations(page: Page): Promise<string[]> {
  return page.evaluate(properties => {
    const found: string[] = [];
    for (const animation of document.getAnimations()) {
      if (animation.playState !== 'running') {
        continue;
      }
      const effect = animation.effect as KeyframeEffect | null;
      const target = effect?.target ?? null;
      if (target?.closest('.animate-spin, .animate-cmn-spin')) {
        continue;
      }
      const props =
        animation instanceof CSSTransition
          ? [animation.transitionProperty]
          : (effect?.getKeyframes().flatMap(frame => Object.keys(frame)) ?? []);
      if (props.some(prop => properties.includes(prop))) {
        found.push(
          `${target?.tagName.toLowerCase()}.${String(target?.className).slice(0, 40)} ${props.join(',')}`
        );
      }
    }
    return found;
  }, TRANSFORM_PROPERTIES);
}

test.describe('motion', () => {
  test.use({viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true});

  // Guards the reduce check below against passing because nothing ever animates.
  test('skeleton | the sheen sweeps when motion is allowed', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await open(page, SKELETON_STORY, 'light', SKELETON_READY);
    await page.waitForTimeout(SWEEP_PROBE_MS);
    expect((await runningTransformAnimations(page)).length).toBeGreaterThan(0);
  });

  test('skeleton | no transform animation under Reduce Motion', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await open(page, SKELETON_STORY, 'light', SKELETON_READY);
    await page.waitForTimeout(SWEEP_PROBE_MS);
    report(await runningTransformAnimations(page), 'enforce');
  });

  test('sheet | no transform animation under Reduce Motion', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await open(page, layoutStory('phone-overlay-sheet-open'));
    await page.waitForSelector('cmn-drawer-container', {state: 'visible'});
    await page.waitForTimeout(SWEEP_PROBE_MS);
    report(await runningTransformAnimations(page), 'enforce');
  });
});

test.describe('desktop pointer', () => {
  test.use({viewport: {width: 1280, height: 800}});

  // Guards the touch check against passing because hints are never rendered at all
  test('palette | keyboard hints shown with a pointer', async ({page}) => {
    await openPalette(page);
    const hints = await visibleKeyHints(page);
    expect(hints).toContain('kbd[ESC]');
  });
});
