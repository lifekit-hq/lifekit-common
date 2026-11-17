import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {CardComponent} from '../card/card.component';
import {SegmentedComponent, type SegmentedOption} from './segmented.component';

const MODES: SegmentedOption[] = [
  {value: 'system', label: 'System'},
  {value: 'light', label: 'Light'},
  {value: 'dark', label: 'Dark'},
];

const meta: Meta<SegmentedComponent> = {
  title: 'Components/Segmented',
  component: SegmentedComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [SegmentedComponent, CardComponent]})],
};

export default meta;
type Story = StoryObj<SegmentedComponent>;

export const Default: Story = {
  args: {options: MODES, value: 'system', label: 'Appearance'},
};

export const Chosen: Story = {
  args: {options: MODES, value: 'dark', label: 'Appearance'},
};

export const Interactive: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-sm flex-col gap-cmn-3">
        <cmn-segmented [options]="options" [(value)]="mode" label="Appearance" />
        <p class="text-cmn-sm text-text-secondary">Chosen: {{ mode }}</p>
      </div>
    `,
    props: {options: MODES, mode: 'system'},
  }),
};

export const DisabledCell: Story = {
  args: {
    options: [MODES[0], MODES[1], {...MODES[2], disabled: true}],
    value: 'system',
    label: 'Appearance',
  },
};

export const Disabled: Story = {
  args: {options: MODES, value: 'light', label: 'Appearance', disabled: true},
};

/** The row never wraps: on a 320px phone each cell still shares the width and stays a touch target. */
export const NarrowPhone: Story = {
  render: () => ({
    template: `
      <div class="w-[320px]">
        <cmn-segmented [options]="options" [(value)]="period" label="Period" />
      </div>
    `,
    props: {
      options: [
        {value: '7d', label: '7 days'},
        {value: '30d', label: '30 days'},
        {value: '90d', label: '90 days'},
        {value: 'ytd', label: 'Year'},
      ],
      period: '30d',
    },
  }),
};

/** A card header holding a view switch: the control's frame is not a second card inside the first. */
export const InCardHeader: Story = {
  render: () => ({
    template: `
      <cmn-card class="block max-w-lg">
        <div class="flex items-center justify-between gap-cmn-3">
          <h2 class="text-cmn-lg font-semibold">Verdict</h2>
          <cmn-segmented [options]="options" [(value)]="period" label="Period" />
        </div>
        <p class="mt-cmn-3 text-cmn-sm text-text-secondary">The switch sits in the header; the body follows.</p>
      </cmn-card>
    `,
    props: {
      options: [
        {value: '1m', label: '1M'},
        {value: '1y', label: '1Y'},
        {value: 'all', label: 'All'},
      ],
      period: '1y',
    },
  }),
};
