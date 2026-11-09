import type {Meta, StoryObj} from '@storybook/angular';

import {ProseComponent} from './prose.component';

const meta: Meta<ProseComponent> = {
  title: 'Components/Prose',
  component: ProseComponent,
  tags: ['autodocs'],
  parameters: {layout: 'padded'},
};

export default meta;
type Story = StoryObj<ProseComponent>;

const DISCLAIMER =
  'Ledger proposes, you decide. Finance Sentry never trades: confirming records your decision ' +
  'and shows the order for you to place at your broker yourself. Nothing here is financial ' +
  'advice, and every proposal is a reading of your own data.';

/** A long paragraph in a wide column wraps at 56ch, under the line-length aim of 80. */
export const Default: Story = {
  render: () => ({
    template: `<div class="max-w-[640px]"><cmn-prose>${DISCLAIMER}</cmn-prose></div>`,
  }),
};

/** One `<p>` per paragraph: a line apart, not a section apart. */
export const Paragraphs: Story = {
  render: () => ({
    template: `
      <div class="max-w-[640px]">
        <cmn-prose>
          <p>${DISCLAIMER}</p>
          <p>Past results do not predict future ones, and a proposal can be declined without a reason.</p>
        </cmn-prose>
      </div>
    `,
  }),
};

/** In a column narrower than the cap (a phone) it simply fills the column. */
export const Narrow: Story = {
  render: () => ({
    template: `<div class="max-w-[320px]"><cmn-prose>${DISCLAIMER}</cmn-prose></div>`,
  }),
};
