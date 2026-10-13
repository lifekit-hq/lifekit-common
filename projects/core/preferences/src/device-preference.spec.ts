import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {type DevicePreference, devicePreference} from './device-preference';
import {LOCAL_STORAGE} from './local-storage.token';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  public get length(): number {
    return this.data.size;
  }

  public clear(): void {
    this.data.clear();
  }

  public getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  public key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  public removeItem(key: string): void {
    this.data.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

/** A storage that refuses every call, as Safari private mode or a blocked-cookies profile does. */
class BlockedStorage extends MemoryStorage {
  public override getItem(): string | null {
    throw new DOMException('blocked', 'SecurityError');
  }

  public override setItem(): void {
    throw new DOMException('full', 'QuotaExceededError');
  }

  public override removeItem(): void {
    throw new DOMException('blocked', 'SecurityError');
  }
}

const KEY = 'lk.fns.density';

describe('devicePreference', () => {
  let storage: MemoryStorage;

  function create<T>(
    defaultValue: T,
    options?: Parameters<typeof devicePreference<T>>[2],
    key: Parameters<typeof devicePreference>[0] = KEY
  ): DevicePreference<T> {
    return TestBed.runInInjectionContext(() => devicePreference<T>(key, defaultValue, options));
  }

  beforeEach(() => {
    storage = new MemoryStorage();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [{provide: LOCAL_STORAGE, useValue: storage}]});
  });

  it('starts at the default when nothing is stored', () => {
    expect(create('comfortable')()).toBe('comfortable');
  });

  it('reads a stored JSON value', () => {
    storage.setItem(KEY, JSON.stringify('compact'));
    expect(create('comfortable')()).toBe('compact');
  });

  it('writes through to storage on set and update', () => {
    const pref = create(1);
    pref.set(2);
    expect(storage.getItem(KEY)).toBe('2');
    pref.update(n => n + 1);
    expect(pref()).toBe(3);
    expect(storage.getItem(KEY)).toBe('3');
  });

  it('stores objects and arrays as JSON', () => {
    const pref = create<string[]>([]);
    pref.set(['a', 'b']);
    expect(storage.getItem(KEY)).toBe('["a","b"]');
    expect(create<string[]>([])()).toEqual(['a', 'b']);
  });

  it('removes the key and returns to the default on reset', () => {
    const pref = create('comfortable');
    pref.set('compact');
    pref.reset();
    expect(pref()).toBe('comfortable');
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('removes the key rather than storing a value JSON cannot encode', () => {
    const pref = create<string | undefined>('x');
    pref.set('y');
    pref.set(undefined);
    expect(storage.getItem(KEY)).toBeNull();
    expect(pref()).toBeUndefined();
  });

  it('falls back to the default on stored text that is not JSON', () => {
    storage.setItem(KEY, 'compact');
    expect(create('comfortable')()).toBe('comfortable');
  });

  it('falls back to the default on a value of the wrong shape', () => {
    storage.setItem(KEY, '42');
    expect(create('comfortable')()).toBe('comfortable');
    storage.setItem(KEY, '"x"');
    expect(create<string[]>([])()).toEqual([]);
    storage.setItem(KEY, '[]');
    expect(create<Record<string, never>>({})()).toEqual({});
    storage.setItem(KEY, 'null');
    expect(create('comfortable')()).toBe('comfortable');
  });

  it('accepts a stored null when the default is null', () => {
    storage.setItem(KEY, 'null');
    expect(create<string | null>(null)()).toBeNull();
    storage.setItem(KEY, '"a"');
    expect(create<string | null>(null)()).toBeNull();
  });

  it('uses a custom validator over the shape check', () => {
    type Density = 'comfortable' | 'compact';
    const validate = (value: unknown): value is Density =>
      value === 'comfortable' || value === 'compact';
    storage.setItem(KEY, '"spacious"');
    expect(create<Density>('comfortable', {validate})()).toBe('comfortable');
    storage.setItem(KEY, '"compact"');
    expect(create<Density>('comfortable', {validate})()).toBe('compact');
  });

  it('accepts the shell namespace', () => {
    const pref = create(true, undefined, 'cmn-sidebar-collapsed');
    pref.set(false);
    expect(storage.getItem('cmn-sidebar-collapsed')).toBe('false');
  });

  describe('when storage throws', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{provide: LOCAL_STORAGE, useValue: new BlockedStorage()}],
      });
    });

    it('starts at the default and keeps the value in memory', () => {
      const pref = create('comfortable');
      expect(pref()).toBe('comfortable');
      pref.set('compact');
      expect(pref()).toBe('compact');
    });

    it('resets in memory without throwing', () => {
      const pref = create('comfortable');
      pref.set('compact');
      expect(() => pref.reset()).not.toThrow();
      expect(pref()).toBe('comfortable');
    });
  });
});
