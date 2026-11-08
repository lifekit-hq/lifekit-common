import {type BaselineRoute, defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, type Page, test} from '@playwright/test';

// The golden lists screen (`Lists/Golden`): the list and table family Carbon step 3 re-specced, in its
// default, hover, focus and disabled states, at 390 and 1280, light and dark. A still page
// cannot hover or focus, so a wrapper marked `data-force` names the state it holds and this spec
// forces that pseudo-class on the control inside it through the DevTools protocol (Chromium only,
// which is the only browser the baselines are drawn in). The row marked `data-swipe` is swiped open
// the same way, so a revealed tray is part of the picture.
const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;

const FORCED_PSEUDO_CLASSES: Record<string, string[]> = {
  hover: ['hover'],
  focus: ['focus', 'focus-visible'],
};

const CONTROLS = ':is(button, input, textarea, a, [role="radio"])';

async function forceStates(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  const {root} = await session.send('DOM.getDocument', {depth: -1, pierce: true});
  for (const [state, pseudoClasses] of Object.entries(FORCED_PSEUDO_CLASSES)) {
    const {nodeIds} = await session.send('DOM.querySelectorAll', {
      nodeId: root.nodeId,
      selector: `[data-force="${state}"] ${CONTROLS}`,
    });
    for (const nodeId of nodeIds) {
      await session.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: pseudoClasses});
    }
  }
}

const SWIPE_PX = 120;
const SWIPE_STEPS = 6;

/** Swipes the `data-swipe` row open toward its trailing action with a real touch through the protocol. */
async function swipeRow(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 1});
  const box = await page.locator('[data-swipe] .touch-pan-y').boundingBox();
  if (!box) {
    throw new Error('the swipe row is not on screen');
  }
  const y = box.y + box.height / 2;
  const at = (i: number): {x: number; y: number}[] => [
    {x: box.x + box.width / 2 - (SWIPE_PX * i) / SWIPE_STEPS, y},
  ];
  await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: at(0)});
  for (let i = 1; i <= SWIPE_STEPS; i++) {
    await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: at(i)});
  }
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
}

const lists: BaselineRoute = {
  name: 'lists-golden',
  url: ({scheme}) =>
    `/iframe.html?id=lists-golden--matrix&viewMode=story&globals=theme:${STORYBOOK_THEME[scheme]}`,
  ready: async page => {
    await page.locator('[data-lists-golden]').waitFor({state: 'visible'});
    await forceStates(page);
    await swipeRow(page);
  },
  // The matrix is taller than a screen: the whole page is the screen under test.
  fullPage: true,
};

defineScreenBaselines({test, expect}, {routes: [lists]});
