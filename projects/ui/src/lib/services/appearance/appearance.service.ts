import {DOCUMENT} from '@angular/common';
import {
  DestroyRef,
  effect,
  type EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  type Signal,
  type Type,
  untracked,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {
  type AccountPreferences,
  type AppearancePreference,
  type ThemeMode,
} from '@lifekit-hq/core/preferences';
import {DEFAULT_INTENSITY, normalizeSeedChoice} from '@lifekit-hq/tokens/engine';

import {type ThemeSeed, ThemeService} from '../theme/theme.service';

/** The theme modes a user can choose, in the order a control lists them. */
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** How long a colour change must sit still before it is written to the account. */
export const SEED_SAVE_DELAY_MS = 400;

/**
 * What `AppearanceService` needs from an account preferences store: the appearance it holds and a
 * way to write it. Every `accountPreferencesStore()` class satisfies it.
 */
export interface AppearanceStore {
  /** The appearance with unsaved changes applied; `null` until the first load. */
  readonly appearance: Signal<AppearancePreference | null>;
  patch(partial: Partial<AccountPreferences>): Promise<boolean>;
}

/**
 * The app's account preferences store, when it has one. `null` (the default) means appearance is
 * kept on this device only. `provideAppearanceSync` sets it.
 */
export const APPEARANCE_STORE = new InjectionToken<AppearanceStore | null>('APPEARANCE_STORE', {
  providedIn: 'root',
  factory: () => null,
});

function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

/**
 * The one place appearance is changed. It writes to both homes the standard names: `ThemeService`
 * (the local cache the page paints from) and, when the app has a preferences store, the account
 * (`PATCH /api/me/preferences`). The reverse direction, the server value winning after sign-in, is
 * a mirror of the store's `appearance()` into `ThemeService`.
 *
 * Without a store (`synced` is false) it is `ThemeService` alone: the choice stays on this device.
 * Components call `setMode`, `setSeed`, `resetSeed` and `toggle` and never touch both sides
 * themselves.
 *
 * The mirror needs the service alive before the first change: add `provideAppearanceSync(Store)`
 * to the app's providers, which also supplies the store.
 */
@Injectable({providedIn: 'root'})
export class AppearanceService {
  private readonly themeService = inject(ThemeService);
  private readonly store = inject(APPEARANCE_STORE);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private pendingSave: ReturnType<typeof setTimeout> | null = null;

  /** The chosen mode, `system` while the OS decides. */
  public readonly mode: Signal<ThemeMode> = toSignal(this.themeService.preference$, {
    requireSync: true,
  });
  /** The user's own colour, or `null` when the app's palette applies. */
  public readonly seed: Signal<ThemeSeed | null> = toSignal(this.themeService.activeSeed$, {
    requireSync: true,
  });
  /** True when a change is also written to the account. */
  public readonly synced: boolean = this.store !== null;

  constructor() {
    const store = this.store;
    if (store) {
      effect(() => {
        const appearance = store.appearance();
        if (appearance) {
          untracked(() => this.applyFromAccount(appearance));
        }
      });
      this.flushOnLeave();
    }
  }

  /** Sets the mode (`system` follows the OS live) and saves it. */
  public setMode(mode: ThemeMode): void {
    this.themeService.setPreference(mode);
    this.save();
  }

  /** Flips the resolved theme and pins it, like the old top-bar toggle. */
  public toggle(): void {
    this.setMode(this.themeService.getTheme() === 'dark' ? 'light' : 'dark');
  }

  /**
   * Sets the user's colour and saves it. The page and the local cache change at once. A change of
   * colour alone (a drag in the colour dialog fires one per step) is written to the account once it
   * has been still for `SEED_SAVE_DELAY_MS`, or when the page is left; a change of intensity is
   * written at once.
   *
   * @throws TypeError when `seed` is not a hex colour; nothing is changed or saved then.
   */
  public setSeed(seed: string, intensity: number = DEFAULT_INTENSITY): void {
    const held = this.themeService.getSeed()?.intensity ?? DEFAULT_INTENSITY;
    this.themeService.setSeed(seed, intensity);
    if (intensity === held) {
      this.saveSoon();
    } else {
      this.save();
    }
  }

  /** Goes back to the app's own colour and saves that. */
  public resetSeed(): void {
    this.themeService.resetSeed();
    this.save();
  }

  /**
   * Writes the whole local appearance to the account. The whole object, never a merge over the
   * store's copy: before the first load that copy is the default, and a merge would send `system`
   * over a server theme that has not arrived yet.
   */
  private save(): void {
    this.cancelPendingSave();
    const store = this.store;
    if (!store) {
      return;
    }
    const seed = this.themeService.getSeed();
    const appearance: AppearancePreference = {
      theme: this.themeService.getPreference(),
      ...(seed ? {seed: seed.seed, intensity: seed.intensity} : {}),
    };
    void store.patch({appearance});
  }

  private saveSoon(): void {
    if (!this.store) {
      return;
    }
    this.cancelPendingSave();
    this.pendingSave = setTimeout(() => this.save(), SEED_SAVE_DELAY_MS);
  }

  private cancelPendingSave(): void {
    if (this.pendingSave !== null) {
      clearTimeout(this.pendingSave);
      this.pendingSave = null;
    }
  }

  private flushPendingSave(): void {
    if (this.pendingSave !== null) {
      this.save();
    }
  }

  /** A write that is still waiting goes out when the page is hidden or left, and when this is destroyed. */
  private flushOnLeave(): void {
    const view = this.document.defaultView;
    const onPageHide = (): void => this.flushPendingSave();
    const onVisibilityChange = (): void => {
      if (this.document.visibilityState === 'hidden') {
        this.flushPendingSave();
      }
    };
    view?.addEventListener('pagehide', onPageHide);
    this.document.addEventListener('visibilitychange', onVisibilityChange);
    this.destroyRef.onDestroy(() => {
      this.flushPendingSave();
      view?.removeEventListener('pagehide', onPageHide);
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
    });
  }

  /** The server value wins: bring the cache and the page to it, touching only what differs. */
  private applyFromAccount(appearance: AppearancePreference): void {
    if (isThemeMode(appearance.theme) && appearance.theme !== this.themeService.getPreference()) {
      this.themeService.setPreference(appearance.theme);
    }
    const wanted = normalizeSeedChoice({seed: appearance.seed, intensity: appearance.intensity});
    const current = this.themeService.getSeed();
    if (!wanted) {
      if (current) {
        this.themeService.resetSeed();
      }
    } else if (wanted.seed !== current?.seed || wanted.intensity !== current.intensity) {
      this.themeService.setSeed(wanted.seed, wanted.intensity);
    }
  }
}

/**
 * Syncs appearance with the app's account preferences store: `AppearanceService` writes every
 * change to it, and the server's `appearance` is applied (and wins) once the store has loaded.
 * Call `load()` on the store after sign-in and `clear()` on sign-out, as the standard says.
 *
 * ```ts
 * export const AppPreferencesStore = accountPreferencesStore<AppPreferences>();
 * // app config
 * provideAppearanceSync(AppPreferencesStore)
 * ```
 */
export function provideAppearanceSync(store: Type<AppearanceStore>): EnvironmentProviders {
  return makeEnvironmentProviders([
    {provide: APPEARANCE_STORE, useExisting: store},
    provideEnvironmentInitializer(() => {
      inject(AppearanceService);
    }),
  ]);
}
