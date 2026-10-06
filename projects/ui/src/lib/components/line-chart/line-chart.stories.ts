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
