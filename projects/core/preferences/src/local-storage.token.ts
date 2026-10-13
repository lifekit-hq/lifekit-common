import {InjectionToken} from '@angular/core';

/**
 * The `Storage` the device tier reads and writes. `localStorage` by default; tests (and
 * `ThemeService`, which re-exports this token) swap it by providing their own `Storage`.
 */
export const LOCAL_STORAGE = new InjectionToken<Storage>('LOCAL_STORAGE', {
  providedIn: 'root',
  factory: () => localStorage,
});
