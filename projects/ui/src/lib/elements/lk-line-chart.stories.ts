/**
 * Angular consumption proof for <lk-line-chart>.
 *
 * Imports the element class by name so production bundlers (which honour
 * sideEffects:false on the package) cannot tree-shake away the module's
 * customElements.define() call. The if-guard makes this safe whether or not
 * the module's own top-level define has already run.
 */
import {LkLineChart} from '@lifekit-hq/elements';

if (!customElements.get('lk-line-chart')) {
  customElements.define('lk-line-chart', LkLineChart);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import type {ChartPoint} from '@lifekit-hq/charts-core';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

const SAMPLE_DATA: ChartPoint[] = [
  {label: 'May', value: 1_280_000},
  {label: 'Jun', value: 1_310_000},
  {label: 'Jul', value: 1_295_000},
  {label: 'Aug', value: 1_340_000},
  {label: 'Sep', value: 1_360_000},
  {label: 'Oct', value: 1_380_000},
  {label: 'Nov', value: 1_355_000},
  {label: 'Dec', value: 1_390_000},
  {label: 'Jan', value: 1_400_000},
  {label: 'Feb', value: 1_395_000},
  {label: 'Mar', value: 1_410_000},
  {label: 'Apr', value: 1_420_892},
];

interface StoryArgs {
  points: ChartPoint[];
  label: string;
  currency: string;
}

const meta: Meta<StoryArgs> = {
  title: 'Elements/LkLineChart',
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }),
  ],
  render: args => ({
    props: args,
    template: `
      <lk-line-chart
        [points]="points"
        [label]="label"
        [currency]="currency"
      ></lk-line-chart>
    `,
  }),
  argTypes: {
    currency: {control: 'select', options: ['USD', 'EUR', 'GBP']},
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {points: SAMPLE_DATA, label: 'Net Worth Performance', currency: 'USD'},
};

export const Empty: Story = {
  args: {points: [], label: 'Net Worth Performance', currency: 'USD'},
};

export const NoLabel: Story = {
  args: {points: SAMPLE_DATA, label: '', currency: 'USD'},
};
