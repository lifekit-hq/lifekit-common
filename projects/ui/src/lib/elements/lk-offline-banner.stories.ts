/**
 * Angular consumption proof for <lk-offline-banner>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects:false on
 * the package) cannot tree-shake away the module's customElements.define() call.
 */
import {LkOfflineBanner} from '@lifekit-hq/elements';

if (!customElements.get('lk-offline-banner')) {
  customElements.define('lk-offline-banner', LkOfflineBanner);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

interface StoryArgs {
  message: string;
}

const meta: Meta<StoryArgs> = {
  title: 'Elements/LkOfflineBanner',
  tags: ['autodocs'],
  decorators: [moduleMetadata({schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  render: args => ({
    props: {
      ...args,
      goOffline(): void {
        window.dispatchEvent(new Event('offline'));
      },
      goOnline(): void {
        window.dispatchEvent(new Event('online'));
      },
    },
    template: `
      <lk-offline-banner [message]="message"></lk-offline-banner>
      <p style="font-family: sans-serif; font-size: 0.75rem">
        The banner tracks the browser's online state. Simulate a change:
        <button type="button" (click)="goOffline()">Go offline</button>
        <button type="button" (click)="goOnline()">Go online</button>
      </p>
    `,
  }),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {args: {message: ''}};

export const CustomMessage: Story = {
  args: {message: "You're offline. Showing the last loaded view."},
};
