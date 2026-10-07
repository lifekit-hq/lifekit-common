import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {type LkThemeChoice, LkThemePicker} from '@lifekit-hq/elements';
import {APP_SEEDS, DEFAULT_INTENSITY} from '@lifekit-hq/tokens/engine';
import type {Meta, StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../../components/button/button.component';
import {CardComponent} from '../../components/card/card.component';
import {type Theme, type ThemePreference, type ThemeSeed, ThemeService} from './theme.service';

if (!customElements.get('lk-theme-picker')) {
  customElements.define('lk-theme-picker', LkThemePicker);
}

const SERIES = [1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-theme-panel',
  imports: [ButtonComponent, CardComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="flex max-w-xl flex-col gap-cmn-4">
      <div class="flex flex-wrap items-center gap-cmn-3">
        <cmn-button (clicked)="setTheme('light')" variant="secondary">light</cmn-button>
        <cmn-button (clicked)="setTheme('dark')" variant="secondary">dark</cmn-button>
        <cmn-button (clicked)="setPreference('system')" variant="secondary">system</cmn-button>
        <cmn-button (clicked)="toggle()">toggle</cmn-button>
        <span class="text-cmn-sm text-text-secondary">
          preference: {{ preference() }}, active: {{ theme() }}
        </span>
      </div>

      <cmn-card>
        <lk-theme-picker
          [attr.app-seed]="appSeed"
          [seed]="seed()?.seed ?? ''"
          [intensity]="seed()?.intensity ?? defaultIntensity"
          (lk-theme-picker-change)="onSeed($event)"
        />
        <p class="mt-cmn-3 text-cmn-sm text-text-secondary">
          seed: {{ seed()?.seed ?? 'app default' }}, intensity:
          {{ seed()?.intensity ?? defaultIntensity }}
        </p>
      </cmn-card>

      <cmn-card>
        <p class="mb-cmn-3 font-headline text-cmn-lg text-text-primary">Where the colour shows</p>
        <p class="mb-cmn-4 text-cmn-sm text-text-secondary">
          Every token below is read from <code>&#64;lifekit-hq/tokens</code>; a seed re-derives the
          whole palette, but the colour itself shows only on the primary action, links, selection,
          focus and chart series 1. Deltas stay green and red whatever the seed.
        </p>
        <div class="mb-cmn-4 flex flex-wrap items-center gap-cmn-2">
          <cmn-button>primary</cmn-button>
          <cmn-button variant="secondary">secondary</cmn-button>
          <cmn-button variant="destructive">destructive</cmn-button>
          <a href="#" class="text-accent-default underline">a link</a>
        </div>
        <div class="mb-cmn-4 flex flex-col gap-cmn-1 text-cmn-sm">
          <span class="rounded-cmn-md bg-accent-subtle px-cmn-3 py-cmn-2 text-text-primary">
            Selected nav item
          </span>
          <span class="px-cmn-3 py-cmn-2 text-text-secondary">Another nav item</span>
        </div>
        <div class="mb-cmn-4 flex gap-cmn-3 text-cmn-sm">
          <span class="text-delta-up">+4.2%</span>
          <span class="text-delta-down">-1.8%</span>
        </div>
        <div class="flex gap-cmn-1" aria-label="Chart series 1 to 8">
          @for (n of series; track n) {
            <span
              [style.background]="'var(--color-chart-series-' + n + ')'"
              class="h-6 w-6 rounded-cmn-sm"
            ></span>
          }
        </div>
      </cmn-card>
    </div>
  `,
})
class StoryThemePanelComponent {
  private readonly themeService = inject(ThemeService);

  protected readonly theme = signal<Theme>(this.themeService.getTheme());
  protected readonly preference = signal<ThemePreference>(this.themeService.getPreference());
  protected readonly seed = signal<ThemeSeed | null>(this.themeService.getSeed());
  protected readonly appSeed = APP_SEEDS.fs.seed;
  protected readonly defaultIntensity = DEFAULT_INTENSITY;
  protected readonly series = SERIES;

  constructor() {
    this.themeService.activeTheme$.pipe(takeUntilDestroyed()).subscribe(t => this.theme.set(t));
    this.themeService.preference$.pipe(takeUntilDestroyed()).subscribe(p => this.preference.set(p));
    this.themeService.activeSeed$.pipe(takeUntilDestroyed()).subscribe(s => this.seed.set(s));
  }

  protected setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  protected setPreference(preference: ThemePreference): void {
    this.themeService.setPreference(preference);
  }

  protected toggle(): void {
    this.themeService.toggle();
  }

  /** Settings > Appearance wiring: the picker reports, the service applies and persists. */
  protected onSeed(event: Event): void {
    const {seed, intensity} = (event as CustomEvent<LkThemeChoice>).detail;
    if (seed) {
      this.themeService.setSeed(seed, intensity);
    } else {
      this.themeService.resetSeed();
    }
  }
}

const meta: Meta<StoryThemePanelComponent> = {
  title: 'Services/Theme',
  component: StoryThemePanelComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<StoryThemePanelComponent>;

/**
 * Light, dark and system (follows the OS live; flip your OS theme to watch it), plus the
 * Settings > Appearance colour picker wired to `setSeed` / `resetSeed`. The app default here is
 * Finance Sentry's petrol. Any colour is safe: the engine solves each role to its WCAG floor.
 */
export const Playground: Story = {};
