import type {Meta, StoryObj} from '@storybook/angular';
import {componentWrapperDecorator} from '@storybook/angular';

import {AllocationBarComponent, type AllocationSegment} from './allocation-bar.component';

/** The whole book in the fixed asset colours, as finance-sentry Home's "Where it is" row. */
const BOOK: AllocationSegment[] = [
  {label: 'Investments', value: 924521, color: 'var(--color-asset-equity)'},
  {label: 'Cash', value: 412050, color: 'var(--color-asset-cash)'},
  {label: 'Crypto', value: 84320, color: 'var(--color-asset-crypto)'},
];

const MANY: AllocationSegment[] = [
  'Brokerage',
  'Banks',
  'Crypto',
  'Retirement',
  'Real estate',
  'Bonds',
  'Other',
].map((label, i) => ({label, value: 700000 - i * 90000}));

const meta: Meta<AllocationBarComponent> = {
  title: 'Components/AllocationBar',
  component: AllocationBarComponent,
  tags: ['autodocs'],
  decorators: [componentWrapperDecorator(story => `<div class="max-w-md">${story}</div>`)],
};

export default meta;
type Story = StoryObj<AllocationBarComponent>;

export const Default: Story = {
  args: {segments: BOOK, currency: 'USD', label: 'Where it is'},
};

export const DefaultDark: Story = {
  args: Default.args,
  globals: {theme: 'dark'},
};

/** No `color` on the segments: the charts-core categorical series, in input order. */
export const DefaultPalette: Story = {
  args: {segments: MANY, currency: 'USD', label: 'Allocation'},
};

export const DefaultPaletteDark: Story = {
  args: DefaultPalette.args,
  globals: {theme: 'dark'},
};

/** A share under 1% keeps a visible sliver and one significant digit instead of "0%". */
export const SmallSlice: Story = {
  args: {
    segments: [
      {label: 'Investments', value: 99600, color: 'var(--color-asset-equity)'},
      {label: 'Crypto', value: 400, color: 'var(--color-asset-crypto)'},
    ],
    currency: 'EUR',
    label: 'Where it is',
  },
};

/**
 * First load: after 200ms with no data, a skeleton shaped like the bar and its legend, so the
 * page does not move when the data lands.
 */
export const Loading: Story = {
  args: {segments: [], status: 'loading', label: 'Where it is'},
};

/** A successful load with nothing positive to draw. */
export const Empty: Story = {
  args: {segments: [], status: 'success', emptyMessage: 'No balances yet', label: 'Where it is'},
};

/** A failed first load: the error replaces the bar. */
export const LoadFailed: Story = {
  args: {
    segments: [],
    status: 'error',
    errorMessage: 'Could not load your balances.',
    label: 'Where it is',
  },
};

/** A failed refresh: the last good bar stays under the error banner. */
export const RefreshFailed: Story = {
  args: {
    segments: BOOK,
    status: 'error',
    errorMessage: 'Could not refresh your balances.',
    label: 'Where it is',
  },
};

/**
 * Bind `(segmentClick)` and the legend rows become touch-sized buttons; the event carries the
 * segment's `index`, `label` and `value`. Left unbound the legend is plain text, as in every
 * other story.
 */
export const Clickable: Story = {
  args: {segments: BOOK, currency: 'USD', label: 'Where it is'},
  render: args => ({
    props: {...args, last: 'Tap a row'},
    template: `
      <cmn-allocation-bar [segments]="segments" [currency]="currency" [label]="label" (segmentClick)="last = $event.label + ': ' + $event.value" />
      <p class="mt-cmn-3 text-cmn-sm text-text-secondary" data-testid="last-click">{{ last }}</p>
    `,
  }),
};

export const ClickableDark: Story = {
  ...Clickable,
  globals: {theme: 'dark'},
};
