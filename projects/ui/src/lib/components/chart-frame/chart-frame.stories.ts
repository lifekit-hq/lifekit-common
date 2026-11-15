import type {Meta, StoryObj} from '@storybook/angular';

import {AreaChartComponent} from '../area-chart/area-chart.component';
import {BarChartComponent, type BarSeries} from '../bar-chart/bar-chart.component';
import {DonutChartComponent} from '../donut-chart/donut-chart.component';
import {ChartFrameComponent} from './chart-frame.component';

const QUARTERS = ['Q1 26', 'Q2 26', 'Q3 26', 'Q4 26 (e)', 'Q1 27 (e)'];
const REVENUE: BarSeries = {
  label: 'Revenue',
  points: QUARTERS.map((label, i) => ({label, value: 86_000 + i * 4800})),
};
const SOURCES = [
  'Filing (SEC EDGAR)',
  'Filing (SEC EDGAR)',
  'Filing (SEC EDGAR)',
  'Consensus (22 analysts)',
  'Consensus (22 analysts)',
];

const meta: Meta<ChartFrameComponent> = {
  title: 'Components/ChartFrame',
  component: ChartFrameComponent,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The frame every chart draws in: a title, a Table chip that swaps the plot for the same ' +
          'data as an accessible table (with a Source column when the data has sources), and a ' +
          'plain-language caption under the plot instead of an in-plot legend. ' +
          '`cmn-line-chart`, `cmn-bar-chart`, `cmn-area-chart` and `cmn-donut-chart` use it ' +
          'themselves (set their `caption`, `sources` and `showDataTable`); use `cmn-chart-frame` ' +
          'directly to frame a plot that is not one of them.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<ChartFrameComponent>;

/**
 * The reference composition: a title, a Table chip, the plot, and one sentence under it that
 * names each series by how it is drawn. The Table chip shows the same figures with a source per
 * row; Tab to the chip and press Enter or Space.
 */
export const Golden: StoryObj<BarChartComponent> = {
  render: () => ({
    moduleMetadata: {imports: [BarChartComponent]},
    template: `
      <cmn-bar-chart
        [series]="series"
        [sources]="sources"
        caption="Revenue per quarter in USD thousands. Solid bars are reported figures from filings; the last two bars are analyst forecasts, marked (e) on the axis."
        label="Revenue"
        valueFormat="number"
      />
    `,
    props: {series: [REVENUE], sources: SOURCES},
  }),
};

/** Opens on the table: `showDataTable` seeds the chip's state, and the chip still toggles it. */
export const TableOpen: StoryObj<BarChartComponent> = {
  render: () => ({
    moduleMetadata: {imports: [BarChartComponent]},
    template: `
      <cmn-bar-chart
        [series]="series"
        [showDataTable]="true"
        [sources]="sources"
        caption="Revenue per quarter in USD thousands. Reported figures first, analyst forecasts after."
        label="Revenue"
        valueFormat="number"
      />
    `,
    props: {series: [REVENUE], sources: SOURCES},
  }),
};

/** Two series: the caption names each by its mark, and the table has a column per series. */
export const TwoSeries: StoryObj<AreaChartComponent> = {
  render: () => ({
    moduleMetadata: {imports: [AreaChartComponent]},
    template: `
      <cmn-area-chart
        [series]="series"
        caption="Cash (blue area) and investments (green area), stacked; the top edge is the total."
        label="Liquid assets"
        stacked
      />
    `,
    props: {
      series: [
        {
          label: 'Cash',
          points: ['Jan', 'Feb', 'Mar', 'Apr'].map((label, i) => ({label, value: 8000 + i * 600})),
        },
        {
          label: 'Investments',
          points: ['Jan', 'Feb', 'Mar', 'Apr'].map((label, i) => ({
            label,
            value: 22_000 + i * 1500,
          })),
        },
      ],
    },
  }),
};

/** A ring: the table lists each segment with its share, and a source per segment. */
export const Ring: StoryObj<DonutChartComponent> = {
  render: () => ({
    moduleMetadata: {imports: [DonutChartComponent]},
    template: `
      <cmn-donut-chart
        [segments]="segments"
        [sources]="sources"
        caption="Share of the portfolio by asset class; each colour is a class, listed in the table."
        label="Allocation"
      />
    `,
    props: {
      segments: [
        {label: 'Stocks', value: 62_000},
        {label: 'Bonds', value: 21_000},
        {label: 'Cash', value: 9000},
      ],
      sources: ['Brokerage', 'Brokerage', 'Bank feed'],
    },
  }),
};

/** A plot that is not one of the library's charts: project it, and the chip, table and caption follow. */
export const OwnPlot: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-chart-frame
        [caption]="caption"
        [label]="label"
        [sources]="sources"
        [table]="table"
      >
        <svg viewBox="0 0 200 60" role="img" aria-label="Savings rate rising" class="h-40 w-full">
          <polyline fill="none" stroke="var(--color-accent-default)" stroke-width="2" points="0,50 50,40 100,30 150,18 200,8" />
        </svg>
      </cmn-chart-frame>
    `,
  }),
  args: {
    label: 'Savings rate',
    caption: 'Savings rate as a share of income (blue line), month by month.',
    table: {
      headers: ['Month', 'Savings rate'],
      rows: [
        ['Jan', '8%'],
        ['Feb', '12%'],
        ['Mar', '17%'],
        ['Apr', '21%'],
        ['May', '26%'],
      ],
    },
    sources: ['Bank feed', 'Bank feed', 'Bank feed', 'Bank feed', 'Manual entry'],
  },
};
