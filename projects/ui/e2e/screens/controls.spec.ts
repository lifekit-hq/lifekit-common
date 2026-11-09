import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

import {controlsRoute} from './support/golden-routes';

// The golden controls screen (`Controls/Golden`): every control Carbon step 2 re-specced, in its
// default, hover, focus, disabled and error states, at 390 and 1280, light and dark. The states a
// still page cannot hold are forced through the DevTools protocol (support/golden-routes.ts).
defineScreenBaselines({test, expect}, {routes: [controlsRoute()]});
