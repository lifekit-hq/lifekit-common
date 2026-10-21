import {computed, inject, type Signal} from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  withComputed,
  withMethods,
  withState,
  type WritableStateSource,
} from '@ngrx/signals';

import {ErrorMessageService} from '../errors/error-message.service';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncStatusState {
  status: AsyncStatus;
  errorCode: string | null;
}

export interface AsyncStatusConfig {
  defaultErrorMessage?: string;
}

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Try again.';
const INITIAL_STATE: AsyncStatusState = {status: 'idle', errorCode: null};

export function withAsyncStatus({
  defaultErrorMessage = DEFAULT_ERROR_MESSAGE,
}: AsyncStatusConfig = {}) {
  return signalStoreFeature(
    withState(INITIAL_STATE),
    withComputed(store => {
      const errorMessages = inject(ErrorMessageService);
      return {
        isLoading: computed(() => store.status() === 'loading'),
        hasError: computed(() => store.status() === 'error'),
        errorMessage: computed(() => {
          if (store.status() !== 'error') {
            return '';
          }
          return errorMessages.resolve(store.errorCode()) ?? defaultErrorMessage;
        }),
      };
    }),
    withMethods(store => ({
      setLoading(): void {
        patchState(store, {
          status: 'loading' as AsyncStatus,
          errorCode: null,
        });
      },
      setSuccess(): void {
        patchState(store, {
          status: 'success' as AsyncStatus,
          errorCode: null,
        });
      },
      setError(errorCode: string | null): void {
        patchState(store, {status: 'error' as AsyncStatus, errorCode});
      },
      setIdle(): void {
        patchState(store, INITIAL_STATE);
      },
    }))
  );
}

/** State a `withNamedAsyncStatus(name)` feature adds: `<name>Status` and `<name>ErrorCode`. */
export type NamedAsyncStatusState<Name extends string> = Record<`${Name}Status`, AsyncStatus> &
  Record<`${Name}ErrorCode`, string | null>;

/** Computeds a `withNamedAsyncStatus(name)` feature adds. */
export type NamedAsyncStatusComputed<Name extends string> = Record<
  `is${Capitalize<Name>}Loading` | `has${Capitalize<Name>}Error`,
  Signal<boolean>
> &
  Record<`${Name}ErrorMessage`, Signal<string>>;

/** Methods a `withNamedAsyncStatus(name)` feature adds. */
export type NamedAsyncStatusMethods<Name extends string> = Record<
  `set${Capitalize<Name>}Loading` | `set${Capitalize<Name>}Success` | `set${Capitalize<Name>}Idle`,
  () => void
> &
  Record<`set${Capitalize<Name>}Error`, (errorCode: string | null) => void>;

/**
 * `withAsyncStatus` for a store that tracks several independent requests.
 * Call it once per request with a distinct name (`withNamedAsyncStatus('profile')`)
 * and the feature adds the same surface as `withAsyncStatus`, prefixed with that
 * name: `profileStatus`, `profileErrorCode`, `isProfileLoading`, `hasProfileError`,
 * `profileErrorMessage`, `setProfileLoading`, `setProfileSuccess`,
 * `setProfileError` and `setProfileIdle`. Error messages resolve through
 * `ErrorMessageService`, falling back to `defaultErrorMessage`, exactly as
 * `withAsyncStatus` does.
 */
export function withNamedAsyncStatus<const Name extends string>(
  name: Name,
  {defaultErrorMessage = DEFAULT_ERROR_MESSAGE}: AsyncStatusConfig = {}
) {
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  const statusKey = `${name}Status`;
  const errorCodeKey = `${name}ErrorCode`;
  const initialState: Record<string, unknown> = {[statusKey]: 'idle', [errorCodeKey]: null};

  return signalStoreFeature(
    withState(initialState as NamedAsyncStatusState<Name>),
    withComputed(store => {
      const errorMessages = inject(ErrorMessageService);
      const signals = store as unknown as Record<string, Signal<unknown>>;
      const status = signals[statusKey];
      const errorCode = signals[errorCodeKey] as Signal<string | null>;
      const computeds: Record<string, Signal<unknown>> = {
        [`is${cap}Loading`]: computed(() => status() === 'loading'),
        [`has${cap}Error`]: computed(() => status() === 'error'),
        [`${name}ErrorMessage`]: computed(() => {
          if (status() !== 'error') {
            return '';
          }
          return errorMessages.resolve(errorCode()) ?? defaultErrorMessage;
        }),
      };
      return computeds as NamedAsyncStatusComputed<Name>;
    }),
    withMethods(store => {
      const target = store as unknown as WritableStateSource<Record<string, unknown>>;
      const set = (status: AsyncStatus, errorCode: string | null): void => {
        patchState(target, {[statusKey]: status, [errorCodeKey]: errorCode});
      };
      const methods: Record<string, (errorCode: string | null) => void> = {
        [`set${cap}Loading`]: (): void => set('loading', null),
        [`set${cap}Success`]: (): void => set('success', null),
        [`set${cap}Error`]: (errorCode: string | null): void => set('error', errorCode),
        [`set${cap}Idle`]: (): void => set('idle', null),
      };
      return methods as NamedAsyncStatusMethods<Name>;
    })
  );
}
