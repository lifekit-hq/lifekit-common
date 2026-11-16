import type {Meta, StoryObj} from '@storybook/angular';

import {SkeletonComponent} from '../skeleton/skeleton.component';
import {PriceBlockComponent} from './price-block.component';
import {AVERAGE_COST, BENCHMARK, FALLING, FILLS, RECENT, RISING} from './price-block.fixtures';

const CAPTION =
  'ACME’s price in US dollars. The dotted line marks the price at the start of the period; ' +
  'the pill beside the price is the change since then.';
const COMPARED_CAPTION =
  'ACME (blue) and the World index (grey), each as its percent change since the start of the ' +
  'period. The dotted line marks 0%, the start.';

const meta: Meta<PriceBlockComponent> = {
  title: 'Components/PriceBlock',
  component: PriceBlockComponent,
  tags: ['autodocs'],
  args: {label: 'ACME', caption: CAPTION, series: [RISING]},
  parameters: {
    docs: {
      description: {
        component:
          'A price chart with the mechanics of a market detail view, on the chart frame: the price ' +
          'and its change over the period (a pill coloured by the sign of that change), a dotted ' +
          'line at the period’s starting price, underlined period tabs (1M, 6M, YTD, 1Y, 5Y, Max), ' +
          'and a crosshair whose one pill carries the date and every series’ value. Overlaying a ' +
          'benchmark (a second series) switches the chart to percent change since the period began.\n\n' +
          'Give the whole history as `series`; the block cuts it to the period, counting back from ' +
          'the last price rather than from today. **Touch:** a horizontal drag across the plot reads ' +
          'it (the page does not scroll sideways) and a vertical drag still scrolls the page; the ' +
          'pill sits in its own band above the plot, so a finger never covers it. Keys: Tab to the ' +
          'plot, then Left and Right step a point, Home and End jump to the ends, Escape lets go. ' +
          'The period tabs take Left, Right, Home and End.\n\n' +
          '**Marks:** `markers` puts dated points on the price (a triangle under the line for a ' +
          '`buy`, over it for a `sell`, at the fill’s `value` or else the day’s price), and ' +
          '`referenceLine` draws a dashed line at a price, such as an average cost. Both are read ' +
          'out in the chart’s description; say in the caption what the marks are. Markers outside ' +
          'the period are left out.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<PriceBlockComponent>;

/** The reference: an instrument that rose over the year, so the pill is green. */
export const Golden: Story = {};

/** An instrument that fell over the year: the pill turns red and points down. */
export const Falling: Story = {args: {series: [FALLING]}};

/**
 * The same instrument over a month: it fell in the last month although it rose over the year, so
 * the pill takes the sign of the period it is reading, not of the instrument.
 */
export const MonthDown: Story = {args: {period: '1M'}};

/** A benchmark overlays, so the chart reads in percent and both lines start from the dotted 0%. */
export const WithBenchmark: Story = {
  args: {series: [RISING, BENCHMARK], caption: COMPARED_CAPTION},
};

/**
 * A holding's fills and its average cost on the chart: a triangle under the line per buy, over it
 * per sell (at the fill price), and a dashed line at the average cost. Say in the caption what the
 * marks are, since the colour alone does not.
 */
export const WithFillsAndCost: Story = {
  args: {
    period: '1Y',
    markers: FILLS,
    referenceLine: AVERAGE_COST,
    caption:
      'ACME’s price in US dollars. Triangles under the line are buys and over it are sells; the ' +
      'dashed line is the average cost. The dotted line marks the price at the start of the period.',
  },
};

/** Fills alone, with no cost line, over a shorter period: the fills before it are left out. */
export const FillsOnly: Story = {args: {period: '6M', markers: FILLS}};

/** With a benchmark the chart reads in percent, and the marks move to their percent change. */
export const FillsCompared: Story = {
  args: {
    series: [RISING, BENCHMARK],
    caption: COMPARED_CAPTION,
    markers: FILLS,
    referenceLine: AVERAGE_COST,
  },
};

/** The percent reading held on a single series, which `mode` allows. */
export const PercentMode: Story = {args: {mode: 'percent'}};

/** A recent listing: the longer periods hold the whole (short) history instead of an empty chart. */
export const ShortHistory: Story = {args: {series: [RECENT], period: '5Y'}};

/** Opens on the table; the period tabs stay, so the rows follow the period. */
export const TableOpen: Story = {args: {showDataTable: true, period: '1M'}};

/** Offers only the periods it is given. */
export const FewPeriods: Story = {args: {periods: ['1M', '1Y', 'MAX']}};

/** Nothing to draw: the message stands in for the plot and the tabs stay. */
export const Empty: Story = {args: {series: []}};

/** Holds the crosshair on a point, as a held finger or a hovering mouse does. */
export const Scrubbing: Story = {
  args: {series: [RISING, BENCHMARK], caption: COMPARED_CAPTION},
  play: async ({canvasElement}) => {
    const canvas = canvasElement.querySelector('canvas');
    if (!canvas) {
      return;
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        clientX: rect.left + rect.width * 0.6,
        clientY: rect.top + rect.height * 0.6,
        bubbles: true,
      })
    );
  },
};

/** The skeleton holds the loaded block's exact box, so nothing shifts when the prices arrive. */
export const Loading: Story = {
  render: () => ({
    moduleMetadata: {imports: [SkeletonComponent]},
    template: '<cmn-skeleton shape="price" />',
  }),
};
