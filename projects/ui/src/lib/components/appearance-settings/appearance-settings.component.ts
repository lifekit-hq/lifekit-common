import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
  type Signal,
} from '@angular/core';
import {type ThemeMode} from '@lifekit-hq/core/preferences';
import {type LkThemeChoice, LkThemePicker} from '@lifekit-hq/elements';
import {DEFAULT_INTENSITY} from '@lifekit-hq/tokens/engine';

import {AppearanceService, THEME_MODES} from '../../services/appearance/appearance.service';
import {type ThemePreference} from '../../services/theme/theme.service';
import {SegmentedComponent, type SegmentedOption} from '../segmented/segmented.component';

const LABELS: Record<ThemePreference, string> = {system: 'System', light: 'Light', dark: 'Dark'};

const MODE_OPTIONS: readonly SegmentedOption[] = THEME_MODES.map(value => ({
  value,
  label: LABELS[value],
}));

const MODE_HELP: Record<ThemePreference, string> = {
  system: 'Follows your device, and changes with it.',
  light: 'Always light.',
  dark: 'Always dark.',
};

const SYNCED_CAPTION = 'Synced to your account';
const DEVICE_CAPTION = 'On this device';

/**
 * The body of the standard Appearance settings section: light or dark (System, Light, Dark) and the
 * colour the app takes, the same in every lifekit app. Put it inside a
 * `cmn-settings-section heading="Appearance"`; it renders its own caption, so leave the section's
 * `caption` unset.
 *
 * Changes apply at once. They go through `AppearanceService`, which writes the local cache (the page
 * changes now) and the account (`PATCH /api/me/preferences`) together, and applies the server's value
 * when the account loads. The caption says where the choice lives: "Synced to your account" when the
 * app has called `provideAppearanceSync`, "On this device" when it has not.
 *
 * `appSeed` is the app's own colour (an `APP_SEEDS` entry): the picker's first swatch, and what a
 * reset goes back to. Without it the picker offers only the presets and a custom colour.
 */
@Component({
  selector: 'cmn-appearance-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SegmentedComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {class: 'block'},
  template: `
    <div class="space-y-cmn-5">
      <div>
        <div class="font-label text-cmn-sm font-medium text-text-primary">Theme</div>
        <div class="mt-cmn-2">
          <cmn-segmented
            [options]="modeOptions"
            [value]="mode()"
            (valueChange)="onMode($event)"
            label="Theme"
          />
        </div>
        <p class="mt-cmn-2 text-cmn-xs leading-relaxed text-text-secondary">{{ modeHelp() }}</p>
      </div>

      <lk-theme-picker
        [attr.app-seed]="appSeed() || null"
        [seed]="seed()?.seed ?? ''"
        [intensity]="seed()?.intensity ?? defaultIntensity"
        (lk-theme-picker-change)="onSeed($event)"
      />

      <p class="text-cmn-xs font-medium text-text-secondary">{{ caption() }}</p>
    </div>
  `,
})
export class AppearanceSettingsComponent {
  private readonly appearance = inject(AppearanceService);

  /** The app's own colour as `#rrggbb` (an `APP_SEEDS` entry). */
  public readonly appSeed = input<string>('');

  protected readonly modeOptions = MODE_OPTIONS;
  protected readonly defaultIntensity = DEFAULT_INTENSITY;

  protected readonly mode: Signal<ThemeMode> = this.appearance.mode;
  protected readonly seed = this.appearance.seed;
  protected readonly modeHelp = computed(() => MODE_HELP[this.mode()]);
  protected readonly caption = computed(() =>
    this.appearance.synced ? SYNCED_CAPTION : DEVICE_CAPTION
  );

  constructor() {
    // Importing the class keeps the bundler from dropping the element; define it where it is used.
    if (!customElements.get('lk-theme-picker')) {
      customElements.define('lk-theme-picker', LkThemePicker);
    }
  }

  protected onMode(value: string): void {
    this.appearance.setMode(value as ThemePreference);
  }

  protected onSeed(event: Event): void {
    const {seed, intensity} = (event as CustomEvent<LkThemeChoice>).detail;
    if (seed === null) {
      this.appearance.resetSeed();
    } else {
      this.appearance.setSeed(seed, intensity);
    }
  }
}
