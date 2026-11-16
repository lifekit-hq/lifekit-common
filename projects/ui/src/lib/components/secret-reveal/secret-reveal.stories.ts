import type {Meta, StoryObj} from '@storybook/angular';
import {componentWrapperDecorator} from '@storybook/angular';

import {SecretRevealComponent} from './secret-reveal.component';

interface SecretRevealStoryArgs {
  secret: string;
  shareable: boolean;
}

const meta: Meta<SecretRevealStoryArgs> = {
  title: 'Components/Secret reveal',
  component: SecretRevealComponent,
  tags: ['autodocs'],
  args: {secret: 'lk_pat_4f9c1a7e02b8d63a5c91e0f7', shareable: false},
};

export default meta;
type Story = StoryObj<SecretRevealStoryArgs>;

/** Inline, as on desktop: sits in the page where the token was created. */
export const Inline: Story = {};

/** The body of a bottom sheet on a phone; the sheet itself is the host's. Share shows where the browser supports it. */
export const Sheet: Story = {
  args: {shareable: true},
  decorators: [
    componentWrapperDecorator(
      story => `<div style="max-width: 390px; padding: 16px">${story}</div>`
    ),
  ],
};
