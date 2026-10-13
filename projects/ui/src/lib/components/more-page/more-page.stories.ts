import {provideRouter} from '@angular/router';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {accountMenu, type AppLayoutAccount} from '../app-layout/app-layout.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {MorePageComponent} from './more-page.component';

interface MorePageStoryArgs {
  items: NavItem[];
  tabRoutes: string[];
  account: AppLayoutAccount | undefined;
  versionLabel: string;
}

const UNREAD_ALERTS = 7;

const ITEMS: NavItem[] = [
  {label: 'Home', icon: 'House', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Subscriptions', icon: 'Repeat', route: '/subscriptions'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts', badge: () => UNREAD_ALERTS},
];

const TAB_ROUTES = ['/dashboard', '/accounts', '/transactions', '/budgets'];

const ACCOUNT: AppLayoutAccount = {
  label: 'Ada Lovelace',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  menuItems: accountMenu({
    settingsRoute: '/settings',
    extras: [
      {id: 'whatsNew', label: "What's new", icon: 'Sparkles'},
      {id: 'report', label: 'Report a problem', icon: 'Flag'},
    ],
  }),
};

const PHONE = {viewport: {value: 'mobile2', isRotated: false}};

const meta: Meta<MorePageStoryArgs> = {
  title: 'Components/MorePage',
  component: MorePageComponent,
  tags: ['autodocs'],
  decorators: [applicationConfig({providers: [provideRouter([{path: '**', children: []}])]})],
  parameters: {layout: 'fullscreen'},
  render: args => ({
    props: args,
    template: `
      <div class="min-h-screen bg-surface-bg">
        <cmn-more-page
          [items]="items"
          [tabRoutes]="tabRoutes"
          [account]="account"
          [versionLabel]="versionLabel"
        />
      </div>
    `,
  }),
  args: {items: ITEMS, tabRoutes: TAB_ROUTES, account: ACCOUNT, versionLabel: 'v3.2.0'},
  globals: PHONE,
};

export default meta;
type Story = StoryObj<MorePageStoryArgs>;

/**
 * The phone's More tab: overflow nav (here Subscriptions and Alerts, with its badge), the
 * account card with its identity, Settings and the app's extras, Sign out in a card of its own,
 * and the version. Settings is a link; every other item is reported through `itemSelect`.
 */
export const Default: Story = {};

export const Dark: Story = {globals: {...PHONE, theme: 'dark'}};

/** An account that is only a label and items has no identity row. */
export const NoIdentity: Story = {
  args: {account: {label: 'AL', menuItems: accountMenu({settingsRoute: '/settings'})}},
};

/** An email without a name: the email is the identity's only line. */
export const EmailOnly: Story = {
  args: {account: {...ACCOUNT, name: undefined}},
};

/** Every nav item fits the tab bar, so the nav card is left out. */
export const NoOverflow: Story = {
  args: {items: ITEMS.slice(0, 4)},
};

/** An app with no sign-in: Settings and extras, no Sign out. */
export const WithoutSignOut: Story = {
  args: {
    account: {
      ...ACCOUNT,
      menuItems: accountMenu({settingsRoute: '/settings', signOut: false}),
    },
  },
};

export const Desktop: Story = {globals: {viewport: {value: 'responsive', isRotated: false}}};
