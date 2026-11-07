import type {Meta, StoryObj} from '@storybook/angular';

import type {ButtonSize, ButtonType, ButtonVariant} from './button.component';
import {ButtonComponent} from './button.component';

interface ButtonStoryArgs {
  variant: ButtonVariant;
  size: ButtonSize;
  type: ButtonType;
  disabled: boolean;
  loading: boolean;
}

const meta: Meta<ButtonStoryArgs> = {
  title: 'Components/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'tertiary',
        'ghost',
        'destructive',
        'danger-tertiary',
        'danger-ghost',
      ],
    },
    size: {control: 'select', options: ['sm', 'md', 'lg']},
    type: {control: 'select', options: ['button', 'submit', 'reset']},
    disabled: {control: 'boolean'},
    loading: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<ButtonStoryArgs>;

export const Primary: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-button [variant]="variant" [size]="size" [disabled]="disabled" [loading]="loading">Primary</cmn-button>',
  }),
  args: {variant: 'primary', size: 'md', disabled: false, loading: false},
};

export const Secondary: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-button variant="secondary" [size]="size" [disabled]="disabled">Secondary</cmn-button>',
  }),
  args: {size: 'md', disabled: false},
};

export const Tertiary: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-button variant="tertiary" [size]="size" [disabled]="disabled">Tertiary</cmn-button>',
  }),
  args: {size: 'md', disabled: false},
};

export const Ghost: Story = {
  render: args => ({
    props: args,
    template: '<cmn-button variant="ghost" [size]="size" [disabled]="disabled">Ghost</cmn-button>',
  }),
  args: {size: 'md', disabled: false},
};

export const DangerTertiary: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-button variant="danger-tertiary" [size]="size" [disabled]="disabled">Remove</cmn-button>',
  }),
  args: {size: 'md', disabled: false},
};

export const DangerGhost: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-button variant="danger-ghost" [size]="size" [disabled]="disabled">Remove</cmn-button>',
  }),
  args: {size: 'md', disabled: false},
};

export const Destructive: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-button variant="destructive" [size]="size" [disabled]="disabled">Delete Account</cmn-button>',
  }),
  args: {size: 'md', disabled: false},
};

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The spinner keeps animating under `prefers-reduced-motion: reduce` so loading feedback stays visible; transitions and decorative animation are suppressed. Verify by enabling "Emulate CSS media feature prefers-reduced-motion" in browser devtools.',
      },
    },
  },
  render: args => ({
    props: args,
    template: '<cmn-button variant="primary" [loading]="loading">Saving...</cmn-button>',
  }),
  args: {loading: true},
};

export const Disabled: Story = {
  render: args => ({
    props: args,
    template: '<cmn-button variant="primary" [disabled]="disabled">Disabled</cmn-button>',
  }),
  args: {disabled: true},
};

export const AllKinds: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-2 flex-wrap">
        <cmn-button variant="primary">Primary</cmn-button>
        <cmn-button variant="secondary">Secondary</cmn-button>
        <cmn-button variant="tertiary">Tertiary</cmn-button>
        <cmn-button variant="ghost">Ghost</cmn-button>
        <cmn-button variant="destructive">Danger</cmn-button>
        <cmn-button variant="danger-tertiary">Danger tertiary</cmn-button>
        <cmn-button variant="danger-ghost">Danger ghost</cmn-button>
      </div>
    `,
  }),
};

export const AllSizes: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-4 flex-wrap">
        <cmn-button variant="primary" size="sm">Small, 32px</cmn-button>
        <cmn-button variant="primary" size="md">Default, 48px</cmn-button>
        <cmn-button variant="primary" size="lg">Large, 64px</cmn-button>
      </div>
    `,
  }),
};
