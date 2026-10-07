import type {Meta, StoryObj} from '@storybook/angular';

import type {PageContainerSpacing} from './page-container.component';
import {PageContainerComponent} from './page-container.component';

interface PageContainerStoryArgs {
  maxWidth: string;
  spacing: PageContainerSpacing;
  fill: boolean;
}

const meta: Meta<PageContainerStoryArgs> = {
  title: 'Components/PageContainer',
  component: PageContainerComponent,
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: 'select',
      options: ['none', 'md', 'lg'] satisfies PageContainerSpacing[],
    },
    fill: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<PageContainerStoryArgs>;

export const Default: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-page-container [maxWidth]="maxWidth" [spacing]="spacing" [fill]="fill"><p class="text-text-primary">Page content goes here.</p></cmn-page-container>',
  }),
  args: {maxWidth: 'max-w-[1200px]', spacing: 'md', fill: false},
};

export const NarrowMaxWidth: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-page-container [maxWidth]="maxWidth" [spacing]="spacing" [fill]="fill"><p class="text-text-primary">Narrow page content (e.g. Settings at 900px).</p></cmn-page-container>',
  }),
  args: {maxWidth: 'max-w-[900px]', spacing: 'lg', fill: false},
};

export const WithRealisticContent: Story = {
  render: () => ({
    template: `
      <cmn-page-container>
        <div class="text-text-primary font-headline text-cmn-2xl font-semibold">Subscriptions</div>
        <p class="text-text-secondary text-cmn-sm">Detected recurring charges from your transactions.</p>
        <div class="bg-surface-card rounded-cmn-md border border-border-default p-cmn-4">
          <p class="text-text-secondary">Subscription list would appear here.</p>
        </div>
      </cmn-page-container>
    `,
  }),
};

export const NoSpacing: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-page-container [maxWidth]="maxWidth" [spacing]="spacing" [fill]="fill">
        <p class="text-text-primary">First block, no vertical rhythm added by the container.</p>
        <p class="text-text-primary">Second block sits flush; the page owns its own gaps.</p>
      </cmn-page-container>
    `,
  }),
  args: {maxWidth: 'max-w-[1200px]', spacing: 'none', fill: false},
};

/** `fill` makes the page a full-height flex column; the table takes the remaining height. */
export const Fill: Story = {
  parameters: {layout: 'fullscreen'},
  render: args => ({
    props: args,
    template: `
      <div class="h-[480px]">
        <cmn-page-container [maxWidth]="maxWidth" [spacing]="spacing" [fill]="fill">
          <div class="text-text-primary font-headline text-cmn-2xl font-semibold">Events</div>
          <div class="bg-surface-card rounded-cmn-md border border-border-default p-cmn-4 min-h-0 flex-1 overflow-auto">
            <p class="text-text-secondary">This panel takes the remaining page height.</p>
          </div>
        </cmn-page-container>
      </div>
    `,
  }),
  args: {maxWidth: 'max-w-[1200px]', spacing: 'none', fill: true},
};
