import type {Meta, StoryObj} from '@storybook/angular';

import {ChipComponent} from './chip.component';

const meta: Meta<ChipComponent> = {
  title: 'Components/Chip',
  component: ChipComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<ChipComponent>;

export const Unselected: Story = {
  render: args => ({
    props: args,
    template: '<cmn-chip [selected]="selected">All accounts</cmn-chip>',
  }),
  args: {selected: false},
};

export const Selected: Story = {
  render: args => ({
    props: args,
    template: '<cmn-chip [selected]="selected">All accounts</cmn-chip>',
  }),
  args: {selected: true},
};

export const FilterRow: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap gap-cmn-2">
        <cmn-chip [selected]="true">All</cmn-chip>
        <cmn-chip>Income</cmn-chip>
        <cmn-chip>Spending</cmn-chip>
        <cmn-chip>Transfers</cmn-chip>
        <cmn-chip>Subscriptions</cmn-chip>
      </div>
    `,
  }),
};

export const LongLabel: Story = {
  render: () => ({
    template: `
      <div class="max-w-xs">
        <cmn-chip>A filter label long enough to test wrapping behaviour</cmn-chip>
      </div>
    `,
  }),
};
