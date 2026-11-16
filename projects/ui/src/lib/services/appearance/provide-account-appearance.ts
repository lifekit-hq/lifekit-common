import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type Type,
} from '@angular/core';
import {AppPreferencesStore} from '@lifekit-hq/core/preferences';

import {provideToastPreferenceErrors} from '../../components/toast/provide-toast-preference-errors';
import {type AppearanceStore, provideAppearanceSync} from './appearance.service';

/**
 * The whole account-appearance wiring in one call: appearance syncs with the account preferences
 * store, a failed save raises an error toast, and the store loads at start. A failed load leaves
 * the local cache in charge, so the page keeps the theme it painted with.
 *
 * Pass the app's own store when it has extra account fields; the default is `AppPreferencesStore`.
 * Call `clear()` on the store at sign-out, as the standard says.
 *
 * ```ts
 * provideAccountAppearance()
 * ```
 */
export function provideAccountAppearance(
  store: Type<AppearanceStore & {load(): Promise<void>}> = AppPreferencesStore
): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppearanceSync(store),
    provideToastPreferenceErrors(),
    provideAppInitializer(() => void inject(store).load()),
  ]);
}
