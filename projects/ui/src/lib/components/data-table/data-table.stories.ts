import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {AsyncStateComponent} from '../async-state/async-state.component';
import {CardComponent} from '../card/card.component';
import {InstitutionAvatarComponent} from '../institution-avatar/institution-avatar.component';
import {DataTableComponent} from './data-table.component';
import {
  CmnCellDirective,
  CmnHeaderCellDirective,
  CmnSummaryCellDirective,
} from './data-table-cell.directive';
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
        AsyncStateComponent,
        CardComponent,
        CmnCellDirective,
        CmnColumnComponent,
        CmnHeaderCellDirective,
        CmnSummaryCellDirective,
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

const CLICKABLE_TEMPLATE = `
  <cmn-data-table [rows]="rows" [rowsActionable]="true" (rowClick)="onRowClick($event)">
    <cmn-column key="date" header="Date" />
    <cmn-column key="description" header="Description" />
    <cmn-column key="amount" header="Amount" align="right" />
  </cmn-data-table>
`;

/**
 * Setting \`rowsActionable\` alongside a \`rowClick\` handler makes rows actionable: pointer cursor, hover highlight, and
 * focusable with a visible focus ring. Tab to a row and press Enter or Space to activate it.
 */
export const ClickableRows: Story = {
  args: {rows: ROWS},
  render: args => ({props: {...args, onRowClick: () => undefined}, template: CLICKABLE_TEMPLATE}),
};

const READ_ONLY_TEMPLATE = `
  <cmn-data-table [rows]="rows">
    <cmn-column key="date" header="Date" />
    <cmn-column key="description" header="Description" />
    <cmn-column key="amount" header="Amount" align="right" />
  </cmn-data-table>
`;

/** With \`rowsActionable\` left at its default (false) rows are inert: no hover highlight, pointer cursor or tab stop. */
export const ReadOnlyRows: Story = {
  args: {rows: ROWS},
  render: args => ({props: args, template: READ_ONLY_TEMPLATE}),
};

/** The loading skeleton mirrors the declared columns: three columns, three bars per row. */
export const ThreeColumnLoading: Story = {
  args: {rows: [], loading: true},
  render: args => ({
    props: args,
    template: READ_ONLY_TEMPLATE.replace('[rows]="rows"', '[rows]="rows" [loading]="loading"'),
  }),
};

const MANY_ROWS: Transaction[] = Array.from({length: 40}, (_, i) => ({
  ...ROWS[i % ROWS.length],
  description: `${ROWS[i % ROWS.length].description} #${i + 1}`,
}));

/**
 * Inside a height-constrained \`<cmn-card fill>\` the table scrolls internally and the
 * header row stays pinned to the top. The card frames it, so the table drops its own frame.
 */
export const ManyRowsScrolling: Story = {
  args: {rows: MANY_ROWS},
  render: args => ({
    props: args,
    template: `
      <div style="height: 20rem" class="flex">
        <cmn-card [fill]="true" padding="none">
          <cmn-data-table [rows]="rows">
            <cmn-column key="date" header="Date" />
            <cmn-column key="description" header="Description" />
            <cmn-column key="amount" header="Amount" align="right" />
          </cmn-data-table>
        </cmn-card>
      </div>
    `,
  }),
};

const ALIGNED_TEMPLATE = `
  <cmn-data-table [rows]="rows">
    <cmn-column key="description" header="Left" align="left" />
    <cmn-column key="status" header="Center" align="center" />
    <cmn-column key="amount" header="Right" align="right" />
  </cmn-data-table>
`;

/** Left, center and right column alignment in one table (header and cells agree). */
export const AlignedColumns: Story = {
  args: {rows: ROWS},
  render: args => ({props: args, template: ALIGNED_TEMPLATE}),
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

/**
 * A failed load: the table sits in \`cmn-async-state\`, which shows the error in its place (never
 * the empty message) with a retry action.
 */
export const LoadError: Story = {
  name: 'Error',
  args: {rows: []},
  render: args => ({
    props: args,
    template: `
      <cmn-async-state
        status="error"
        errorMessage="Transactions could not be loaded. The bank connection timed out."
        emptySubMessage="New activity appears here after the next sync."
        retryable
      >
        ${READ_ONLY_TEMPLATE}
      </cmn-async-state>
    `,
  }),
};

/** A failed refresh keeps the rows already on screen under a persistent banner. */
export const ErrorAboveRows: Story = {
  args: {rows: ROWS},
  render: args => ({
    props: args,
    template: `
      <cmn-async-state
        status="error"
        errorPlacement="above"
        errorMessage="Showing the last synced transactions. The refresh failed."
        emptySubMessage="New activity appears here after the next sync."
      >
        ${READ_ONLY_TEMPLATE}
      </cmn-async-state>
    `,
  }),
};

interface Account {
  name: string;
  institution: string;
  balance: number | null;
  updated: Date | null;
  note: string | null;
}

const ACCOUNTS: Account[] = [
  {
    name: 'Everyday Checking',
    institution: 'Chase',
    balance: 2480.12,
    updated: new Date(2026, 3, 24),
    note: 'Bills and card payments',
  },
  {
    name: 'Brokerage',
    institution: 'IBKR',
    balance: 18240.5,
    updated: new Date(2026, 3, 22),
    note: 'Long-term index funds, rebalanced every quarter against the target allocation',
  },
  {
    name: 'Spot Wallet',
    institution: 'Binance',
    balance: 3206,
    updated: null,
    note: null,
  },
  {
    name: 'Emergency Savings',
    institution: 'Ally',
    balance: 12000,
    updated: new Date(2026, 3, 1),
    note: '',
  },
  {
    name: 'Old Card',
    institution: 'Amex',
    balance: null,
    updated: new Date(2025, 11, 31),
    note: 'Closed; kept for statements',
  },
];

const MONEY = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});
const DAY = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric'});

const SORTABLE_TEMPLATE = `
  <cmn-data-table [rows]="rows" [sortMode]="sortMode" [(sort)]="sort">
    <cmn-column key="name" header="Account" sortable />
    <cmn-column key="institution" header="Institution" sortable />
    <cmn-column key="updated" header="Updated" sortable>
      <ng-template cmnCell let-row>{{ row.updated ? day.format(row.updated) : '\u2014' }}</ng-template>
    </cmn-column>
    <cmn-column key="balance" header="Balance" align="right" sortable>
      <ng-template cmnCell let-row>{{ row.balance === null ? '\u2014' : money.format(row.balance) }}</ng-template>
    </cmn-column>
  </cmn-data-table>
  <p class="mt-cmn-3 text-cmn-xs text-text-secondary">sort: {{ sort ? sort.key + ' ' + sort.direction : 'none' }}</p>
`;

/**
 * Columns opt in with \`sortable\`. Click a header, or Tab to it and press Enter or Space, to cycle
 * ascending, descending and back to the given order; the header carries \`aria-sort\`. Numbers and
 * dates sort by value, text by locale, and empty values stay last.
 */
export const Sorting: StoryObj = {
  args: {rows: ACCOUNTS, sortMode: 'client', sort: {key: 'balance', direction: 'desc'}},
  render: args => ({props: {...args, money: MONEY, day: DAY}, template: SORTABLE_TEMPLATE}),
};

/**
 * \`sortMode="server"\` leaves \`rows\` in the order given and only emits \`sortChange\`, so the
 * caller fetches the sorted page. Here the rows never change, while the header and the readout
 * follow the requested sort.
 */
export const ServerSorting: StoryObj = {
  args: {rows: ACCOUNTS, sortMode: 'server', sort: null},
  render: args => ({props: {...args, money: MONEY, day: DAY}, template: SORTABLE_TEMPLATE}),
};

const SUMMARY_TEMPLATE = `
  <cmn-data-table [rows]="rows" [mode]="mode">
    <cmn-column key="name" header="Account" listSlot="primary" summary="Total" />
    <cmn-column key="institution" header="Institution" listSlot="secondary" />
    <cmn-column key="balance" header="Balance" align="right" listSlot="trailing">
      <ng-template cmnCell let-row>{{ row.balance === null ? '\u2014' : money.format(row.balance) }}</ng-template>
      <ng-template cmnSummaryCell>{{ money.format(total) }}</ng-template>
    </cmn-column>
  </cmn-data-table>
`;

const TOTAL = ACCOUNTS.reduce((sum, a) => sum + (a.balance ?? 0), 0);

/**
 * A column's \`summary\` text, or a \`cmnSummaryCell\` template, fills a summary row pinned to the
 * bottom of the table. The table shows what it is given; the caller computes the totals.
 */
export const SummaryRow: StoryObj = {
  args: {rows: ACCOUNTS, mode: 'table'},
  render: args => ({props: {...args, money: MONEY, total: TOTAL}, template: SUMMARY_TEMPLATE}),
};

/** On a phone the summary is the last list row: primary text at the start, the total at the end. */
export const SummaryRowList: StoryObj = {
  args: {rows: ACCOUNTS, mode: 'list'},
  render: args => ({props: {...args, money: MONEY, total: TOTAL}, template: SUMMARY_TEMPLATE}),
};

/**
 * A cell whose value is \`null\`, \`undefined\` or blank renders a dash, read to screen readers
 * as \`emptyCellLabel\` ("No value"). Cells from a \`cmnCell\` template render as written.
 */
export const EmptyCells: StoryObj = {
  args: {rows: ACCOUNTS},
  render: args => ({
    props: args,
    template: `
      <cmn-data-table [rows]="rows">
        <cmn-column key="name" header="Account" />
        <cmn-column key="institution" header="Institution" />
        <cmn-column key="note" header="Note" />
        <cmn-column key="balance" header="Balance" align="right" />
      </cmn-data-table>
    `,
  }),
};

/**
 * \`truncate\` cuts long text to one line with an ellipsis. Hover a cut-off cell, or Tab to it,
 * to see the full value in a tooltip; text that fits shows none.
 */
export const LongText: StoryObj = {
  args: {rows: ACCOUNTS},
  render: args => ({
    props: args,
    template: `
      <div style="max-width: 36rem">
        <cmn-data-table [rows]="rows">
          <cmn-column key="name" header="Account" width="11rem" />
          <cmn-column key="note" header="Note" truncate />
          <cmn-column key="balance" header="Balance" align="right" width="7rem" />
        </cmn-data-table>
      </div>
    `,
  }),
};

const PAGER_TEMPLATE = `
  <cmn-data-table
    [rows]="rows"
    [pagination]="pagination"
    [pageSizeOptions]="pageSizeOptions"
    showPageNumbers
    (pageChange)="onPageChange($event)"
  >
    <cmn-column key="date" header="Date" />
    <cmn-column key="description" header="Description" />
    <cmn-column key="amount" header="Amount" align="right" />
  </cmn-data-table>
`;

/**
 * With \`showPageNumbers\`, from \`md\` up the pager lists page numbers, eliding long runs, with the
 * first and last page always one click away; below \`md\` it shows "Page X of Y".
 * \`pageSizeOptions\` adds a rows per page choice. Every control emits \`pageChange\` with the
 * offset and limit to fetch.
 */
export const PageNumbers: StoryObj = {
  args: {
    rows: ROWS,
    pagination: {totalCount: 240, offset: 90, limit: 10, hasMore: true},
    pageSizeOptions: [10, 25, 50],
  },
  render: args => ({
    props: {
      ...args,
      onPageChange(this: {pagination: object}, page: {offset: number; limit: number}): void {
        this.pagination = {...page, totalCount: 240, hasMore: page.offset + page.limit < 240};
      },
    },
    template: PAGER_TEMPLATE,
  }),
};

/** The fuller pager in the dark theme. */
export const PageNumbersDark: StoryObj = {
  ...PageNumbers,
  globals: {theme: 'dark'},
};
