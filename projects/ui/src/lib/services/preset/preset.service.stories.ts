import {ChangeDetectionStrategy, Component, DestroyRef, inject, signal} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {AreaChartComponent} from '../../components/area-chart/area-chart.component';
import {ButtonComponent} from '../../components/button/button.component';
import {CardComponent} from '../../components/card/card.component';
import {InputComponent} from '../../components/input/input.component';
import {SegmentedComponent} from '../../components/segmented/segmented.component';
import {TagComponent} from '../../components/tag/tag.component';
import {PresetService, provideDesignPresets} from './preset.service';

/**
 * A preset for this story only. It is the whole contract in miniature: one rule under
 * `:root[data-preset='demo']` that overrides token names, nothing else. The real presets live in
 * `@lifekit-hq/tokens/presets/`; none ships yet besides Carbon, the default.
 */
const DEMO_PRESET_CSS = `
:root[data-preset='demo'] {
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --cmn-control-h: 44px;
}
`;

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
    TagComponent,
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
          Nothing below knows about presets. Choosing Demo swaps the radius and control-height
          tokens, so the corners round and the controls change height; choosing Carbon puts them
          back.
        </p>
        <div class="mb-cmn-4 flex flex-wrap items-center gap-cmn-2">
          <cmn-button>Primary</cmn-button>
          <cmn-button variant="secondary">Secondary</cmn-button>
          <cmn-tag>Tag</cmn-tag>
        </div>
        <div class="mb-cmn-4 max-w-xs">
          <cmn-input aria-label="Account name" placeholder="Everyday account" />
        </div>
        <cmn-segmented [options]="options" value="month" label="Range" />
      </cmn-card>

      <cmn-area-chart [series]="series" label="Net worth" />
    </div>
  `,
})
class StoryPresetPanelComponent {
  protected readonly presets = inject(PresetService);
  protected readonly options = OPTIONS;
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
