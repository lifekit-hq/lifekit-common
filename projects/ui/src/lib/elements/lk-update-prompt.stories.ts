/**
 * Angular consumption proof for <lk-update-prompt>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects:false on
 * the package) cannot tree-shake away the module's customElements.define() call.
 */
import {LkUpdatePrompt} from '@lifekit-hq/elements';

if (!customElements.get('lk-update-prompt')) {
  customElements.define('lk-update-prompt', LkUpdatePrompt);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

interface StoryArgs {
  ready: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'Elements/LkUpdatePrompt',
  tags: ['autodocs'],
  decorators: [moduleMetadata({schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  render: args => ({
    props: {
      ...args,
      reloads: 0,
      onReload(): void {
        this['reloads'] += 1;
      },
    },
    template: `
      <lk-update-prompt [ready]="ready" (lk-update-prompt-reload)="onReload()"></lk-update-prompt>
      <p style="font-family: sans-serif; font-size: 0.75rem">Reload requests: {{ reloads }}</p>
    `,
  }),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Ready: Story = {args: {ready: true}};

export const NotReady: Story = {args: {ready: false}};
