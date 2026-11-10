import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import {BRAND_APPS, type BrandApp} from '@lifekit-hq/tokens/brand/mark';

import {APP_MARK, AppMarkService} from '../services/app-mark/app-mark.service';

export interface AppMarkConfig {
  /**
   * Keep the SVG favicon on the user's chosen colour (default). Turn it off for an app that
   * serves a fixed icon, or whose CSP has no `data:` in `img-src`.
   */
  readonly followSeed?: boolean;
}

/**
 * Sets the app's own mark: the glyph `<cmn-app-mark>` draws and the favicon follows. `app` is the
 * app's initials from `@lifekit-hq/tokens/brand/mark` (`lk`, `fs`, `dc`, `bk`); its build-time icon
 * set comes from `@lifekit-hq/tokens/brand/<app>/`.
 *
 * @throws Error when `app` has no mark.
 */
export function provideAppMark(app: BrandApp, config: AppMarkConfig = {}): EnvironmentProviders {
  if (!BRAND_APPS.includes(app)) {
    throw new Error(`provideAppMark: no mark for "${app}" (known: ${BRAND_APPS.join(', ')})`);
  }
  return makeEnvironmentProviders([
    {provide: APP_MARK, useValue: app},
    provideEnvironmentInitializer(() => {
      if (config.followSeed ?? true) {
        inject(AppMarkService).followSeed();
      }
    }),
  ]);
}
