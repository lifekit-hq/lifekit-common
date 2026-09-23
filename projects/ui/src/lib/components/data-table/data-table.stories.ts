import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {DataTableComponent} from './data-table.component';
import {CmnCellDirective, CmnHeaderCellDirective} from './data-table-cell.directive';
import {CmnColumnComponent} from './data-table-column.component';

interface Transaction {
  date: string;
  description: string;
  account: string;
  amount: string;
  status: string;
}

const ROWS: Transaction[] = [
  {
    date: 'Apr 24',
    description: 'Netflix',
    account: 'Chase Checking',
    amount: '-$15.99',
    status: 'Settled',
  },
  {
    date: 'Apr 23',
    description: 'Salary',
    account: 'Chase Checking',
    amount: '+$5,000.00',
    status: 'Settled',
  },
  {
    date: 'Apr 22',
    description: 'Whole Foods',
    account: 'Chase Checking',
    amount: '-$87.43',
    status: 'Pending',
  },
  {
    date: 'Apr 21',
    description: 'Dividends',
    account: 'IBKR',
    amount: '+$124.50',
    status: 'Settled',
  },
  {
    date: 'Apr 20',
    description: 'BTC Purchase',
    account: 'Binance',
    amount: '-$500.00',
    status: 'Settled',
  },
];

const meta: Meta<DataTableComponent<Transaction>> = {
  title: 'Components/DataTable',
  component: DataTableComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [CmnCellDirective, CmnColumnComponent, CmnHeaderCellDirective],
    }),
  ],
};

export default meta;
type Story = StoryObj<DataTableComponent<Transaction>>;

const TEMPLATE = `
  <cmn-data-table [rows]="rows" [emptyMessage]="emptyMessage">
    <cmn-column key="date" header="Date">
      <ng-template cmnCell let-row>{{ row.date }}</ng-template>
    </cmn-column>
    <cmn-column key="description" header="Description">
      <ng-template cmnCell let-row>{{ row.description }}</ng-template>
    </cmn-column>
    <cmn-column key="account" header="Account" />
    <cmn-column key="amount" header="Amount" align="right">
      <ng-template cmnCell let-row>{{ row.amount }}</ng-template>
    </cmn-column>
    <cmn-column key="status" header="Status" align="center">
      <ng-template cmnCell let-row>{{ row.status }}</ng-template>
    </cmn-column>
  </cmn-data-table>
`;

export const Default: Story = {
  args: {rows: ROWS},
  render: args => ({props: args, template: TEMPLATE}),
};

export const Empty: Story = {
  args: {rows: [], emptyMessage: 'No recent transactions'},
  render: args => ({props: args, template: TEMPLATE}),
};

/** The loading state: the table keeps its header and shows placeholder rows. */
export const Loading: Story = {
  args: {rows: [], loading: true},
  render: args => ({props: args, template: TEMPLATE}),
};

const PAGINATED_TEMPLATE = `
  <cmn-data-table [rows]="rows" [pagination]="pagination">
    <cmn-column key="date" header="Date">
      <ng-template cmnCell let-row>{{ row.date }}</ng-template>
    </cmn-column>
    <cmn-column key="description" header="Description">
      <ng-template cmnCell let-row>{{ row.description }}</ng-template>
    </cmn-column>
    <cmn-column key="amount" header="Amount" align="right">
      <ng-template cmnCell let-row>{{ row.amount }}</ng-template>
    </cmn-column>
  </cmn-data-table>
`;

/** The first page — Previous is disabled, Next is live. */
export const FirstPage: Story = {
  args: {
    rows: ROWS,
    pagination: {totalCount: 128, offset: 0, limit: 10, hasMore: true},
  },
  render: args => ({props: args, template: PAGINATED_TEMPLATE}),
};

/** A page in the middle of a larger result set. */
export const Paginated: Story = {
  args: {
    rows: ROWS,
    pagination: {totalCount: 128, offset: 10, limit: 10, hasMore: true},
  },
  render: args => ({props: args, template: PAGINATED_TEMPLATE}),
};

/** The last page — there is nothing further to fetch. */
export const LastPage: Story = {
  args: {
    rows: ROWS,
    pagination: {totalCount: 15, offset: 10, limit: 10, hasMore: false},
  },
  render: args => ({props: args, template: PAGINATED_TEMPLATE}),
};

/**
 * `cmnHeaderCell` replaces a column's plain `header` string with a template, so
 * a header can carry an icon, a sort affordance or any other markup.
 */
export const CustomHeaderCell: Story = {
  args: {rows: ROWS},
  render: args => ({
    props: args,
    template: `
      <cmn-data-table [rows]="rows">
        <cmn-column key="description" header="Description">
          <ng-template cmnHeaderCell>
            <span class="font-semibold text-accent-default">Merchant</span>
          </ng-template>
          <ng-template cmnCell let-row>{{ row.description }}</ng-template>
        </cmn-column>
        <cmn-column key="amount" header="Amount" align="right">
          <ng-template cmnCell let-row let-i="index">
            <span [class.text-status-success]="row.amount.startsWith('+')">
              {{ i + 1 }}. {{ row.amount }}
            </span>
          </ng-template>
        </cmn-column>
      </cmn-data-table>
    `,
  }),
};
