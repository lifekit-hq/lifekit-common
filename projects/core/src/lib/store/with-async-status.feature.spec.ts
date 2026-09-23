import {TestBed} from '@angular/core/testing';
import {signalStore} from '@ngrx/signals';
import {beforeEach, describe, expect, it} from 'vitest';

import {ERROR_MESSAGES, type ErrorMessagesMap} from '../errors/error-messages.token';
import {withAsyncStatus} from './with-async-status.feature';

const CustomStore = signalStore(
  {providedIn: 'root'},
  withAsyncStatus({defaultErrorMessage: 'Custom fallback.'})
);

const DefaultStore = signalStore({providedIn: 'root'}, withAsyncStatus());

/** Error codes are snake_case on the wire; build the map by key to keep the linter happy. */
const MESSAGES: ErrorMessagesMap = {};
MESSAGES['rate_limited'] = 'Too many attempts. Try again later.';

function build<T>(store: new (...args: never[]) => T): T {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{provide: ERROR_MESSAGES, useValue: MESSAGES}],
  });
  return TestBed.inject(store as never);
}

describe('withAsyncStatus', () => {
  let store: InstanceType<typeof DefaultStore>;

  beforeEach(() => {
    store = build(DefaultStore);
  });

  it('starts idle with no error', () => {
    expect(store.status()).toBe('idle');
    expect(store.errorCode()).toBeNull();
    expect(store.isLoading()).toBe(false);
    expect(store.hasError()).toBe(false);
    expect(store.errorMessage()).toBe('');
  });

  it('flags loading', () => {
    store.setLoading();
    expect(store.status()).toBe('loading');
    expect(store.isLoading()).toBe(true);
    expect(store.hasError()).toBe(false);
  });

  it('clears a previous error code when loading starts again', () => {
    store.setError('rate_limited');
    store.setLoading();
    expect(store.errorCode()).toBeNull();
    expect(store.errorMessage()).toBe('');
  });

  it('flags success and clears the error code', () => {
    store.setError('rate_limited');
    store.setSuccess();
    expect(store.status()).toBe('success');
    expect(store.errorCode()).toBeNull();
    expect(store.hasError()).toBe(false);
  });

  it('resolves a known error code through the injected message map', () => {
    store.setError('rate_limited');
    expect(store.hasError()).toBe(true);
    expect(store.errorMessage()).toBe('Too many attempts. Try again later.');
  });

  it('falls back to the default message for an unknown code', () => {
    store.setError('never_seen');
    expect(store.errorMessage()).toBe('Something went wrong. Please try again.');
  });

  it('falls back to the default message when the error carries no code', () => {
    store.setError(null);
    expect(store.errorCode()).toBeNull();
    expect(store.errorMessage()).toBe('Something went wrong. Please try again.');
  });

  it('honours a caller-supplied default message', () => {
    const custom = build(CustomStore);
    custom.setError('never_seen');
    expect(custom.errorMessage()).toBe('Custom fallback.');
  });

  it('reports no message while not in the error state, even with a stale code', () => {
    store.setError('rate_limited');
    store.setSuccess();
    expect(store.errorMessage()).toBe('');
  });

  it('resets to the initial state', () => {
    store.setError('rate_limited');
    store.setIdle();
    expect(store.status()).toBe('idle');
    expect(store.errorCode()).toBeNull();
  });
});
