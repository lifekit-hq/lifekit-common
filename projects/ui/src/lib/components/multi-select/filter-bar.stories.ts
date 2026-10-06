import {FormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {DateRangeComponent} from '../date-range/date-range.component';
import {SearchInputComponent} from '../search-input/search-input.component';
import {MultiSelectComponent} from './multi-select.component';

const meta: Meta = {
  title: 'Patterns/FilterBar',
  decorators: [
    moduleMetadata({
      imports: [FormsModule, SearchInputComponent, MultiSelectComponent, DateRangeComponent],
    }),
  ],
};

export default meta;
type Story = StoryObj;

/** The primitives composed into a transaction filter bar; layout wraps on narrow screens. */
export const Transactions: Story = {
  render: () => ({
    props: {
      query: '',
      accounts: [],
      categories: [],
      range: {from: null, to: null},
      accountOptions: [
        {label: 'Main current account', value: 'main'},
        {label: 'Savings vault', value: 'savings'},
      ],
      categoryOptions: [
        {label: 'Groceries', value: 'groceries'},
        {label: 'Rent', value: 'rent'},
        {label: 'Dining out', value: 'dining'},
      ],
    },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <cmn-search-input class="w-64" [(ngModel)]="query" placeholder="Search transactions" />
        <cmn-multi-select class="w-52" [(ngModel)]="accounts" [options]="accountOptions" placeholder="All accounts" ariaLabel="Accounts" />
        <cmn-multi-select class="w-52" [(ngModel)]="categories" [options]="categoryOptions" placeholder="All categories" ariaLabel="Categories" />
        <cmn-date-range class="w-80" [(ngModel)]="range" />
      </div>
    `,
  }),
};
