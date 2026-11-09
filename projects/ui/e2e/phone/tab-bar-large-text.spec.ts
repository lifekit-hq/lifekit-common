import {expect, type Page, test} from '@playwright/test';

import {layoutStory, openStory, settleFrames} from './phone-helpers';

// WCAG 1.4.4 and the Apple HIG on Dynamic Type: at 200 percent root text nothing in the phone tab
// bar clips. The bar grows with its labels (docs/PHONE-CONTRACT.md, rule on large text), so each
// label stays inside its tab and each tab inside the bar, docked or floating, on the golden shell
// and the app layout alike.

const PHONE = {width: 390, height: 844};
const ROOT_TEXT = '200%';
const TOLERANCE = 1;

const STORIES = [
  {id: 'shell-golden--matrix', ready: 'cmn-bottom-tab-bar nav'},
  {id: 'components-bottom-tab-bar--default', ready: 'cmn-bottom-tab-bar nav'},
  {id: 'components-bottom-tab-bar--floating', ready: 'cmn-bottom-tab-bar nav'},
  {id: 'components-bottom-tab-bar--large-text', ready: 'cmn-bottom-tab-bar nav'},
  {id: 'components-bottom-tab-bar--floating-large-text', ready: 'cmn-bottom-tab-bar nav'},
  {id: layoutStory('phone'), ready: 'cmn-bottom-tab-bar nav'},
];

/** Tab labels, or their buttons, that spill outside the bar or cut their own text, per bar. */
async function clippedTabs(page: Page): Promise<string[]> {
  return page.evaluate(tolerance => {
    const found: string[] = [];
    for (const nav of document.querySelectorAll('cmn-bottom-tab-bar nav')) {
      const bar = nav.getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(nav).paddingBottom);
      for (const button of nav.querySelectorAll('button')) {
        const tab = button.getBoundingClientRect();
        const label = button.querySelector(':scope > span:last-child') as HTMLElement;
        const text = label.getBoundingClientRect();
        const name = (label.textContent ?? '').trim();
        if (tab.bottom > bar.bottom - inset + tolerance || tab.top < bar.top - tolerance) {
          found.push(
            `${name}: tab ${Math.round(tab.bottom)} runs past the bar ${Math.round(bar.bottom - inset)}`
          );
        }
        if (text.bottom > tab.bottom + tolerance || text.top < tab.top - tolerance) {
          found.push(`${name}: label spills out of its tab`);
        }
        if (text.left < tab.left - tolerance || text.right > tab.right + tolerance) {
          found.push(`${name}: label wider than its tab`);
        }
        if (
          label.scrollWidth > label.clientWidth + tolerance ||
          label.scrollHeight > label.clientHeight + tolerance
        ) {
          found.push(`${name}: label text is cut`);
        }
        if (
          getComputedStyle(button).overflow !== 'visible' &&
          button.scrollHeight > button.clientHeight + tolerance
        ) {
          found.push(`${name}: tab content is cut`);
        }
      }
      if (nav.scrollWidth > nav.clientWidth + tolerance) {
        found.push(`bar scrolls sideways: ${nav.scrollWidth} in ${nav.clientWidth}`);
      }
    }
    return found;
  }, TOLERANCE);
}

const FLOATING_BAR_HEIGHT = 49;

test.describe('phone tab bar | default text', () => {
  test.use({viewport: PHONE, hasTouch: true, isMobile: true});

  test('the floating bar keeps its 49px of items', async ({page}) => {
    await openStory(page, 'components-bottom-tab-bar--floating', 'light', 'cmn-bottom-tab-bar nav');
    await settleFrames(page);
    const height = await page
      .locator('cmn-bottom-tab-bar nav')
      .evaluate(nav => nav.getBoundingClientRect().height);
    expect(height).toBe(FLOATING_BAR_HEIGHT);
  });
});

test.describe('phone tab bar | 200 percent root text', () => {
  test.use({viewport: PHONE, hasTouch: true, isMobile: true});

  for (const {id, ready} of STORIES) {
    test(`${id} | no tab label clips`, async ({page}) => {
      await openStory(page, id, 'light', ready);
      await page.evaluate(size => {
        document.documentElement.style.fontSize = size;
      }, ROOT_TEXT);
      await settleFrames(page);
      expect(await clippedTabs(page)).toEqual([]);
    });
  }
});
