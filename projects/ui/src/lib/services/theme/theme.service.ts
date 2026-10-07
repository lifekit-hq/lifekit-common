import {DestroyRef, inject, Injectable, InjectionToken} from '@angular/core';
import {
  applySeedDeclarations,
  clearSeedDeclarations,
  clearStoredSeed,
  DEFAULT_INTENSITY,
  normalizeSeedChoice,
  readStoredSeed,
  type SeedDeclarations,
  type SeedVariant,
  seedVariant,
  storeSeed,
} from '@lifekit-hq/tokens/engine';
import {BehaviorSubject, distinctUntilChanged, map, Observable} from 'rxjs';

export type Theme = 'light' | 'dark';

/** What the user chose: an explicit theme, or `system` to follow the OS live. */
export type ThemePreference = Theme | 'system';

/** A user's own colour: the seed the palette derives from, and how far it tints surfaces (0-1). */
export interface ThemeSeed {
  seed: string;
  intensity: number;
}

const THEME_STORAGE_KEY = 'cmn-theme';
/** Where `setAccent` kept its hex before the seed engine; read once to migrate, then removed. */
const LEGACY_ACCENT_STORAGE_KEY = 'cmn-accent';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const MORE_CONTRAST_QUERY = '(prefers-contrast: more)';
const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

export const DOCUMENT = new InjectionToken<Document>('DOCUMENT', {
  providedIn: 'root',
  factory: () => document,
});

export const LOCAL_STORAGE = new InjectionToken<Storage>('LOCAL_STORAGE', {
  providedIn: 'root',
  factory: () => localStorage,
});

/** The OS colour-scheme query, or `null` where `matchMedia` is unavailable. */
export const PREFERS_DARK = new InjectionToken<MediaQueryList | null>('PREFERS_DARK', {
  providedIn: 'root',
  factory: () => (typeof matchMedia === 'function' ? matchMedia(DARK_SCHEME_QUERY) : null),
});

/** The OS increased-contrast query, or `null` where `matchMedia` is unavailable. */
export const PREFERS_MORE_CONTRAST = new InjectionToken<MediaQueryList | null>(
  'PREFERS_MORE_CONTRAST',
  {
    providedIn: 'root',
    factory: () => (typeof matchMedia === 'function' ? matchMedia(MORE_CONTRAST_QUERY) : null),
  }
);

/**
 * Owns `data-theme` on `<html>`, the user's own colour and the `theme-color` metas.
 *
 * The persisted `cmn-theme` key holds an explicit `light` | `dark` choice. With no key the
 * preference is `system`: the OS theme applies and is followed live, never persisted. That
 * is also what the pre-paint script in `@lifekit-hq/tokens` does, so first paint and the
 * service agree.
 *
 * A seed (`setSeed`) is per device: the whole `--color-*` palette is derived from it by the
 * `@lifekit-hq/tokens` engine for each theme and contrast level, set inline on `<html>` over the
 * app's own palette, and cached in `cmn-theme-seed` for the pre-paint script. With no seed the
 * app's stylesheet palette applies untouched.
 */
@Injectable({providedIn: 'root'})
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(LOCAL_STORAGE);
  private readonly prefersDark = inject(PREFERS_DARK);
  private readonly prefersMoreContrast = inject(PREFERS_MORE_CONTRAST);
  private readonly destroyRef = inject(DestroyRef);

  private preference: ThemePreference;
  private readonly themeSubject$: BehaviorSubject<Theme>;
  private readonly preferenceSubject$: BehaviorSubject<ThemePreference>;
  private readonly seedSubject$: BehaviorSubject<ThemeSeed | null>;
  /** The derived palette per theme and contrast level, while a seed is set. */
  private seedPalettes: Record<SeedVariant, SeedDeclarations> | null = null;

  /** The resolved theme in effect (`system` already mapped to light or dark). */
  public readonly activeTheme$: Observable<Theme>;
  public readonly preference$: Observable<ThemePreference>;
  /** The user's own colour, or `null` when the app's palette applies. */
  public readonly activeSeed$: Observable<ThemeSeed | null>;
  /** The active seed's hex, or `null`. Kept for `setAccent` callers; prefer `activeSeed$`. */
  public readonly activeAccent$: Observable<string | null>;

  constructor() {
    const stored = this.readStorage(THEME_STORAGE_KEY);
    this.preference = stored === 'dark' || stored === 'light' ? stored : 'system';
    const initial = this.resolve(this.preference);
    this.themeSubject$ = new BehaviorSubject<Theme>(initial);
    this.activeTheme$ = this.themeSubject$.pipe(distinctUntilChanged());
    this.preferenceSubject$ = new BehaviorSubject<ThemePreference>(this.preference);
    this.preference$ = this.preferenceSubject$.asObservable();

    this.seedSubject$ = new BehaviorSubject<ThemeSeed | null>(null);
    this.activeSeed$ = this.seedSubject$.asObservable();
    this.activeAccent$ = this.seedSubject$.pipe(map(seed => seed?.seed ?? null));
    this.restoreSeed();
    this.applyTheme(initial);

    this.listen(this.prefersDark, () => {
      if (this.preference === 'system') {
        this.commit(this.resolve('system'));
      }
    });
    this.listen(this.prefersMoreContrast, () => this.applyTheme(this.themeSubject$.value));
  }

  // ── Theme ─────────────────────────────────────────────────────────────────

  /** Pins an explicit theme: persisted, and the OS no longer drives it. */
  public setTheme(theme: Theme): void {
    this.setPreference(theme);
  }

  /** Applies and persists a preference; `system` clears the stored choice and follows the OS. */
  public setPreference(preference: ThemePreference): void {
    this.preference = preference;
    if (preference === 'system') {
      this.removeStorage(THEME_STORAGE_KEY);
    } else {
      this.writeStorage(THEME_STORAGE_KEY, preference);
    }
    this.preferenceSubject$.next(preference);
    this.commit(this.resolve(preference));
  }

  /** Flips the resolved theme and pins it as an explicit choice. */
  public toggle(): void {
    this.setTheme(this.themeSubject$.value === 'dark' ? 'light' : 'dark');
  }

  /** The resolved theme in effect. */
  public getTheme(): Theme {
    return this.themeSubject$.value;
  }

  public getPreference(): ThemePreference {
    return this.preference;
  }

  private resolve(preference: ThemePreference): Theme {
    if (preference !== 'system') {
      return preference;
    }
    return this.prefersDark?.matches ? 'dark' : 'light';
  }

  private commit(theme: Theme): void {
    this.applyTheme(theme);
    this.themeSubject$.next(theme);
  }

  private applyTheme(theme: Theme): void {
    const root = this.doc.documentElement;
    root.setAttribute('data-theme', theme);
    if (this.seedPalettes) {
      const contrast = this.prefersMoreContrast?.matches ? 'more' : 'standard';
      applySeedDeclarations(root, this.seedPalettes[seedVariant(theme, contrast)]);
    }
    this.syncThemeColor();
  }

  /**
   * The `theme-color` metas carry `(prefers-color-scheme)` media queries, so they follow the OS
   * only. Point them all at the active surface so the browser bar tracks an in-app choice.
   */
  private syncThemeColor(): void {
    const surface = this.doc.defaultView
      ?.getComputedStyle(this.doc.documentElement)
      .getPropertyValue('--color-surface-bg')
      .trim();
    if (!surface) {
      return;
    }
    this.doc
      .querySelectorAll(THEME_COLOR_SELECTOR)
      .forEach(meta => meta.setAttribute('content', surface));
  }

  private listen(query: MediaQueryList | null, onChange: () => void): void {
    if (!query) {
      return;
    }
    query.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }

  private readStorage(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      // storage blocked: the choice applies for this session only
    }
  }

  private removeStorage(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      // storage blocked: nothing was persisted
    }
  }

  // ── Seed colour ───────────────────────────────────────────────────────────

  /**
   * Re-derives the whole palette from `seed` (any `#rgb` / `#rrggbb`) at `intensity` (0 quiet,
   * 1 immersive) and applies it for the active theme and contrast level. Every derived pair
   * meets its WCAG floor, so any colour is safe. Persisted on this device only.
   *
   * @throws TypeError when `seed` is not a hex colour.
   */
  public setSeed(seed: string, intensity: number = DEFAULT_INTENSITY): void {
    const choice = normalizeSeedChoice({seed, intensity});
    if (!choice) {
      throw new TypeError(`ThemeService.setSeed: not a hex colour: ${seed}`);
    }
    this.useSeed(choice);
  }

  /** Drops the user's colour: the app's own palette applies again. */
  public resetSeed(): void {
    clearStoredSeed(this.storage);
    this.removeStorage(LEGACY_ACCENT_STORAGE_KEY);
    this.seedPalettes = null;
    clearSeedDeclarations(this.doc.documentElement);
    this.seedSubject$.next(null);
    this.syncThemeColor();
  }

  /** The user's colour, or `null` when the app's palette applies. */
  public getSeed(): ThemeSeed | null {
    return this.seedSubject$.value;
  }

  private useSeed(choice: ThemeSeed): void {
    this.seedPalettes = storeSeed(this.storage, choice);
    this.seedSubject$.next(choice);
    this.applyTheme(this.themeSubject$.value);
  }

  /**
   * Re-derives a stored seed (refreshing the pre-paint cache when the engine changed since it
   * was written), or migrates a hex `setAccent` stored before the engine existed.
   */
  private restoreSeed(): void {
    const legacy = this.readStorage(LEGACY_ACCENT_STORAGE_KEY);
    const choice =
      readStoredSeed(this.storage) ??
      normalizeSeedChoice({seed: legacy ?? undefined, intensity: DEFAULT_INTENSITY});
    if (legacy !== null) {
      this.removeStorage(LEGACY_ACCENT_STORAGE_KEY);
    }
    if (choice) {
      this.seedPalettes = storeSeed(this.storage, choice);
      this.seedSubject$.next(choice);
    }
  }

  // ── Accent (pre-engine API) ───────────────────────────────────────────────

  /**
   * Sets the user's colour from one hex, keeping the current intensity. Since the seed engine
   * this is `setSeed`: the whole palette follows the colour, not just an `--cmn-accent-*` ramp,
   * and contrast is solved per role rather than forcing every stop to 4.5:1.
   *
   * @deprecated Use `setSeed`.
   */
  public setAccent(hex: string): void {
    this.setSeed(hex, this.seedSubject$.value?.intensity ?? DEFAULT_INTENSITY);
  }

  /** @deprecated Use `resetSeed`. */
  public resetAccent(): void {
    this.resetSeed();
  }

  /** The user's colour hex, or `null`. @deprecated Use `getSeed`. */
  public getStoredAccent(): string | null {
    return this.seedSubject$.value?.seed ?? null;
  }
}
