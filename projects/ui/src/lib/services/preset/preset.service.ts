import {
  type EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  type Signal,
  signal,
} from '@angular/core';

import {DOCUMENT, LOCAL_STORAGE} from '../theme/theme.service';

/** A design preset an app offers: the id its stylesheet scopes to, and what a control calls it. */
export interface DesignPresetOption {
  /** The `data-preset` value and the stylesheet name (`@lifekit-hq/tokens/presets/<id>.css`). */
  id: string;
  label: string;
}

/** Carbon: the look the unscoped values in `theme.css` give, so it is the absence of `data-preset`. */
export const DEFAULT_PRESET = 'carbon';

const DEFAULT_OPTION: DesignPresetOption = {id: DEFAULT_PRESET, label: 'Carbon'};
const PRESET_STORAGE_KEY = 'cmn-preset';

/**
 * The presets the app offers, Carbon first. An app that stays on Carbon provides nothing and the
 * appearance control hides the choice; `provideDesignPresets` adds the others it imports.
 */
export const DESIGN_PRESETS = new InjectionToken<readonly DesignPresetOption[]>('DESIGN_PRESETS', {
  providedIn: 'root',
  factory: () => [DEFAULT_OPTION],
});

/**
 * Offers design presets besides Carbon. Import each one's stylesheet
 * (`@lifekit-hq/tokens/presets/<id>.css`) in the app's entry stylesheet as well: this only lists
 * what a user can pick.
 *
 * ```ts
 * provideDesignPresets({id: 'lifekit', label: 'Lifekit'})
 * ```
 */
export function provideDesignPresets(...presets: DesignPresetOption[]): EnvironmentProviders {
  const others = presets.filter(preset => preset.id !== DEFAULT_PRESET);
  return makeEnvironmentProviders([
    {provide: DESIGN_PRESETS, useValue: [DEFAULT_OPTION, ...others]},
  ]);
}

/**
 * Owns `data-preset` on `<html>`: the design preset, a third axis next to `data-theme` (light or
 * dark) and the seed colour (`--color-*`), so the result is theme x seed x preset.
 *
 * Carbon is the default and has no attribute. Choosing it removes the attribute and the stored
 * key, so a device on the default carries nothing; any other preset is stored under `cmn-preset`,
 * which the pre-paint script in `@lifekit-hq/tokens` reads before first paint, so the page never
 * flashes Carbon first. At start a stored choice wins; with none, an offered `data-preset` already
 * on `<html>` (an app that ships a different default in its `index.html`) is kept; anything the app
 * does not offer falls back to Carbon.
 *
 * The choice is per device. It is not part of the account `appearance` (`AppearanceService`), whose
 * shape belongs to each app's preferences API.
 */
@Injectable({providedIn: 'root'})
export class PresetService {
  private readonly doc = inject(DOCUMENT);
  private readonly storage = inject(LOCAL_STORAGE);
  private readonly presets = inject(DESIGN_PRESETS);
  private readonly current = signal<string>(DEFAULT_PRESET);

  /** The preset in effect: its id, `carbon` for the default. */
  public readonly preset: Signal<string> = this.current.asReadonly();
  /** Every preset the app offers, Carbon first. */
  public readonly available: readonly DesignPresetOption[] = this.presets;

  constructor() {
    const stored = this.read();
    const present = this.doc.documentElement.getAttribute('data-preset');
    if (stored !== null && this.offers(stored)) {
      this.apply(stored);
    } else if (present !== null && this.offers(present)) {
      this.current.set(present);
    } else {
      this.apply(DEFAULT_PRESET);
    }
  }

  /**
   * Applies and persists a preset; `carbon` goes back to the default and clears the stored choice.
   *
   * @throws TypeError when the app does not offer `id`.
   */
  public setPreset(id: string): void {
    if (!this.offers(id)) {
      throw new TypeError(`PresetService.setPreset: not an offered design preset: ${id}`);
    }
    if (id === DEFAULT_PRESET) {
      this.remove();
    } else {
      this.write(id);
    }
    this.apply(id);
  }

  /** The preset in effect. */
  public getPreset(): string {
    return this.current();
  }

  private offers(id: string): boolean {
    return this.presets.some(preset => preset.id === id);
  }

  private apply(id: string): void {
    const root = this.doc.documentElement;
    if (id === DEFAULT_PRESET) {
      root.removeAttribute('data-preset');
    } else {
      root.setAttribute('data-preset', id);
    }
    this.current.set(id);
  }

  private read(): string | null {
    try {
      return this.storage.getItem(PRESET_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private write(id: string): void {
    try {
      this.storage.setItem(PRESET_STORAGE_KEY, id);
    } catch {
      // storage blocked: the choice applies for this session only
    }
  }

  private remove(): void {
    try {
      this.storage.removeItem(PRESET_STORAGE_KEY);
    } catch {
      // storage blocked: nothing was persisted
    }
  }
}
