import {type BaselineRoute, defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

// The reference app: the golden screens of the page templates, as the owner approves them. A
// template's story is the app (real shell, real components, realistic content), so a change to the
// template, a component or a token that moves a pixel on any of them shows up here.
// Each template holds its golden story in this list: List, Detail, Form, Settings and Overview,
// and Detail holds two more, the tile grid and the verdict header.
const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;

/**
 * One golden screen: the template's `Templates/<Kind>` story, opened at the size and scheme under
 * test. A named state (`with-tiles`) is a screen of its own, as in the route scan.
 */
function goldenScreen(kind: string, state = ''): BaselineRoute {
  const suffix = state ? `-${state}` : '';
  return {
    name: `templates-${kind}${suffix}`,
    url: ({scheme}) =>
      `/iframe.html?id=templates-${kind}--phone${suffix}&viewMode=story&globals=theme:${STORYBOOK_THEME[scheme]}`,
    ready: async page => {
      await page.locator('cmn-page[data-cmn-page]').waitFor({state: 'visible'});
    },
  };
}

defineScreenBaselines(
  {test, expect},
  {
    routes: [
      ...['list', 'detail', 'form', 'settings', 'overview'].map(kind => goldenScreen(kind)),
      goldenScreen('detail', 'with-tiles'),
      // The detail template led by its verdict header (`cmn-verdict-header`).
      goldenScreen('detail', 'with-verdict'),
    ],
  }
);
