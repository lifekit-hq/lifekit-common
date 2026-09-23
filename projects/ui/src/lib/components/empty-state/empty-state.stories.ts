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

export const MessageOnly: Story = {
  args: {message: 'Nothing to show'},
};

export const Bare: Story = {
  args: {
    message: 'No results',
    subMessage: 'Try a different search term.',
    icon: 'Search',
    variant: 'bare',
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
