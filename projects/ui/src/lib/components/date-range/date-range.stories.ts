import {FormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';
import {applicationConfig, moduleMetadata} from '@storybook/angular';

import {DateRangeComponent} from './date-range.component';
import {DATE_RANGE_PRESETS, DATE_RANGE_TODAY, LAST_30_DAYS_PRESET} from './date-range-presets';

/** Presets resolve against a pinned today so the catalog and its snapshots never drift. */
const PINNED_TODAY = applicationConfig({
  providers: [{provide: DATE_RANGE_TODAY, useValue: () => new Date(2026, 9, 22)}],
});

const meta: Meta = {
  title: 'Components/DateRange',
  component: DateRangeComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [FormsModule]})],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => ({
    props: {range: {from: null, to: null}},
    template: `
      <div class="w-96">
        <cmn-date-range [(ngModel)]="range" />
        <p class="mt-2 text-cmn-sm text-text-secondary">{{ range | json }}</p>
      </div>
    `,
  }),
};

export const Prefilled: Story = {
  render: () => ({
    props: {range: {from: '2026-01-01', to: '2026-01-31'}},
    template: '<div class="w-96"><cmn-date-range [(ngModel)]="range" /></div>',
  }),
};

export const InvertedRange: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'An inverted range is only flagged visually (`aria-invalid` and an error border). The ' +
          'inverted `{from, to}` is still emitted and the control has no validator, so consumers ' +
          'must validate `from <= to` themselves.',
      },
    },
  },
  render: () => ({
    props: {range: {from: '2026-03-10', to: '2026-03-01'}},
    template: '<div class="w-96"><cmn-date-range [(ngModel)]="range" /></div>',
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: {range: {from: '2026-01-01', to: null}},
    template: '<div class="w-96"><cmn-date-range [(ngModel)]="range" [disabled]="true" /></div>',
  }),
};

export const WithPresets: Story = {
  decorators: [PINNED_TODAY],
  parameters: {
    docs: {
      description: {
        story:
          'Pass `[presets]="DATE_RANGE_PRESETS"` (or your own `{label, range}` list) for a chip row ' +
          'above the fields. Choosing a chip sets both bounds and emits the usual change; the chip ' +
          'whose range matches the value reads as selected. Today is pinned to 2026-10-22 here.',
      },
    },
  },
  render: () => ({
    props: {range: {from: null, to: null}, presets: DATE_RANGE_PRESETS},
    template: `
      <div class="w-96">
        <cmn-date-range [(ngModel)]="range" [presets]="presets" />
        <p class="mt-2 text-cmn-sm text-text-secondary">{{ range | json }}</p>
      </div>
    `,
  }),
};

export const PresetSelected: Story = {
  decorators: [PINNED_TODAY],
  render: () => ({
    props: {range: {from: '2026-09-01', to: '2026-09-30'}, presets: DATE_RANGE_PRESETS},
    template: '<div class="w-96"><cmn-date-range [(ngModel)]="range" [presets]="presets" /></div>',
  }),
};

export const CustomPresets: Story = {
  decorators: [PINNED_TODAY],
  parameters: {
    docs: {
      description: {
        story: 'Built-ins mix with fixed ranges; a fixed range is a plain `{from, to}`.',
      },
    },
  },
  render: () => ({
    props: {
      range: {from: null, to: null},
      presets: [
        LAST_30_DAYS_PRESET,
        {label: 'Q1 2026', range: {from: '2026-01-01', to: '2026-03-31'}},
        {label: 'Since 2025', range: {from: '2025-01-01', to: null}},
      ],
    },
    template: '<div class="w-96"><cmn-date-range [(ngModel)]="range" [presets]="presets" /></div>',
  }),
};

export const PresetsDisabled: Story = {
  decorators: [PINNED_TODAY],
  render: () => ({
    props: {range: {from: '2026-10-01', to: '2026-10-22'}, presets: DATE_RANGE_PRESETS},
    template:
      '<div class="w-96"><cmn-date-range [(ngModel)]="range" [presets]="presets" [disabled]="true" /></div>',
  }),
};
