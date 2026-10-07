import {expect, type Page, test} from '@playwright/test';

// Checks docs/PHONE-CONTRACT.md against the built app-layout stories. Report-only by default:
// a violation becomes a `violation` annotation (collected by summary-reporter.ts) and the test
// stays green. PHONE_CONFORMANCE=gate turns every violation into a failure.

const GATING = process.env['PHONE_CONFORMANCE'] === 'gate';

const MIN_TARGET = 44;
const MIN_TEXT = 12;
const SCROLL_PROBE = 300;
const SURFACE_TOLERANCE = 1;

const VIEWPORTS = [
  {name: 'phone 390x844', width: 390, height: 844, tabs: true},
  {name: 'landscape 844x390', width: 844, height: 390, tabs: true},
  {name: 'tablet 820x1180', width: 820, height: 1180, tabs: false},
] as const;

const STORIES = ['phone', 'phone-overlay'] as const;

const THEME_COLOR_METAS = [
  {content: '#f3f5f6', media: '(prefers-color-scheme: light)'},
  {content: '#0c1113', media: '(prefers-color-scheme: dark)'},
];

type Theme = 'light' | 'dark';

async function open(page: Page, story: string, theme: Theme = 'light') {
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
  await page.goto(
    `/iframe.html?id=components-app-layout--${story}&viewMode=story&globals=theme:${theme}`
  );
  await page.waitForSelector('cmn-app-layout > div', {state: 'visible'});
}

/** Records violations; fails only when gating. */
function report(violations: string[]) {
  for (const detail of violations) {
    test.info().annotations.push({type: 'violation', description: detail});
  }
  if (GATING) {
    expect(violations).toEqual([]);
  }
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
        await open(page, story);
        const small = await page.evaluate(min => {
          const found: string[] = [];
          const selector = 'button, a[href], [role=button], [role=tab], input, select';
          for (const el of document.querySelectorAll(selector)) {
            const r = el.getBoundingClientRect();
            if (r.width && r.height && (r.width < min || r.height < min)) {
              const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
              found.push(
                `${el.tagName.toLowerCase()}[${label.slice(0, 24)}] ${Math.round(r.width)}x${Math.round(r.height)}`
              );
            }
          }
          return found;
        }, MIN_TARGET);
        report(small.map(s => `target under ${MIN_TARGET}: ${s}`));
      });

      test(`${id} | text >= 12px`, async ({page}) => {
        await open(page, story);
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
        await open(page, story);
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
        await open(page, story);
        const tabs = page.locator('cmn-bottom-tab-bar nav');
        const visible = (await tabs.count()) > 0 && (await tabs.first().isVisible());
        const problems: string[] = [];
        if (vp.tabs && !visible) {
          problems.push(`tab bar missing at ${vp.width}x${vp.height}`);
        }
        if (!vp.tabs && visible) {
          problems.push(`tab bar shown at ${vp.width}x${vp.height}, expected the rail`);
        }
        report(problems);
      });

      // `phone` has no scrollable body; only the overlay story gives main something to scroll.
      if (story === 'phone-overlay') {
        test(`${id} | back restores scroll`, async ({page}) => {
          await open(page, story);
          const main = page.locator('cmn-app-layout main');
          await main.evaluate((el, y) => el.scrollTo(0, y), SCROLL_PROBE);
          await page.evaluate(() => history.pushState({}, '', '#detail'));
          await page.goBack();
          await page.waitForTimeout(200);
          const top = await main.evaluate(el => el.scrollTop);
          report(
            top === SCROLL_PROBE ? [] : [`scrollTop ${top} after back, expected ${SCROLL_PROBE}`]
          );
        });
      }
    }

    for (const theme of ['light', 'dark'] as const) {
      test(`${vp.name} | ${theme} | theme-color matches the surface`, async ({page}) => {
        await page.emulateMedia({colorScheme: theme});
        await open(page, 'phone', theme);
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
