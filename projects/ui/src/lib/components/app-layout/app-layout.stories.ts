import {BreakpointObserver} from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  type OnDestroy,
  signal,
} from '@angular/core';
import {
  type ChipRowOption,
  LkChipRow,
  LkInfiniteList,
  LkInstallHint,
  LkOfflineBanner,
  LkSegmented,
  LkUpdatePrompt,
} from '@lifekit-hq/elements';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import type {CommandPaletteItem} from '../command-palette/command-palette-item.model';
import {type FilterBarChip, FilterBarComponent} from '../filter-bar/filter-bar.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import type {MenuItem} from '../menu/menu.component';
import {PageContainerComponent} from '../page-container/page-container.component';
import {SegmentedComponent, type SegmentedOption} from '../segmented/segmented.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {
  accountMenu,
  APPEARANCE_PALETTE_ITEMS,
  type AppLayoutAccount,
  AppLayoutComponent,
} from './app-layout.component';

// Imported by name so a bundler cannot tree-shake the customElements.define() calls.
for (const [tag, element] of [
  ['lk-chip-row', LkChipRow],
  ['lk-infinite-list', LkInfiniteList],
  ['lk-install-hint', LkInstallHint],
  ['lk-offline-banner', LkOfflineBanner],
  ['lk-segmented', LkSegmented],
  ['lk-update-prompt', LkUpdatePrompt],
] as const) {
  if (!customElements.get(tag)) {
    customElements.define(tag, element);
  }
}

const FEED_PAGE_SIZE = 8;
const FEED_PAGES = 4;
const FEED_PAGE_DELAY_MS = 40;

/**
 * A store's paging in miniature, for the shell: pages of rows land after a short delay and the
 * last page clears `hasMore`. The first page is shorter than the screen, so the list has to keep
 * asking until it fills.
 */
@Component({
  selector: 'cmn-story-infinite-feed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <lk-infinite-list
      [hasMore]="hasMore()"
      [loading]="loading()"
      (lk-infinite-list-load-more)="load()"
      data-last-content
      data-infinite-list
    >
      <cmn-page-container spacing="md">
        @for (row of rows(); track row) {
          <cmn-list-item-row [label]="'Payment ' + row" sublabel="Card payment">
            <span amount class="text-cmn-sm tabular-nums text-text-primary">-€12.24</span>
          </cmn-list-item-row>
        }
      </cmn-page-container>
    </lk-infinite-list>
  `,
  imports: [ListItemRowComponent, PageContainerComponent],
})
class StoryInfiniteFeedComponent implements OnDestroy {
  private page = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly rows = signal<number[]>([]);
  protected readonly loading = signal(false);
  protected readonly hasMore = signal(true);

  protected load(): void {
    this.loading.set(true);
    this.timer = setTimeout(() => {
      this.page += 1;
      const first = (this.page - 1) * FEED_PAGE_SIZE;
      this.rows.update(rows => [
        ...rows,
        ...Array.from({length: FEED_PAGE_SIZE}, (_, i) => first + i + 1),
      ]);
      this.hasMore.set(this.page < FEED_PAGES);
      this.loading.set(false);
    }, FEED_PAGE_DELAY_MS);
  }

  public ngOnDestroy(): void {
    clearTimeout(this.timer);
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

/** Devices the shell stories are measured at, beside the toolbar's own phone presets. */
const SHELL_VIEWPORTS = {
  phoneLandscape: {name: 'Phone landscape', styles: {width: '844px', height: '390px'}},
  tabletPortrait: {name: 'Tablet portrait', styles: {width: '820px', height: '1180px'}},
  tabletLandscape: {name: 'Tablet landscape', styles: {width: '1180px', height: '820px'}},
};

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
  parameters: {layout: 'fullscreen', viewport: {options: SHELL_VIEWPORTS}},
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
        [accountOnPhone]="accountOnPhone"
        [phoneOverlay]="phoneOverlay"
        [floatingActionClearance]="floatingActionClearance"
      >${BODY}</cmn-app-layout>
    `,
  }),
  args: {
    navItems: NAV_ITEMS,
    activeRoute: '/dashboard',
    title: 'Dashboard',
    showThemeToggle: false,
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

/**
 * The top bar's light/dark toggle is off by default: it can only flip between light and dark, so it
 * can never go back to System. Appearance lives in Settings (`cmn-appearance-settings`) and in the
 * palette. An app that still wants the toggle sets `showThemeToggle` (desktop and phone).
 */
export const WithThemeToggle: Story = {
  args: {showThemeToggle: true},
};

/**
 * Binding `versionClick` makes the sidebar's version footer a button, with `versionDot` marking
 * it while there is something new. Left unbound the footer stays static text.
 */
export const VersionFooterButton: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-app-layout
        [navItems]="navItems"
        [activeRoute]="activeRoute"
        [title]="title"
        [avatarLabel]="avatarLabel"
        [avatarMenuItems]="avatarMenuItems"
        [versionLabel]="versionLabel"
        [versionDot]="true"
        (versionClick)="versionLabel = 'v0.3.2'"
      >${BODY}</cmn-app-layout>
    `,
  }),
  args: {versionLabel: "v0.3.2 · What's new"},
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
 * In the phone shell (under 600px, or a landscape phone) the sidebar gives way to a bottom tab bar: the four `tabRoutes`
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
 * The shell follows the device, not the width alone. A landscape phone (844x390, wider than the
 * 600px medium class) keeps the tab bar because the viewport is short and the pointer coarse.
 * Storybook's viewport cannot make the pointer coarse, so this story pins the device with
 * `PinnedBreakpointObserver`; `e2e/phone` checks the real media queries on an emulated phone.
 */
export const PhoneLandscape: Story = {
  args: {...Phone.args},
  decorators: [
    moduleMetadata({
      providers: [
        {provide: BreakpointObserver, useValue: new PinnedBreakpointObserver('phone-landscape')},
      ],
    }),
  ],
  globals: {viewport: {value: 'phoneLandscape', isRotated: false}},
};

/**
 * The medium window class (600-839px, here a 820px portrait tablet) shows the sidebar as a
 * rail: collapsed to icons, titled by label, with no toggle to widen it.
 */
export const TabletPortraitRail: Story = {
  args: {...Phone.args},
  globals: {viewport: {value: 'tabletPortrait', isRotated: false}},
};

/** The expanded window class (840px and up, here a 1180px landscape tablet) opens the full sidebar. */
export const TabletLandscapeSidebar: Story = {
  args: {...Phone.args},
  globals: {viewport: {value: 'tabletLandscape', isRotated: false}},
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

const LIST_PERIODS: ChipRowOption[] = [
  {value: 'week', label: 'This week'},
  {value: 'month', label: 'This month'},
  {value: 'last-month', label: 'Last month'},
  {value: 'quarter', label: 'Last three months'},
  {value: 'year', label: 'This year'},
];

const LIST_KINDS: SegmentedOption[] = [
  {value: 'all', label: 'All'},
  {value: 'out', label: 'Spending'},
  {value: 'in', label: 'Income'},
  {value: 'move', label: 'Transfers'},
  {value: 'back', label: 'Refunds'},
];

const LIST_APPLIED: FilterBarChip[] = [
  {id: 'category', label: 'Category: Groceries'},
  {id: 'account', label: 'Account: Main current'},
];

const LIST_DAYS = ['Today', 'Yesterday', 'Mon 12 Oct', 'Sun 11 Oct', 'Sat 10 Oct'];
const LIST_ROWS_PER_DAY = 5;

/**
 * A list page as consumers build one: the page component's host is a full-height flex column
 * (`flex h-full flex-col`) holding `cmn-page-container fill`, a filter bar with a quick-filter
 * chip row, a segmented control and day groups in `cmn-list-section`s.
 */
const LIST_PAGE_BODY = `
  <div class="flex h-full flex-col">
    <cmn-page-container spacing="md" fill>
      <cmn-filter-bar [activeCount]="applied.length" [applied]="applied" placeholder="Search transactions">
        <lk-chip-row [options]="periods" [selected]="['month']" cmnFilterBarQuick label="Period"></lk-chip-row>
      </cmn-filter-bar>
      <cmn-segmented [options]="kinds" value="all" label="Kind" />
      @for (day of days; track day) {
        <cmn-list-section [heading]="day">
          <span cmnListSectionAside class="normal-case tabular-nums">-€61.20</span>
          @for (row of rows; track row) {
            <cmn-list-item-row [label]="day + ' payment ' + row" sublabel="Card payment">
              <span amount class="text-cmn-sm tabular-nums text-text-primary">-€12.24</span>
            </cmn-list-item-row>
          }
        </cmn-list-section>
      }
      <p class="text-center text-cmn-xs text-text-secondary" data-last-content>Last item clears the tab bar</p>
    </cmn-page-container>
  </div>
`;

const LIST_PAGE_PROPS = {
  periods: LIST_PERIODS,
  kinds: LIST_KINDS,
  applied: LIST_APPLIED,
  days: LIST_DAYS,
  rows: Array.from({length: LIST_ROWS_PER_DAY}, (_, i) => i + 1),
};

/**
 * A list page inside a full-height page host. main publishes how much the bars cover
 * (`--cmn-content-inset-top` / `-bottom`) and reserves the bottom one after the page, so the last
 * line clears the floating tab bar even though the host caps its own height. Day headings stick
 * flush under the top bar while their rows scroll past.
 */
export const PhoneOverlayListPage: Story = {
  args: {...PhoneOverlay.args},
  globals: PHONE,
  decorators: [
    moduleMetadata({
      imports: [
        FilterBarComponent,
        ListItemRowComponent,
        ListSectionComponent,
        PageContainerComponent,
        SegmentedComponent,
      ],
    }),
  ],
  render: args => ({
    props: {...args, ...LIST_PAGE_PROPS},
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
      >${LIST_PAGE_BODY}</cmn-app-layout>
    `,
  }),
};

/**
 * The list page with notices pinned under the top bar and a floating action: day headings stick
 * under the notices (`--cmn-sticky-top`), and the last line clears the floating action too.
 */
export const PhoneOverlayListPageNotices: Story = {
  ...PhoneOverlayListPage,
  args: {...PhoneOverlay.args, floatingActionClearance: FAB_CLEARANCE},
  play: () => {
    window.dispatchEvent(new Event('offline'));
  },
  render: args => ({
    props: {...args, ...LIST_PAGE_PROPS},
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
      >${LIST_PAGE_BODY}${NOTICES}${NOTICES_FAB}</cmn-app-layout>
    `,
  }),
};

const WIDE_KINDS: SegmentedOption[] = [
  {value: 'all', label: 'All transactions'},
  {value: 'out', label: 'Spending and bills'},
  {value: 'in', label: 'Income and refunds'},
  {value: 'move', label: 'Transfers between accounts'},
];

const SHORT_ROWS = 8;

const STORY_SHELL_PROPS = {
  kinds: LIST_KINDS,
  wideKinds: WIDE_KINDS,
  rows: Array.from({length: SHORT_ROWS}, (_, i) => i + 1),
  days: LIST_DAYS,
};

const STORY_ROW = `
  <cmn-list-item-row [label]="'Payment ' + row" sublabel="Card payment">
    <span amount class="text-cmn-sm tabular-nums text-text-primary">-€12.24</span>
  </cmn-list-item-row>
`;

const AFTER_CONTAINER_BODY = `
  <cmn-page-container spacing="md">
    @for (row of rows; track row) {${STORY_ROW}}
  </cmn-page-container>
  <p class="px-cmn-4 py-cmn-2 text-center text-cmn-xs text-text-secondary" data-last-content>
    Bare content after the page container clears the tab bar
  </p>
`;

const SIBLING_CONTAINERS_BODY = `
  <cmn-page-container spacing="md">
    @for (row of rows; track row) {${STORY_ROW}}
  </cmn-page-container>
  <cmn-page-container spacing="md" data-second-container>
    @for (row of rows; track row) {${STORY_ROW}}
    <p class="text-center text-cmn-xs text-text-secondary" data-last-content>
      The second page container clears the tab bar
    </p>
  </cmn-page-container>
`;

const OVERFLOWING_HOST_BODY = `
  <div class="h-full">
    <div class="flex flex-col gap-cmn-3 p-cmn-4">
      @for (day of days; track day) {
        @for (row of rows; track row) {
          <div class="rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4">
            <p class="text-cmn-sm text-text-primary">{{ day }} item {{ row }}</p>
          </div>
        }
      }
      <p class="text-center text-cmn-xs text-text-secondary" data-last-content>
        Overflow of a full-height host clears the tab bar
      </p>
    </div>
  </div>
`;

const CHAT_HOST_BODY = `
  <div class="relative flex h-full flex-col" data-chat-host>
    <div class="flex min-h-0 flex-1 flex-col gap-cmn-2 overflow-y-auto p-cmn-4" data-chat-log>
      @for (day of days; track day) {
        @for (row of rows; track row) {
          <p class="rounded-cmn-lg bg-surface-card p-cmn-3 text-cmn-sm text-text-primary">
            {{ day }} message {{ row }}
          </p>
        }
      }
    </div>
    <form class="shrink-0 border-t border-border-default p-cmn-3" data-last-content>
      <input aria-label="Message" class="h-11 w-full rounded-cmn-lg border border-border-default bg-surface-card px-cmn-3 text-base" />
    </form>
  </div>
`;

const WIDE_SEGMENTED_BODY = `
  <div class="flex flex-col gap-cmn-4 p-cmn-4">
    <cmn-segmented [options]="wideKinds" value="out" label="Kind" />
    <lk-segmented [options]="wideKinds" value="move" label="Kind"></lk-segmented>
    <p class="text-center text-cmn-xs text-text-secondary" data-last-content>
      Over-long segmented rows scroll inside themselves
    </p>
  </div>
`;

const shellStory = (body: string, summary: string): Story => ({
  args: {...PhoneOverlay.args},
  globals: PHONE,
  parameters: {docs: {description: {story: summary}}},
  decorators: [
    moduleMetadata({imports: [ListItemRowComponent, PageContainerComponent, SegmentedComponent]}),
  ],
  render: args => ({
    props: {...args, ...STORY_SHELL_PROPS},
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
      >${body}</cmn-app-layout>
    `,
  }),
});

/** Bare content after a page container: the shell, not the container, reserves the clearance. */
export const PhoneOverlayContentAfterContainer: Story = shellStory(
  AFTER_CONTAINER_BODY,
  'A paragraph follows a `cmn-page-container`; the last line still rests clear of the tab bar.'
);

/** Two sibling page containers: clearance only after the last, no gap between them. */
export const PhoneOverlaySiblingContainers: Story = shellStory(
  SIBLING_CONTAINERS_BODY,
  'Two top-level page containers: the tab bar clearance follows the second, never the first.'
);

/** A full-height host whose content is taller than main: its overflow still clears the tab bar. */
export const PhoneOverlayOverflowingHost: Story = shellStory(
  OVERFLOWING_HOST_BODY,
  'An `h-full` host with taller content than main: the shell reserves clearance after the overflow.'
);

/** A chat-style host (`relative flex h-full`) fills main's visible height and scrolls inside. */
export const PhoneOverlayChatHost: Story = shellStory(
  CHAT_HOST_BODY,
  'A `relative flex h-full` host with an internal scroller fills the visible height exactly; main does not scroll.'
);

/** Segmented rows whose labels need more than the phone is wide scroll inside themselves. */
export const PhoneOverlayWideSegmented: Story = shellStory(
  WIDE_SEGMENTED_BODY,
  'Over-long `cmn-segmented` and `lk-segmented` rows scroll sideways inside their own box; the page never does.'
);

/**
 * A list that pages itself: `lk-infinite-list` asks for the next page as the end nears, shows
 * skeleton rows while it appends and closes with an end marker that clears the tab bar.
 */
export const PhoneOverlayInfiniteList: Story = {
  ...shellStory(
    '<cmn-story-infinite-feed />',
    'Four pages of rows load as the reader scrolls; the last page ends in an end marker that clears the tab bar.'
  ),
  decorators: [moduleMetadata({imports: [StoryInfiniteFeedComponent]})],
};

const PALETTE_ITEMS: CommandPaletteItem[] = [
  {id: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', group: 'Pages'},
  {id: '/budgets', label: 'Budgets', icon: 'Zap', group: 'Pages'},
  ...APPEARANCE_PALETTE_ITEMS,
];

/**
 * The shell owns its own glue: with no `activeRoute` it follows the router, and with `paletteItems`
 * it opens the command palette from the search button and Cmd/Ctrl-K. The app passes only nav
 * items, a brand and an `account` (label and menu), and spreads `APPEARANCE_PALETTE_ITEMS` into the
 * palette. Try Cmd-K and choose "Appearance: Dark", then "Appearance: System".
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

/** The account every lifekit app shows: identity, then `accountMenu()`'s fixed order. */
const STANDARD_ACCOUNT: AppLayoutAccount = {
  label: 'Ada Lovelace',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  menuItems: accountMenu({
    settingsRoute: '/settings',
    extras: [{id: 'whatsNew', label: "What's new", icon: 'Sparkles'}],
  }),
};

const ACCOUNT_STANDARD_TEMPLATE = `
  <cmn-app-layout
    [navItems]="navItems"
    [title]="title"
    [brand]="brand"
    [tabRoutes]="tabRoutes"
    [moreRoute]="moreRoute"
    [accountOnPhone]="accountOnPhone"
    [account]="account"
    [showThemeToggle]="showThemeToggle"
  >${BODY}</cmn-app-layout>
`;

/**
 * The account standard on a wide window: the avatar opens a menu with the identity header,
 * Settings, the app's extras and, set apart by a divider, Sign out. `accountMenu()` gives every
 * app the same ids, icons and order, and the layout navigates to Settings itself; the app handles
 * `avatarMenuSelect` for Sign out and its extras only. The menu holds no appearance controls.
 */
export const AccountStandard: Story = {
  render: args => ({props: args, template: ACCOUNT_STANDARD_TEMPLATE}),
  args: {
    title: 'Dashboard',
    brand: 'Lifekit',
    account: STANDARD_ACCOUNT,
    showThemeToggle: false,
  },
};

/**
 * On a phone with a More page the account lives there: `accountOnPhone` defaults to `more` when
 * `moreRoute` is set, so the top bar drops its avatar and the app's More page renders
 * `cmn-more-page`. Open the More tab's page in your app; the shell only gives it the tab.
 */
export const AccountStandardPhone: Story = {
  render: args => ({props: args, template: ACCOUNT_STANDARD_TEMPLATE}),
  args: {
    ...AccountStandard.args,
    navItems: PHONE_NAV_ITEMS,
    tabRoutes: PHONE_TAB_ROUTES,
    moreRoute: MORE_ROUTE,
    title: 'Home',
  },
  globals: PHONE,
};

/** `accountOnPhone="avatar"` keeps the avatar and its menu in the phone's top bar. */
export const AccountOnPhoneAvatar: Story = {
  render: args => ({props: args, template: ACCOUNT_STANDARD_TEMPLATE}),
  args: {...AccountStandardPhone.args, accountOnPhone: 'avatar'},
  globals: PHONE,
};
