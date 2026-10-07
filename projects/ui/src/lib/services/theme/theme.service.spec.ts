import {TestBed} from '@angular/core/testing';
import {
  contrastRatio,
  DEFAULT_INTENSITY,
  derive,
  SEED_STORAGE_KEY,
  seedTokenNames,
} from '@lifekit-hq/tokens/engine';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {LOCAL_STORAGE, PREFERS_DARK, PREFERS_MORE_CONTRAST, ThemeService} from './theme.service';

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

const INDIGO = '#4f46e5';
const MIN_TEXT_CONTRAST = 4.5;

function inline(name: string): string {
  return document.documentElement.style.getPropertyValue(`--color-${name}`);
}

function derived(
  name: string,
  mode: 'light' | 'dark',
  contrast: 'standard' | 'more' = 'standard'
): string {
  return derive({seed: INDIGO, mode, contrast}).tokens[name];
}

class FakeMediaQuery extends EventTarget {
  public matches: boolean;

  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }

  public setMatches(matches: boolean): void {
    this.matches = matches;
    this.dispatchEvent(new Event('change'));
  }
}

function build(
  stored?: Record<string, string>,
  osDark = false,
  osMoreContrast = false
): {service: ThemeService; storage: Storage; os: FakeMediaQuery; contrast: FakeMediaQuery} {
  const storage = new MemoryStorage();
  const os = new FakeMediaQuery(osDark);
  const contrast = new FakeMediaQuery(osMoreContrast);
  for (const [k, v] of Object.entries(stored ?? {})) {
    storage.setItem(k, v);
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {provide: LOCAL_STORAGE, useValue: storage},
      {provide: PREFERS_DARK, useValue: os},
      {provide: PREFERS_MORE_CONTRAST, useValue: contrast},
    ],
  });
  return {service: TestBed.inject(ThemeService), storage, os, contrast};
}

describe('ThemeService', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    for (const name of seedTokenNames()) {
      document.documentElement.style.removeProperty(name);
    }
  });

  it('starts light and writes the attribute the token file keys off', () => {
    const {service} = build();
    expect(service.getTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('restores a persisted dark theme on construction', () => {
    const {service} = build({'cmn-theme': 'dark'});
    expect(service.getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('falls back to light for an unrecognised persisted value', () => {
    const {service} = build({'cmn-theme': 'solarized'});
    expect(service.getTheme()).toBe('light');
  });

  it('persists and publishes a theme change', () => {
    const {service, storage} = build();
    const seen: string[] = [];
    service.activeTheme$.subscribe(t => seen.push(t));

    service.setTheme('dark');
    expect(storage.getItem('cmn-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(seen).toEqual(['light', 'dark']);
  });

  it('toggles between the two themes', () => {
    const {service} = build();
    service.toggle();
    expect(service.getTheme()).toBe('dark');
    service.toggle();
    expect(service.getTheme()).toBe('light');
  });

  describe('system preference', () => {
    it('follows the OS when nothing is stored', () => {
      const {service} = build({}, true);
      expect(service.getPreference()).toBe('system');
      expect(service.getTheme()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('lets a stored choice win over the OS', () => {
      const {service} = build({'cmn-theme': 'light'}, true);
      expect(service.getPreference()).toBe('light');
      expect(service.getTheme()).toBe('light');
    });

    it('follows OS changes live without persisting them', () => {
      const {service, storage, os} = build();
      const seen: string[] = [];
      service.activeTheme$.subscribe(t => seen.push(t));

      os.setMatches(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      os.setMatches(false);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(seen).toEqual(['light', 'dark', 'light']);
      expect(storage.getItem('cmn-theme')).toBeNull();
    });

    it('ignores OS changes once a theme is pinned', () => {
      const {service, os} = build();
      service.setTheme('light');
      os.setMatches(true);
      expect(service.getTheme()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('returns to the OS theme and clears the stored choice', () => {
      const {service, storage, os} = build({'cmn-theme': 'light'}, true);
      const prefs: string[] = [];
      service.preference$.subscribe(p => prefs.push(p));

      service.setPreference('system');
      expect(storage.getItem('cmn-theme')).toBeNull();
      expect(service.getTheme()).toBe('dark');

      os.setMatches(false);
      expect(service.getTheme()).toBe('light');
      expect(prefs).toEqual(['light', 'system']);
    });

    it('pins the opposite of the resolved theme on toggle', () => {
      const {service, storage} = build({}, true);
      service.toggle();
      expect(service.getPreference()).toBe('light');
      expect(storage.getItem('cmn-theme')).toBe('light');
    });

    it('stops listening when destroyed', () => {
      const {service, os} = build();
      TestBed.resetTestingModule();
      os.setMatches(true);
      expect(service.getTheme()).toBe('light');
    });

    it('falls back to light without matchMedia', () => {
      const storage = new MemoryStorage();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {provide: LOCAL_STORAGE, useValue: storage},
          {provide: PREFERS_DARK, useValue: null},
          {provide: PREFERS_MORE_CONTRAST, useValue: null},
        ],
      });
      const service = TestBed.inject(ThemeService);
      expect(service.getTheme()).toBe('light');
      service.setSeed(INDIGO);
      expect(inline('accent-default')).toBe(derived('accent-default', 'light'));
    });

    it('survives blocked storage', () => {
      const blocked = new MemoryStorage();
      const boom = (): never => {
        throw new Error('blocked');
      };
      blocked.getItem = boom;
      blocked.setItem = boom;
      blocked.removeItem = boom;
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          {provide: LOCAL_STORAGE, useValue: blocked},
          {provide: PREFERS_DARK, useValue: new FakeMediaQuery(true)},
          {provide: PREFERS_MORE_CONTRAST, useValue: new FakeMediaQuery(false)},
        ],
      });
      const service = TestBed.inject(ThemeService);
      expect(service.getTheme()).toBe('dark');
      service.setTheme('light');
      service.setPreference('system');
      service.setSeed(INDIGO);
      expect(inline('accent-default')).toBe(derived('accent-default', 'dark'));
      service.resetSeed();
      expect(service.getSeed()).toBeNull();
      expect(inline('accent-default')).toBe('');
    });
  });

  describe('theme-color metas', () => {
    let style: HTMLStyleElement;
    let metas: HTMLMetaElement[];

    beforeEach(() => {
      style = document.createElement('style');
      style.textContent = `
        :root { --color-surface-bg: #f7f8fa; }
        :root[data-theme='dark'] { --color-surface-bg: #0e1120; }
      `;
      document.head.appendChild(style);
      metas = ['light', 'dark'].map(scheme => {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#000000';
        meta.media = `(prefers-color-scheme: ${scheme})`;
        document.head.appendChild(meta);
        return meta;
      });
    });

    afterEach(() => {
      style.remove();
      metas.forEach(meta => meta.remove());
    });

    it('points every meta at the active surface on construction', () => {
      build({'cmn-theme': 'dark'});
      expect(metas.map(m => m.content)).toEqual(['#0e1120', '#0e1120']);
    });

    it('follows theme changes, including OS-driven ones', () => {
      const {service, os} = build();
      expect(metas.map(m => m.content)).toEqual(['#f7f8fa', '#f7f8fa']);

      service.setTheme('dark');
      expect(metas.map(m => m.content)).toEqual(['#0e1120', '#0e1120']);

      service.setPreference('system');
      os.setMatches(true);
      expect(metas.map(m => m.content)).toEqual(['#0e1120', '#0e1120']);
      os.setMatches(false);
      expect(metas.map(m => m.content)).toEqual(['#f7f8fa', '#f7f8fa']);
    });

    it('leaves the metas alone when the surface token is not loaded', () => {
      style.remove();
      build();
      expect(metas.map(m => m.content)).toEqual(['#000000', '#000000']);
    });

    it('follows a seed, whose surface replaces the app palette', () => {
      const {service} = build();
      service.setSeed(INDIGO);
      const surface = derived('surface-bg', 'light');
      expect(metas.map(m => m.content)).toEqual([surface, surface]);

      service.resetSeed();
      expect(metas.map(m => m.content)).toEqual(['#f7f8fa', '#f7f8fa']);
    });
  });

  describe('seed colour', () => {
    it('leaves the app palette untouched when no seed is set', () => {
      const {service} = build();
      expect(service.getSeed()).toBeNull();
      for (const name of seedTokenNames()) {
        expect(document.documentElement.style.getPropertyValue(name)).toBe('');
      }
    });

    it('applies the whole derived palette inline at the quiet default intensity', () => {
      const {service} = build();
      service.setSeed(INDIGO);
      const {tokens} = derive({seed: INDIGO, intensity: DEFAULT_INTENSITY, mode: 'light'});
      for (const [name, value] of Object.entries(tokens)) {
        expect(inline(name), name).toBe(value);
      }
      expect(service.getSeed()).toEqual({seed: INDIGO, intensity: DEFAULT_INTENSITY});
    });

    it('persists the choice with every variant cached for the pre-paint script', () => {
      const {service, storage} = build();
      service.setSeed('#4F46E5', 0.45);
      const cached = JSON.parse(storage.getItem(SEED_STORAGE_KEY) ?? 'null');
      expect(cached.seed).toBe(INDIGO);
      expect(cached.intensity).toBe(0.45);
      expect(Object.keys(cached.css)).toEqual(['light', 'dark', 'light-more', 'dark-more']);
    });

    it('re-derives for the theme when it changes', () => {
      const {service} = build();
      service.setSeed(INDIGO);
      service.setTheme('dark');
      expect(inline('accent-default')).toBe(derived('accent-default', 'dark'));
      expect(inline('surface-bg')).toBe(derived('surface-bg', 'dark'));
      service.setTheme('light');
      expect(inline('accent-default')).toBe(derived('accent-default', 'light'));
    });

    it('follows the OS contrast preference live', () => {
      const {service, contrast} = build({}, false, true);
      service.setSeed(INDIGO);
      expect(inline('text-secondary')).toBe(derived('text-secondary', 'light', 'more'));
      contrast.setMatches(false);
      expect(inline('text-secondary')).toBe(derived('text-secondary', 'light'));
    });

    it('keeps text and accent fills readable for any colour, solved per role', () => {
      for (const seed of ['#ffffff', '#000000', '#ffff00', '#808080']) {
        for (const theme of ['light', 'dark'] as const) {
          const {service} = build({'cmn-theme': theme});
          service.setSeed(seed);
          const pairs: [string, string][] = [
            ['text-primary', 'surface-card'],
            ['accent-default', 'surface-card'],
            ['text-inverse', 'accent-default'],
          ];
          for (const [fg, bg] of pairs) {
            expect(
              contrastRatio(inline(fg), inline(bg)),
              `${seed} ${theme} ${fg}/${bg}`
            ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
          }
        }
      }
    });

    it('restores a stored seed on construction', () => {
      const first = build();
      first.service.setSeed(INDIGO, 0.85);
      const {service} = build({
        [SEED_STORAGE_KEY]: first.storage.getItem(SEED_STORAGE_KEY) ?? '',
        'cmn-theme': 'dark',
      });
      expect(service.getSeed()).toEqual({seed: INDIGO, intensity: 0.85});
      expect(inline('surface-bg')).toBe(
        derive({seed: INDIGO, intensity: 0.85, mode: 'dark'}).tokens['surface-bg']
      );
    });

    it('publishes the active seed', () => {
      const {service} = build();
      const seen: unknown[] = [];
      service.activeSeed$.subscribe(seed => seen.push(seed));
      service.setSeed(INDIGO);
      service.resetSeed();
      expect(seen).toEqual([null, {seed: INDIGO, intensity: DEFAULT_INTENSITY}, null]);
    });

    it('clears every derived property and the stored choice on reset', () => {
      const {service, storage} = build();
      service.setSeed(INDIGO);
      service.resetSeed();
      for (const name of seedTokenNames()) {
        expect(document.documentElement.style.getPropertyValue(name)).toBe('');
      }
      expect(storage.getItem(SEED_STORAGE_KEY)).toBeNull();
    });

    it('rejects a seed that is not a hex colour', () => {
      const {service} = build();
      expect(() => service.setSeed('indigo')).toThrow(TypeError);
      expect(service.getSeed()).toBeNull();
    });
  });

  describe('accent (pre-engine API)', () => {
    it('sets the seed, keeping the current intensity', () => {
      const {service} = build();
      service.setSeed('#8e3b8a', 0.45);
      service.setAccent(INDIGO);
      expect(service.getSeed()).toEqual({seed: INDIGO, intensity: 0.45});
      expect(service.getStoredAccent()).toBe(INDIGO);
    });

    it('feeds the --cmn-accent-* ramp through the derived accent stops', () => {
      const {service} = build();
      service.setAccent(INDIGO);
      expect(inline('accent-500')).toBe(derived('accent-500', 'light'));
    });

    it('publishes the active accent hex', () => {
      const {service} = build();
      const seen: (string | null)[] = [];
      service.activeAccent$.subscribe(a => seen.push(a));
      service.setAccent('#0ea5e9');
      service.resetAccent();
      expect(seen).toEqual([null, '#0ea5e9', null]);
    });

    it('migrates an accent stored before the engine into a seed', () => {
      const {service, storage} = build({'cmn-accent': '#e11d48'});
      expect(service.getSeed()).toEqual({seed: '#e11d48', intensity: DEFAULT_INTENSITY});
      expect(storage.getItem('cmn-accent')).toBeNull();
      expect(storage.getItem(SEED_STORAGE_KEY)).not.toBeNull();
      expect(inline('accent-default')).toBe(
        derive({seed: '#e11d48', mode: 'light'}).tokens['accent-default']
      );
    });

    it('drops an unusable stored accent', () => {
      const {service, storage} = build({'cmn-accent': 'not-a-colour'});
      expect(service.getSeed()).toBeNull();
      expect(storage.getItem('cmn-accent')).toBeNull();
    });

    it('reports no stored accent on a fresh install', () => {
      const {service} = build();
      expect(service.getStoredAccent()).toBeNull();
    });
  });
});
