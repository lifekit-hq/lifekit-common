import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {accountPreferencesStore} from './account-preferences-store';
import {
  PREFERENCE_SAVE_ERROR_HANDLER,
  type PreferenceSaveFailure,
} from './preference-error-handler.token';
import {type AccountPreferences} from './preference-types';

interface AppPreferences extends AccountPreferences {
  baseCurrency: string;
}

const URL = '/api/me/preferences';
const STORED: AppPreferences = {appearance: {theme: 'system'}, baseCurrency: 'USD'};

const Store = accountPreferencesStore<AppPreferences>();

describe('accountPreferencesStore', () => {
  let http: HttpTestingController;
  let failures: PreferenceSaveFailure[];

  beforeEach(() => {
    failures = [];
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: PREFERENCE_SAVE_ERROR_HANDLER,
          useValue: (f: PreferenceSaveFailure) => failures.push(f),
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  /** Requests leave on a microtask (saves are queued), so wait for one to appear. */
  async function nextRequest(method: string) {
    let request!: ReturnType<HttpTestingController['expectOne']>;
    await vi.waitFor(() => {
      request = http.expectOne(r => r.url === URL && r.method === method);
    });
    return request;
  }

  async function loaded(prefs: AppPreferences = STORED) {
    const store = TestBed.inject(Store);
    const done = store.load();
    (await nextRequest('GET')).flush(prefs);
    await done;
    return store;
  }

  describe('load', () => {
    it('starts empty and idle', () => {
      const store = TestBed.inject(Store);
      expect(store.preferences()).toBeNull();
      expect(store.appearance()).toBeNull();
      expect(store.isLoaded()).toBe(false);
      expect(store.status()).toBe('idle');
    });

    it('GETs the endpoint and exposes the full object', async () => {
      const store = TestBed.inject(Store);
      const done = store.load();
      expect(store.isLoading()).toBe(true);
      (await nextRequest('GET')).flush(STORED);
      await done;
      expect(store.preferences()).toEqual(STORED);
      expect(store.appearance()).toEqual({theme: 'system'});
      expect(store.isLoaded()).toBe(true);
      expect(store.status()).toBe('success');
    });

    it('shares one request between concurrent loads and loads once after that', async () => {
      const store = TestBed.inject(Store);
      const first = store.load();
      const second = store.load();
      (await nextRequest('GET')).flush(STORED);
      await Promise.all([first, second]);
      await store.load();
      http.expectNone(URL);
    });

    it('surfaces a failed load and retries it on the next call', async () => {
      const store = TestBed.inject(Store);
      const failed = store.load();
      (await nextRequest('GET')).flush({errorCode: 'down'}, {status: 500, statusText: 'Error'});
      await failed;
      expect(store.hasError()).toBe(true);
      expect(store.errorCode()).toBe('down');
      expect(store.errorMessage()).toBe('Could not load your preferences.');
      expect(store.preferences()).toBeNull();

      const retry = store.load();
      (await nextRequest('GET')).flush(STORED);
      await retry;
      expect(store.status()).toBe('success');
    });

    it('reload fetches again and replaces the copy', async () => {
      const store = await loaded();
      const done = store.reload();
      (await nextRequest('GET')).flush({...STORED, baseCurrency: 'EUR'});
      await done;
      expect(store.preferences()?.baseCurrency).toBe('EUR');
    });

    it('uses a custom endpoint as given', async () => {
      const Custom = accountPreferencesStore('/v2/prefs');
      const store = TestBed.inject(Custom);
      const done = store.load();
      await vi.waitFor(() => http.expectOne({url: '/v2/prefs', method: 'GET'}).flush(STORED));
      await done;
      expect(store.isLoaded()).toBe(true);
    });
  });

  describe('patch', () => {
    it('applies the change at once, sends only the given fields and takes the full response', async () => {
      const store = await loaded();
      const saved = store.patch({baseCurrency: 'EUR'});
      expect(store.preferences()?.baseCurrency).toBe('EUR');
      expect(store.isSaving()).toBe(true);

      const request = await nextRequest('PATCH');
      expect(request.request.body).toEqual({baseCurrency: 'EUR'});
      request.flush({appearance: {theme: 'dark'}, baseCurrency: 'EUR'});

      await expect(saved).resolves.toBe(true);
      expect(store.isSaving()).toBe(false);
      expect(store.preferences()).toEqual({appearance: {theme: 'dark'}, baseCurrency: 'EUR'});
    });

    it('rolls a failed change back, reports it and resolves false', async () => {
      const store = await loaded();
      const saved = store.patch({baseCurrency: 'EUR'});
      (await nextRequest('PATCH')).flush(
        {errorCode: 'invalid_currency'},
        {status: 422, statusText: 'Unprocessable'}
      );

      await expect(saved).resolves.toBe(false);
      expect(store.preferences()).toEqual(STORED);
      expect(store.isSaving()).toBe(false);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toMatchObject({errorCode: 'invalid_currency', fields: ['baseCurrency']});
    });

    it('rolls back only the failed change and keeps a later pending one', async () => {
      const store = await loaded();
      const first = store.patch({baseCurrency: 'EUR'});
      const second = store.patch({appearance: {theme: 'dark'}});
      expect(store.preferences()).toEqual({appearance: {theme: 'dark'}, baseCurrency: 'EUR'});

      (await nextRequest('PATCH')).flush({}, {status: 500, statusText: 'Error'});
      await expect(first).resolves.toBe(false);
      expect(store.preferences()).toEqual({appearance: {theme: 'dark'}, baseCurrency: 'USD'});

      (await nextRequest('PATCH')).flush({appearance: {theme: 'dark'}, baseCurrency: 'USD'});
      await expect(second).resolves.toBe(true);
      expect(store.preferences()).toEqual({appearance: {theme: 'dark'}, baseCurrency: 'USD'});
    });

    it('sends saves one at a time, in order', async () => {
      const store = await loaded();
      const first = store.patch({baseCurrency: 'EUR'});
      const second = store.patch({baseCurrency: 'GBP'});

      const firstRequest = await nextRequest('PATCH');
      expect(firstRequest.request.body).toEqual({baseCurrency: 'EUR'});
      http.expectNone(r => r.method === 'PATCH' && r.body?.baseCurrency === 'GBP');
      firstRequest.flush({...STORED, baseCurrency: 'EUR'});
      await first;

      const secondRequest = await nextRequest('PATCH');
      expect(secondRequest.request.body).toEqual({baseCurrency: 'GBP'});
      secondRequest.flush({...STORED, baseCurrency: 'GBP'});
      await second;
      expect(store.preferences()?.baseCurrency).toBe('GBP');
    });

    it('still saves before the first load and adopts the response', async () => {
      const store = TestBed.inject(Store);
      expect(store.preferences()).toBeNull();
      const saved = store.patch({baseCurrency: 'EUR'});
      expect(store.preferences()).toBeNull();
      (await nextRequest('PATCH')).flush({...STORED, baseCurrency: 'EUR'});
      await saved;
      expect(store.preferences()?.baseCurrency).toBe('EUR');
    });
  });

  describe('patchAppearance', () => {
    it('merges over the current appearance and sends all of it', async () => {
      const store = await loaded({
        appearance: {theme: 'light', seed: '#175a6d', intensity: 0.4},
        baseCurrency: 'USD',
      });
      const saved = store.patchAppearance({theme: 'dark'});
      expect(store.appearance()).toEqual({theme: 'dark', seed: '#175a6d', intensity: 0.4});

      const request = await nextRequest('PATCH');
      expect(request.request.body).toEqual({
        appearance: {theme: 'dark', seed: '#175a6d', intensity: 0.4},
      });
      request.flush({
        appearance: {theme: 'dark', seed: '#175a6d', intensity: 0.4},
        baseCurrency: 'USD',
      });
      await saved;
    });

    it('drops the seed when it is set to undefined', async () => {
      const store = await loaded({
        appearance: {theme: 'light', seed: '#175a6d'},
        baseCurrency: 'USD',
      });
      const saved = store.patchAppearance({seed: undefined});
      expect(store.appearance()?.seed).toBeUndefined();
      const request = await nextRequest('PATCH');
      expect(JSON.parse(JSON.stringify(request.request.body))).toEqual({
        appearance: {theme: 'light'},
      });
      request.flush(STORED);
      await saved;
    });

    it('starts from the default appearance before the first load', async () => {
      const store = TestBed.inject(Store);
      const saved = store.patchAppearance({seed: '#4f46e5'});
      const request = await nextRequest('PATCH');
      expect(request.request.body).toEqual({appearance: {theme: 'system', seed: '#4f46e5'}});
      request.flush({appearance: {theme: 'system', seed: '#4f46e5'}, baseCurrency: 'USD'});
      await saved;
    });

    it('rolls the appearance back on failure', async () => {
      const store = await loaded();
      const saved = store.patchAppearance({theme: 'dark'});
      (await nextRequest('PATCH')).flush({}, {status: 0, statusText: 'offline'});
      await expect(saved).resolves.toBe(false);
      expect(store.appearance()).toEqual({theme: 'system'});
      expect(failures[0].fields).toEqual(['appearance']);
    });
  });

  describe('clear', () => {
    it('forgets the loaded copy so the next load fetches again', async () => {
      const store = await loaded();
      store.clear();
      expect(store.preferences()).toBeNull();
      expect(store.status()).toBe('idle');

      const done = store.load();
      (await nextRequest('GET')).flush({...STORED, baseCurrency: 'GBP'});
      await done;
      expect(store.preferences()?.baseCurrency).toBe('GBP');
    });
  });
});
