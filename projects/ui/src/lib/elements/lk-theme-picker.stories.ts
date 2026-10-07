/**
 * Angular consumption proof for <lk-theme-picker>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects:false on
 * the package) cannot tree-shake away the module's customElements.define() call.
 *
 * The stories keep the choice inside a preview box: each change is derived and applied to that
 * box only, so the rest of the catalog keeps its palette. In an app, hand the event to
 * `ThemeService.setSeed` (see Services/Theme).
 */
import {type LkThemeChoice, LkThemePicker} from '@lifekit-hq/elements';

if (!customElements.get('lk-theme-picker')) {
  customElements.define('lk-theme-picker', LkThemePicker);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {
  APP_SEEDS,
  DEFAULT_INTENSITY,
  INTENSITY_STOPS,
  PRESETS,
  seedVariant,
  seedVariants,
} from '@lifekit-hq/tokens/engine';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

interface StoryArgs {
  appSeed: string;
  seed: string;
  intensity: number;
}

function previewStyle(choice: {seed: string; intensity: number}): Record<string, string> {
  if (!choice.seed) {
    return {};
  }
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return seedVariants(choice)[seedVariant(dark ? 'dark' : 'light')];
}

const meta: Meta<StoryArgs> = {
  title: 'Elements/LkThemePicker',
  tags: ['autodocs'],
  decorators: [moduleMetadata({schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  argTypes: {
    intensity: {control: {type: 'range', min: 0, max: 1, step: 0.01}},
    seed: {control: 'color'},
    appSeed: {control: 'color'},
  },
  render: args => ({
    props: {
      ...args,
      preview: previewStyle({seed: args.seed || args.appSeed, intensity: args.intensity}),
      onChange(event: Event): void {
        const {seed, intensity} = (event as CustomEvent<LkThemeChoice>).detail;
        this['seed'] = seed ?? '';
        this['intensity'] = intensity;
        this['preview'] = previewStyle({seed: seed ?? this['appSeed'], intensity});
      },
    },
    template: `
      <div
        [style]="preview"
        style="display: grid; gap: 1rem; max-width: 36rem; padding: 1rem;
          background: var(--color-surface-bg); color: var(--color-text-primary)"
      >
        <lk-theme-picker
          [attr.app-seed]="appSeed || null"
          [seed]="seed"
          [intensity]="intensity"
          (lk-theme-picker-change)="onChange($event)"
        ></lk-theme-picker>
        <div
          style="display: flex; gap: 0.75rem; align-items: center; padding: 1rem;
            border-radius: var(--radius-lg); background: var(--color-surface-card)"
        >
          <button
            type="button"
            style="padding: 0.5rem 1rem; border: 0; border-radius: var(--radius-md);
              background: var(--color-accent-default); color: var(--color-text-inverse)"
          >
            Primary
          </button>
          <a href="#" style="color: var(--color-accent-default)">A link</a>
          <span style="color: var(--color-delta-up)">+4.2%</span>
          <span style="color: var(--color-delta-down)">-1.8%</span>
        </div>
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** Finance Sentry's own petrol at the quiet default: no user colour yet. */
export const AppDefault: Story = {
  args: {appSeed: APP_SEEDS.fs.seed, seed: '', intensity: DEFAULT_INTENSITY},
};

/** A preset picked over the app's colour. */
export const Preset: Story = {
  args: {appSeed: APP_SEEDS.fs.seed, seed: APP_SEEDS.lk.seed, intensity: DEFAULT_INTENSITY},
};

/** A colour that is not a preset shows as Custom, with the colour input holding it. */
export const CustomColour: Story = {
  args: {appSeed: APP_SEEDS.fs.seed, seed: '#c2410c', intensity: DEFAULT_INTENSITY},
};

/** The Discord-strength tint: surfaces carry the colour too. */
export const Immersive: Story = {
  args: {appSeed: APP_SEEDS.dc.seed, seed: APP_SEEDS.dc.seed, intensity: INTENSITY_STOPS.immersive},
};

/** A red seed sits next to the error colour, so the picker says so. */
export const NearStatusColour: Story = {
  args: {appSeed: APP_SEEDS.fs.seed, seed: '#be2533', intensity: DEFAULT_INTENSITY},
};

/** With no app colour the picker offers only the presets and a custom colour. */
export const NoAppColour: Story = {
  args: {appSeed: '', seed: PRESETS[3].seed, intensity: DEFAULT_INTENSITY},
};

/** With `appearance` set the picker also offers Light / Dark / System, as Settings > Appearance. */
export const WithAppearance: Story = {
  args: {appSeed: APP_SEEDS.lk.seed, seed: '', intensity: DEFAULT_INTENSITY},
  render: args => ({
    props: args,
    template: `
      <lk-theme-picker
        appearance="system"
        [attr.app-seed]="appSeed"
        [seed]="seed"
        [intensity]="intensity"
      ></lk-theme-picker>
    `,
  }),
};
