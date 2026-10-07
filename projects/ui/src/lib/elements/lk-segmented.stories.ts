/**
 * Angular consumption proof for <lk-segmented>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects on the
 * package) cannot tree-shake away the module's customElements.define() call.
 */
import {LkSegmented, type SegmentedOption} from '@lifekit-hq/elements';

if (!customElements.get('lk-segmented')) {
  customElements.define('lk-segmented', LkSegmented);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {
  componentWrapperDecorator,
  type Meta,
  moduleMetadata,
  type StoryObj,
} from '@storybook/angular';

const PERIODS: SegmentedOption[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'MAX'].map(value => ({
  value,
  label: value,
}));

interface StoryArgs {
  options: SegmentedOption[];
  value: string;
  label: string;
  disabled: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'Elements/LkSegmented',
  tags: ['autodocs'],
  decorators: [moduleMetadata({schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  args: {options: PERIODS, value: '1M', label: 'History range', disabled: false},
  render: args => ({
    props: {
      ...args,
      chosen: args.value,
      choose: (e: CustomEvent<{value: string}>) => (args.value = e.detail.value),
    },
    template: `
      <lk-segmented
        [options]="options"
        [value]="value"
        [label]="label"
        [disabled]="disabled"
        (lk-segmented-change)="choose($event)"
      ></lk-segmented>
      <p class="mt-cmn-3 text-cmn-sm text-text-secondary">value: {{ value }}</p>
    `,
  }),
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** A chart period: pick one, the host reads `value`. Arrow keys move and choose; Home/End jump. */
export const Default: Story = {};

/** Seven periods in the 326px a card leaves on a 390px phone: one row, every cell at least 44px. */
export const Phone: Story = {
  decorators: [
    componentWrapperDecorator(
      story =>
        `<div class="mx-auto w-[326px] rounded-cmn-lg bg-surface-card p-cmn-4">${story}</div>`
    ),
  ],
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

/** A disabled cell is skipped by Tab and the arrow keys (here 3M has no data yet). */
export const DisabledOption: Story = {
  args: {options: PERIODS.map(o => ({...o, disabled: o.value === '3M'}))},
};

export const Disabled: Story = {args: {disabled: true}};

export const Dark: Story = {
  decorators: [
    componentWrapperDecorator(story => `<div class="bg-surface-bg p-cmn-4">${story}</div>`),
  ],
  globals: {theme: 'dark'},
};

/** Few options still share the row equally. */
export const TwoOptions: Story = {
  args: {
    options: [
      {value: 'net', label: 'Net'},
      {value: 'gross', label: 'Gross'},
    ],
    value: 'net',
    label: 'Amounts',
  },
};
