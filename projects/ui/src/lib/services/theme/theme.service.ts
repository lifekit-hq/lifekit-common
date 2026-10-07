import {DestroyRef, inject, Injectable, InjectionToken} from '@angular/core';
import chroma from 'chroma-js';
import {BehaviorSubject, distinctUntilChanged, Observable} from 'rxjs';

export type Theme = 'light' | 'dark';

/** What the user chose: an explicit theme, or `system` to follow the OS live. */
export type ThemePreference = Theme | 'system';

const THEME_STORAGE_KEY = 'cmn-theme';
const ACCENT_STORAGE_KEY = 'cmn-accent';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

/** Number of accent palette stops (100 → 1000). */
const ACCENT_STOP_COUNT = 11;
/** Multiplier from stop index to CSS property suffix (1 → 100, 2 → 200, …). */
const ACCENT_STOP_MULTIPLIER = 100;
/** Minimum WCAG AA contrast ratio for text on backgrounds. */
const MIN_WCAG_AA_CONTRAST = 4.5;
/** OkLCH lightness step per iteration, moving toward the contrasting extreme. */
const AUTO_CORRECT_STEP = 0.05;
/** Iteration limit for contrast auto-correction. */
const MAX_CORRECT_ITERATIONS = 20;
/**
 * Relative luminance where black and white contrast equally against a surface:
 * lighter surfaces are corrected darker, darker surfaces lighter.
 */
const LUMINANCE_CROSSOVER = 0.179;

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

/**
 * Owns `data-theme` on `<html>`, the accent ramp and the `theme-color` metas.
 *
 * The persisted `cmn-theme` key holds an explicit `light` | `dark` choice. With no key the
 * preference is `system`: the OS theme applies and is followed live, never persisted. That
 * is also what the pre-paint script in `@lifekit-hq/tokens` does, so first paint and the
 * service agree.
 */
@Injectable({providedIn: 'root'})
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(LOCAL_STORAGE);
  private readonly prefersDark = inject(PREFERS_DARK);
  private readonly destroyRef = inject(DestroyRef);

  private preference: ThemePreference;
  private readonly themeSubject$: BehaviorSubject<Theme>;
  private readonly preferenceSubject$: BehaviorSubject<ThemePreference>;
  private readonly accentSubject$: BehaviorSubject<string | null>;

  /** The resolved theme in effect (`system` already mapped to light or dark). */
  public readonly activeTheme$: Observable<Theme>;
  public readonly preference$: Observable<ThemePreference>;
  public readonly activeAccent$: Observable<string | null>;

  constructor() {
    const stored = this.readStorage(THEME_STORAGE_KEY);
    this.preference = stored === 'dark' || stored === 'light' ? stored : 'system';
    const initial = this.resolve(this.preference);
    this.themeSubject$ = new BehaviorSubject<Theme>(initial);
    this.activeTheme$ = this.themeSubject$.pipe(distinctUntilChanged());
    this.preferenceSubject$ = new BehaviorSubject<ThemePreference>(this.preference);
    this.preference$ = this.preferenceSubject$.asObservable();
    this.applyTheme(initial);

    const storedAccent = this.readStorage(ACCENT_STORAGE_KEY);
    this.accentSubject$ = new BehaviorSubject<string | null>(storedAccent);
    this.activeAccent$ = this.accentSubject$.asObservable();
    if (storedAccent) {
      this.applyAccentPalette(storedAccent);
    }

    const query = this.prefersDark;
    if (query) {
      const onChange = (): void => {
        if (this.preference === 'system') {
          this.commit(this.resolve('system'));
        }
      };
      query.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }
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
    const accent = this.accentSubject$.value;
    if (accent) {
      this.applyAccentPalette(accent);
    }
    this.themeSubject$.next(theme);
  }

  private applyTheme(theme: Theme): void {
    this.doc.documentElement.setAttribute('data-theme', theme);
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

  // ── Accent color ──────────────────────────────────────────────────────────

  /**
   * Generate an 11-stop OkLCH palette from `hex`, auto-correct stops that
   * fail WCAG AA contrast against `--color-surface-bg`, write all stops as
   * `--cmn-accent-N` CSS custom properties, and persist the hex to localStorage.
   */
  public setAccent(hex: string): void {
    this.applyAccentPalette(hex);
    this.writeStorage(ACCENT_STORAGE_KEY, hex);
    this.accentSubject$.next(hex);
  }

  /**
   * Remove all inline `--cmn-accent-*` custom properties and clear localStorage.
   * The CSS file fallbacks (`var(--color-accent-*)`) take over immediately.
   */
  public resetAccent(): void {
    for (let stop = 1; stop <= ACCENT_STOP_COUNT; stop++) {
      this.doc.documentElement.style.removeProperty(
        `--cmn-accent-${stop * ACCENT_STOP_MULTIPLIER}`
      );
    }
    this.removeStorage(ACCENT_STORAGE_KEY);
    this.accentSubject$.next(null);
  }

  public getStoredAccent(): string | null {
    return this.readStorage(ACCENT_STORAGE_KEY);
  }

  private applyAccentPalette(hex: string): void {
    const stops = this.buildPalette(hex);
    const bgVar = this.readToken('--color-surface-bg', '#f3f5f6');

    for (let i = 0; i < stops.length; i++) {
      const stop = (i + 1) * ACCENT_STOP_MULTIPLIER;
      const corrected = this.autoCorrectContrast(stops[i], bgVar);
      this.doc.documentElement.style.setProperty(`--cmn-accent-${stop}`, corrected);
    }
  }

  private buildPalette(hex: string): string[] {
    const light = this.readToken('--color-accent-scale-light', '#f8f8f8');
    const dark = this.readToken('--color-accent-scale-dark', '#0a0a0a');
    return chroma.scale([light, hex, dark]).mode('oklch').colors(ACCENT_STOP_COUNT);
  }

  private readToken(name: string, fallback: string): string {
    const value = this.doc.defaultView
      ?.getComputedStyle(this.doc.documentElement)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  }

  private autoCorrectContrast(color: string, background: string): string {
    let c = chroma(color);
    const direction = chroma(background).luminance() > LUMINANCE_CROSSOVER ? -1 : 1;
    let iterations = 0;
    while (
      chroma.contrast(c, background) < MIN_WCAG_AA_CONTRAST &&
      iterations < MAX_CORRECT_ITERATIONS
    ) {
      const l = c.get('oklch.l');
      const target = l + direction * AUTO_CORRECT_STEP;
      c = c.set('oklch.l', Math.max(0, Math.min(1, target)));
      iterations++;
    }
    return c.hex();
  }
}
