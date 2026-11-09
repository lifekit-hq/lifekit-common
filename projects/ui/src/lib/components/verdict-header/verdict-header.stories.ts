import type {Meta, StoryObj} from '@storybook/angular';

import {VerdictHeaderComponent, type VerdictStatus} from './verdict-header.component';

const meta: Meta<VerdictHeaderComponent> = {
  title: 'Components/VerdictHeader',
  component: VerdictHeaderComponent,
  tags: ['autodocs'],
  parameters: {layout: 'padded'},
  args: {
    status: {tone: 'success', label: 'Strong buy'},
    pills: [{label: 'High conviction', tone: 'info'}, {label: '12 months'}],
    caveat: 'Priced for perfection; wait for a pullback before adding.',
    price: 182.4,
    currency: 'EUR',
    change: {percent: 0.018, amount: 3.2},
  },
};

export default meta;
type Story = StoryObj<VerdictHeaderComponent>;

/** The verdict first: the status word, two pills, the caveat, and the price with the day's move opposite. */
export const Default: Story = {};

/** A loss: the minus and the falling arrow carry the direction, the red tint only repeats it. */
export const Loss: Story = {
  args: {
    status: {tone: 'error', label: 'Sell'},
    pills: [{label: 'Low conviction', tone: 'warning'}, {label: '3 months'}],
    caveat: 'Guidance cut twice this year.',
    change: {percent: -0.0234, amount: -4.37},
  },
};

/** The vocabulary is the app's: any word, in any of the five tones. */
export const Vocabulary: Story = {
  render: () => ({
    props: {
      statuses: [
        {tone: 'success', label: 'On track'},
        {tone: 'warning', label: 'Watch'},
        {tone: 'error', label: 'Overdue'},
        {tone: 'info', label: 'In review'},
        {tone: 'neutral', label: 'Hold'},
      ] satisfies VerdictStatus[],
    },
    template: `
      <div class="flex flex-col gap-cmn-8">
        @for (status of statuses; track status.label) {
          <cmn-verdict-header [status]="status" [pills]="[{label: status.tone}]" caveat="Same header, another word." />
        }
      </div>
    `,
  }),
};

/** No price: the status, pills and caveat read on their own. */
export const WithoutPrice: Story = {args: {price: null, change: null}};

/** No pills and no caveat: the word alone, and the price. */
export const WordOnly: Story = {args: {pills: [], caveat: null}};

/** A zero move is neutral and unsigned. */
export const NoChange: Story = {
  args: {status: {tone: 'neutral', label: 'Hold'}, change: {percent: 0, amount: 0}},
};

/** A string price is shown as given, for a figure the formatter cannot know (a range, a unit). */
export const StringPrice: Story = {args: {price: '€180 - €190', change: null}};

/** A long word and a long caveat wrap; the price stays whole under them on a phone. */
export const LongContent: Story = {
  args: {
    status: {tone: 'warning', label: 'Accumulate on weakness'},
    pills: [{label: 'Medium conviction', tone: 'info'}, {label: '12 to 18 months'}],
    caveat:
      'Valuation already assumes the new product line ships on time and at the planned margin, so a delay would be punished twice.',
    price: 1234567.89,
  },
};
