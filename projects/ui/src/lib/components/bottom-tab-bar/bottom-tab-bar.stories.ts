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

const MORE: NavItem[] = [
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Subscriptions', icon: 'Repeat', route: '/subscriptions'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

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
          [moreItems]="moreItems"
          [activeRoute]="activeRoute"
          [floating]="floating"
        />
      </div>
    `,
  }),
  args: {
    items: TABS,
    moreItems: MORE,
    activeRoute: '/dashboard',
    floating: false,
  },
};

export default meta;
type Story = StoryObj<BottomTabBarComponent>;

/** Four primary tabs plus More; Alerts carries an unread badge. */
export const Default: Story = {};

export const Dark: Story = {
  globals: {...PHONE, theme: 'dark'},
};

/** The active route lives under More, so the More tab is highlighted. */
export const ActiveInMore: Story = {
  args: {activeRoute: '/settings'},
};

/** A sheet item with a badge puts a dot on the More tab. */
export const BadgeInMore: Story = {
  args: {
    moreItems: [{...MORE[0], badge: () => 2}, ...MORE.slice(1)],
  },
};

/** Four destinations or fewer: no More tab. */
export const NoMore: Story = {
  args: {moreItems: []},
};

/** Opens the More sheet on load: the remaining destinations, one tap away. */
export const MoreOpen: Story = {
  play: ({canvasElement}) => {
    canvasElement.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.click();
  },
};

export const MoreOpenDark: Story = {
  ...MoreOpen,
  globals: {...PHONE, theme: 'dark'},
};

/** `floating`: an inset, translucent pill with the active tab highlighted, as cmn-app-layout's phone overlay uses. */
export const Floating: Story = {
  args: {floating: true},
};

export const FloatingDark: Story = {
  args: {floating: true},
  globals: {...PHONE, theme: 'dark'},
};
