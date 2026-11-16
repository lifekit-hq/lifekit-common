import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {
  ACCOUNT_PREFERENCES_ENDPOINT,
  type AccountPreferences,
  type AppearancePreference,
  AppPreferencesStore,
  PREFERENCE_SAVE_ERROR_HANDLER,
} from '@lifekit-hq/core/preferences';
import {beforeEach, describe, expect, it} from 'vitest';

import {
  LOCAL_STORAGE,
  PREFERS_DARK,
  PREFERS_MORE_CONTRAST,
  ThemeService,
} from '../theme/theme.service';
import {APPEARANCE_STORE, AppearanceService} from './appearance.service';
import {provideAccountAppearance} from './provide-account-appearance';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: key => map.get(key) ?? null,
    key: index => Array.from(map.keys())[index] ?? null,
    removeItem: key => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

function configure(...providers: unknown[]): void {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {provide: LOCAL_STORAGE, useValue: memoryStorage()},
      {provide: PREFERS_DARK, useValue: null},
      {provide: PREFERS_MORE_CONTRAST, useValue: null},
      provideHttpClient(withXhr()),
      provideHttpClientTesting(),
      ...(providers as never[]),
    ],
  });
}

describe('provideAccountAppearance', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  it('syncs appearance with the default store, handles save errors and loads at start', async () => {
    configure(provideAccountAppearance());
    const http = TestBed.inject(HttpTestingController);

    http.expectOne(ACCOUNT_PREFERENCES_ENDPOINT).flush({appearance: {theme: 'dark'}});
    await TestBed.inject(AppPreferencesStore).load();
    TestBed.tick();

    expect(TestBed.inject(APPEARANCE_STORE)).toBe(TestBed.inject(AppPreferencesStore));
    expect(TestBed.inject(AppearanceService).synced).toBe(true);
    expect(TestBed.inject(PREFERENCE_SAVE_ERROR_HANDLER)).toBeTypeOf('function');
    expect(TestBed.inject(ThemeService).getPreference()).toBe('dark');
  });

  it('keeps the local cache in charge when the load fails', async () => {
    configure(provideAccountAppearance());
    TestBed.inject(ThemeService).setPreference('light');
    const http = TestBed.inject(HttpTestingController);

    http.expectOne(ACCOUNT_PREFERENCES_ENDPOINT).flush('nope', {status: 500, statusText: 'Error'});
    await TestBed.inject(AppPreferencesStore)
      .load()
      .catch(() => undefined);
    TestBed.tick();

    expect(TestBed.inject(ThemeService).getPreference()).toBe('light');
    expect(TestBed.inject(AppearanceService).mode()).toBe('light');
  });

  it('uses the store the app passes', () => {
    class OwnStore {
      public readonly appearance = signal<AppearancePreference | null>(null);
      public loads = 0;

      public patch(_: Partial<AccountPreferences>): Promise<boolean> {
        return Promise.resolve(true);
      }

      public load(): Promise<void> {
        this.loads += 1;
        return Promise.resolve();
      }
    }
    configure({provide: OwnStore, useClass: OwnStore}, provideAccountAppearance(OwnStore));

    const own = TestBed.inject(OwnStore);
    expect(TestBed.inject(APPEARANCE_STORE)).toBe(own);
    expect(own.loads).toBe(1);
    TestBed.inject(HttpTestingController).expectNone(ACCOUNT_PREFERENCES_ENDPOINT);
  });
});
