import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {CardComponent} from '../card/card.component';
import {EmptyStateComponent} from '../empty-state/empty-state.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';
import {AsyncStateComponent} from './async-state.component';

const meta: Meta<AsyncStateComponent> = {
  title: 'Components/Async State',
  component: AsyncStateComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ButtonComponent, CardComponent, EmptyStateComponent, SkeletonComponent],
    }),
  ],
};

export default meta;
type Story = StoryObj<AsyncStateComponent>;

const CONTENT = `
  <div class="rounded-cmn-md border border-border-default bg-surface-card p-cmn-4">
    <p class="text-cmn-sm text-text-primary">Loaded content.</p>
  </div>
`;

export const Loading: Story = {
  render: args => ({
    props: args,
    template: `<cmn-async-state [status]="status" [skeletonRows]="skeletonRows">${CONTENT}</cmn-async-state>`,
  }),
  args: {status: 'loading', skeletonRows: 3},
};

export const Error: Story = {
  render: args => ({
    props: args,
    template: `<cmn-async-state [status]="status" [errorMessage]="errorMessage">${CONTENT}</cmn-async-state>`,
  }),
  args: {status: 'error', errorMessage: 'The upstream provider timed out.'},
};

export const ErrorWithoutMessage: Story = {
  render: () => ({
    template: `<cmn-async-state status="error">${CONTENT}</cmn-async-state>`,
  }),
};

export const Empty: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-async-state [status]="status" [isEmpty]="isEmpty" [emptyMessage]="emptyMessage">
        ${CONTENT}
      </cmn-async-state>
    `,
  }),
  args: {status: 'success', isEmpty: true, emptyMessage: 'No transactions this month.'},
};

export const Success: Story = {
  render: () => ({
    template: `<cmn-async-state status="success">${CONTENT}</cmn-async-state>`,
  }),
};

export const Idle: Story = {
  render: () => ({
    template: `<cmn-async-state status="idle">${CONTENT}</cmn-async-state>`,
  }),
};

const ROWS = `
  <cmn-card padding="none">
    <div class="divide-y divide-border-default">
      @for (row of ['Vanguard FTSE All-World', 'Bitcoin', 'Apple Inc.']; track row) {
        <div class="flex items-center gap-cmn-3 px-cmn-4 py-cmn-3">
          <span class="flex h-8 w-8 items-center justify-center rounded-cmn-full bg-accent-subtle text-cmn-xs text-accent-default">{{ row[0] }}</span>
          <div class="flex-1">
            <p class="text-cmn-sm text-text-primary">{{ row }}</p>
            <p class="text-cmn-xs text-text-secondary">Brokerage</p>
          </div>
          <span class="font-mono text-cmn-sm tabular-nums text-text-primary">£1,204.00</span>
        </div>
      }
    </div>
  </cmn-card>
`;

/**
 * A row-shaped placeholder projected into the \`[skeleton]\` slot: avatar, two text lines and a
 * trailing value in a card, so nothing reflows when the rows arrive. Switch \`status\` to
 * \`success\` to compare the two.
 */
export const RowShapedSkeleton: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-async-state [status]="status">
        <cmn-card skeleton padding="none">
          <div class="divide-y divide-border-default">
            @for (_ of [1, 2, 3]; track $index) {
              <div class="flex items-center gap-cmn-3 px-cmn-4 py-cmn-3">
                <cmn-skeleton height="2rem" width="2rem" />
                <div class="flex-1 space-y-cmn-1">
                  <cmn-skeleton height="0.875rem" width="30%" />
                  <cmn-skeleton height="0.75rem" width="20%" />
                </div>
                <cmn-skeleton height="0.875rem" width="4rem" />
              </div>
            }
          </div>
        </cmn-card>
        ${ROWS}
      </cmn-async-state>
    `,
  }),
  args: {status: 'loading'},
};

/** A multi-column table placeholder: one skeleton per column, at the column's width. */
export const ColumnSkeleton: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-async-state [status]="status">
        <cmn-card skeleton>
          <div class="space-y-cmn-3 p-cmn-4">
            @for (_ of [1, 2, 3, 4, 5]; track $index) {
              <div class="flex gap-cmn-4">
                <cmn-skeleton height="1rem" width="15%" />
                <cmn-skeleton height="1rem" width="35%" />
                <cmn-skeleton height="1rem" width="20%" />
                <cmn-skeleton height="1rem" width="15%" />
                <cmn-skeleton height="1rem" width="15%" />
              </div>
            }
          </div>
        </cmn-card>
        ${CONTENT}
      </cmn-async-state>
    `,
  }),
  args: {status: 'loading'},
};

/** A whole-page placeholder with its own height and width per block: a heading and three cards. */
export const CompositeSkeleton: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-async-state [status]="status">
        <div skeleton class="space-y-cmn-5">
          <cmn-skeleton height="2rem" width="40%" />
          <cmn-skeleton height="10rem" />
          <cmn-skeleton height="12rem" />
          <cmn-skeleton height="12rem" />
        </div>
        ${CONTENT}
      </cmn-async-state>
    `,
  }),
  args: {status: 'loading'},
};

/**
 * Per-stat skeletons inside live cards: the cards and their labels stay rendered and only each
 * figure swaps. Give the host \`class="block"\` so the label spacing reaches it.
 */
export const PerStatSkeletons: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="grid grid-cols-2 gap-cmn-4 sm:grid-cols-4">
        @for (stat of [['Income', '£4,210'], ['Spending', '£2,980'], ['Invested', '£600'], ['Saved', '£630']]; track stat[0]) {
          <cmn-card>
            <div class="space-y-cmn-1">
              <span class="block font-label text-cmn-xs font-semibold uppercase tracking-wide text-text-secondary">{{ stat[0] }}</span>
              <cmn-async-state [status]="status" class="block">
                <cmn-skeleton skeleton height="1.5rem" width="70%" />
                <span class="block font-mono text-cmn-2xl font-semibold tabular-nums text-text-primary">{{ stat[1] }}</span>
              </cmn-async-state>
            </div>
          </cmn-card>
        }
      </div>
    `,
  }),
  args: {status: 'loading'},
};

/** An action projected into the \`[error-action]\` slot renders inside the error alert. */
export const ErrorWithRetry: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-async-state [status]="status" [errorMessage]="errorMessage">
        <cmn-button error-action variant="secondary" size="sm">Retry</cmn-button>
        ${CONTENT}
      </cmn-async-state>
    `,
  }),
  args: {status: 'error', errorMessage: 'Could not load your accounts.'},
};

/**
 * \`errorPlacement="above"\` keeps the content (or the empty state) rendered under a persistent
 * banner, so a failed refresh does not throw away what is already on screen.
 */
export const PersistentErrorBanner: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-async-state [status]="status" [errorMessage]="errorMessage" errorPlacement="above">
        <cmn-button error-action variant="secondary" size="sm">Retry</cmn-button>
        ${ROWS}
      </cmn-async-state>
    `,
  }),
  args: {status: 'error', errorMessage: 'Sync failed. Showing the last good data.'},
};

/** A rich empty state projected into the \`[empty]\` slot, with a call to action. */
export const EmptyWithCallToAction: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-async-state [status]="status" [isEmpty]="isEmpty">
        <cmn-empty-state
          empty
          icon="Link"
          message="No accounts connected yet."
          subMessage="Connect a bank, brokerage or exchange to see your balances."
        >
          <cmn-button cta variant="primary" icon="Plus">Connect account</cmn-button>
        </cmn-empty-state>
        ${CONTENT}
      </cmn-async-state>
    `,
  }),
  args: {status: 'success', isEmpty: true},
};
