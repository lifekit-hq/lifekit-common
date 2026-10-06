import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import type {Meta, StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../../components/button/button.component';
import {CardComponent} from '../../components/card/card.component';
import {type Theme, type ThemePreference, ThemeService} from './theme.service';

const ACCENTS = ['#175a6d', '#0ea5e9', '#e11d48', '#16a34a', '#f59e0b'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-theme-panel',
  imports: [ButtonComponent, CardComponent],
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

      <div class="flex flex-wrap items-center gap-cmn-2">
        @for (hex of accents; track hex) {
          <button
            [style.background]="hex"
            [attr.aria-label]="'Set accent ' + hex"
            (click)="setAccent(hex)"
            type="button"
            class="h-8 w-8 rounded-cmn-full border border-border-default"
          ></button>
        }
        <cmn-button (clicked)="resetAccent()" variant="secondary">reset accent</cmn-button>
        <span class="text-cmn-sm text-text-secondary">accent: {{ accent() ?? 'default' }}</span>
      </div>

      <cmn-card>
        <p class="mb-cmn-3 font-headline text-cmn-lg text-text-primary">Token preview</p>
        <p class="mb-cmn-4 text-cmn-sm text-text-secondary">
          Every surface, text and accent token below is read from
          <code>&#64;lifekit-hq/tokens</code>; the service only flips <code>data-theme</code> and
          writes the accent ramp.
        </p>
        <div class="flex flex-wrap gap-cmn-2">
          <cmn-button>primary</cmn-button>
          <cmn-button variant="secondary">secondary</cmn-button>
          <cmn-button variant="destructive">destructive</cmn-button>
        </div>
      </cmn-card>
    </div>
  `,
})
class StoryThemePanelComponent {
  private readonly themeService = inject(ThemeService);

  protected readonly theme = signal<Theme>(this.themeService.getTheme());
  protected readonly preference = signal<ThemePreference>(this.themeService.getPreference());
  protected readonly accent = signal<string | null>(this.themeService.getStoredAccent());
  protected readonly accents = ACCENTS;

  constructor() {
    this.themeService.activeTheme$.pipe(takeUntilDestroyed()).subscribe(t => this.theme.set(t));
    this.themeService.preference$.pipe(takeUntilDestroyed()).subscribe(p => this.preference.set(p));
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

  protected setAccent(hex: string): void {
    this.themeService.setAccent(hex);
    this.accent.set(hex);
  }

  protected resetAccent(): void {
    this.themeService.resetAccent();
    this.accent.set(null);
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
 * Light, dark and system (follows the OS live; flip your OS theme to watch it) plus a runtime accent override. The accent ramp is generated in
 * OkLCH and auto-corrected to WCAG AA against the current surface, so a light
 * accent stays legible.
 */
export const Playground: Story = {};
