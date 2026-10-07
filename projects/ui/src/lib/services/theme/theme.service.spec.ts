import {TestBed} from '@angular/core/testing';
import chroma from 'chroma-js';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {LOCAL_STORAGE, PREFERS_DARK, ThemeService} from './theme.service';

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

const ACCENT_STOPS = 11;
const MIN_CONTRAST = 4.5;
const MAX_MID_DELTA_E = 15;
const LIGHT_SURFACE = '#f8f9fa';
const DARK_SURFACE = '#111827';

function stopValue(stop: number): string {
  return document.documentElement.style.getPropertyValue(`--cmn-accent-${stop * 100}`);
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
  seed?: Record<string, string>,
  osDark = false
): {service: ThemeService; storage: Storage; os: FakeMediaQuery} {
  const storage = new MemoryStorage();
  const os = new FakeMediaQuery(osDark);
  for (const [k, v] of Object.entries(seed ?? {})) {
    storage.setItem(k, v);
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {provide: LOCAL_STORAGE, useValue: storage},
      {provide: PREFERS_DARK, useValue: os},
    ],
  });
  return {service: TestBed.inject(ThemeService), storage, os};
}

describe('ThemeService', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    for (let stop = 1; stop <= ACCENT_STOPS; stop++) {
      document.documentElement.style.removeProperty(`--cmn-accent-${stop * 100}`);
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
        ],
      });
      expect(TestBed.inject(ThemeService).getTheme()).toBe('light');
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
        ],
      });
      const service = TestBed.inject(ThemeService);
      expect(service.getTheme()).toBe('dark');
      service.setTheme('light');
      service.setPreference('system');
      service.setAccent('#4f46e5');
      service.resetAccent();
      expect(service.getStoredAccent()).toBeNull();
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
  });

  it('writes a full accent ramp as inline custom properties', () => {
    const {service, storage} = build();
    service.setAccent('#4f46e5');

    for (let stop = 1; stop <= ACCENT_STOPS; stop++) {
      const value = document.documentElement.style.getPropertyValue(`--cmn-accent-${stop * 100}`);
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(storage.getItem('cmn-accent')).toBe('#4f46e5');
    expect(service.getStoredAccent()).toBe('#4f46e5');
  });

  it('runs the accent ramp between the scale-end tokens when they resolve', () => {
    const root = document.documentElement;
    const {service} = build();
    service.setAccent('#4f46e5');
    const shipped = root.style.getPropertyValue('--cmn-accent-100');

    root.style.setProperty('--color-accent-scale-light', '#000000');
    root.style.setProperty('--color-accent-scale-dark', '#000000');
    service.setAccent('#4f46e5');
    const overridden = root.style.getPropertyValue('--cmn-accent-100');
    root.style.removeProperty('--color-accent-scale-light');
    root.style.removeProperty('--color-accent-scale-dark');

    expect(overridden).not.toBe(shipped);
  });

  it('publishes the active accent', () => {
    const {service} = build();
    const seen: (string | null)[] = [];
    service.activeAccent$.subscribe(a => seen.push(a));

    service.setAccent('#0ea5e9');
    expect(seen).toEqual([null, '#0ea5e9']);
  });

  it('re-applies a persisted accent on construction', () => {
    build({'cmn-accent': '#e11d48'});
    expect(document.documentElement.style.getPropertyValue('--cmn-accent-500')).not.toBe('');
  });

  it('clears every stop and the stored hex on reset', () => {
    const {service, storage} = build();
    service.setAccent('#4f46e5');
    service.resetAccent();

    for (let stop = 1; stop <= ACCENT_STOPS; stop++) {
      expect(document.documentElement.style.getPropertyValue(`--cmn-accent-${stop * 100}`)).toBe(
        ''
      );
    }
    expect(storage.getItem('cmn-accent')).toBeNull();
    expect(service.getStoredAccent()).toBeNull();
  });

  it('reports no stored accent on a fresh install', () => {
    const {service} = build();
    expect(service.getStoredAccent()).toBeNull();
  });

  describe('contrast auto-correction', () => {
    let surfaces: HTMLStyleElement;

    beforeEach(() => {
      surfaces = document.createElement('style');
      surfaces.textContent = `
        :root { --color-surface-bg: ${LIGHT_SURFACE}; }
        :root[data-theme='dark'] { --color-surface-bg: ${DARK_SURFACE}; }
      `;
      document.head.appendChild(surfaces);
    });

    afterEach(() => {
      surfaces.remove();
    });

    it('darkens failing light stops on a light surface until they pass', () => {
      const {service} = build();
      service.setAccent('#4f46e5');

      for (let stop = 1; stop <= ACCENT_STOPS; stop++) {
        expect(chroma.contrast(stopValue(stop), LIGHT_SURFACE)).toBeGreaterThanOrEqual(
          MIN_CONTRAST
        );
      }
      // First stop starts near-white (#f8f8f8): corrected darker, never saturating at white.
      const first = chroma(stopValue(1));
      expect(first.get('oklch.l')).toBeLessThan(chroma('#f8f8f8').get('oklch.l'));
      expect(first.hex()).not.toBe('#ffffff');
    });

    it('lightens failing dark stops on a dark surface until they pass', () => {
      const {service} = build({'cmn-theme': 'dark'});
      service.setAccent('#4f46e5');

      for (let stop = 1; stop <= ACCENT_STOPS; stop++) {
        expect(chroma.contrast(stopValue(stop), DARK_SURFACE)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      }
      // Last stop starts near-black (#0a0a0a): corrected lighter, never saturating at black.
      const last = chroma(stopValue(ACCENT_STOPS));
      expect(last.get('oklch.l')).toBeGreaterThan(chroma('#0a0a0a').get('oklch.l'));
      expect(last.hex()).not.toBe('#000000');
    });

    it('keeps the mid stop recognisably the requested accent', () => {
      const {service} = build();
      service.setAccent('#4f46e5');

      expect(chroma.deltaE(stopValue(6), '#4f46e5')).toBeLessThan(MAX_MID_DELTA_E);
    });

    it('recomputes the ramp against the new surface when the theme changes', () => {
      const {service} = build();
      service.setAccent('#4f46e5');
      const lightLast = stopValue(ACCENT_STOPS);
      expect(chroma.contrast(lightLast, LIGHT_SURFACE)).toBeGreaterThanOrEqual(MIN_CONTRAST);

      service.setTheme('dark');
      const darkLast = stopValue(ACCENT_STOPS);
      expect(darkLast).not.toBe(lightLast);
      expect(chroma(darkLast).get('oklch.l')).toBeGreaterThan(chroma(lightLast).get('oklch.l'));
      expect(chroma.contrast(darkLast, DARK_SURFACE)).toBeGreaterThanOrEqual(MIN_CONTRAST);

      service.setTheme('light');
      expect(stopValue(ACCENT_STOPS)).toBe(lightLast);
    });

    it('meets AA on every stop for extreme accents on each surface', () => {
      for (const [theme, surface] of [
        ['light', LIGHT_SURFACE],
        ['dark', DARK_SURFACE],
      ] as const) {
        for (const accent of ['#ffffff', '#000000', '#808080']) {
          const {service} = build({'cmn-theme': theme});
          service.setAccent(accent);
          for (let stop = 1; stop <= ACCENT_STOPS; stop++) {
            expect(chroma.contrast(stopValue(stop), surface)).toBeGreaterThanOrEqual(MIN_CONTRAST);
          }
        }
      }
    });
  });
});
