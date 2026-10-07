import type {Meta, StoryObj} from '@storybook/angular';

import type {DonutSegment} from './donut-chart.component';
import {DonutChartComponent} from './donut-chart.component';

const SAMPLE_SEGMENTS: DonutSegment[] = [
  {label: 'Banks', value: 412050},
  {label: 'Brokerage', value: 924521},
  {label: 'Crypto', value: 84320},
];

const MANY_SEGMENTS: DonutSegment[] = [
  'Brokerage',
  'Banks',
  'Crypto',
  'Retirement',
  'Real estate',
  'Cash',
  'Bonds',
  'Other',
].map((label, i) => ({label, value: 800000 - i * 90000}));

const meta: Meta<DonutChartComponent> = {
  title: 'Components/DonutChart',
  component: DonutChartComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<DonutChartComponent>;

export const Default: Story = {
  args: {segments: SAMPLE_SEGMENTS, label: 'Allocation', currency: 'USD'},
};

export const Empty: Story = {
  args: {segments: [], label: 'Allocation', currency: 'USD'},
};

export const CustomColors: Story = {
  args: {
    segments: [
      {label: 'Banks', value: 412050, color: '#175a6d'},
      {label: 'Brokerage', value: 924521, color: '#10b981'},
      {label: 'Crypto', value: 84320, color: '#f59e0b'},
    ],
    label: 'Allocation',
    currency: 'USD',
  },
};

/** Nothing to draw (no segments, or all zero) — an explicit message instead of a blank card. */
export const EmptyCustomMessage: Story = {
  args: {segments: [], label: 'Allocation', emptyMessage: 'No holdings yet'},
};

/** Ring-only mode inside a host-sized box: the ring must fill the box, not collapse. */
export const Embedded: Story = {
  args: {segments: SAMPLE_SEGMENTS, chrome: false, showLegend: false},
  render: args => ({
    props: args,
    template:
      '<div style="height: 260px; width: 260px"><cmn-donut-chart [segments]="segments" [chrome]="chrome" [showLegend]="showLegend" /></div>',
  }),
};

export const DefaultDark: Story = {
  args: Default.args,
  globals: {theme: 'dark'},
};

export const EmptyDark: Story = {
  args: Empty.args,
  globals: {theme: 'dark'},
};

export const EmbeddedDark: Story = {
  ...Embedded,
  globals: {theme: 'dark'},
};

/** Every default palette stop in use; neighbours stay clearly distinct in hue. */
export const ManySegments: Story = {
  args: {segments: MANY_SEGMENTS, label: 'Allocation', currency: 'USD'},
};

export const ManySegmentsDark: Story = {
  args: ManySegments.args,
  globals: {theme: 'dark'},
};

/**
 * Bind `(segmentClick)` and the ring segments become clickable (pointer cursor); the event
 * carries the segment's `index`, `label` and `value`. Left unbound the chart is inert, as in
 * every other story.
 */
export const Clickable: Story = {
  args: {segments: SAMPLE_SEGMENTS, label: 'Allocation', currency: 'USD'},
  render: args => ({
    props: {...args, last: 'Click a segment'},
    template: `
      <cmn-donut-chart [segments]="segments" [label]="label" [currency]="currency" (segmentClick)="last = $event.label + ': ' + $event.value" />
      <p class="mt-cmn-3 text-cmn-sm text-text-secondary" data-testid="last-click">{{ last }}</p>
    `,
  }),
};
