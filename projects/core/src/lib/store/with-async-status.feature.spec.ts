import {TestBed} from '@angular/core/testing';
import {signalStore} from '@ngrx/signals';
import {beforeEach, describe, expect, it} from 'vitest';

import {ERROR_MESSAGES, type ErrorMessagesMap} from '../errors/error-messages.token';
import {withAsyncStatus, withNamedAsyncStatus} from './with-async-status.feature';

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

const NamedStore = signalStore(
  {providedIn: 'root'},
  withNamedAsyncStatus('profile'),
  withNamedAsyncStatus('events', {defaultErrorMessage: 'Custom fallback.'})
);

describe('withNamedAsyncStatus', () => {
  let store: InstanceType<typeof NamedStore>;

  beforeEach(() => {
    store = build(NamedStore);
  });

  it('starts every key idle with no error', () => {
    expect(store.profileStatus()).toBe('idle');
    expect(store.profileErrorCode()).toBeNull();
    expect(store.isProfileLoading()).toBe(false);
    expect(store.hasProfileError()).toBe(false);
    expect(store.profileErrorMessage()).toBe('');
    expect(store.eventsStatus()).toBe('idle');
    expect(store.eventsErrorCode()).toBeNull();
  });

  it('flags loading', () => {
    store.setProfileLoading();
    expect(store.profileStatus()).toBe('loading');
    expect(store.isProfileLoading()).toBe(true);
    expect(store.hasProfileError()).toBe(false);
  });

  it('clears a previous error code when loading starts again', () => {
    store.setProfileError('rate_limited');
    store.setProfileLoading();
    expect(store.profileErrorCode()).toBeNull();
    expect(store.profileErrorMessage()).toBe('');
  });

  it('flags success and clears the error code', () => {
    store.setProfileError('rate_limited');
    store.setProfileSuccess();
    expect(store.profileStatus()).toBe('success');
    expect(store.profileErrorCode()).toBeNull();
    expect(store.hasProfileError()).toBe(false);
  });

  it('resolves a known error code through the injected message map', () => {
    store.setProfileError('rate_limited');
    expect(store.hasProfileError()).toBe(true);
    expect(store.profileErrorMessage()).toBe('Too many attempts. Try again later.');
  });

  it('falls back to the default message for an unknown code', () => {
    store.setProfileError('never_seen');
    expect(store.profileErrorMessage()).toBe('Something went wrong. Please try again.');
  });

  it('falls back to the default message when the error carries no code', () => {
    store.setProfileError(null);
    expect(store.profileErrorCode()).toBeNull();
    expect(store.profileErrorMessage()).toBe('Something went wrong. Please try again.');
  });

  it('honours a caller-supplied default message per key', () => {
    store.setEventsError('never_seen');
    expect(store.eventsErrorMessage()).toBe('Custom fallback.');
    store.setProfileError('never_seen');
    expect(store.profileErrorMessage()).toBe('Something went wrong. Please try again.');
  });

  it('reports no message while not in the error state, even with a stale code', () => {
    store.setProfileError('rate_limited');
    store.setProfileSuccess();
    expect(store.profileErrorMessage()).toBe('');
  });

  it('resets a key to the initial state', () => {
    store.setProfileError('rate_limited');
    store.setProfileIdle();
    expect(store.profileStatus()).toBe('idle');
    expect(store.profileErrorCode()).toBeNull();
  });

  it('tracks two keys independently', () => {
    store.setProfileLoading();
    store.setEventsError('rate_limited');

    expect(store.isProfileLoading()).toBe(true);
    expect(store.hasProfileError()).toBe(false);
    expect(store.hasEventsError()).toBe(true);
    expect(store.isEventsLoading()).toBe(false);
    expect(store.eventsErrorMessage()).toBe('Too many attempts. Try again later.');
    expect(store.profileErrorMessage()).toBe('');

    store.setProfileSuccess();
    expect(store.eventsStatus()).toBe('error');
    expect(store.eventsErrorCode()).toBe('rate_limited');

    store.setEventsIdle();
    expect(store.profileStatus()).toBe('success');
    expect(store.eventsStatus()).toBe('idle');
  });

  it('coexists with the unnamed feature in one store', () => {
    const Mixed = signalStore(
      {providedIn: 'root'},
      withAsyncStatus(),
      withNamedAsyncStatus('extra')
    );
    const mixed = build(Mixed);
    mixed.setLoading();
    mixed.setExtraError('rate_limited');
    expect(mixed.status()).toBe('loading');
    expect(mixed.extraStatus()).toBe('error');
    expect(mixed.isLoading()).toBe(true);
    expect(mixed.hasExtraError()).toBe(true);
  });
});
