import {Injectable, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {type AccountPreferences, type AppearancePreference} from '@lifekit-hq/core/preferences';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {provideAppearanceSync} from '../../services/appearance/appearance.service';
import {PresetService, provideDesignPresets} from '../../services/preset/preset.service';
import {
  LOCAL_STORAGE,
  PREFERS_DARK,
  PREFERS_MORE_CONTRAST,
  ThemeService,
} from '../../services/theme/theme.service';
import {AppearanceSettingsComponent} from './appearance-settings.component';

const TEAL = '#175a6d';
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

function setup(synced: boolean, presets = false): ComponentFixture<AppearanceSettingsComponent> {
  TestBed.configureTestingModule({
    providers: [
      {provide: LOCAL_STORAGE, useValue: new MemoryStorage()},
      {provide: PREFERS_DARK, useValue: null},
      {provide: PREFERS_MORE_CONTRAST, useValue: null},
      ...(synced ? [provideAppearanceSync(FakeStore)] : []),
      ...(presets ? [provideDesignPresets({id: 'lifekit', label: 'Lifekit'})] : []),
    ],
  });
  const fixture = TestBed.createComponent(AppearanceSettingsComponent);
  fixture.detectChanges();
  return fixture;
}

function el(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function radios(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(el(fixture).querySelectorAll<HTMLButtonElement>('[role="radio"]'));
}

function picker(
  fixture: ComponentFixture<unknown>
): HTMLElement & {seed: string; intensity: number} {
  return el(fixture).querySelector('lk-theme-picker') as never;
}

function emitFromPicker(
  fixture: ComponentFixture<unknown>,
  detail: {seed: string | null; intensity: number}
): void {
  picker(fixture).dispatchEvent(new CustomEvent('lk-theme-picker-change', {detail, bubbles: true}));
  fixture.detectChanges();
}

afterEach(() => {
  document.documentElement.removeAttribute('data-preset');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('style');
});

describe('AppearanceSettingsComponent', () => {
  describe('with an account store', () => {
    let fixture: ComponentFixture<AppearanceSettingsComponent>;
    let store: FakeStore;
    let theme: ThemeService;

    beforeEach(() => {
      fixture = setup(true);
      store = TestBed.inject(FakeStore);
      theme = TestBed.inject(ThemeService);
    });

    it('offers System, Light and Dark, on System by default', () => {
      expect(radios(fixture).map(r => r.textContent?.trim())).toEqual(['System', 'Light', 'Dark']);
      expect(radios(fixture)[0].getAttribute('aria-checked')).toBe('true');
    });

    it('says the choice is synced to the account', () => {
      expect(el(fixture).textContent).toContain('Synced to your account');
    });

    it('applies a chosen mode to the page and the account', () => {
      radios(fixture)[2].click();
      fixture.detectChanges();

      expect(theme.getPreference()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(store.patched).toEqual([{appearance: {theme: 'dark'}}]);
      expect(radios(fixture)[2].getAttribute('aria-checked')).toBe('true');
    });

    it('can go back to System', () => {
      radios(fixture)[2].click();
      radios(fixture)[0].click();
      fixture.detectChanges();

      expect(theme.getPreference()).toBe('system');
      expect(store.patched.at(-1)).toEqual({appearance: {theme: 'system'}});
    });

    it('describes the chosen mode', () => {
      expect(el(fixture).textContent).toContain('Follows your device');

      radios(fixture)[1].click();
      fixture.detectChanges();

      expect(el(fixture).textContent).toContain('Always light.');
    });

    it('applies a picked colour to the page and the account', () => {
      emitFromPicker(fixture, {seed: TEAL, intensity: INTENSITY});

      expect(theme.getSeed()).toEqual({seed: TEAL, intensity: INTENSITY});
      expect(store.patched.at(-1)).toEqual({
        appearance: {theme: 'system', seed: TEAL, intensity: INTENSITY},
      });
    });

    it('resets the colour when the picker goes back to the app colour', () => {
      emitFromPicker(fixture, {seed: TEAL, intensity: INTENSITY});
      emitFromPicker(fixture, {seed: null, intensity: INTENSITY});

      expect(theme.getSeed()).toBeNull();
      expect(store.patched.at(-1)).toEqual({appearance: {theme: 'system'}});
    });

    it('shows the colour the account loaded', () => {
      store.appearance.set({theme: 'dark', seed: TEAL, intensity: INTENSITY});
      TestBed.tick();
      fixture.detectChanges();

      expect(radios(fixture)[2].getAttribute('aria-checked')).toBe('true');
      expect(picker(fixture).seed).toBe(TEAL);
      expect(picker(fixture).intensity).toBe(INTENSITY);
    });
  });

  describe('with no preferences endpoint', () => {
    let fixture: ComponentFixture<AppearanceSettingsComponent>;

    beforeEach(() => {
      fixture = setup(false);
    });

    it('says the choice stays on this device', () => {
      expect(el(fixture).textContent).toContain('On this device');
      expect(el(fixture).textContent).not.toContain('Synced to your account');
    });

    it('still applies a mode to the page and the cache', () => {
      radios(fixture)[1].click();
      fixture.detectChanges();

      expect(TestBed.inject(ThemeService).getPreference()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('design presets', () => {
    function designRadios(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
      return Array.from(
        el(fixture).querySelectorAll<HTMLButtonElement>('[aria-label="Design"] [role="radio"]')
      );
    }

    it('shows no Design control while the app offers only Carbon', () => {
      const fixture = setup(false);
      expect(el(fixture).textContent).not.toContain('Design');
      expect(radios(fixture)).toHaveLength(3);
    });

    it('lists the offered presets, Carbon first and selected', () => {
      const fixture = setup(false, true);
      expect(designRadios(fixture).map(r => r.textContent?.trim())).toEqual(['Carbon', 'Lifekit']);
      expect(designRadios(fixture)[0].getAttribute('aria-checked')).toBe('true');
    });

    it('applies a chosen preset to the page and keeps it on this device, even with an account store', () => {
      const fixture = setup(true, true);
      designRadios(fixture)[1].click();
      fixture.detectChanges();

      expect(TestBed.inject(PresetService).getPreset()).toBe('lifekit');
      expect(document.documentElement.getAttribute('data-preset')).toBe('lifekit');
      expect(TestBed.inject(FakeStore).patched).toEqual([]);
      expect(designRadios(fixture)[1].getAttribute('aria-checked')).toBe('true');
    });

    it('goes back to Carbon', () => {
      const fixture = setup(false, true);
      designRadios(fixture)[1].click();
      designRadios(fixture)[0].click();
      fixture.detectChanges();

      expect(document.documentElement.hasAttribute('data-preset')).toBe(false);
    });
  });

  it('hands the app colour to the picker', () => {
    const fixture = setup(false);
    fixture.componentRef.setInput('appSeed', TEAL);
    fixture.detectChanges();

    expect(picker(fixture).getAttribute('app-seed')).toBe(TEAL);
  });

  it('leaves app-seed off the picker when there is none', () => {
    const fixture = setup(false);

    expect(picker(fixture).hasAttribute('app-seed')).toBe(false);
  });
});
