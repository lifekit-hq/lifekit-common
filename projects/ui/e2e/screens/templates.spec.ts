import {defineScreenBaselines} from '@lifekit-hq/tokens/screen';
import {expect, test} from '@playwright/test';

import {templateRoutes} from './support/golden-routes';

// The reference app: the golden screens of the page templates, as the owner approves them. A
// template's story is the app (real shell, real components, realistic content), so a change to the
// template, a component or a token that moves a pixel on any of them shows up here.
// Each template holds its golden story in this list: List, Detail, Form, Settings and Overview,
// and Detail holds two more, the tile grid and the verdict header.
defineScreenBaselines({test, expect}, {routes: templateRoutes()});
