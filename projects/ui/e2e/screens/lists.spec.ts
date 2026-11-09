import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

import {listsRoute} from './support/golden-routes';

// The golden lists screen (`Lists/Golden`): the list and table family Carbon step 3 re-specced, in its
// default, hover, focus and disabled states, at 390 and 1280, light and dark. The states a still page
// cannot hold are forced, and the row marked `data-swipe` is swiped open, through the DevTools
// protocol (support/golden-routes.ts), so a revealed tray is part of the picture.
defineScreenBaselines({test, expect}, {routes: [listsRoute()]});
