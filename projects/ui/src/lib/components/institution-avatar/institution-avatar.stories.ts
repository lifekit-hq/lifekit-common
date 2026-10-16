import type {Meta, StoryObj} from '@storybook/angular';

import type {InstitutionAvatarSize} from './institution-avatar.component';
import {InstitutionAvatarComponent} from './institution-avatar.component';

interface Args {
  name: string;
  size: InstitutionAvatarSize;
}

const meta: Meta<Args> = {
  title: 'Components/InstitutionAvatar',
  component: InstitutionAvatarComponent,
  tags: ['autodocs'],
  argTypes: {
    name: {control: 'text'},
    size: {control: 'select', options: ['sm', 'md', 'lg']},
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
  render: args => ({
    props: args,
    template: '<cmn-institution-avatar [name]="name" [size]="size" />',
  }),
  args: {name: 'Wells Fargo', size: 'md'},
};

export const AllSizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-3">
        <cmn-institution-avatar name="Chase Bank" size="sm" />
        <cmn-institution-avatar name="Wells Fargo" size="md" />
        <cmn-institution-avatar name="Vanguard" size="lg" />
      </div>
    `,
  }),
};

export const InstitutionGallery: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-3">
        <cmn-institution-avatar name="Chase Bank" />
        <cmn-institution-avatar name="Wells Fargo" />
        <cmn-institution-avatar name="Vanguard" />
        <cmn-institution-avatar name="Fidelity" />
        <cmn-institution-avatar name="Coinbase" />
        <cmn-institution-avatar name="Kraken" />
      </div>
    `,
  }),
};

export const StatusDots: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-4">
        <cmn-institution-avatar name="Chase Bank" status="success" statusLabel="Synced 2h ago" />
        <cmn-institution-avatar name="Wells Fargo" status="warning" statusLabel="Retrying 2h ago" />
        <cmn-institution-avatar name="Monobank" status="error" statusLabel="Reconnect needed" />
        <cmn-institution-avatar name="Inzhur" status="neutral" statusLabel="Not synced yet" />
        <cmn-institution-avatar name="No Status" />
      </div>
    `,
  }),
};

export const StatusDotAllSizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-4">
        <cmn-institution-avatar name="Chase Bank" size="sm" status="success" statusLabel="Synced" />
        <cmn-institution-avatar name="Wells Fargo" size="md" status="warning" statusLabel="Retrying" />
        <cmn-institution-avatar name="Vanguard" size="lg" status="error" statusLabel="Reconnect needed" />
      </div>
    `,
  }),
};
