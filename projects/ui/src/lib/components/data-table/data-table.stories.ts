import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {InstitutionAvatarComponent} from '../institution-avatar/institution-avatar.component';
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
      imports: [
        CmnCellDirective,
        CmnColumnComponent,
        CmnHeaderCellDirective,
        InstitutionAvatarComponent,
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<DataTableComponent<Transaction>>;

const TEMPLATE = `
  <cmn-data-table [rows]="rows" [emptyMessage]="emptyMessage" [loading]="loading">
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

/** The loading state: the table is replaced by skeleton placeholder rows. */
export const Loading: Story = {
  args: {rows: [], loading: true},
  render: args => ({props: args, template: TEMPLATE}),
};

const FIXED_WIDTHS_TEMPLATE = `
  <cmn-data-table [rows]="rows">
    <cmn-column key="date" header="Date" width="8rem" />
    <cmn-column key="description" header="Description" />
    <cmn-column key="amount" header="Amount" align="right" width="9rem" />
    <cmn-column key="status" header="Status" align="center" width="7rem" />
  </cmn-data-table>
`;

/** Per-column `width` pins trailing columns; the unsized column takes the remaining space. */
export const FixedColumnWidths: Story = {
  args: {rows: ROWS},
  render: args => ({props: args, template: FIXED_WIDTHS_TEMPLATE}),
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

interface Holding {
  symbol: string;
  provider: string;
  position: string;
  value: string;
  pnl: string;
}

const HOLDINGS: Holding[] = [
  {
    symbol: 'AAPL',
    provider: 'IBKR',
    position: '12 × $144.20',
    value: '$1,730.40',
    pnl: '+$212.10 (+14.0%)',
  },
  {
    symbol: 'RDDT',
    provider: 'IBKR',
    position: '4 × $107.98',
    value: '$431.94',
    pnl: '-$38.06 (-8.1%)',
  },
  {
    symbol: 'BTC',
    provider: 'Binance',
    position: '0.05 × $64,120.00',
    value: '$3,206.00',
    pnl: '+$706.00 (+28.2%)',
  },
];

/**
 * Columns opt into the phone layout with `listSlot`: `leading`, `primary`,
 * `secondary` (joined with a middle dot), `trailing` and `trailing-secondary`.
 * Columns without a slot (Date and Status here) are dropped from list rows.
 */
const LIST_TEMPLATE = `
  <cmn-data-table [rows]="rows" [mode]="mode" [loading]="loading" emptyMessage="No transactions">
    <cmn-column key="logo" listSlot="leading">
      <ng-template cmnCell let-row>
        <cmn-institution-avatar [name]="row.description" size="lg" />
      </ng-template>
    </cmn-column>
    <cmn-column key="date" header="Date" />
    <cmn-column key="description" header="Description" listSlot="primary" />
    <cmn-column key="account" header="Account" listSlot="secondary" />
    <cmn-column key="status" header="Status" listSlot="secondary" />
    <cmn-column key="amount" header="Amount" align="right" listSlot="trailing">
      <ng-template cmnCell let-row>
        <span [class.text-status-success]="row.amount.startsWith('+')">{{ row.amount }}</span>
      </ng-template>
    </cmn-column>
  </cmn-data-table>
`;

/**
 * List-row mode pinned on (\`mode="list"\`): one stacked row per record with an
 * avatar, a primary line, a muted secondary line and a right-aligned amount.
 * In the default \`responsive\` mode this layout is used below \`md\` (768px).
 */
export const ListRows: Story = {
  args: {rows: ROWS, mode: 'list'},
  render: args => ({props: args, template: LIST_TEMPLATE}),
};

/** The same list rows in the dark theme. */
export const ListRowsDark: Story = {
  ...ListRows,
  globals: {theme: 'dark'},
};

/** List-row skeleton: two muted lines and a trailing value per row. */
export const ListRowsLoading: Story = {
  args: {rows: [], mode: 'list', loading: true},
  render: args => ({props: args, template: LIST_TEMPLATE}),
};

/** The empty message renders as a single list row. */
export const ListRowsEmpty: Story = {
  args: {rows: [], mode: 'list'},
  render: args => ({props: args, template: LIST_TEMPLATE}),
};

/**
 * Default \`responsive\` mode at phone width: the table above becomes list rows
 * below \`md\`, and stays a table from \`md\` up. Desktop rendering is unchanged.
 */
export const ResponsivePhone: Story = {
  args: {rows: ROWS, mode: 'responsive'},
  render: args => ({props: args, template: LIST_TEMPLATE}),
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

/**
 * Holdings-shaped rows: ticker with the provider as subtitle, position size,
 * and value with unrealised P&L in the \`trailing-secondary\` line.
 */
export const ListRowsHoldings: StoryObj = {
  args: {rows: HOLDINGS},
  render: args => ({
    props: args,
    template: `
      <cmn-data-table [rows]="rows" mode="list">
        <cmn-column key="symbol" header="Symbol" listSlot="primary" />
        <cmn-column key="provider" header="Provider" listSlot="secondary" />
        <cmn-column key="position" header="Position" listSlot="secondary" />
        <cmn-column key="value" header="Value" align="right" listSlot="trailing" />
        <cmn-column key="pnl" header="P&L" align="right" listSlot="trailing-secondary">
          <ng-template cmnCell let-row>
            <span
              [class.text-status-success]="row.pnl.startsWith('+')"
              [class.text-status-error]="row.pnl.startsWith('-')"
              >{{ row.pnl }}</span
            >
          </ng-template>
        </cmn-column>
      </cmn-data-table>
    `,
  }),
};

/** Holdings-shaped list rows in the dark theme. */
export const ListRowsHoldingsDark: StoryObj = {
  ...ListRowsHoldings,
  globals: {theme: 'dark'},
};
