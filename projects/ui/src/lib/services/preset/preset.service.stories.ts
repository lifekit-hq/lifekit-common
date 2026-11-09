import {ChangeDetectionStrategy, Component, DestroyRef, inject, signal} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {AreaChartComponent} from '../../components/area-chart/area-chart.component';
import {ButtonComponent} from '../../components/button/button.component';
import {CardComponent} from '../../components/card/card.component';
import {InputComponent} from '../../components/input/input.component';
import {SegmentedComponent} from '../../components/segmented/segmented.component';
import {type CmnTab, TabGroupComponent} from '../../components/tab-group/tab-group.component';
import {TagComponent} from '../../components/tag/tag.component';
import {ToggleComponent} from '../../components/toggle/toggle.component';
import {PresetService, provideDesignPresets} from './preset.service';

/**
 * A preset for this story only. It is the whole contract in miniature: one rule under
 * `:root[data-preset='demo']` that overrides token names, nothing else. The first block is token
 * values (radius, control height); the second is the hooks, the anatomy a value cannot change: a
 * framed field, a card held by a shadow, a tinted tab row with a filled tab, a tonal secondary
 * button, a pill segmented control and a wider toggle. The real presets live in
 * `@lifekit-hq/tokens/presets/` (Lifekit; Carbon, the default, is `theme.css`).
 */
const DEMO_PRESET_CSS = `
:root[data-preset='demo'] {
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --cmn-control-h: 44px;

  --cmn-field-border-width: 1px;
  --cmn-select-border-width: 1px;
  --cmn-card-border-color: transparent;
  --cmn-card-shadow: 0 1px 3px rgb(0 0 0 / 0.14);
  --cmn-float-border-color: transparent;
  --cmn-btn-weight: 500;
  --cmn-btn-secondary-bg: var(--color-accent-subtle);
  --cmn-btn-secondary-fg: var(--color-text-primary);
  --cmn-btn-secondary-hover: var(--color-surface-hover);
  --cmn-tab-indicator: 0px;
  --cmn-tab-radius: 8px;
  --cmn-tab-active-bg: var(--color-surface-card);
  --cmn-tabs-bg: var(--color-surface-raised);
  --cmn-tabs-pad: 4px;
  --cmn-tabs-gap: 4px;
  --cmn-tabs-radius: 12px;
  --cmn-segmented-radius: 999px;
  --cmn-segmented-cell-radius: 999px;
  --cmn-segmented-active-bg: var(--color-accent-default);
  --cmn-segmented-active-fg: var(--color-text-inverse);
  --cmn-toggle-w: 52px;
  --cmn-toggle-h: 32px;
  --cmn-toggle-thumb: 24px;
  --cmn-toggle-pad: 4px;
  --cmn-toggle-on: var(--color-accent-default);
}
`;

const TABS: CmnTab[] = [
  {id: 'overview', label: 'Overview'},
  {id: 'activity', label: 'Activity'},
  {id: 'settings', label: 'Settings'},
];

const SERIES = [
  {
    label: 'Banking',
    points: ['Jun', 'Jul', 'Aug', 'Sep'].map((label, i) => ({
      label,
      value: [420, 428, 431, 445][i],
    })),
  },
];

const OPTIONS = [
  {value: 'week', label: 'Week'},
  {value: 'month', label: 'Month'},
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-preset-panel',
  imports: [
    AreaChartComponent,
    ButtonComponent,
    CardComponent,
    InputComponent,
    SegmentedComponent,
    TabGroupComponent,
    TagComponent,
    ToggleComponent,
  ],
  template: `
    <div class="flex max-w-xl flex-col gap-cmn-4">
      <div class="flex flex-wrap items-center gap-cmn-3">
        @for (option of presets.available; track option.id) {
          <cmn-button
            [variant]="presets.preset() === option.id ? 'primary' : 'secondary'"
            (clicked)="presets.setPreset(option.id)"
          >
            {{ option.label }}
          </cmn-button>
        }
        <span class="text-cmn-sm text-text-secondary">
          preset: {{ presets.preset() }}, data-preset: {{ attribute() }}
        </span>
      </div>

      <cmn-card>
        <p class="mb-cmn-3 font-headline text-cmn-lg text-text-primary">Same components</p>
        <p class="mb-cmn-4 text-cmn-sm text-text-secondary">
          Nothing below knows about presets. Choosing Demo swaps token values (corners, control
          height) and the hooks (field frame, card shadow, tab style, secondary button, toggle
          geometry), so the same components change anatomy; choosing Carbon puts them back.
        </p>
        <div class="mb-cmn-4 flex flex-wrap items-center gap-cmn-2">
          <cmn-button>Primary</cmn-button>
          <cmn-button variant="secondary">Secondary</cmn-button>
          <cmn-tag>Tag</cmn-tag>
        </div>
        <div class="mb-cmn-4 max-w-xs">
          <cmn-input aria-label="Account name" placeholder="Everyday account" />
        </div>
        <div class="mb-cmn-4 flex flex-wrap items-center gap-cmn-4">
          <cmn-segmented [options]="options" value="month" label="Range" />
          <cmn-toggle [checked]="true" label="Weekly summary" />
        </div>
        <cmn-tab-group [tabs]="tabs" activeTab="overview" ariaLabel="Account sections" />
      </cmn-card>

      <cmn-area-chart [series]="series" label="Net worth" />
    </div>
  `,
})
class StoryPresetPanelComponent {
  protected readonly presets = inject(PresetService);
  protected readonly options = OPTIONS;
  protected readonly tabs = TABS;
  protected readonly series = SERIES;
  protected readonly attribute = signal<string>('none');

  constructor() {
    const style = document.createElement('style');
    style.textContent = DEMO_PRESET_CSS;
    document.head.appendChild(style);

    const root = document.documentElement;
    const read = (): void => this.attribute.set(root.getAttribute('data-preset') ?? 'none');
    const observer = new MutationObserver(read);
    observer.observe(root, {attributes: true, attributeFilter: ['data-preset']});
    read();

    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      style.remove();
      this.presets.setPreset('carbon');
    });
  }
}

const meta: Meta<StoryPresetPanelComponent> = {
  title: 'Services/Preset',
  component: StoryPresetPanelComponent,
  tags: ['autodocs'],
  decorators: [applicationConfig({providers: [provideDesignPresets({id: 'demo', label: 'Demo'})]})],
};

export default meta;
type Story = StoryObj<StoryPresetPanelComponent>;

/**
 * The design preset is a root attribute, `data-preset`, next to `data-theme`; no attribute is
 * Carbon. `PresetService` sets it, persists it under `cmn-preset` and the pre-paint script restores
 * it before first paint. Pick Demo (a preset defined in this story only) and Carbon to watch the
 * same components change with no component change. In the toolbar, the Design global previews every
 * story in a preset the same way.
 */
export const Playground: Story = {};
