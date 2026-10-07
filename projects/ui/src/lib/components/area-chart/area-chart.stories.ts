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

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const YEAR_MONTHS = 24;
const YEAR_START = 24;

/** Two years of monthly labels ("Mar '26") — the dense range that collided on phone. */
const LONG_RANGE_SERIES: AreaSeries[] = [
  ['Banking', 420000, 4000],
  ['Brokerage', 610000, 9000],
].map(([label, base, step]) => ({
  label: label as string,
  points: Array.from({length: YEAR_MONTHS}, (_, i) => ({
    label: `${MONTH_NAMES[i % MONTH_NAMES.length]} '${YEAR_START + Math.floor(i / MONTH_NAMES.length)}`,
    value: (base as number) + i * (step as number),
  })),
}));

const meta: Meta<AreaChartComponent> = {
  title: 'Components/AreaChart',
  component: AreaChartComponent,
  tags: ['autodocs'],
  argTypes: {
    stacked: {
      control: 'boolean',
      description:
        'Stacks the bands into a cumulative total on a value axis that starts at zero (`true`, the default) or draws each series as an independent, unfilled line (`false`). Toggling re-renders the existing chart — the series input is untouched.',
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
  args: {series: [], emptyMessage: 'No history yet'},
};

export const EmptyDark: Story = {
  args: Empty.args,
  globals: {theme: 'dark'},
};

export const StackedDark: Story = {
  globals: {theme: 'dark'},
};

/** Long range: x labels thin out below ~480px so neighbours never touch (resize the viewport to compare). */
export const LongRange: Story = {args: {series: LONG_RANGE_SERIES}};

/**
 * Opt into scrub-to-read with `scrubbable`: a crosshair follows a hovering mouse or a pressed
 * finger and `(scrub)` reports every band at the point, with the stacked total as its `y`.
 */
export const Scrubbable: Story = {args: {scrubbable: true}};
