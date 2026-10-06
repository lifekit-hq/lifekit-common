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

const UNREAD_ALERTS = 7;

/** A fuller nav, as an app with more destinations than fit on a phone bar would pass. */
const PHONE_NAV_ITEMS: NavItem[] = [
  {label: 'Home', icon: 'House', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Subscriptions', icon: 'Repeat', route: '/subscriptions'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts', badge: () => UNREAD_ALERTS},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

const PHONE_TAB_ROUTES = ['/dashboard', '/accounts', '/transactions', '/alerts'];

const PHONE = {viewport: {value: 'mobile2', isRotated: false}};

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
        [showThemeToggle]="showThemeToggle"
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [versionLabel]="versionLabel"
        [brand]="brand"
        [tabRoutes]="tabRoutes"
        [phoneOverlay]="phoneOverlay"
        [floatingActionClearance]="floatingActionClearance"
      >${BODY}</cmn-app-layout>
    `,
  }),
  args: {
    navItems: NAV_ITEMS,
    activeRoute: '/dashboard',
    title: 'Dashboard',
    isDark: false,
    showThemeToggle: true,
    avatarLabel: 'D',
    avatarMenuItems: AVATAR_MENU,
    versionLabel: 'v0.3.2',
    brand: 'Lifekit',
    tabRoutes: [],
    phoneOverlay: false,
    floatingActionClearance: 0,
  },
};

export default meta;
type Story = StoryObj<AppLayoutComponent>;

export const Default: Story = {};

/** A different route is active — the sidebar highlight follows `activeRoute`. */
export const DifferentActiveRoute: Story = {
  args: {activeRoute: '/budgets', title: 'Budgets'},
};

/** `brand` replaces the sidebar header text so another app can use the shared shell. */
export const CustomBrand: Story = {
  args: {brand: 'Lifekit Dashboard'},
};

/** The top bar's theme toggle reflects `isDark`. */
export const DarkToggleOn: Story = {
  args: {isDark: true},
};

/** `showThemeToggle: false` removes the top bar's theme toggle (desktop and phone). */
export const NoThemeToggle: Story = {
  args: {showThemeToggle: false},
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

/** Desktop shell in the dark theme. */
export const Dark: Story = {
  args: {isDark: true},
  globals: {theme: 'dark'},
};

/**
 * Below the md breakpoint the sidebar gives way to a bottom tab bar: the four `tabRoutes`
 * as tabs (Alerts with its unread badge) and the rest under More. The top bar compacts to
 * the title, an icon search button, the theme toggle, and the avatar.
 */
export const Phone: Story = {
  args: {navItems: PHONE_NAV_ITEMS, tabRoutes: PHONE_TAB_ROUTES, title: 'Home'},
  globals: PHONE,
};

export const PhoneDark: Story = {
  args: {navItems: PHONE_NAV_ITEMS, tabRoutes: PHONE_TAB_ROUTES, title: 'Home', isDark: true},
  globals: {...PHONE, theme: 'dark'},
};

/** The active page is under More, so the More tab carries the highlight. */
export const PhoneActiveInMore: Story = {
  args: {
    navItems: PHONE_NAV_ITEMS,
    tabRoutes: PHONE_TAB_ROUTES,
    activeRoute: '/budgets',
    title: 'Budgets',
  },
  globals: PHONE,
};

/** Without `tabRoutes` the first four nav items become the tabs. */
export const PhoneDefaultTabs: Story = {
  args: {navItems: PHONE_NAV_ITEMS, title: 'Home'},
  globals: PHONE,
};

/** Full-bleed cards so content showing through the translucent bars is visible. */
const OVERLAY_BODY = `
  <div class="flex flex-col gap-cmn-3 p-cmn-4">
    @for (row of rows; track row) {
      <div class="rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4">
        <p class="font-headline text-cmn-sm font-semibold text-text-primary">Item {{ row }}</p>
        <p class="text-cmn-xs text-accent-default">Scrolls under the top bar and the tab bar</p>
      </div>
    }
    <p class="text-center text-cmn-xs text-text-secondary">Last item clears the tab bar</p>
  </div>
`;

const OVERLAY_ROWS = 30;

/**
 * `phoneOverlay`: an edge-to-edge phone shell like a native app. The top bar and a floating
 * tab bar sit translucent and blurred over main, which scrolls under both; main is padded by
 * the bar heights plus safe-area insets so the first and last items rest clear of the bars.
 * Desktop widths are unchanged.
 */
export const PhoneOverlay: Story = {
  args: {
    navItems: PHONE_NAV_ITEMS,
    tabRoutes: PHONE_TAB_ROUTES,
    title: 'Transactions',
    activeRoute: '/transactions',
    phoneOverlay: true,
  },
  globals: PHONE,
  render: args => ({
    props: {...args, rows: Array.from({length: OVERLAY_ROWS}, (_, i) => i + 1)},
    template: `
      <cmn-app-layout
        [navItems]="navItems"
        [activeRoute]="activeRoute"
        [title]="title"
        [isDark]="isDark"
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [tabRoutes]="tabRoutes"
        [phoneOverlay]="phoneOverlay"
        [floatingActionClearance]="floatingActionClearance"
      >${OVERLAY_BODY}
        @if (floatingActionClearance) {
          <button
            type="button"
            aria-label="Ask Ledger"
            class="fixed bottom-[calc(64px+16px+env(safe-area-inset-bottom)+8px)] left-cmn-4 z-20 flex size-12 items-center justify-center rounded-full bg-accent-default text-cmn-xs text-white shadow-cmn-md md:hidden"
          >Ask</button>
        }
      </cmn-app-layout>
    `,
  }),
};

export const PhoneOverlayDark: Story = {
  ...PhoneOverlay,
  args: {...PhoneOverlay.args, isDark: true},
  globals: {...PHONE, theme: 'dark'},
};

/** `phoneOverlay` at desktop width: identical to the default shell. */
export const PhoneOverlayDesktop: Story = {
  ...PhoneOverlay,
  globals: {},
};

const FAB_CLEARANCE = 56;

/**
 * `floatingActionClearance`: a consumer's floating action button (here a 48px "Ask" launcher
 * 8px above the tab bar, so 56px) is declared to the layout, which reserves that much extra
 * space at the bottom of main. The last item scrolls clear of the button, not under it.
 */
export const PhoneOverlayFloatingAction: Story = {
  ...PhoneOverlay,
  args: {...PhoneOverlay.args, floatingActionClearance: FAB_CLEARANCE},
};

export const PhoneOverlayFloatingActionDark: Story = {
  ...PhoneOverlayFloatingAction,
  args: {...PhoneOverlayFloatingAction.args, isDark: true},
  globals: {...PHONE, theme: 'dark'},
};
