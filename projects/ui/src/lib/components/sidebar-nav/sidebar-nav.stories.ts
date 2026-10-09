import type {Meta, StoryObj} from '@storybook/angular';

import {type NavItem, SidebarNavComponent} from './sidebar-nav.component';

const NAV_ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Holdings', icon: 'ChartBar', route: '/holdings'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

const meta: Meta<SidebarNavComponent> = {
  title: 'Components/SidebarNav',
  component: SidebarNavComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<SidebarNavComponent>;

export const Default: Story = {
  args: {items: NAV_ITEMS, activeRoute: '/dashboard'},
};

/** `brand` replaces the default "Lifekit" header text. */
export const CustomBrand: Story = {
  args: {items: NAV_ITEMS, activeRoute: '/dashboard', brand: 'Lifekit Dashboard'},
};

/** Nothing listens to `versionClick`, so the version footer is static text, as it always was. */
export const VersionFooter: Story = {
  args: {items: NAV_ITEMS, activeRoute: '/dashboard', versionLabel: 'v1.15.0'},
};

/** Binding `versionClick` turns the footer into a button; `versionDot` marks it while there is news. */
export const VersionFooterButton: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-sidebar-nav
        [items]="items"
        [activeRoute]="activeRoute"
        [versionLabel]="versionLabel"
        [versionDot]="versionDot"
        (versionClick)="versionDot = false"
      />
    `,
  }),
  args: {
    items: NAV_ITEMS,
    activeRoute: '/dashboard',
    versionLabel: "v1.15.0 · What's new",
    versionDot: true,
  },
};

/** The rail keeps the button: an info icon with the dot, named by the version label. */
export const VersionFooterButtonRail: Story = {
  ...VersionFooterButton,
  render: args => ({
    props: args,
    template: `
      <cmn-sidebar-nav
        [items]="items"
        [activeRoute]="activeRoute"
        [versionLabel]="versionLabel"
        [versionDot]="versionDot"
        [rail]="true"
        (versionClick)="versionDot = false"
      />
    `,
  }),
};

export const ActiveAccounts: Story = {
  args: {items: NAV_ITEMS, activeRoute: '/accounts'},
};

/** Collapsing snaps straight to the rail: the width does not tween. */
export const Collapsed: Story = {
  args: {items: NAV_ITEMS, activeRoute: '/dashboard'},
  play: ({canvasElement}) => {
    canvasElement.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.click();
  },
};
