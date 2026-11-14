import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

import {controlsRoute, listsRoute, shellRoute, templateRoutes} from './support/golden-routes';

// The Linear preset (`data-preset="linear"`, tokens/presets/linear.css): the same golden stories
// the Carbon and Lifekit specs hold, opened with the Storybook toolbar's `preset` global set, at 390
// and 1280, light and dark (dark is the look's default; light holds the same checks). They sit beside
// the other presets' as `linear-<screen>`. The images come from the Update screen baselines
// workflow, never from a local run.
const PRESET = 'linear';

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
