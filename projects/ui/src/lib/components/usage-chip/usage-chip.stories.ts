import type {Meta, StoryObj} from '@storybook/angular';

import {UsageChipComponent} from './usage-chip.component';

interface Args {
  used: number;
  total: number;
  label: string;
  unit: string;
}

const meta: Meta<Args> = {
  title: 'Components/UsageChip',
  component: UsageChipComponent,
  tags: ['autodocs'],
  argTypes: {
    used: {control: 'number'},
    total: {control: 'number'},
    label: {control: 'text'},
    unit: {control: 'text'},
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
  args: {used: 12, total: 50, label: 'API', unit: 'calls'},
};

export const Tones: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col items-start gap-3">
        <cmn-usage-chip [used]="12" [total]="50" label="Healthy" unit="calls" />
        <cmn-usage-chip [used]="42" [total]="50" label="Near limit" unit="calls" />
        <cmn-usage-chip [used]="50" [total]="50" label="Exhausted" unit="calls" />
      </div>
    `,
  }),
};

export const NoLabel: Story = {
  args: {used: 3, total: 10, label: '', unit: ''},
};
