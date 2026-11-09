import {type BaselineRoute} from '@lifekit-hq/tokens/screen';
import {type Page} from '@playwright/test';

// The golden screens as baseline routes, shared by the Carbon specs (`templates.spec.ts`,
// `controls.spec.ts`, `lists.spec.ts`, `shell.spec.ts`) and the other presets' (`lifekit.spec.ts`).
// A preset is the Storybook toolbar's `preset` global: leave it out for Carbon, the default, and the
// URLs and baseline names are the ones the Carbon specs always had; pass an id and each route is the
// same story under that preset, its baseline named `<preset>-<screen>`.

const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;

type Scheme = keyof typeof STORYBOOK_THEME;

/** The `globals` query value for a scheme and an optional preset (`theme:dark;preset:lifekit`). */
function globals(scheme: Scheme, preset?: string): string {
  const theme = `theme:${STORYBOOK_THEME[scheme]}`;
  return preset ? `${theme};preset:${preset}` : theme;
}

function routeName(name: string, preset?: string): string {
  return preset ? `${preset}-${name}` : name;
}

function storyUrl(id: string, scheme: Scheme, preset?: string): string {
  return `/iframe.html?id=${id}&viewMode=story&globals=${globals(scheme, preset)}`;
}

/**
 * One golden screen of a page template: the `Templates/<Kind>` story, opened at the size and scheme
 * under test. A named state (`with-tiles`) is a screen of its own, as in the route scan.
 */
function templateRoute(kind: string, state = '', preset?: string): BaselineRoute {
  const suffix = state ? `-${state}` : '';
  return {
    name: routeName(`templates-${kind}${suffix}`, preset),
    url: ({scheme}) => storyUrl(`templates-${kind}--phone${suffix}`, scheme, preset),
    ready: async (page: Page): Promise<void> => {
      await page.locator('cmn-page[data-cmn-page]').waitFor({state: 'visible'});
    },
  };
}

/** The templates' golden screens: the five kinds and the two detail states. */
export function templateRoutes(preset?: string): BaselineRoute[] {
  return [
    ...['list', 'detail', 'form', 'settings', 'overview'].map(kind =>
      templateRoute(kind, '', preset)
    ),
    templateRoute('detail', 'with-tiles', preset),
    // The detail template led by its verdict header (`cmn-verdict-header`).
    templateRoute('detail', 'with-verdict', preset),
  ];
}

const CONTROL_STATES: Record<string, string[]> = {
  hover: ['hover'],
  focus: ['focus', 'focus-visible'],
};

/**
 * A still page cannot hover or focus, so a wrapper marked `data-force` names the state it holds and
 * this forces that pseudo-class on the controls inside it through the DevTools protocol (Chromium
 * only, which is the only browser the baselines are drawn in).
 */
async function forceControlStates(page: Page, controls: string): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  const {root} = await session.send('DOM.getDocument', {depth: -1, pierce: true});
  for (const [state, pseudoClasses] of Object.entries(CONTROL_STATES)) {
    const {nodeIds} = await session.send('DOM.querySelectorAll', {
      nodeId: root.nodeId,
      selector: `[data-force="${state}"] ${controls}`,
    });
    for (const nodeId of nodeIds) {
      await session.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: pseudoClasses});
    }
  }
}

/** The controls matrix (`Controls/Golden`): every control in its default, hover, focus, disabled and error states. */
export function controlsRoute(preset?: string): BaselineRoute {
  return {
    name: routeName('controls-golden', preset),
    url: ({scheme}) => storyUrl('controls-golden--matrix', scheme, preset),
    ready: async (page: Page): Promise<void> => {
      await page.locator('[data-controls-golden]').waitFor({state: 'visible'});
      await forceControlStates(page, ':is(button, input, textarea)');
    },
    // The matrix is taller than a screen: the whole page is the screen under test.
    fullPage: true,
  };
}

const SWIPE_PX = 120;
const SWIPE_STEPS = 6;
const HALF = 2;

/** Swipes the `data-swipe` row open toward its trailing action with a real touch through the protocol. */
async function swipeRow(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 1});
  const surface = page.locator('[data-swipe] .touch-pan-y');
  // A touch outside the viewport lands on nothing, so bring the row on screen first.
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  if (!box) {
    throw new Error('the swipe row is not on screen');
  }
  const y = box.y + box.height / HALF;
  const at = (i: number): {x: number; y: number}[] => [
    {x: box.x + box.width / HALF - (SWIPE_PX * i) / SWIPE_STEPS, y},
  ];
  await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: at(0)});
  for (let i = 1; i <= SWIPE_STEPS; i++) {
    await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: at(i)});
  }
  await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  // Puts the sticky section headings back where the still page draws them.
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * The list and table family (`Lists/Golden`): tabs, the segmented switcher, search, contained-list
 * rows, the structured list, expandable rows and the data table, with hover, focus and a row swiped open.
 */
export function listsRoute(preset?: string): BaselineRoute {
  return {
    name: routeName('lists-golden', preset),
    url: ({scheme}) => storyUrl('lists-golden--matrix', scheme, preset),
    ready: async (page: Page): Promise<void> => {
      await page.locator('[data-lists-golden]').waitFor({state: 'visible'});
      await forceControlStates(page, ':is(button, input, textarea, a, [role="radio"])');
      await swipeRow(page);
    },
    // The matrix is taller than a screen: the whole page is the screen under test.
    fullPage: true,
  };
}

const SHELL_FORCED: readonly {selector: string; pseudoClasses: string[]}[] = [
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

/**
 * The shell (`Shell/Golden`): the header, side nav, rail and the phone tab bar, with a hovered and a
 * focused side-nav link and a hovered and a focused header button forced through the protocol.
 */
export function shellRoute(preset?: string): BaselineRoute {
  return {
    name: routeName('shell-golden', preset),
    url: ({scheme}) => storyUrl('shell-golden--matrix', scheme, preset),
    ready: async (page: Page): Promise<void> => {
      await page.locator('[data-shell-golden]').waitFor({state: 'visible'});
      const session = await page.context().newCDPSession(page);
      await session.send('DOM.enable');
      await session.send('CSS.enable');
      const {root} = await session.send('DOM.getDocument', {depth: -1, pierce: true});
      for (const {selector, pseudoClasses} of SHELL_FORCED) {
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
}
