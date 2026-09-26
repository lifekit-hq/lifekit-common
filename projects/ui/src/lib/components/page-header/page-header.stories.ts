import type {Meta, StoryObj} from '@storybook/angular';

import {PageHeaderComponent} from './page-header.component';

const meta: Meta<PageHeaderComponent> = {
  title: 'Components/PageHeader',
  component: PageHeaderComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<PageHeaderComponent>;

export const TitleOnly: Story = {
  args: {title: 'Accounts'},
};

export const WithSubtitle: Story = {
  args: {
    title: 'Accounts',
    subtitle: 'Manage your connected bank and brokerage accounts',
  },
};

export const WithAction: Story = {
  args: {
    title: 'Accounts',
    subtitle: 'Manage your connected bank and brokerage accounts',
    actionLabel: 'Connect Account',
    actionIcon: 'Plus',
  },
};

export const ActionLoading: Story = {
  args: {
    title: 'Accounts',
    actionLabel: 'Connecting…',
    actionIcon: 'Plus',
    actionLoading: true,
  },
};

export const ActionDisabled: Story = {
  args: {
    title: 'Accounts',
    actionLabel: 'Connect Account',
    actionIcon: 'Plus',
    actionDisabled: true,
  },
};

export const LongTitle: Story = {
  args: {
    title: 'Quarterly brokerage and bank account reconciliation across every connected institution',
    subtitle: 'Manage your connected bank and brokerage accounts',
    actionLabel: 'Connect Account',
    actionIcon: 'Plus',
  },
};

export const Narrow: Story = {
  args: {
    title: 'Accounts',
    subtitle: 'Manage your connected bank and brokerage accounts',
    actionLabel: 'Connect Account',
    actionIcon: 'Plus',
  },
  render: args => ({
    props: args,
    template: `
      <div style="max-width: 400px">
        <cmn-page-header
          [title]="title"
          [subtitle]="subtitle"
          [actionLabel]="actionLabel"
          [actionIcon]="actionIcon"
        />
      </div>
    `,
  }),
};

export const WithSecondaryAction: Story = {
  args: {
    title: 'Accounts',
    subtitle: 'Manage your connected bank and brokerage accounts',
    actionLabel: 'Connect Account',
    actionIcon: 'Plus',
    secondaryActionLabel: 'Export',
    secondaryActionIcon: 'Download',
  },
};
