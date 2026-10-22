import type {Meta, StoryObj} from '@storybook/angular';

import {MenuComponent, type MenuHeader, type MenuItem} from './menu.component';

interface MenuStoryArgs {
  items: MenuItem[];
  header?: MenuHeader;
}

const meta: Meta<MenuStoryArgs> = {
  title: 'Components/Menu',
  component: MenuComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<MenuStoryArgs>;

export const Default: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="flex h-48 items-start justify-end p-cmn-8 bg-surface-bg">
        <cmn-menu
          [items]="items"
          ariaLabel="Account menu"
          triggerClass="h-8 w-8 rounded-cmn-full bg-accent-default text-cmn-xs font-semibold text-text-inverse hover:opacity-90"
        >
          D
        </cmn-menu>
      </div>
    `,
  }),
  args: {
    items: [
      {id: 'settings', label: 'Settings', icon: 'Settings2'},
      {id: 'logout', label: 'Log out', icon: 'LogOut', destructive: true},
    ],
  },
};

/**
 * An identity header (the signed-in account) sits above the items as text, not as an item: it is
 * not focusable and cannot be selected. `separatorBefore` sets Sign out apart from
 * the group above it. `accountMenu()` builds this list for an app.
 */
export const AccountWithIdentity: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="flex h-72 items-start justify-end p-cmn-8 bg-surface-bg">
        <cmn-menu
          [items]="items"
          [header]="header"
          ariaLabel="Account menu"
          triggerClass="h-8 w-8 rounded-cmn-full bg-accent-default text-cmn-xs font-semibold text-text-inverse hover:opacity-90"
        >
          AL
        </cmn-menu>
      </div>
    `,
  }),
  args: {
    header: {title: 'Ada Lovelace', subtitle: 'ada@example.com'},
    items: [
      {id: '/settings', label: 'Settings', icon: 'Settings2'},
      {id: 'whatsNew', label: "What's new", icon: 'Sparkles'},
      {id: '_signOut', label: 'Sign out', icon: 'LogOut', destructive: true, separatorBefore: true},
    ],
  },
};

/** A long name or email truncates inside the menu instead of widening it past the viewport. */
export const LongIdentity: Story = {
  ...AccountWithIdentity,
  args: {
    ...AccountWithIdentity.args,
    header: {
      title: 'Augusta Ada King-Noel, Countess of Lovelace',
      subtitle: 'augusta.ada.king.noel.countess.of.lovelace@analytical-engine.example.com',
    },
  },
};

const ARROW_DOWN_KEY_CODE = 40;

/**
 * Opened from the keyboard: ArrowDown (or Enter, Space) on the trigger opens on the first item,
 * ArrowUp on the last. Inside, the arrow keys, Home and End move, typing a letter jumps to the
 * next item that starts with it, and Escape, Tab or choosing an item closes the menu and puts
 * focus back on the trigger.
 */
export const OpenedFromKeyboard: Story = {
  ...AccountWithIdentity,
  play: async ({canvasElement}) => {
    const trigger = canvasElement.querySelector<HTMLButtonElement>('cmn-menu > button');
    trigger?.focus();
    trigger?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        keyCode: ARROW_DOWN_KEY_CODE,
        bubbles: true,
        cancelable: true,
      })
    );
  },
};
