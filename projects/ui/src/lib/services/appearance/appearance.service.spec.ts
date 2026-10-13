import {Injectable, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {type AccountPreferences, type AppearancePreference} from '@lifekit-hq/core/preferences';
import {DEFAULT_INTENSITY} from '@lifekit-hq/tokens/engine';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  LOCAL_STORAGE,
  PREFERS_DARK,
  PREFERS_MORE_CONTRAST,
  ThemeService,
} from '../theme/theme.service';
import {AppearanceService, provideAppearanceSync, SEED_SAVE_DELAY_MS} from './appearance.service';

const TEAL = '#175a6d';
const INDIGO = '#4f46e5';
const INTENSITY = 0.7;

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  public get length(): number {
    return this.map.size;
  }

  public clear(): void {
    this.map.clear();
  }

  public getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  public key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  public removeItem(key: string): void {
    this.map.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

/** The part of `accountPreferencesStore` the service uses, applying a patch at once like the real one. */
@Injectable({providedIn: 'root'})
class FakeStore {
  public readonly appearance = signal<AppearancePreference | null>(null);
  public readonly patched: Partial<AccountPreferences>[] = [];

  public patch(partial: Partial<AccountPreferences>): Promise<boolean> {
    this.patched.push(partial);
    if (partial.appearance) {
      this.appearance.set(partial.appearance);
    }
    return Promise.resolve(true);
  }
}

function configure(providers: unknown[] = []): void {
  TestBed.configureTestingModule({
    providers: [
      {provide: LOCAL_STORAGE, useValue: new MemoryStorage()},
      {provide: PREFERS_DARK, useValue: null},
      {provide: PREFERS_MORE_CONTRAST, useValue: null},
      ...(providers as never[]),
    ],
  });
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
});

describe('AppearanceService without a preferences store', () => {
  let service: AppearanceService;
  let theme: ThemeService;

  beforeEach(() => {
    configure();
    service = TestBed.inject(AppearanceService);
    theme = TestBed.inject(ThemeService);
  });

  it('reports itself as not synced', () => {
    expect(service.synced).toBe(false);
  });

  it('starts on system with no colour', () => {
    expect(service.mode()).toBe('system');
    expect(service.seed()).toBeNull();
  });

  it('keeps a mode change in the local cache', () => {
    service.setMode('dark');

    expect(theme.getPreference()).toBe('dark');
    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('can go back to system', () => {
    service.setMode('dark');
    service.setMode('system');

    expect(theme.getPreference()).toBe('system');
  });

  it('toggles between light and dark and pins the result', () => {
    service.setMode('light');
    service.toggle();
    expect(service.mode()).toBe('dark');

    service.toggle();
    expect(service.mode()).toBe('light');
  });

  it('keeps a seed in the local cache, and drops it again', () => {
    service.setSeed(TEAL, INTENSITY);
    expect(service.seed()).toEqual({seed: TEAL, intensity: INTENSITY});

    service.resetSeed();
    expect(service.seed()).toBeNull();
  });

  it('rejects a seed that is not a hex colour', () => {
    expect(() => service.setSeed('teal')).toThrow(TypeError);
    expect(service.seed()).toBeNull();
  });
});

describe('AppearanceService with a preferences store', () => {
  let service: AppearanceService;
  let theme: ThemeService;
  let store: FakeStore;

  beforeEach(() => {
    vi.useFakeTimers();
    configure([provideAppearanceSync(FakeStore)]);
    store = TestBed.inject(FakeStore);
    theme = TestBed.inject(ThemeService);
    service = TestBed.inject(AppearanceService);
    TestBed.tick();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports itself as synced', () => {
    expect(service.synced).toBe(true);
  });

  it('applies nothing before the store has loaded', () => {
    expect(theme.getPreference()).toBe('system');
    expect(store.patched).toEqual([]);
  });

  it('applies the loaded appearance to the cache and the page, and the server wins', () => {
    theme.setPreference('light');
    theme.setSeed(INDIGO);

    store.appearance.set({theme: 'dark', seed: TEAL, intensity: INTENSITY});
    TestBed.tick();

    expect(theme.getPreference()).toBe('dark');
    expect(theme.getSeed()).toEqual({seed: TEAL, intensity: INTENSITY});
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('drops a local colour the server does not have', () => {
    theme.setSeed(INDIGO);

    store.appearance.set({theme: 'system'});
    TestBed.tick();

    expect(theme.getSeed()).toBeNull();
  });

  it('ignores a mode the server sent that it does not know', () => {
    theme.setPreference('dark');

    store.appearance.set({theme: 'sepia' as never});
    TestBed.tick();

    expect(theme.getPreference()).toBe('dark');
  });

  it('writes a mode change to the account as a whole appearance', () => {
    service.setMode('dark');

    expect(theme.getPreference()).toBe('dark');
    expect(store.patched).toEqual([{appearance: {theme: 'dark'}}]);
  });

  it('writes a colour change with the current mode', () => {
    service.setMode('light');
    service.setSeed(TEAL, INTENSITY);

    expect(store.patched.at(-1)).toEqual({
      appearance: {theme: 'light', seed: TEAL, intensity: INTENSITY},
    });
  });

  it('writes a colour reset without a seed, so the server clears it', () => {
    service.setSeed(TEAL);
    service.resetSeed();

    expect(store.patched.at(-1)).toEqual({appearance: {theme: 'system'}});
    vi.advanceTimersByTime(SEED_SAVE_DELAY_MS);
    expect(store.patched).toHaveLength(1);
  });

  it('builds the write from the cache, not a merge over a store that has not loaded', () => {
    theme.setPreference('dark');

    service.setSeed(TEAL);
    vi.advanceTimersByTime(SEED_SAVE_DELAY_MS);

    expect(store.patched[0]).toEqual({
      appearance: {theme: 'dark', seed: TEAL, intensity: DEFAULT_INTENSITY},
    });
  });

  describe('a colour drag', () => {
    const DRAG = ['#112233', '#223344', '#334455', TEAL];

    it('changes the page at once and writes the account once, with the last colour', () => {
      for (const colour of DRAG) {
        service.setSeed(colour);
      }

      expect(theme.getSeed()?.seed).toBe(TEAL);
      expect(store.patched).toEqual([]);

      vi.advanceTimersByTime(SEED_SAVE_DELAY_MS);

      expect(store.patched).toEqual([
        {appearance: {theme: 'system', seed: TEAL, intensity: DEFAULT_INTENSITY}},
      ]);
    });

    it('waits for the colour to sit still', () => {
      service.setSeed(INDIGO);
      vi.advanceTimersByTime(SEED_SAVE_DELAY_MS - 1);
      service.setSeed(TEAL);
      vi.advanceTimersByTime(SEED_SAVE_DELAY_MS - 1);
      expect(store.patched).toEqual([]);

      vi.advanceTimersByTime(1);

      expect(store.patched).toHaveLength(1);
      expect(store.patched[0].appearance?.seed).toBe(TEAL);
    });

    it('writes an intensity change at once, with the colour it has now', () => {
      service.setSeed(INDIGO);
      service.setSeed(TEAL);
      service.setSeed(TEAL, INTENSITY);

      expect(store.patched).toEqual([
        {appearance: {theme: 'system', seed: TEAL, intensity: INTENSITY}},
      ]);
      vi.advanceTimersByTime(SEED_SAVE_DELAY_MS);
      expect(store.patched).toHaveLength(1);
    });

    it('goes out with a mode change instead of after it', () => {
      service.setSeed(TEAL);
      service.setMode('dark');

      expect(store.patched).toEqual([
        {appearance: {theme: 'dark', seed: TEAL, intensity: DEFAULT_INTENSITY}},
      ]);
      vi.advanceTimersByTime(SEED_SAVE_DELAY_MS);
      expect(store.patched).toHaveLength(1);
    });

    it('is written when the page is hidden for navigation', () => {
      service.setSeed(TEAL);

      window.dispatchEvent(new Event('pagehide'));

      expect(store.patched).toHaveLength(1);
      expect(store.patched[0].appearance?.seed).toBe(TEAL);
      vi.advanceTimersByTime(SEED_SAVE_DELAY_MS);
      expect(store.patched).toHaveLength(1);
    });

    it('is written when the tab becomes hidden, and not when it becomes visible', () => {
      const state = vi.spyOn(document, 'visibilityState', 'get');
      service.setSeed(TEAL);

      state.mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(store.patched).toEqual([]);

      state.mockReturnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      expect(store.patched).toHaveLength(1);
      expect(store.patched[0].appearance?.seed).toBe(TEAL);
    });

    it('is written when the service is destroyed', () => {
      service.setSeed(TEAL);

      TestBed.resetTestingModule();

      expect(store.patched).toHaveLength(1);
      expect(store.patched[0].appearance?.seed).toBe(TEAL);
    });

    it('keeps the drag colour when the store reports an older value while the write waits', () => {
      store.appearance.set({theme: 'system', seed: INDIGO, intensity: DEFAULT_INTENSITY});
      TestBed.tick();

      service.setSeed(TEAL);
      store.appearance.set({theme: 'system', seed: INDIGO, intensity: DEFAULT_INTENSITY});
      TestBed.tick();

      expect(theme.getSeed()?.seed).toBe(TEAL);

      vi.advanceTimersByTime(SEED_SAVE_DELAY_MS);
      TestBed.tick();

      expect(store.patched).toEqual([
        {appearance: {theme: 'system', seed: TEAL, intensity: DEFAULT_INTENSITY}},
      ]);
      expect(theme.getSeed()?.seed).toBe(TEAL);
    });

    it('sends nothing when nothing was pending as the page is left', () => {
      window.dispatchEvent(new Event('pagehide'));
      TestBed.resetTestingModule();

      expect(store.patched).toEqual([]);
    });
  });

  it('puts the cache back when a save is rolled back', () => {
    store.appearance.set({theme: 'light'});
    TestBed.tick();
    vi.spyOn(store, 'patch').mockImplementationOnce(() => Promise.resolve(false));

    service.setMode('dark');
    expect(theme.getPreference()).toBe('dark');

    // The real store drops the failed change from its view; the mirror follows.
    store.appearance.set({theme: 'light'});
    TestBed.tick();

    expect(theme.getPreference()).toBe('light');
  });

  it('keeps the cache when the store is cleared on sign-out', () => {
    store.appearance.set({theme: 'dark', seed: TEAL});
    TestBed.tick();

    store.appearance.set(null);
    TestBed.tick();

    expect(theme.getPreference()).toBe('dark');
    expect(theme.getSeed()?.seed).toBe(TEAL);
  });
});
