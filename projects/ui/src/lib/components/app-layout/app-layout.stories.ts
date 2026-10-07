import {ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject} from '@angular/core';
import {LkInstallHint, LkOfflineBanner, LkUpdatePrompt} from '@lifekit-hq/elements';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {CmnDrawerService} from '../../services/drawer/drawer.service';
import type {CommandPaletteItem} from '../command-palette/command-palette-item.model';
import type {MenuItem} from '../menu/menu.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {AppLayoutComponent} from './app-layout.component';

// Imported by name so a bundler cannot tree-shake the customElements.define() calls.
for (const [tag, element] of [
  ['lk-install-hint', LkInstallHint],
  ['lk-offline-banner', LkOfflineBanner],
  ['lk-update-prompt', LkUpdatePrompt],
] as const) {
  if (!customElements.get(tag)) {
    customElements.define(tag, element);
  }
}

@Component({
  selector: 'cmn-story-sheet-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="p-cmn-6 text-cmn-sm text-text-secondary">A bottom sheet is open.</p>',
})
class StorySheetContentComponent {}

/** Opens a bottom sheet from the story, so the FAB slot can be seen hiding behind it. */
@Component({
  selector: 'cmn-story-sheet-launcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<button (click)="open()" type="button" class="cmn-story-open-sheet">Open sheet</button>',
})
class StorySheetLauncherComponent {
  private readonly drawer = inject(CmnDrawerService);

  protected open(): void {
    this.drawer.open(StorySheetContentComponent, {mode: 'sheet', title: 'Sheet'});
  }
}

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

/** The page the app builds for the More tab; the shell only needs its route. */
const MORE_ROUTE = '/more';

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
  decorators: [
    moduleMetadata({
      imports: [StorySheetLauncherComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }),
  ],
  parameters: {layout: 'fullscreen'},
  render: args => ({
    props: args,
    template: `
      <cmn-app-layout
        [navItems]="navItems"
        [activeRoute]="activeRoute"
        [title]="title"
        [showThemeToggle]="showThemeToggle"
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [versionLabel]="versionLabel"
        [brand]="brand"
        [tabRoutes]="tabRoutes"
        [moreRoute]="moreRoute"
        [phoneOverlay]="phoneOverlay"
        [floatingActionClearance]="floatingActionClearance"
      >${BODY}</cmn-app-layout>
    `,
  }),
  args: {
    navItems: NAV_ITEMS,
    activeRoute: '/dashboard',
    title: 'Dashboard',
    showThemeToggle: true,
    avatarLabel: 'D',
    avatarMenuItems: AVATAR_MENU,
    versionLabel: 'v0.3.2',
    brand: 'Lifekit',
    tabRoutes: [],
    moreRoute: '',
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
  globals: {theme: 'dark'},
};

/**
 * Below the md breakpoint the sidebar gives way to a bottom tab bar: the four `tabRoutes`
 * as tabs, then a More tab because the app declares `moreRoute`. More is a page the app builds,
 * not a sheet; the shell only gives it a tab, the active highlight and a dot when a nav item
 * that is not a tab has a badge. The top bar compacts to the title, an icon search button, the
 * theme toggle, and the avatar.
 */
export const Phone: Story = {
  args: {
    navItems: PHONE_NAV_ITEMS,
    tabRoutes: PHONE_TAB_ROUTES,
    moreRoute: MORE_ROUTE,
    title: 'Home',
  },
  globals: PHONE,
};

export const PhoneDark: Story = {
  args: {...Phone.args},
  globals: {...PHONE, theme: 'dark'},
};

/**
 * The active page is not a tab (Budgets), so the More tab carries the highlight. It does the
 * same on the More page itself.
 */
export const PhoneActiveInMore: Story = {
  args: {...Phone.args, activeRoute: '/budgets', title: 'Budgets'},
  globals: PHONE,
};

/** Without `tabRoutes` the first four nav items become the tabs; no `moreRoute`, no More tab. */
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
    moreRoute: MORE_ROUTE,
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
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [tabRoutes]="tabRoutes"
        [moreRoute]="moreRoute"
        [phoneOverlay]="phoneOverlay"
        [floatingActionClearance]="floatingActionClearance"
      >${OVERLAY_BODY}
        @if (floatingActionClearance) {
          <button
            cmnAppLayoutFab
            type="button"
            aria-label="Ask Ledger"
            class="fixed bottom-[calc(64px+16px+env(safe-area-inset-bottom)+8px)] left-cmn-4 z-20 flex size-12 items-center justify-center rounded-full bg-accent-default text-cmn-xs text-text-inverse shadow-cmn-md md:hidden"
          >Ask</button>
        }
      </cmn-app-layout>
    `,
  }),
};

export const PhoneOverlayDark: Story = {
  ...PhoneOverlay,
  args: {...PhoneOverlay.args},
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
  args: {...PhoneOverlayFloatingAction.args},
  globals: {...PHONE, theme: 'dark'},
};

const NOTICES = `
  <lk-offline-banner cmnAppLayoutNotice></lk-offline-banner>
  <lk-update-prompt cmnAppLayoutNotice ready></lk-update-prompt>
`;

const NOTICES_FAB = `
  <button
    cmnAppLayoutFab
    type="button"
    aria-label="Ask Ledger"
    class="fixed bottom-[calc(64px+16px+env(safe-area-inset-bottom)+8px)] left-cmn-4 z-20 flex size-12 items-center justify-center rounded-full bg-accent-default text-cmn-xs text-text-inverse shadow-cmn-md md:hidden"
  >Ask</button>
`;

/**
 * Notices project into `[cmnAppLayoutNotice]`: the offline banner and the update prompt (the
 * install hint goes the same way) render in flow at the top of main, stuck just below the top
 * bar, never over it or the tab bar. Here the device is forced offline so the banner shows.
 */
export const PhoneOverlayNotices: Story = {
  args: {
    ...PhoneOverlay.args,
    floatingActionClearance: FAB_CLEARANCE,
  },
  globals: PHONE,
  play: () => {
    window.dispatchEvent(new Event('offline'));
  },
  render: args => ({
    props: {...args, rows: Array.from({length: OVERLAY_ROWS}, (_, i) => i + 1)},
    template: `
      <cmn-app-layout
        [navItems]="navItems"
        [activeRoute]="activeRoute"
        [title]="title"
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [tabRoutes]="tabRoutes"
        [moreRoute]="moreRoute"
        [phoneOverlay]="phoneOverlay"
        [floatingActionClearance]="floatingActionClearance"
      >${OVERLAY_BODY}${NOTICES}${NOTICES_FAB}</cmn-app-layout>
    `,
  }),
};

export const PhoneOverlayNoticesDark: Story = {
  ...PhoneOverlayNotices,
  globals: {...PHONE, theme: 'dark'},
};

/**
 * A bottom sheet is open: the layout hides the `[cmnAppLayoutFab]` slot until it closes, so the
 * floating button never sits over the sheet's rows.
 */
export const PhoneOverlaySheetOpen: Story = {
  ...PhoneOverlayNotices,
  play: async ({canvasElement}) => {
    window.dispatchEvent(new Event('offline'));
    canvasElement.querySelector<HTMLButtonElement>('.cmn-story-open-sheet')?.click();
  },
  render: args => ({
    props: {...args, rows: Array.from({length: OVERLAY_ROWS}, (_, i) => i + 1)},
    template: `
      <cmn-app-layout
        [navItems]="navItems"
        [activeRoute]="activeRoute"
        [title]="title"
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [tabRoutes]="tabRoutes"
        [moreRoute]="moreRoute"
        [phoneOverlay]="phoneOverlay"
        [floatingActionClearance]="floatingActionClearance"
      ><cmn-story-sheet-launcher />${NOTICES}${NOTICES_FAB}</cmn-app-layout>
    `,
  }),
};

const PALETTE_ITEMS: CommandPaletteItem[] = [
  {id: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', group: 'Pages'},
  {id: '/budgets', label: 'Budgets', icon: 'Zap', group: 'Pages'},
  {id: '_theme', label: 'Toggle theme', icon: 'Sun', group: 'Actions'},
];

/**
 * The shell owns its own glue: with no `activeRoute` it follows the router, the theme toggle drives
 * the theme service, and with `paletteItems` it opens the command palette from the search button
 * and Cmd/Ctrl-K. The app passes only nav items, a brand and an `account` (label and menu). Try
 * the theme toggle and Cmd-K; choosing "Toggle theme" in the palette flips the theme.
 */
export const LibraryManaged: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-app-layout
        [navItems]="navItems"
        [title]="title"
        [brand]="brand"
        [account]="account"
        [paletteItems]="paletteItems"
      >${BODY}</cmn-app-layout>
    `,
  }),
  args: {
    title: 'Dashboard',
    brand: 'Lifekit',
    account: {label: 'Ada Lovelace', menuItems: AVATAR_MENU},
    paletteItems: PALETTE_ITEMS,
  },
};
