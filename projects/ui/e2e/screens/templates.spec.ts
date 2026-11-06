import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

// The reference app: the golden screens of the page templates, as the owner approves them. A
// template's story is the app (real shell, real components, realistic content), so a change to the
// template, a component or a token that moves a pixel on any of them shows up here.
// `Templates/List` is the only template held here today; each new template adds its golden story to this list.
const STORYBOOK_THEME = {light: 'light', dark: 'dark'} as const;

defineScreenBaselines(
  {test, expect},
  {
    routes: [
      {
        name: 'templates-list',
        url: ({scheme}) =>
          `/iframe.html?id=templates-list--phone&viewMode=story&globals=theme:${STORYBOOK_THEME[scheme]}`,
        ready: async page => {
          await page.locator('cmn-page[data-cmn-page]').waitFor({state: 'visible'});
        },
      },
    ],
  }
);
