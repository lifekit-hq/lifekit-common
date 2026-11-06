import {type BaselineRoute, defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

// The reference app: the golden screens of the page templates, as the owner approves them. A
// template's story is the app (real shell, real components, realistic content), so a change to the
// template, a component or a token that moves a pixel on any of them shows up here.
// Each template holds its golden story in this list: List, Detail, Form, Settings and Overview.
const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;

// docs/SCREEN-BASELINES.md: the smallest ratio that is stable, at most 20 pixels of the desktop screen.
const AVATAR_EDGE_TOLERANCE = 20 / (1280 * 800);

/** One golden screen: the template's `Templates/<Kind>` story, opened at the size and scheme under test. */
function goldenScreen(kind: string): BaselineRoute {
  return {
    name: `templates-${kind}`,
    // The anti-aliased edge of the header avatar initials 'AM' rasterises 1-2 colour levels apart
    // between runs on the CI runner (one pixel at around x=1235, y=12), so overview desktop dark
    // alone is allowed a few pixels; every other screen compares exactly.
    ...(kind === 'overview'
      ? {screenMaxDiffPixelRatio: {'templates-overview-desktop-dark': AVATAR_EDGE_TOLERANCE}}
      : {}),
    url: ({scheme}) =>
      `/iframe.html?id=templates-${kind}--phone&viewMode=story&globals=theme:${STORYBOOK_THEME[scheme]}`,
    ready: async page => {
      await page.locator('cmn-page[data-cmn-page]').waitFor({state: 'visible'});
    },
  };
}

defineScreenBaselines(
  {test, expect},
  {routes: ['list', 'detail', 'form', 'settings', 'overview'].map(goldenScreen)}
);
