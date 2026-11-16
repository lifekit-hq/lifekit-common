import {type EnvironmentProviders, InjectionToken, makeEnvironmentProviders} from '@angular/core';

/** The app's version label (`v3.2.0`), set once by `provideAppVersion` from the build's define. */
export const CMN_APP_VERSION = new InjectionToken<string>('CMN_APP_VERSION');

/**
 * Gives the app's version to the shell: `cmn-app-layout` shows it in the sidebar footer and
 * `cmn-more-page` at the end of the phone's More page, so no shell passes `versionLabel`. `version`
 * is the bare number from the app's build define; a leading `v` is added when it has none.
 */
export function provideAppVersion(version: string): EnvironmentProviders {
  const label = /^v/i.test(version) ? version : `v${version}`;
  return makeEnvironmentProviders([{provide: CMN_APP_VERSION, useValue: label}]);
}
