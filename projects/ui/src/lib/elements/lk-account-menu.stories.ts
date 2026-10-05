/**
 * Angular consumption proof for <lk-account-menu>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects:false on
 * the package) cannot tree-shake away the module's customElements.define() call.
 */
import {LkAccountMenu} from '@lifekit-hq/elements';

if (!customElements.get('lk-account-menu')) {
  customElements.define('lk-account-menu', LkAccountMenu);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

interface StoryArgs {
  name: string;
  email: string;
  picture: string;
  signOutUrl: string;
}

const meta: Meta<StoryArgs> = {
  title: 'Elements/LkAccountMenu',
  tags: ['autodocs'],
  decorators: [moduleMetadata({schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  args: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    picture: '',
    signOutUrl: '/#signed-out',
  },
  render: args => ({
    props: args,
    template: `
      <div style="display: flex; justify-content: flex-end; min-height: 12rem">
        <lk-account-menu [name]="name" [email]="email" [picture]="picture" [signOutUrl]="signOutUrl"></lk-account-menu>
      </div>
    `,
  }),
  play: async ({canvasElement}) => {
    const menu = canvasElement.querySelector<LkAccountMenu>('lk-account-menu');
    await menu?.updateComplete;
    const link = menu?.shadowRoot?.querySelector('a.sign-out');
    if (link?.textContent?.trim() !== 'Sign out') {
      throw new Error('lk-account-menu did not render the Sign out link');
    }
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Initials: Story = {};

export const WithPicture: Story = {
  args: {
    picture: 'https://placehold.co/64x64/6366f1/6366f1.png',
  },
};

export const EmailOnly: Story = {args: {name: ''}};

export const LongValues: Story = {
  args: {
    name: 'Bartholomew Maximilian Featherstonehaugh-Cholmondeley',
    email: 'bartholomew.featherstonehaugh-cholmondeley@a-very-long-domain.example.com',
  },
};
