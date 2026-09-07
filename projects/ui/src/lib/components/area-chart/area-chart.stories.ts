import type {Meta, StoryObj} from '@storybook/angular';

import type {AreaSeries} from './area-chart.component';
import {AreaChartComponent} from './area-chart.component';

const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function series(label: string, values: number[]): AreaSeries {
  return {label, points: values.map((value, i) => ({label: MONTHS[i], value}))};
}

const SAMPLE_SERIES: AreaSeries[] = [
  series('Banking', [420000, 428000, 431000, 445000, 452000, 461000, 458000, 470000]),
  series('Brokerage', [610000, 625000, 601000, 640000, 662000, 671000, 655000, 690000]),
  series('Crypto', [180000, 205000, 172000, 198000, 214000, 236000, 221000, 248000]),
];

const meta: Meta<AreaChartComponent> = {
  title: 'Components/AreaChart',
  component: AreaChartComponent,
  tags: ['autodocs'],
  argTypes: {
    stacked: {
      control: 'boolean',
      description:
        'Stacks the bands into a cumulative total (`true`, the default) or draws each series as an independent, unfilled line (`false`). Toggling re-renders the existing chart — the series input is untouched.',
      table: {defaultValue: {summary: 'true'}},
    },
  },
  args: {series: SAMPLE_SERIES, label: 'Net Worth Over Time', currency: 'USD', stacked: true},
};

export default meta;
type Story = StoryObj<AreaChartComponent>;

/** Cumulative composition — the bands sum to total net worth. */
export const Stacked: Story = {};

/** Per-account trends compared side by side, no stacking and no fill. */
export const Lines: Story = {
  args: {stacked: false},
};

export const Empty: Story = {
  args: {series: []},
};
