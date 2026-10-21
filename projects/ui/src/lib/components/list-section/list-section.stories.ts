import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from './list-section.component';

const DAYS = ['Today', 'Yesterday', 'Mon 12 Oct', 'Sun 11 Oct'];
const ROWS = ['Corner shop', 'Train ticket', 'Lunch', 'Pharmacy', 'Bakery'];

const meta: Meta<ListSectionComponent> = {
  title: 'Components/ListSection',
  component: ListSectionComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [ListItemRowComponent]})],
  args: {heading: 'Today', card: true},
  render: args => ({
    props: {...args, rows: ROWS},
    template: `
      <cmn-list-section class="max-w-md" [heading]="heading" [card]="card">
        @for (row of rows; track row) {
          <cmn-list-item-row [label]="row" sublabel="Card payment">
            <span amount class="text-cmn-sm tabular-nums text-text-primary">-€8.90</span>
          </cmn-list-item-row>
        }
      </cmn-list-section>
    `,
  }),
};

export default meta;
type Story = StoryObj<ListSectionComponent>;

/** One day of transactions: an uppercase heading over an unpadded card of rows. */
export const Default: Story = {};

/** A summary projected with `cmnListSectionAside` sits at the heading's end. */
export const WithAside: Story = {
  render: args => ({
    props: {...args, rows: ROWS},
    template: `
      <cmn-list-section class="max-w-md" [heading]="heading">
        <span cmnListSectionAside class="normal-case tabular-nums">-€44.50</span>
        @for (row of rows; track row) {
          <cmn-list-item-row [label]="row" sublabel="Card payment" />
        }
      </cmn-list-section>
    `,
  }),
};

/** `card` false: the rows bring their own container. */
export const Bare: Story = {
  args: {card: false},
};

/**
 * Below `md` each heading sticks to the top of its scroll container while its rows pass under it,
 * and the next day's heading pushes it out. In the app shell it pins flush under the top bar.
 */
export const StickyOnPhone: Story = {
  globals: {viewport: {value: 'mobile2', isRotated: false}},
  render: () => ({
    props: {days: DAYS, rows: ROWS},
    template: `
      <div class="h-96 overflow-y-auto bg-surface-bg px-cmn-4" tabindex="0" role="region" aria-label="Transactions">
        @for (day of days; track day) {
          <cmn-list-section class="mb-cmn-5" [heading]="day">
            <span cmnListSectionAside class="normal-case tabular-nums">-€44.50</span>
            @for (row of rows; track row) {
              <cmn-list-item-row [label]="row" sublabel="Card payment" />
            }
          </cmn-list-section>
        }
      </div>
    `,
  }),
};
