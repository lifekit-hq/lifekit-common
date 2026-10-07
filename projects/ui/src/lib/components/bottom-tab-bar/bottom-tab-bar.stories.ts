import type {Meta, StoryObj} from '@storybook/angular';

import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {BottomTabBarComponent} from './bottom-tab-bar.component';

const UNREAD_ALERTS = 12;

const TABS: NavItem[] = [
  {label: 'Home', icon: 'House', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts', badge: () => UNREAD_ALERTS},
];

const MORE: NavItem = {label: 'More', icon: 'Ellipsis', route: '/more'};

const PHONE = {viewport: {value: 'mobile2', isRotated: false}};

const meta: Meta<BottomTabBarComponent> = {
  title: 'Components/Bottom Tab Bar',
  component: BottomTabBarComponent,
  tags: ['autodocs'],
  parameters: {layout: 'fullscreen'},
  globals: PHONE,
  render: args => ({
    props: args,
    template: `
      <div class="flex h-screen flex-col bg-surface-bg">
        <div class="flex-1 p-cmn-4 text-cmn-sm text-text-secondary">Page content</div>
        <cmn-bottom-tab-bar
          [items]="items"
          [more]="more"
          [activeRoute]="activeRoute"
          [floating]="floating"
        />
      </div>
    `,
  }),
  args: {
    items: TABS,
    more: MORE,
    activeRoute: '/dashboard',
    floating: false,
  },
};

export default meta;
type Story = StoryObj<BottomTabBarComponent>;

/** Four primary tabs plus More, a page the app declares; Alerts carries an unread badge. */
export const Default: Story = {};

export const Dark: Story = {
  globals: {...PHONE, theme: 'dark'},
};

/** The active route is the More page, so the More tab is highlighted. */
export const ActiveMore: Story = {
  args: {activeRoute: '/more'},
};

/** Something behind the More page has a badge: a dot on the More tab. */
export const BadgeInMore: Story = {
  args: {more: {...MORE, badge: () => 2}},
};

/** No More page declared: no More tab. */
export const NoMore: Story = {
  args: {more: undefined},
};

/** `floating`: an inset, translucent pill with the active tab highlighted, as cmn-app-layout's phone overlay uses. */
export const Floating: Story = {
  args: {floating: true},
};

export const FloatingDark: Story = {
  args: {floating: true},
  globals: {...PHONE, theme: 'dark'},
};
