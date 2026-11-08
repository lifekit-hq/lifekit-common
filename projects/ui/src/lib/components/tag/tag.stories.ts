import type {Meta, StoryObj} from '@storybook/angular';

import type {TagSize, TagVariant} from './tag.component';
import {TagComponent} from './tag.component';

const meta: Meta<{variant: TagVariant; size: TagSize}> = {
  title: 'Components/Tag',
  component: TagComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info', 'neutral'],
    },
    size: {control: 'select', options: ['md', 'lg']},
  },
};

export default meta;
type Story = StoryObj<{variant: TagVariant; size: TagSize}>;

export const Default: Story = {
  render: args => ({
    props: args,
    template: '<cmn-tag [variant]="variant" [size]="size">Neutral</cmn-tag>',
  }),
  args: {variant: 'neutral', size: 'md'},
};

export const AllVariants: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap gap-2">
        <cmn-tag variant="success">Synced</cmn-tag>
        <cmn-tag variant="error">Error</cmn-tag>
        <cmn-tag variant="warning">Stale</cmn-tag>
        <cmn-tag variant="info">Info</cmn-tag>
        <cmn-tag variant="neutral">Pending</cmn-tag>
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-center gap-2">
        <cmn-tag variant="success" size="md">Synced, 24px</cmn-tag>
        <cmn-tag variant="success" size="lg">Synced, 32px</cmn-tag>
      </div>
    `,
  }),
};
