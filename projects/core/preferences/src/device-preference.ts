import {computed, inject, type Signal, signal} from '@angular/core';

import {LOCAL_STORAGE} from './local-storage.token';

/**
 * The key namespaces the device tier allows: `cmn-*` for what the shared shell stores, and
 * `lk.<app>.*` for an app's own keys (`lk.fns.pushDeviceId`). Enforced by the type, not at runtime.
 */
export type DevicePreferenceKey = `cmn-${string}` | `lk.${string}.${string}`;

export interface DevicePreferenceOptions<T> {
  /**
   * Accepts or rejects a stored value. The default compares only the JSON shape with the default
   * (same `typeof`, array-ness and null-ness), so pass this for enums and objects.
   */
  validate?: (value: unknown) => value is T;
}

/** A signal the device tier owns: writing it writes through to storage. */
export interface DevicePreference<T> extends Signal<T> {
  set(value: T): void;
  update(updater: (current: T) => T): void;
  /** Back to the default, and the key is removed from storage. */
  reset(): void;
}

function sameShape(value: unknown, template: unknown): boolean {
  if (value === null || template === null) {
    return value === template;
  }
  return typeof value === typeof template && Array.isArray(value) === Array.isArray(template);
}

/**
 * A device-tier preference: a signal backed by `LOCAL_STORAGE`, JSON-encoded under `key`. It is read
 * once when created and is not live across tabs. Storage that throws (private mode, quota, blocked)
 * and stored values that do not parse or validate are tolerated: the default is used, and the
 * signal keeps working in memory. `T` must survive `JSON.stringify` (no `undefined`, `Date`, `Map`).
 *
 * Call it in an injection context, typically a field initialiser.
 */
export function devicePreference<T>(
  key: DevicePreferenceKey,
  defaultValue: T,
  options: DevicePreferenceOptions<T> = {}
): DevicePreference<T> {
  const storage = inject(LOCAL_STORAGE);
  const isValid =
    options.validate ?? ((value: unknown): value is T => sameShape(value, defaultValue));

  const read = (): T => {
    try {
      const raw = storage.getItem(key);
      if (raw === null) {
        return defaultValue;
      }
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const write = (value: T): void => {
    try {
      const raw = JSON.stringify(value) as string | undefined;
      if (raw === undefined) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, raw);
      }
    } catch {
      // Storage is unavailable or full: the in-memory value still holds for this session.
    }
  };

  const state = signal<T>(read());
  const preference = computed(() => state());

  const set = (value: T): void => {
    state.set(value);
    write(value);
  };

  return Object.assign(preference, {
    set,
    update: (updater: (current: T) => T): void => set(updater(state())),
    reset: (): void => {
      state.set(defaultValue);
      try {
        storage.removeItem(key);
      } catch {
        // Nothing stored that we could remove; the default is already back in memory.
      }
    },
  });
}
