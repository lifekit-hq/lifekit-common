import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

import {shellRoute} from './support/golden-routes';

// The golden shell screen (`Shell/Golden`): the desktop chrome Carbon step 4 re-specced (header,
// side nav, rail) and the phone tab bar, at 390 and 1280, light and dark. The hover and focus states
// are forced through the DevTools protocol (support/golden-routes.ts).
defineScreenBaselines({test, expect}, {routes: [shellRoute()]});
