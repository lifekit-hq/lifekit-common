import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

import {CardComponent} from '../card/card.component';
import {TagComponent} from '../tag/tag.component';
import {DescriptionItemComponent, DescriptionListComponent} from './description-list.component';

const meta: Meta<DescriptionListComponent> = {
  title: 'Components/DescriptionList',
  component: DescriptionListComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [CardComponent, DescriptionItemComponent, TagComponent]})],
};

export default meta;
type Story = StoryObj<DescriptionListComponent>;

/** Text values and projected ones (a tag, a link) side by side from `sm` up. */
export const Default: Story = {
  render: () => ({
    template: `
      <cmn-card class="block max-w-2xl">
        <cmn-description-list>
          <cmn-description-item label="Sector" value="Technology" />
          <cmn-description-item label="Exchange" value="NASDAQ" />
          <cmn-description-item label="Market cap" value="$3.41T" />
          <cmn-description-item label="Status">
            <cmn-tag variant="success">Held</cmn-tag>
          </cmn-description-item>
          <cmn-description-item label="Investor relations">
            <a class="text-accent-default underline" href="#investor-relations">ir.example.com</a>
          </cmn-description-item>
        </cmn-description-list>
      </cmn-card>
    `,
  }),
};

/** Below `sm` each value stacks under its label. */
export const StackedOnPhone: Story = {
  globals: {viewport: {value: 'mobile2', isRotated: false}},
  render: () => ({
    template: `
      <cmn-card class="block">
        <cmn-description-list>
          <cmn-description-item label="Account holder" value="Olena Kovalenko" />
          <cmn-description-item label="Account type" value="Current account" />
          <cmn-description-item label="Opened" value="12 March 2021" />
          <cmn-description-item label="Currency" value="EUR" />
        </cmn-description-list>
      </cmn-card>
    `,
  }),
};

/** Long labels and values wrap; an unspaced value such as an IBAN breaks rather than overflows. */
export const LongContent: Story = {
  render: () => ({
    template: `
      <cmn-card class="block max-w-md">
        <cmn-description-list>
          <cmn-description-item
            label="Business description"
            value="Designs, manufactures and markets smartphones, personal computers, tablets, wearables and accessories, and sells a range of related services worldwide."
          />
          <cmn-description-item label="IBAN" value="UA213223130000026007233566001UA213223130000026007233566001" />
          <cmn-description-item
            label="Settlement account used for dividends and corporate actions"
            value="Brokerage cash"
          />
        </cmn-description-list>
      </cmn-card>
    `,
  }),
};

/** An item with no value and no projected content shows a dash. */
export const EmptyValue: Story = {
  render: () => ({
    template: `
      <cmn-card class="block max-w-2xl">
        <cmn-description-list>
          <cmn-description-item label="Dividend yield" value="0.44%" />
          <cmn-description-item label="Analyst target" />
          <cmn-description-item label="Next earnings" [value]="null" />
        </cmn-description-list>
      </cmn-card>
    `,
  }),
};
