import {expect, type Page, test} from '@playwright/test';

// Checks docs/PHONE-CONTRACT.md against the built app-layout stories. Report-only by default:
// a violation becomes a `violation` annotation (collected by summary-reporter.ts) and the test
// stays green. PHONE_CONFORMANCE=gate turns every violation into a failure. Checks marked
// `enforce` below always fail: the guarantee behind them is built, so they only ever raise the bar.

const GATING = process.env['PHONE_CONFORMANCE'] === 'gate';

const MIN_TARGET = 44;
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

const STORIES = ['phone', 'phone-overlay'] as const;
// Layout stories that differ in their tab labels (up to four tabs and More).
const TAB_STORIES = ['phone', 'phone-overlay', 'phone-default-tabs', 'phone-active-in-more'];

const THEME_COLOR_METAS = [
  {content: '#f3f5f6', media: '(prefers-color-scheme: light)'},
  {content: '#0c1113', media: '(prefers-color-scheme: dark)'},
];

type Theme = 'light' | 'dark';

const layoutStory = (story: string) => `components-app-layout--${story}`;
const ROUTED_STORY = 'conformance-routed-app-layout--routed';
// Chips and a link in a card: small controls the layout stories do not hold.
const TARGETS_STORY = 'conformance-touch-targets--targets';
const PALETTE_STORY = 'components-command-palette--playground';
const LAYOUT_READY = 'cmn-app-layout > div';
const TARGETS_READY = 'cmn-touch-targets';

async function open(
  page: Page,
  storyId: string,
  theme: Theme = 'light',
  ready: string = LAYOUT_READY
) {
  // The head carries the browser chrome metas, as an app's index.html does.
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
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story&globals=theme:${theme}`);
  await page.waitForSelector(ready, {state: 'visible'});
}

/** Records violations; fails when gating, or when this check always enforces. */
function report(violations: string[], enforce = false) {
  for (const detail of violations) {
    test.info().annotations.push({type: 'violation', description: detail});
  }
  if (GATING || enforce) {
    expect(violations).toEqual([]);
  }
}

/** Interactive controls that measure under `min` px in either direction, hit-slop included. */
async function undersizedTargets(page: Page, min: number): Promise<string[]> {
  return page.evaluate(limit => {
    const found: string[] = [];
    const selector = 'button, a[href], [role=button], [role=tab], input, select';
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      // A control may press wider than it draws: `.cmn-hit-slop` paints its target in ::after
      const slop = getComputedStyle(el, '::after');
      const slopped = slop.content !== 'none' && slop.position === 'absolute';
      const width = Math.max(r.width, slopped ? parseFloat(slop.width) : 0);
      const height = Math.max(r.height, slopped ? parseFloat(slop.height) : 0);
      if (r.width && r.height && (width < limit || height < limit)) {
        const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
        found.push(
          `${el.tagName.toLowerCase()}[${label.slice(0, 24)}] ${Math.round(width)}x${Math.round(height)}`
        );
      }
    }
    return found;
  }, min);
}

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
          vp.touchChrome
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
        report(problems, true);
      });
    }

    test(`${vp.name} | touch-targets | targets >= 44`, async ({page}) => {
      await open(page, TARGETS_STORY, 'light', TARGETS_READY);
      const small = await undersizedTargets(page, MIN_TARGET);
      report(
        small.map(s => `target under ${MIN_TARGET}: ${s}`),
        vp.touchChrome
      );
    });

    test(`${vp.name} | keyboard hints hidden on touch`, async ({page}) => {
      await open(page, layoutStory('phone-overlay'));
      const hints = await visibleKeyHints(page);
      await openPalette(page);
      hints.push(...(await visibleKeyHints(page)));
      report(
        hints.map(h => `keyboard hint shown on touch: ${h}`),
        true
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
      report(cut, true);
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

// Overlays never cover the chrome: notices sit between the top bar and the tab bar, and the
// floating action hides while a bottom sheet is open.
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

test.describe('desktop pointer', () => {
  test.use({viewport: {width: 1280, height: 800}});

  // Guards the touch check against passing because hints are never rendered at all
  test('palette | keyboard hints shown with a pointer', async ({page}) => {
    await openPalette(page);
    const hints = await visibleKeyHints(page);
    expect(hints).toContain('kbd[ESC]');
  });
});
