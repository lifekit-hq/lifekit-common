import type {Meta, StoryObj} from '@storybook/angular';

import type {ChartPoint} from './line-chart.component';
import {LineChartComponent} from './line-chart.component';

const SAMPLE_DATA: ChartPoint[] = [
  {label: 'May', value: 1280000},
  {label: 'Jun', value: 1310000},
  {label: 'Jul', value: 1295000},
  {label: 'Aug', value: 1340000},
  {label: 'Sep', value: 1360000},
  {label: 'Oct', value: 1380000},
  {label: 'Nov', value: 1355000},
  {label: 'Dec', value: 1390000},
  {label: 'Jan', value: 1400000},
  {label: 'Feb', value: 1395000},
  {label: 'Mar', value: 1410000},
  {label: 'Apr', value: 1420892},
];

const SCORE_DATA: ChartPoint[] = [
  {label: 'May', value: 12},
  {label: 'Jun', value: 18},
  {label: 'Jul', value: 15},
  {label: 'Aug', value: 22},
  {label: 'Sep', value: 25},
];

const meta: Meta<LineChartComponent> = {
  title: 'Components/LineChart',
  component: LineChartComponent,
  tags: ['autodocs'],
  argTypes: {
    xSpacing: {
      control: 'inline-radio',
      options: ['even', 'time'],
      description:
        "`'even'` (default) gives each point an equal slot; `'time'` places each by the epoch-ms `time` on it.",
    },
    valueFormat: {
      control: 'inline-radio',
      options: ['currency', 'number', 'percent'],
      description:
        "How ticks and tooltips render values: a kind (`'currency'` default, `'number'`, `'percent'`) or a `(value, compact) => string` function.",
    },
  },
};

export default meta;
type Story = StoryObj<LineChartComponent>;

export const Default: Story = {
  args: {data: SAMPLE_DATA, label: 'Net Worth Performance', currency: 'USD'},
};

/** Unit-less series (a score): ticks and tooltip carry no currency symbol. */
export const NumberFormat: Story = {
  args: {data: SCORE_DATA, label: 'Health score', valueFormat: 'number'},
};

export const PercentFormat: Story = {
  args: {
    data: [
      {label: 'May', value: 41.5},
      {label: 'Jun', value: 44},
      {label: 'Jul', value: 43.2},
      {label: 'Aug', value: 47.8},
    ],
    label: 'Savings rate',
    valueFormat: 'percent',
  },
};

export const CustomFormatter: Story = {
  args: {
    data: SCORE_DATA,
    label: 'Health score',
    valueFormat: (value: number) => `${value} pts`,
  },
};

/** A sparkline: only the line, filling the host (here 12rem x 2.5rem) - no title, frame, axes or animation. Size it with a `height` on the element. */
export const Compact: Story = {
  args: {data: SAMPLE_DATA, compact: true},
  render: args => ({
    props: args,
    template:
      '<div style="display:flex;align-items:center;gap:1rem"><span>Trend</span><cmn-line-chart [data]="data" [compact]="compact" style="width:12rem;height:2.5rem"></cmn-line-chart></div>',
  }),
};

const DAY_MS = 86_400_000;
const FIRST_SIGNAL = Date.UTC(2026, 5, 1);
const SIGNAL_LEVELS = [1, 2, 2, 3, 1, 2];
// A burst of signals on the first days, then a long quiet gap, then a late pair.
const SIGNAL_DAYS = [0, 1, 2, 3, 70, 71];

const SIGNAL_TREND: ChartPoint[] = SIGNAL_LEVELS.map((value, i) => ({
  label: `Signal ${i + 1}`,
  value,
  time: FIRST_SIGNAL + SIGNAL_DAYS[i] * DAY_MS,
}));

/**
 * A sparkline that keeps what the trend means: `yDomain` pins low/medium/high (1-3) to fixed
 * heights, so a low-to-medium series does not draw like a medium-to-high one, and
 * `xSpacing="time"` places each point by its timestamp, so the burst stays a burst.
 */
export const CompactFixedDomainTimeSpaced: Story = {
  args: {data: SIGNAL_TREND, compact: true, yDomain: {min: 1, max: 3}, xSpacing: 'time'},
  render: args => ({
    props: args,
    template:
      '<div style="display:flex;align-items:center;gap:1rem"><span>Signals</span><cmn-line-chart [data]="data" [compact]="compact" [yDomain]="yDomain" [xSpacing]="xSpacing" style="width:12rem;height:2.5rem"></cmn-line-chart></div>',
  }),
};

/** The same options on the full chart: the y axis spans the fixed domain and x ticks read as dates. */
export const FixedDomainTimeSpaced: Story = {
  args: {
    data: SIGNAL_TREND,
    label: 'Radar signals',
    valueFormat: 'number',
    yDomain: {min: 0, max: 4},
    xSpacing: 'time',
  },
};

export const Empty: Story = {
  args: {data: [], label: 'Net Worth Performance', currency: 'USD'},
};

export const EmptyCustomMessage: Story = {
  args: {data: [], label: 'Exchange rate', emptyMessage: 'No rates recorded yet'},
};

export const DefaultDark: Story = {
  args: Default.args,
  globals: {theme: 'dark'},
};

export const EmptyDark: Story = {
  args: Empty.args,
  globals: {theme: 'dark'},
};
