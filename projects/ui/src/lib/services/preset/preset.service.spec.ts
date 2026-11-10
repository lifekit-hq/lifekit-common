import {TestBed} from '@angular/core/testing';
import {afterEach, describe, expect, it} from 'vitest';

import {LOCAL_STORAGE} from '../theme/theme.service';
import {
  DEFAULT_PRESET,
  DESIGN_PRESETS,
  type DesignPresetOption,
  PresetService,
  provideDesignPresets,
} from './preset.service';

const LIFEKIT: DesignPresetOption = {id: 'lifekit', label: 'Lifekit'};
const SOFT: DesignPresetOption = {id: 'soft', label: 'Soft'};

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

/** A storage that refuses every call, as a locked-down browser does. */
class BlockedStorage extends MemoryStorage {
  public override getItem(): string | null {
    throw new Error('blocked');
  }

  public override setItem(): void {
    throw new Error('blocked');
  }

  public override removeItem(): void {
    throw new Error('blocked');
  }
}

function build(options: {stored?: string; offered?: DesignPresetOption[]; storage?: Storage}): {
  service: PresetService;
  storage: Storage;
} {
  const storage = options.storage ?? new MemoryStorage();
  if (options.stored !== undefined) {
    storage.setItem('cmn-preset', options.stored);
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {provide: LOCAL_STORAGE, useValue: storage},
      ...(options.offered ? [provideDesignPresets(...options.offered)] : []),
    ],
  });
  return {service: TestBed.inject(PresetService), storage};
}

const attribute = (): string | null => document.documentElement.getAttribute('data-preset');

describe('PresetService', () => {
  afterEach(() => document.documentElement.removeAttribute('data-preset'));

  it('is Carbon with no attribute and nothing stored by default', () => {
    const {service, storage} = build({});
    expect(service.preset()).toBe(DEFAULT_PRESET);
    expect(attribute()).toBeNull();
    expect(storage.getItem('cmn-preset')).toBeNull();
  });

  it('offers Carbon alone unless the app provides more', () => {
    const {service} = build({});
    expect(service.available).toEqual([{id: 'carbon', label: 'Carbon'}]);
  });

  it('puts Carbon first and ignores a second Carbon among the provided presets', () => {
    const {service} = build({offered: [LIFEKIT, {id: 'carbon', label: 'Other'}, SOFT]});
    expect(service.available.map(p => p.id)).toEqual(['carbon', 'lifekit', 'soft']);
    expect(service.available[0].label).toBe('Carbon');
  });

  it('sets data-preset, publishes the signal and persists a chosen preset', () => {
    const {service, storage} = build({offered: [LIFEKIT]});
    service.setPreset('lifekit');
    expect(attribute()).toBe('lifekit');
    expect(service.preset()).toBe('lifekit');
    expect(service.getPreset()).toBe('lifekit');
    expect(storage.getItem('cmn-preset')).toBe('lifekit');
  });

  it('goes back to Carbon by removing the attribute and storing carbon as the choice', () => {
    const {service, storage} = build({offered: [LIFEKIT]});
    service.setPreset('lifekit');
    service.setPreset('carbon');
    expect(attribute()).toBeNull();
    expect(service.preset()).toBe('carbon');
    expect(storage.getItem('cmn-preset')).toBe('carbon');
  });

  it('stores an explicit Carbon pick even when nothing was stored before', () => {
    const {service, storage} = build({});
    expect(storage.getItem('cmn-preset')).toBeNull();
    service.setPreset('carbon');
    expect(storage.getItem('cmn-preset')).toBe('carbon');
  });

  it('keeps a Carbon pick across a reload on an app whose default is another preset', () => {
    document.documentElement.setAttribute('data-preset', 'lifekit');
    const first = build({offered: [LIFEKIT]});
    expect(first.service.preset()).toBe('lifekit');
    first.service.setPreset('carbon');
    expect(attribute()).toBeNull();

    // reload: the page ships its default again, the stored choice is all that survives
    document.documentElement.setAttribute('data-preset', 'lifekit');
    const second = build({offered: [LIFEKIT], storage: first.storage});
    expect(second.service.preset()).toBe('carbon');
    expect(attribute()).toBeNull();
  });

  it('reads a stored carbon as a choice that beats the page default', () => {
    document.documentElement.setAttribute('data-preset', 'lifekit');
    const {service} = build({stored: 'carbon', offered: [LIFEKIT]});
    expect(service.preset()).toBe('carbon');
    expect(attribute()).toBeNull();
  });

  it('reads the absent key as no choice, so the page default stands', () => {
    document.documentElement.setAttribute('data-preset', 'lifekit');
    const {service} = build({offered: [LIFEKIT]});
    expect(service.preset()).toBe('lifekit');
    expect(attribute()).toBe('lifekit');
  });

  it('restores a stored preset the app offers', () => {
    const {service} = build({stored: 'soft', offered: [LIFEKIT, SOFT]});
    expect(service.preset()).toBe('soft');
    expect(attribute()).toBe('soft');
  });

  it('falls back to Carbon, and clears the attribute the pre-paint script set, for a stored preset the app does not offer', () => {
    document.documentElement.setAttribute('data-preset', 'gone');
    const {service} = build({stored: 'gone', offered: [LIFEKIT]});
    expect(service.preset()).toBe('carbon');
    expect(attribute()).toBeNull();
  });

  it('keeps an offered data-preset already on the page when nothing is stored, as an app default', () => {
    document.documentElement.setAttribute('data-preset', 'lifekit');
    const {service, storage} = build({offered: [LIFEKIT]});
    expect(service.preset()).toBe('lifekit');
    expect(attribute()).toBe('lifekit');
    expect(storage.getItem('cmn-preset')).toBeNull();
  });

  it('lets a stored choice win over the data-preset already on the page', () => {
    document.documentElement.setAttribute('data-preset', 'lifekit');
    const {service} = build({stored: 'soft', offered: [LIFEKIT, SOFT]});
    expect(service.preset()).toBe('soft');
    expect(attribute()).toBe('soft');
  });

  it('rejects a preset the app does not offer and changes nothing', () => {
    const {service, storage} = build({offered: [LIFEKIT]});
    expect(() => service.setPreset('soft')).toThrow(TypeError);
    expect(service.preset()).toBe('carbon');
    expect(attribute()).toBeNull();
    expect(storage.getItem('cmn-preset')).toBeNull();
  });

  it('still applies the choice for the session when storage is blocked', () => {
    const {service} = build({offered: [LIFEKIT], storage: new BlockedStorage()});
    expect(service.preset()).toBe('carbon');
    service.setPreset('lifekit');
    expect(attribute()).toBe('lifekit');
    service.setPreset('carbon');
    expect(attribute()).toBeNull();
  });

  it('is independent of the theme attribute', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const {service} = build({offered: [LIFEKIT]});
    service.setPreset('lifekit');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    document.documentElement.removeAttribute('data-theme');
  });

  it('reads DESIGN_PRESETS as the offered list', () => {
    build({offered: [LIFEKIT]});
    expect(TestBed.inject(DESIGN_PRESETS).map(p => p.id)).toEqual(['carbon', 'lifekit']);
  });
});
