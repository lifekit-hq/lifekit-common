import type {Meta, StoryObj} from '@storybook/angular';

import type {MenuItem} from '../menu/menu.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {AppLayoutComponent} from './app-layout.component';

const NAV_ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

const AVATAR_MENU: MenuItem[] = [
  {id: 'profile', label: 'Profile', icon: 'User'},
  {id: 'logout', label: 'Log out', icon: 'LogOut', destructive: true},
];

const BODY = `
  <div class="p-cmn-6">
    <h1 class="mb-cmn-4 font-headline text-cmn-2xl text-text-primary">Page content</h1>
    <p class="text-cmn-sm text-text-secondary">
      Anything projected into <code>cmn-app-layout</code> lands in the scrolling main region.
    </p>
  </div>
`;

const meta: Meta<AppLayoutComponent> = {
  title: 'Components/App Layout',
  component: AppLayoutComponent,
  tags: ['autodocs'],
  parameters: {layout: 'fullscreen'},
  render: args => ({
    props: args,
    template: `
      <cmn-app-layout
        [navItems]="navItems"
        [activeRoute]="activeRoute"
        [title]="title"
        [isDark]="isDark"
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [versionLabel]="versionLabel"
      >${BODY}</cmn-app-layout>
    `,
  }),
  args: {
    navItems: NAV_ITEMS,
    activeRoute: '/dashboard',
    title: 'Dashboard',
    isDark: false,
    avatarLabel: 'D',
    avatarMenuItems: AVATAR_MENU,
    versionLabel: 'v0.3.2',
  },
};

export default meta;
type Story = StoryObj<AppLayoutComponent>;

export const Default: Story = {};

/** A different route is active — the sidebar highlight follows `activeRoute`. */
export const DifferentActiveRoute: Story = {
  args: {activeRoute: '/budgets', title: 'Budgets'},
};

/** The top bar's theme toggle reflects `isDark`. */
export const DarkToggleOn: Story = {
  args: {isDark: true},
};

/** Nothing configured — no nav, no title, no avatar, no version. */
export const Bare: Story = {
  args: {
    navItems: [],
    activeRoute: '',
    title: '',
    avatarLabel: '',
    avatarMenuItems: [],
    versionLabel: '',
  },
};

/** A long body so the main region scrolls under a fixed sidebar and top bar. */
export const ScrollingContent: Story = {
  render: args => ({
    props: {...args, rows: Array.from({length: 60}, (_, i) => i + 1)},
    template: `
      <cmn-app-layout
        [navItems]="navItems"
        [activeRoute]="activeRoute"
        [title]="title"
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [versionLabel]="versionLabel"
      >
        <div class="flex flex-col gap-cmn-2 p-cmn-6">
          @for (row of rows; track row) {
            <p class="text-cmn-sm text-text-secondary">Row {{ row }}</p>
          }
        </div>
      </cmn-app-layout>
    `,
  }),
};
