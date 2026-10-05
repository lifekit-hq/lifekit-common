import {TestBed} from '@angular/core/testing';
import chroma from 'chroma-js';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {LOCAL_STORAGE, ThemeService} from './theme.service';

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

function build(seed?: Record<string, string>): {service: ThemeService; storage: Storage} {
  const storage = new MemoryStorage();
  for (const [k, v] of Object.entries(seed ?? {})) {
    storage.setItem(k, v);
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{provide: LOCAL_STORAGE, useValue: storage}],
  });
  return {service: TestBed.inject(ThemeService), storage};
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
    afterEach(() => {
      document.documentElement.style.removeProperty('--color-surface-bg');
    });

    it('darkens failing light stops on a light surface until they pass', () => {
      document.documentElement.style.setProperty('--color-surface-bg', LIGHT_SURFACE);
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
      document.documentElement.style.setProperty('--color-surface-bg', DARK_SURFACE);
      const {service} = build();
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
      document.documentElement.style.setProperty('--color-surface-bg', LIGHT_SURFACE);
      const {service} = build();
      service.setAccent('#4f46e5');

      expect(chroma.deltaE(stopValue(6), '#4f46e5')).toBeLessThan(MAX_MID_DELTA_E);
    });

    it('terminates on every stop for extreme accents', () => {
      for (const surface of [LIGHT_SURFACE, DARK_SURFACE]) {
        document.documentElement.style.setProperty('--color-surface-bg', surface);
        for (const accent of ['#ffffff', '#000000', '#808080']) {
          const {service} = build();
          service.setAccent(accent);
          for (let stop = 1; stop <= ACCENT_STOPS; stop++) {
            expect(stopValue(stop)).toMatch(/^#[0-9a-f]{6}$/i);
          }
        }
      }
    });
  });
});
