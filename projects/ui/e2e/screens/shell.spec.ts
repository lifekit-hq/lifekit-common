import {type BaselineRoute, defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

// The golden shell screen (`Shell/Golden`): the desktop chrome Carbon step 4 re-specced (header,
// side nav, rail) and the phone tab bar, at 390 and 1280, light and dark. A still page cannot hover
// or focus, so the frame marked `data-shell-states` has these forced through the DevTools protocol
// (Chromium only, which is the only browser the baselines are drawn in): a hovered and a focused
// side-nav link, a hovered header button and a focused search trigger.
const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;

const FORCED: readonly {selector: string; pseudoClasses: string[]}[] = [
  {
    selector: '[data-shell-states] cmn-sidebar-nav nav button:nth-of-type(3)',
    pseudoClasses: ['hover'],
  },
  {
    selector: '[data-shell-states] cmn-sidebar-nav nav button:nth-of-type(4)',
    pseudoClasses: ['focus', 'focus-visible'],
  },
  {
    selector: '[data-shell-states] cmn-top-bar button[aria-label="Toggle theme"]',
    pseudoClasses: ['hover'],
  },
  {
    selector: '[data-shell-states] cmn-top-bar button[aria-label="Search"]',
    pseudoClasses: ['focus', 'focus-visible'],
  },
];

const shell: BaselineRoute = {
  name: 'shell-golden',
  url: ({scheme}) =>
    `/iframe.html?id=shell-golden--matrix&viewMode=story&globals=theme:${STORYBOOK_THEME[scheme]}`,
  ready: async page => {
    await page.locator('[data-shell-golden]').waitFor({state: 'visible'});
    const session = await page.context().newCDPSession(page);
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const {root} = await session.send('DOM.getDocument', {depth: -1, pierce: true});
    for (const {selector, pseudoClasses} of FORCED) {
      const {nodeId} = await session.send('DOM.querySelector', {nodeId: root.nodeId, selector});
      if (!nodeId) {
        throw new Error(`shell golden: nothing matches ${selector}`);
      }
      await session.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: pseudoClasses});
    }
  },
  // The matrix is taller than a screen: the whole page is the screen under test.
  fullPage: true,
};

defineScreenBaselines({test, expect}, {routes: [shell]});
