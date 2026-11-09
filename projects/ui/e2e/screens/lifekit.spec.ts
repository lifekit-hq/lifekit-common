import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

import {controlsRoute, listsRoute, shellRoute, templateRoutes} from './support/golden-routes';

// The Lifekit preset (`data-preset="lifekit"`, tokens/presets/lifekit.css): the same golden stories
// the Carbon specs hold, opened with the Storybook toolbar's `preset` global set, at 390 and 1280,
// light and dark. Carbon's own baselines are untouched by it (templates, controls, lists and shell
// specs); these sit beside them as `lifekit-<screen>`. The images come from the Update screen
// baselines workflow, never from a local run.
const PRESET = 'lifekit';

defineScreenBaselines(
  {test, expect},
  {
    routes: [
      ...templateRoutes(PRESET),
      controlsRoute(PRESET),
      listsRoute(PRESET),
      shellRoute(PRESET),
    ],
  }
);
