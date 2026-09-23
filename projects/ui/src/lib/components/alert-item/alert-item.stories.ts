import type {Meta, StoryObj} from '@storybook/angular';

import {AlertItemComponent} from './alert-item.component';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const meta: Meta<AlertItemComponent> = {
  title: 'Components/Alert Item',
  component: AlertItemComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<AlertItemComponent>;

export const Unread: Story = {
  args: {
    title: 'Sync failed',
    message: 'Monobank returned 502 on the last three attempts.',
    severity: 'error',
    timestamp: new Date(Date.now() - 5 * MINUTE_MS),
    badgeLabel: 'error',
    referenceLabel: 'JOB-1421',
    description: 'Bank sync',
  },
};

export const Read: Story = {
  args: {
    ...Unread.args,
    isRead: true,
  },
};

export const Severities: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-xl flex-col gap-cmn-3">
        <cmn-alert-item
          title="Sync failed"
          message="Monobank returned 502 on the last three attempts."
          severity="error"
          badgeLabel="error"
        />
        <cmn-alert-item
          title="Budget nearly spent"
          message="Groceries is at 92% with 9 days left in the period."
          severity="warning"
          badgeLabel="warning"
        />
        <cmn-alert-item
          title="Statement ready"
          message="March statement is available for Chase Checking."
          severity="info"
          badgeLabel="info"
        />
      </div>
    `,
  }),
};

export const Ages: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-xl flex-col gap-cmn-3">
        @for (row of rows; track row.title) {
          <cmn-alert-item
            [title]="row.title"
            [message]="row.message"
            [timestamp]="row.timestamp"
            severity="info"
          />
        }
      </div>
    `,
    props: {
      rows: [
        {title: 'Just now', message: 'Under a minute old.', timestamp: new Date()},
        {
          title: 'Minutes',
          message: 'Five minutes old.',
          timestamp: new Date(Date.now() - 5 * MINUTE_MS),
        },
        {
          title: 'Hours',
          message: 'Three hours old.',
          timestamp: new Date(Date.now() - 3 * HOUR_MS),
        },
        {title: 'Days', message: 'Two days old.', timestamp: new Date(Date.now() - 2 * DAY_MS)},
        {title: 'No timestamp', message: 'Renders without a time.', timestamp: null},
      ],
    },
  }),
};

export const NotDismissible: Story = {
  args: {
    title: 'Account locked',
    message: 'Re-authenticate to continue syncing.',
    severity: 'error',
    dismissible: false,
  },
};
