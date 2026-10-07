import {
  applySeedDeclarations,
  clearSeedDeclarations,
  clearStoredSeed,
  DEFAULT_INTENSITY,
  derive,
  INTENSITY_STOPS,
  normalizeHex,
  PRESETS,
  readStoredSeed,
  seedVariant,
  seedVariants,
  storeSeed,
} from '@lifekit-hq/tokens/engine';
import {css, html, LitElement, nothing, type PropertyDeclarations, type TemplateResult} from 'lit';

/** What `lk-theme-picker-change` carries: the chosen colour, or `null` for the app's own. */
export interface LkThemeChoice {
  seed: string | null;
  intensity: number;
}

/** Light, dark, or follow the OS. */
export type LkAppearance = 'light' | 'dark' | 'system';

/** A named stop on the intensity slider. */
export type LkIntensityStop = 'quiet' | 'tinted' | 'immersive';

const APPEARANCE_LABELS: Readonly<Record<LkAppearance, string>> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};
/** The key the pre-paint script and ThemeService keep an explicit light or dark choice under. */
const THEME_STORAGE_KEY = 'cmn-theme';

const STOP_LABELS: Readonly<Record<LkIntensityStop, string>> = {
  quiet: 'Quiet',
  tinted: 'Tinted',
  immersive: 'Immersive',
};
const CUSTOM = 'custom';
const APP_DEFAULT = '';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const MORE_CONTRAST_QUERY = '(prefers-contrast: more)';

/** The named stop nearest to `intensity`. */
export function nearestIntensityStop(intensity: number): LkIntensityStop {
  const stops = Object.entries(INTENSITY_STOPS) as [LkIntensityStop, number][];
  return stops.reduce((best, stop) =>
    Math.abs(stop[1] - intensity) < Math.abs(best[1] - intensity) ? stop : best
  )[0];
}

function clampIntensity(intensity: number): number {
  return Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : DEFAULT_INTENSITY;
}

function deviceStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function readTheme(storage: Storage): string | null {
  try {
    return storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeTheme(storage: Storage, appearance: LkAppearance): void {
  try {
    if (appearance === 'system') {
      storage.removeItem(THEME_STORAGE_KEY);
    } else {
      storage.setItem(THEME_STORAGE_KEY, appearance);
    }
  } catch {
    // storage blocked: the choice applies for this page only
  }
}

let nextId = 0;

/**
 * Colour picker for Settings > Appearance: the app's own colour, the preset colours, any custom
 * colour, and how far the colour tints the surfaces (quiet, tinted, immersive). The palette is
 * derived from the one colour by the `@lifekit-hq/tokens` engine, so every choice keeps text and
 * controls readable; a colour close to a status colour gets a note saying so.
 *
 * The element is controlled: it shows `seed` and `intensity` and emits `lk-theme-picker-change` with
 * `{seed, intensity}` (`seed: null` for the app's own colour). In an Angular app, hand that to
 * `ThemeService.setSeed` / `resetSeed`. With `persist`, the element instead keeps the choice on
 * this device itself (the `cmn-theme-seed` key the pre-paint script reads) and applies it to
 * `<html>`; use that only where no theme service owns the palette.
 *
 * Set `appearance` to also show a Light / Dark / System row; a pick emits `lk-theme-picker-appearance`
 * with `{appearance}` (for `ThemeService.setPreference`), or with `persist` is stored under
 * `cmn-theme` and applied as `data-theme` directly.
 *
 * @example
 * <lk-theme-picker app-seed="#175a6d" seed="#4f46e5" intensity="0.12"></lk-theme-picker>
 */
export class LkThemePicker extends LitElement {
  private readonly groupName = `lk-theme-picker-${nextId++}`;
  private readonly ticksId = `${this.groupName}-ticks`;
  private themeObserver: MutationObserver | null = null;

  declare private customSeed: string;
  declare private nearStatusNote: string;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: block;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--color-text-primary, #0f1a1f);
    }

    :host([hidden]) {
      display: none;
    }

    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }

    legend,
    .label {
      margin-bottom: var(--space-2, 0.5rem);
      padding: 0;
      font-weight: 600;
    }

    .swatches {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2, 0.5rem);
    }

    .swatch {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem) var(--space-1, 0.25rem)
        var(--space-1, 0.25rem);
      border: 1px solid var(--color-border-default, #d9e0e3);
      border-radius: var(--radius-full);
      background: var(--color-surface-card, #ffffff);
      cursor: pointer;
    }

    .swatch:has(input:checked) {
      border-color: var(--color-accent-default, #175a6d);
      background: var(--color-accent-subtle, #e3f1f4);
    }

    .swatch:has(input:focus-visible),
    button:focus-visible,
    input[type='range']:focus-visible,
    input[type='color']:focus-visible {
      outline: 2px solid var(--color-border-focus, #1d6f85);
      outline-offset: 2px;
    }

    .swatch input[type='radio'] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .swatch.segment {
      padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
    }

    .appearance {
      margin-bottom: var(--space-4, 1rem);
    }

    .chip {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      border: 1px solid var(--color-border-default, #d9e0e3);
      background: var(--swatch);
    }

    .swatch input[type='color'] {
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      border: 1px solid var(--color-border-default, #d9e0e3);
      border-radius: 50%;
      background: none;
      cursor: pointer;
    }

    .intensity {
      margin-top: var(--space-4, 1rem);
    }

    .intensity input[type='range'] {
      width: 100%;
      accent-color: var(--color-accent-default, #175a6d);
    }

    .stops {
      display: flex;
      justify-content: space-between;
      gap: var(--space-2, 0.5rem);
    }

    .stops button,
    button.reset {
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: none;
      color: var(--color-text-secondary, #46565e);
      font: inherit;
      cursor: pointer;
    }

    .stops button[aria-pressed='true'] {
      border-color: var(--color-border-default, #d9e0e3);
      color: var(--color-text-primary, #0f1a1f);
      font-weight: 600;
    }

    .note {
      margin: var(--space-3, 0.75rem) 0 0;
      color: var(--color-text-secondary, #46565e);
    }

    button.reset {
      margin-top: var(--space-3, 0.75rem);
      border-color: var(--color-border-default, #d9e0e3);
      color: var(--color-text-primary, #0f1a1f);
    }

    button.reset:hover,
    .stops button:hover {
      background: var(--color-surface-raised, #e8edef);
    }

    button:disabled,
    input:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    appSeed: {type: String, attribute: 'app-seed', reflect: true},
    seed: {type: String, reflect: true},
    intensity: {type: Number, reflect: true},
    persist: {type: Boolean, reflect: true},
    appearance: {type: String, reflect: true},
    customSeed: {state: true},
    nearStatusNote: {state: true},
  };

  /** The app's own colour, offered as "App default". */
  declare public appSeed: string;
  /** The chosen colour (`#rrggbb`); empty for the app's own. */
  declare public seed: string;
  /** How far the colour tints the surfaces, 0-1. */
  declare public intensity: number;
  /** Keep the choice on this device and apply it to `<html>` (hosts without a theme service). */
  declare public persist: boolean;
  /** Light, dark or system; empty hides the appearance row. */
  declare public appearance: LkAppearance | '';

  constructor() {
    super();
    this.appSeed = '';
    this.seed = '';
    this.intensity = DEFAULT_INTENSITY;
    this.persist = false;
    this.appearance = '';
    this.customSeed = '';
    this.nearStatusNote = '';
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    if (!this.persist) {
      return;
    }
    const storage = deviceStorage();
    if (this.appearance && storage) {
      const theme = readTheme(storage);
      this.appearance = theme === 'light' || theme === 'dark' ? theme : 'system';
    }
    const stored = storage ? readStoredSeed(storage) : null;
    if (stored) {
      this.seed = stored.seed;
      this.intensity = stored.intensity;
      this.applyToDocument();
    }
    this.themeObserver = new MutationObserver(() => this.applyToDocument());
    this.themeObserver.observe(document.documentElement, {attributeFilter: ['data-theme']});
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.themeObserver?.disconnect();
    this.themeObserver = null;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('seed') || changed.has('appSeed')) {
      const seed = normalizeHex(this.seed);
      if (seed && !this.isPreset(seed)) {
        this.customSeed = seed;
      }
      const effective = seed ?? normalizeHex(this.appSeed);
      this.nearStatusNote = effective ? (derive({seed: effective}).warnings[0]?.message ?? '') : '';
    }
  }

  private isPreset(seed: string): boolean {
    return PRESETS.some(preset => preset.seed === seed);
  }

  private get selected(): string {
    const seed = normalizeHex(this.seed);
    if (!seed) {
      return APP_DEFAULT;
    }
    return this.isPreset(seed) ? seed : CUSTOM;
  }

  private readonly onPick = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    if (value === APP_DEFAULT) {
      this.choose(null);
    } else {
      this.choose(value === CUSTOM ? this.customSeed || PRESETS[0].seed : value);
    }
  };

  private readonly onCustomColour = (event: Event): void => {
    const seed = normalizeHex((event.target as HTMLInputElement).value);
    if (seed) {
      this.customSeed = seed;
      this.choose(seed);
    }
  };

  private readonly onIntensity = (event: Event): void => {
    this.setIntensity(Number((event.target as HTMLInputElement).value));
  };

  private readonly onStop = (event: Event): void => {
    const stop = (event.currentTarget as HTMLElement).dataset['stop'] as LkIntensityStop;
    this.setIntensity(INTENSITY_STOPS[stop]);
  };

  private readonly onAppearance = (event: Event): void => {
    const appearance = (event.target as HTMLInputElement).value as LkAppearance;
    this.appearance = appearance;
    if (this.persist) {
      const storage = deviceStorage();
      if (storage) {
        writeTheme(storage, appearance);
      }
      const dark =
        appearance === 'dark' || (appearance === 'system' && matchMedia(DARK_SCHEME_QUERY).matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
    this.dispatchEvent(
      new CustomEvent<{appearance: LkAppearance}>('lk-theme-picker-appearance', {
        detail: {appearance},
        bubbles: true,
        composed: true,
      })
    );
  };

  private readonly onReset = (): void => {
    this.intensity = DEFAULT_INTENSITY;
    this.choose(null);
  };

  /** Moving the slider on the app's own colour pins that colour at the new intensity. */
  private setIntensity(intensity: number): void {
    this.intensity = intensity;
    this.choose(normalizeHex(this.seed) ?? normalizeHex(this.appSeed));
  }

  private choose(seed: string | null): void {
    const choice: LkThemeChoice = {
      seed: normalizeHex(seed),
      intensity: clampIntensity(this.intensity),
    };
    this.seed = choice.seed ?? '';
    this.intensity = choice.intensity;
    if (this.persist) {
      this.persistChoice(choice);
    }
    this.dispatchEvent(
      new CustomEvent<LkThemeChoice>('lk-theme-picker-change', {
        detail: choice,
        bubbles: true,
        composed: true,
      })
    );
  }

  private persistChoice(choice: LkThemeChoice): void {
    const storage = deviceStorage();
    if (!choice.seed) {
      if (storage) {
        clearStoredSeed(storage);
      }
      clearSeedDeclarations(document.documentElement);
      return;
    }
    if (storage) {
      storeSeed(storage, {seed: choice.seed, intensity: choice.intensity});
    }
    this.applyToDocument();
  }

  private applyToDocument(): void {
    const seed = normalizeHex(this.seed);
    if (!seed) {
      return;
    }
    const root = document.documentElement;
    const theme =
      root.getAttribute('data-theme') === 'dark' ||
      (!root.hasAttribute('data-theme') && matchMedia(DARK_SCHEME_QUERY).matches)
        ? 'dark'
        : 'light';
    const contrast = matchMedia(MORE_CONTRAST_QUERY).matches ? 'more' : 'standard';
    const variants = seedVariants({seed, intensity: this.intensity});
    applySeedDeclarations(root, variants[seedVariant(theme, contrast)]);
  }

  private renderSwatch(value: string, label: string, colour: string): TemplateResult {
    return html`
      <label class="swatch">
        <input
          type="radio"
          name=${this.groupName}
          .value=${value}
          .checked=${this.selected === value}
          @change=${this.onPick}
        />
        <span class="chip" style=${`--swatch: ${colour}`} aria-hidden="true"></span>
        <span>${label}</span>
      </label>
    `;
  }

  private renderAppearance(): TemplateResult | typeof nothing {
    if (!this.appearance) {
      return nothing;
    }
    return html`
      <fieldset class="appearance">
        <legend>Appearance</legend>
        <div class="swatches">
          ${(Object.keys(APPEARANCE_LABELS) as LkAppearance[]).map(
            value => html`
              <label class="swatch segment">
                <input
                  type="radio"
                  name=${`${this.groupName}-appearance`}
                  .value=${value}
                  .checked=${this.appearance === value}
                  @change=${this.onAppearance}
                />
                <span>${APPEARANCE_LABELS[value]}</span>
              </label>
            `
          )}
        </div>
      </fieldset>
    `;
  }

  protected override render(): TemplateResult {
    const appSeed = normalizeHex(this.appSeed);
    const canTint = Boolean(normalizeHex(this.seed) ?? appSeed);
    const stop = nearestIntensityStop(this.intensity);
    return html`
      ${this.renderAppearance()}
      <fieldset>
        <legend>Colour</legend>
        <div class="swatches">
          ${appSeed ? this.renderSwatch(APP_DEFAULT, 'App default', appSeed) : nothing}
          ${PRESETS.map(preset => this.renderSwatch(preset.seed, preset.name, preset.seed))}
          <label class="swatch">
            <input
              type="radio"
              name=${this.groupName}
              .value=${CUSTOM}
              .checked=${this.selected === CUSTOM}
              @change=${this.onPick}
            />
            <input
              type="color"
              aria-label="Custom colour"
              .value=${this.customSeed || PRESETS[0].seed}
              @input=${this.onCustomColour}
            />
            <span>Custom</span>
          </label>
        </div>
      </fieldset>

      <div class="intensity">
        <label class="label" for=${`${this.groupName}-intensity`}>Intensity</label>
        <input
          id=${`${this.groupName}-intensity`}
          type="range"
          min="0"
          max="1"
          step="0.01"
          list=${this.ticksId}
          .value=${String(this.intensity)}
          aria-valuetext=${STOP_LABELS[stop]}
          ?disabled=${!canTint}
          @change=${this.onIntensity}
        />
        <datalist id=${this.ticksId}>
          ${Object.values(INTENSITY_STOPS).map(value => html`<option value=${value}></option>`)}
        </datalist>
        <div class="stops">
          ${(Object.keys(STOP_LABELS) as LkIntensityStop[]).map(
            name => html`
              <button
                type="button"
                data-stop=${name}
                aria-pressed=${stop === name ? 'true' : 'false'}
                ?disabled=${!canTint}
                @click=${this.onStop}
              >
                ${STOP_LABELS[name]}
              </button>
            `
          )}
        </div>
      </div>

      ${
        this.nearStatusNote
          ? html`<p class="note" role="status">${this.nearStatusNote}</p>`
          : nothing
      }

      <button
        type="button"
        class="reset"
        ?disabled=${!normalizeHex(this.seed)}
        @click=${this.onReset}
      >
        Use the app's colour
      </button>
    `;
  }
}

customElements.define('lk-theme-picker', LkThemePicker);
