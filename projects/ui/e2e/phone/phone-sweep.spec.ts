import {test} from '@playwright/test';

import {
  layoutStory,
  MIN_TARGET,
  openStory,
  report,
  settleFrames,
  undersizedTargets,
} from './phone-helpers';

// The phone shell across the phone sizes in use, iPhone SE to Pro Max (see PHONE-CONTRACT.md,
// "Phone sizes"). Every check here is enforced: the sizes are guaranteed, not advisory.
const ROUTED_STORY = 'conformance-routed-app-layout--routed';

// Every width at the short and the tall screen. `env(safe-area-inset-*)` is 0 in headless Chromium, so the bar's height is its 49pt.
const SWEEP_WIDTHS = [320, 360, 375, 390, 393, 412, 430] as const;
const SWEEP_HEIGHTS = [667, 932] as const;
const TAB_BAR_ITEMS_HEIGHT = 49;
const GUTTER = 16;
// Longer than the bar's colour transition, so a measurement is of the settled state.
const TRANSITION_SETTLE = 250;
const MIN_FIELD_TEXT = 16;
const SWEEP_STORIES = ['phone-overlay-list-page', 'phone-overlay'] as const;

for (const width of SWEEP_WIDTHS) {
  for (const height of SWEEP_HEIGHTS) {
    test.describe(`phone sweep ${width}x${height}`, () => {
      test.use({viewport: {width, height}, hasTouch: true, isMobile: true});

      for (const story of SWEEP_STORIES) {
        test(`${story} | nothing scrolls sideways, text stays inside the gutters`, async ({
          page,
        }) => {
          await openStory(page, layoutStory(story));
          await settleFrames(page);
          const problems = await page.evaluate(
            ({gutter, viewportWidth}) => {
              const found: string[] = [];
              const main = document.querySelector('cmn-app-layout main');
              const root = document.documentElement;
              if (root.scrollWidth > viewportWidth) {
                found.push(`document is ${root.scrollWidth}px wide`);
              }
              if (main && main.scrollWidth > main.clientWidth) {
                found.push(`main is ${main.scrollWidth}px wide in ${main.clientWidth}px`);
              }
              for (const el of document.querySelectorAll(
                'cmn-app-layout main cmn-filter-bar, cmn-app-layout main cmn-list-section, cmn-app-layout main h1'
              )) {
                const box = el.getBoundingClientRect();
                if (box.left < gutter - 0.5 || box.right > viewportWidth - gutter + 0.5) {
                  found.push(
                    `${el.tagName.toLowerCase()} spans ${Math.round(box.left)}-${Math.round(box.right)}, gutters are ${gutter}px`
                  );
                }
              }
              return found;
            },
            {gutter: GUTTER, viewportWidth: width}
          );
          report(problems, 'enforce');
        });

        test(`${story} | tab bar sits on the bottom edge and labels fit`, async ({page}) => {
          await openStory(page, layoutStory(story));
          await settleFrames(page);
          const problems = await page.evaluate(
            ({items, viewportHeight, viewportWidth}) => {
              const found: string[] = [];
              const nav = document.querySelector('cmn-bottom-tab-bar nav');
              const box = nav?.getBoundingClientRect();
              if (!nav || !box) {
                return ['no tab bar'];
              }
              if (Math.abs(box.bottom - viewportHeight) > 1) {
                found.push(
                  `tab bar ends at ${Math.round(box.bottom)}, screen ends at ${viewportHeight}`
                );
              }
              if (Math.abs(box.height - items) > 1) {
                found.push(`tab bar is ${Math.round(box.height)}px tall, expected ${items}`);
              }
              if (box.left > 0.5 || box.right < viewportWidth - 0.5) {
                found.push(`tab bar spans ${Math.round(box.left)}-${Math.round(box.right)}`);
              }
              for (const label of nav.querySelectorAll('button > span')) {
                const tab = label.parentElement?.getBoundingClientRect();
                const text = label.getBoundingClientRect();
                if (
                  label.scrollWidth > label.clientWidth ||
                  (tab && (text.left < tab.left - 0.5 || text.right > tab.right + 0.5)) ||
                  text.right > viewportWidth + 0.5
                ) {
                  found.push(`tab label "${label.textContent?.trim()}" is cut`);
                }
              }
              return found;
            },
            {items: TAB_BAR_ITEMS_HEIGHT, viewportHeight: height, viewportWidth: width}
          );
          report(problems, 'enforce');
        });

        test(`${story} | targets >= 44, fields >= 16px, no double-tap zoom`, async ({page}) => {
          await openStory(page, layoutStory(story));
          await settleFrames(page);
          const small = (await undersizedTargets(page, MIN_TARGET)).map(
            s => `target under ${MIN_TARGET}: ${s}`
          );
          const fields = await page.evaluate(min => {
            const found: string[] = [];
            for (const el of document.querySelectorAll('input, select, textarea')) {
              const size = parseFloat(getComputedStyle(el).fontSize);
              if (el.getClientRects().length && size < min) {
                found.push(`${el.tagName.toLowerCase()} text is ${size}px, iOS zooms below ${min}`);
              }
            }
            const shell = document.querySelector('cmn-app-layout > div');
            if (shell && getComputedStyle(shell).touchAction !== 'manipulation') {
              found.push('shell does not set touch-action: manipulation');
            }
            return found;
          }, MIN_FIELD_TEXT);
          report([...small, ...fields], 'enforce');
        });
      }

      test('routed | the top bar is a transparent 44pt scroll edge until content scrolls under it', async ({
        page,
      }) => {
        await openStory(page, ROUTED_STORY);
        await settleFrames(page);
        const edge = () =>
          page.evaluate(() => {
            const header = document.querySelector('cmn-top-bar header');
            const style = header ? getComputedStyle(header) : null;
            return {
              height: header?.getBoundingClientRect().height ?? 0,
              fill: style?.backgroundColor ?? '',
              hairline: style?.borderBottomColor ?? '',
            };
          });
        const transparent = 'rgba(0, 0, 0, 0)';
        await page.waitForTimeout(TRANSITION_SETTLE);
        const atTop = await edge();
        const problems: string[] = [];
        if (Math.abs(atTop.height - 44) > 1) {
          problems.push(`top bar is ${Math.round(atTop.height)}px tall, expected 44`);
        }
        if (atTop.fill !== transparent || atTop.hairline !== transparent) {
          problems.push(`top bar has a fill or hairline at the scroll edge: ${atTop.fill}`);
        }
        await page.evaluate(() => document.querySelector('cmn-app-layout main')?.scrollTo(0, 12));
        await settleFrames(page);
        await page.waitForTimeout(TRANSITION_SETTLE);
        const scrolled = await edge();
        if (scrolled.fill === transparent) {
          problems.push('top bar stays transparent with content scrolled under it');
        }
        report(problems, 'enforce');
      });
    });
  }
}
