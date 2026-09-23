import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

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
});
