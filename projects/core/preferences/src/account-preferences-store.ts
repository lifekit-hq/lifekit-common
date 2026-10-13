import {HttpClient} from '@angular/common/http';
import {computed, inject, type Signal, signal, type Type} from '@angular/core';
import {type AsyncStatus, extractErrorCode, withAsyncStatus} from '@lifekit-hq/core';
import {signalStore, withComputed, withMethods, withProps} from '@ngrx/signals';
import {firstValueFrom} from 'rxjs';

import {PREFERENCE_SAVE_ERROR_HANDLER} from './preference-error-handler.token';
import {
  ACCOUNT_PREFERENCES_ENDPOINT,
  type AccountPreferences,
  type AppearancePreference,
  DEFAULT_APPEARANCE,
} from './preference-types';

interface PendingPatch<P> {
  id: number;
  patch: Partial<P>;
}

/** What an injected account preferences store offers. `P` is the app's preferences type. */
export interface AccountPreferencesStoreApi<P extends AccountPreferences> {
  /** The full preferences with unsaved changes applied; `null` until the first load. */
  readonly preferences: Signal<P | null>;
  /** The appearance part of `preferences`; `null` until the first load. */
  readonly appearance: Signal<AppearancePreference | null>;
  /** True while at least one change is applied locally and not yet confirmed. */
  readonly isSaving: Signal<boolean>;
  /** True once the server's copy has been read. */
  readonly isLoaded: Signal<boolean>;
  /** Status of the load request (saves report through `PREFERENCE_SAVE_ERROR_HANDLER`). */
  readonly status: Signal<AsyncStatus>;
  readonly errorCode: Signal<string | null>;
  readonly isLoading: Signal<boolean>;
  readonly hasError: Signal<boolean>;
  readonly errorMessage: Signal<string>;
  /** Reads the server's copy once. Later calls reuse it; a failed load is retried. */
  load(): Promise<void>;
  /** Reads the server's copy again, keeping the current view while it loads. */
  reload(): Promise<void>;
  /**
   * Changes top-level fields. Each given field replaces the stored one wholesale; omitted fields
   * are untouched. Resolves `true` once the server confirmed it, `false` after a rollback. It never
   * rejects.
   */
  patch(partial: Partial<P>): Promise<boolean>;
  /**
   * Changes the appearance, merged over the current one, and sends the whole appearance. Pass
   * `seed: undefined` to go back to the app's default seed. Before the first load the merge starts
   * from `DEFAULT_APPEARANCE`.
   */
  patchAppearance(change: Partial<AppearancePreference>): Promise<boolean>;
  /**
   * Forgets the loaded copy, e.g. on sign-out, so the next user starts clean. Requests still in
   * flight are ignored when they answer, and saves not yet sent are dropped (they resolve `false`).
   */
  clear(): void;
}

const LOAD_ERROR_MESSAGE = 'Could not load your preferences.';

/**
 * The account tier: one signal store over a uniform `GET` / `PATCH` preferences resource.
 *
 * - `load()` fetches once; `reload()` fetches again.
 * - `patch(partial)` applies the change to `preferences` at once, then `PATCH`es it. The server
 *   returns the full object, which replaces the confirmed copy. Saves are sent one at a time, in
 *   order. A failed save drops only its own change from the view (later pending changes stay) and
 *   reports through `PREFERENCE_SAVE_ERROR_HANDLER`.
 * - `patchAppearance(partial)` is `patch` for the appearance field, merged over the current one.
 *
 * The server contract is in `docs/APP-SHELL-STANDARD.md`. `endpoint` is used as given, so an app
 * behind an API prefix passes the prefixed path. Provide `HttpClient` as usual; the store is
 * `providedIn: 'root'`, so call `clear()` on sign-out.
 *
 * ```ts
 * export const AppPreferencesStore = accountPreferencesStore<AppPreferences>();
 * ```
 */
export function accountPreferencesStore<P extends AccountPreferences = AccountPreferences>(
  endpoint: string = ACCOUNT_PREFERENCES_ENDPOINT
): Type<AccountPreferencesStoreApi<P>> {
  return signalStore(
    {providedIn: 'root'},
    withProps(() => ({
      /** The last full object the server returned: what a failed save rolls back to. */
      confirmed: signal<P | null>(null),
      /** Saves applied locally and not yet answered, oldest first. */
      pending: signal<PendingPatch<P>[]>([]),
    })),
    withAsyncStatus({defaultErrorMessage: LOAD_ERROR_MESSAGE}),
    withComputed(store => {
      const preferences = computed<P | null>(() => {
        const confirmed = store.confirmed();
        if (confirmed === null) {
          return null;
        }
        return store.pending().reduce<P>((view, {patch}) => ({...view, ...patch}), confirmed);
      });
      return {
        preferences,
        appearance: computed<AppearancePreference | null>(() => preferences()?.appearance ?? null),
        isSaving: computed(() => store.pending().length > 0),
        isLoaded: computed(() => store.confirmed() !== null),
      };
    }),
    withMethods(store => {
      const http = inject(HttpClient);
      const onSaveError = inject(PREFERENCE_SAVE_ERROR_HANDLER);
      let nextId = 0;
      let generation = 0;
      let inFlightLoad: Promise<void> | null = null;
      let saveQueue: Promise<unknown> = Promise.resolve();

      const fetchPreferences = async (): Promise<void> => {
        const started = generation;
        store.setLoading();
        try {
          const loaded = await firstValueFrom(http.get<P>(endpoint));
          if (started === generation) {
            store.confirmed.set(loaded);
            store.setSuccess();
          }
        } catch (error) {
          if (started === generation) {
            store.setError(extractErrorCode(error));
          }
        }
      };

      const send = async (pending: PendingPatch<P>, started: number): Promise<boolean> => {
        if (started !== generation) {
          return false;
        }
        const settle = (confirmed?: P): void => {
          if (started !== generation) {
            return;
          }
          if (confirmed !== undefined) {
            store.confirmed.set(confirmed);
          }
          store.pending.update(list => list.filter(({id}) => id !== pending.id));
        };
        try {
          const response = await firstValueFrom(http.patch<P>(endpoint, pending.patch));
          settle(response);
          return started === generation;
        } catch (error) {
          settle();
          if (started === generation) {
            onSaveError({
              error,
              errorCode: extractErrorCode(error),
              fields: Object.keys(pending.patch),
            });
          }
          return false;
        }
      };

      const patch = (partial: Partial<P>): Promise<boolean> => {
        const pending: PendingPatch<P> = {id: nextId++, patch: partial};
        const started = generation;
        store.pending.update(list => [...list, pending]);
        const result = saveQueue.then(() => send(pending, started));
        saveQueue = result;
        return result;
      };

      return {
        load(): Promise<void> {
          if (store.confirmed() !== null) {
            return Promise.resolve();
          }
          if (inFlightLoad === null) {
            const load: Promise<void> = fetchPreferences().finally(() => {
              if (inFlightLoad === load) {
                inFlightLoad = null;
              }
            });
            inFlightLoad = load;
          }
          return inFlightLoad;
        },
        reload(): Promise<void> {
          return fetchPreferences();
        },
        patch,
        patchAppearance(change: Partial<AppearancePreference>): Promise<boolean> {
          const appearance: AppearancePreference = {
            ...(store.appearance() ?? DEFAULT_APPEARANCE),
            ...change,
          };
          return patch({appearance} as Partial<P>);
        },
        clear(): void {
          generation++;
          inFlightLoad = null;
          saveQueue = Promise.resolve();
          store.confirmed.set(null);
          store.pending.set([]);
          store.setIdle();
        },
      };
    })
  );
}
