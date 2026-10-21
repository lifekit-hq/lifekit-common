import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {EmptyStateComponent} from './empty-state.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'Components/Empty State',
  component: EmptyStateComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [ButtonComponent]})],
};

export default meta;
type Story = StoryObj<EmptyStateComponent>;

export const Card: Story = {
  args: {
    message: 'No accounts connected yet',
    subMessage: 'Connect a bank or exchange to start tracking balances.',
    icon: 'Building2',
    variant: 'card',
  },
};

export const Bare: Story = {
  args: {
    message: 'No results',
    subMessage: 'Try a different search term.',
    icon: 'Search',
    variant: 'bare',
  },
};

export const WithActions: Story = {
  args: {
    message: 'No transactions on Monobank ••4242',
    subMessage: 'Nothing matches this card in October.',
    icon: 'Search',
    actionLabel: 'Clear filter',
    secondaryLabel: 'Show all time',
  },
};

export const LongText: Story = {
  args: {
    message:
      'No transactions match Monobank ••4242, Groceries and Utilities between 1 October and 31 October 2026',
    subMessage:
      'Try removing a category or widening the period, or check that the card has finished syncing with the bank before you filter again.',
    icon: 'Search',
    actionLabel: 'Clear all filters',
    secondaryLabel: 'Show all time',
  },
};

export const WithCallToAction: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-empty-state [message]="message" [subMessage]="subMessage" [icon]="icon">
        <cmn-button cta icon="Plus">Connect an account</cmn-button>
      </cmn-empty-state>
    `,
  }),
  args: {
    message: 'No accounts connected yet',
    subMessage: 'Connect a bank or exchange to start tracking balances.',
    icon: 'Building2',
  },
};

export const TintedIcon: Story = {
  args: {
    message: 'Sync is paused',
    subMessage: 'Resume it from settings when you are ready.',
    icon: 'CirclePause',
    iconClass: 'text-status-warning',
  },
};

/** First use (guardrails S6): nothing exists yet, so say what goes here and how to add it. */
export const FirstUse: Story = {
  args: {
    message: 'No budgets yet',
    subMessage: 'Set a monthly limit for a category to see how much is left.',
    icon: 'Plus',
    kind: 'first-use',
    actionLabel: 'Add a budget',
  },
};

/** No results (guardrails S6): the data exists but the filter hides it, so offer the way back. */
export const NoResults: Story = {
  args: {
    message: 'No transactions match "rent"',
    subMessage: 'Check the spelling or search for a payee instead.',
    icon: 'Search',
    kind: 'no-results',
    actionLabel: 'Clear search',
  },
};

/**
 * Error (guardrails S6): say what failed and offer a retry; never an empty state that hides it.
 * The `error` kind announces the state and tints the icon without an `iconClass`.
 */
export const Error: Story = {
  args: {
    message: 'Transactions did not load',
    subMessage: 'The bank did not answer. Your saved data is unchanged.',
    icon: 'CircleAlert',
    kind: 'error',
    actionLabel: 'Try again',
  },
};
