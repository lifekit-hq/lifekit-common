import type {Meta, StoryObj} from '@storybook/angular';

import {AsyncStateComponent} from './async-state.component';

const meta: Meta<AsyncStateComponent> = {
  title: 'Components/Async State',
  component: AsyncStateComponent,
  tags: ['autodocs'],
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
