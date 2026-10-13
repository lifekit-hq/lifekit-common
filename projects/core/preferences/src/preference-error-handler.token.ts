import {InjectionToken} from '@angular/core';

/** A rejected account-preference save, after the optimistic change has been rolled back. */
export interface PreferenceSaveFailure {
  error: unknown;
  /** The server's `errorCode` when the response carried one. */
  errorCode: string | null;
  /** The top-level preference fields the failed `PATCH` tried to change. */
  fields: readonly string[];
}

/**
 * Called once per failed account-preference save. The store lives below the UI layer, so it cannot
 * toast itself: the app (or `provideToastPreferenceErrors()` from `@lifekit-hq/ui`) provides this.
 * The default does nothing, so an unwired app still rolls back but says nothing.
 */
export const PREFERENCE_SAVE_ERROR_HANDLER = new InjectionToken<
  (failure: PreferenceSaveFailure) => void
>('PREFERENCE_SAVE_ERROR_HANDLER', {
  providedIn: 'root',
  factory: () => () => undefined,
});
