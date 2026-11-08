import {type BaselineRoute, defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

// The golden What's new screens (`Templates/Whats new`, #268): the Settings page with its About
// section, once with the sheet open on the releases (a bottom sheet at 390, a side panel at 1280)
// and once before it is opened, with the dot on What's new. Light and dark at both sizes.
const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;

/** One golden screen: the story is the app (real shell, real components, fake releases). */
function goldenScreen(name: string, story: string, ready: string): BaselineRoute {
  return {
    name,
    url: ({scheme}) =>
      `/iframe.html?id=templates-whats-new--${story}&viewMode=story&globals=theme:${STORYBOOK_THEME[scheme]}`,
    ready: async page => {
      await page.locator('cmn-page[data-cmn-page]').waitFor({state: 'visible'});
      await page.locator(ready).first().waitFor({state: 'visible'});
    },
  };
}

defineScreenBaselines(
  {test, expect},
  {
    routes: [
      // The sheet is open once its first release is drawn: the fetch has settled.
      goldenScreen('whats-new-sheet', 'phone', '[data-whats-new-version="4.5.0"]'),
      // The dot is on the button once the unread release's notes have been fetched.
      goldenScreen('whats-new-badge', 'phone-with-badge', '.cmn-badge-indicator'),
    ],
  }
);
