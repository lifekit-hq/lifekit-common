import type {Meta, StoryObj} from '@storybook/angular';

import type {BarSeries} from './bar-chart.component';
import {BarChartComponent} from './bar-chart.component';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function series(label: string, values: number[]): BarSeries {
  return {label, points: values.map((value, i) => ({label: MONTHS[i], value}))};
}

const LONG_RANGE: BarSeries = {
  label: 'Spending',
  points: ['2022', '2023', '2024', '2025']
    .flatMap(year => ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => `${quarter} ${year}`))
    .map((label, i) => ({label, value: 3600 + ((i * 7) % 11) * 240})),
};

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

/** No data at all — the frame and label stay, with an explicit message in place of the plot. */
export const Empty: Story = {
  args: {series: [], label: 'Monthly Spending'},
};

export const EmptyDark: Story = {
  args: Empty.args,
  globals: {theme: 'dark'},
};

/**
 * Bind `(barClick)` and the bars become clickable (pointer cursor); the event carries the bar's
 * `index`, `label`, `seriesIndex`, `seriesLabel` and `value`, enough to drill into that month.
 * Left unbound the chart is inert, as in every other story.
 */
export const Clickable: Story = {
  args: {series: [INCOME, SPENDING], label: 'Income vs Spending'},
  render: args => ({
    props: {...args, last: 'Click a bar'},
    template: `
      <cmn-bar-chart [series]="series" [label]="label" (barClick)="last = $event.seriesLabel + ', ' + $event.label + ': ' + $event.value" />
      <p class="mt-cmn-3 text-cmn-sm text-text-secondary" data-testid="last-click">{{ last }}</p>
    `,
  }),
};

/**
 * Sixteen quarters: x labels thin out so neighbours never touch, while the accessible name still
 * reads the span and its highest and lowest bar.
 */
export const LongRange: Story = {
  args: {series: [LONG_RANGE], label: 'Quarterly Spending'},
};

/**
 * The canvas is an image named by `label` and a derived summary (span, highest and lowest bar;
 * replace it with `summary`), and a screen reader reaches every bar in a data table.
 * `showDataTable` shows that table under the chart. Hover a bar, or Tab to the chart and use
 * ArrowLeft/ArrowRight, Home and End: the column highlights and its values are announced.
 */
export const DataTable: Story = {
  args: {series: [INCOME, SPENDING], label: 'Income vs Spending', showDataTable: true},
};
