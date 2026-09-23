import type {Meta, StoryObj} from '@storybook/angular';

import type {BarSeries} from './bar-chart.component';
import {BarChartComponent} from './bar-chart.component';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function series(label: string, values: number[]): BarSeries {
  return {label, points: values.map((value, i) => ({label: MONTHS[i], value}))};
}

const INCOME = series('Income', [5000, 5000, 5200, 5000, 5400, 5000]);
const SPENDING = series('Spending', [1200, 980, 1440, 1310, 1120, 1560]);

const meta: Meta<BarChartComponent> = {
  title: 'Components/BarChart',
  component: BarChartComponent,
  tags: ['autodocs'],
  argTypes: {
    stacked: {
      control: 'boolean',
      description:
        'Stacks the series into one bar per label instead of grouping them side by side.',
      table: {defaultValue: {summary: 'false'}},
    },
    valueFormat: {
      control: 'radio',
      options: ['currency', 'percent'],
    },
  },
  args: {
    series: [SPENDING],
    label: 'Monthly Spending',
    currency: 'USD',
    stacked: false,
    valueFormat: 'currency',
  },
};

export default meta;
type Story = StoryObj<BarChartComponent>;

/** One series — the common case. */
export const Single: Story = {};

/** Two series side by side. */
export const Grouped: Story = {
  args: {series: [INCOME, SPENDING], label: 'Income vs Spending'},
};

/** The same two series stacked into one bar per month. */
export const Stacked: Story = {
  args: {series: [INCOME, SPENDING], label: 'Income vs Spending', stacked: true},
};

/** Negative values — a net-flow chart crosses the zero line. */
export const WithNegativeValues: Story = {
  args: {
    series: [series('Net flow', [820, -140, 410, -260, 300, 690])],
    label: 'Net Flow',
  },
};

/** Percentages instead of money. */
export const PercentFormat: Story = {
  args: {
    series: [series('Budget used', [62, 48, 91, 77, 55, 84])],
    label: 'Budget Utilisation',
    valueFormat: 'percent',
  },
};

/** A single point still renders a readable chart. */
export const SinglePoint: Story = {
  args: {series: [series('Spending', [1200])], label: 'Monthly Spending'},
};

/** No data at all — the chart renders its frame and label, nothing else. */
export const Empty: Story = {
  args: {series: [], label: 'Monthly Spending'},
};
