import {type EnvironmentProviders, inject, makeEnvironmentProviders} from '@angular/core';
import {PREFERENCE_SAVE_ERROR_HANDLER} from '@lifekit-hq/core/preferences';

import {ToastService} from './toast.service';

export const DEFAULT_PREFERENCE_SAVE_ERROR_MESSAGE = 'Could not save that change. It was undone.';

/**
 * Wires `accountPreferencesStore` save failures to an error toast. The store rolls the change back
 * itself; this is the "say so" half. Add it once, in the app's providers.
 */
export function provideToastPreferenceErrors(
  message: string = DEFAULT_PREFERENCE_SAVE_ERROR_MESSAGE
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: PREFERENCE_SAVE_ERROR_HANDLER,
      useFactory: () => {
        const toast = inject(ToastService);
        return () => toast.error(message);
      },
    },
  ]);
}
