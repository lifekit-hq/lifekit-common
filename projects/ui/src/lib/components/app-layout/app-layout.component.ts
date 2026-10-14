import {Location} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {createUrlTreeFromSnapshot, NavigationEnd, Router} from '@angular/router';
import {type ThemeMode} from '@lifekit-hq/core/preferences';
import {filter, map} from 'rxjs';

import {isOutputObserved} from '../../chart-click/output-observed';
import {AppearanceService} from '../../services/appearance/appearance.service';
import {CmnDialogService} from '../../services/dialog/dialog.service';
import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {CmnPageActionsService} from '../../services/page-actions/page-actions.service';
import {CmnShellService} from '../../services/shell/shell.service';
import {ThemeService} from '../../services/theme/theme.service';
import {type AccountIdentity} from '../account-avatar/account-avatar.component';
import {BottomTabBarComponent} from '../bottom-tab-bar/bottom-tab-bar.component';
import {CommandPaletteComponent} from '../command-palette/command-palette.component';
import {
  type CommandPaletteItem,
  type PaletteResult,
} from '../command-palette/command-palette-item.model';
import {CmnDialogBareContainerComponent} from '../dialog/dialog-bare-container.component';
import {type MenuItem} from '../menu/menu.component';
import {isRouteMenuItem} from '../menu/route-menu-item';
import {type NavItem, SidebarNavComponent} from '../sidebar-nav/sidebar-nav.component';
import {TopBarComponent, type TopBarLargeTitle} from '../top-bar/top-bar.component';
import {
  type BackTarget,
  leafRoute,
  type PageAction,
  type PageChromeData,
  readPageChrome,
  resolveBack,
} from './page-chrome';
import {overflowNavItems, phoneTabItems} from './phone-tabs';
import {matchTab, ShellNavigationService} from './shell-navigation.service';

export {type NavItem} from '../sidebar-nav/sidebar-nav.component';
export * from './account-menu';
export * from './page-chrome';
export {LAST_TAB_STORAGE_KEY} from './shell-navigation.service';

/**
 * Palette action id the layout handles itself: flips light and dark and pins the result.
 *
 * @deprecated A toggle can never go back to System. Offer `APPEARANCE_PALETTE_ITEMS` instead; this id
 * is still handled so existing palettes keep working.
 */
export const PALETTE_THEME_ACTION = '_theme';

/** Palette action ids the layout handles itself: set the appearance mode, System included. */
export const PALETTE_APPEARANCE_ACTIONS = {
  system: '_theme:system',
  light: '_theme:light',
  dark: '_theme:dark',
} as const;

/**
 * The standard palette entries for appearance: "Appearance: System", "Light" and "Dark". Spread them
 * into `paletteItems`; the layout applies the choice through `AppearanceService`, so the cache and
 * the account are written together (see `docs/APP-SHELL-STANDARD.md`).
 */
export const APPEARANCE_PALETTE_ITEMS: readonly CommandPaletteItem[] = [
  {
    id: PALETTE_APPEARANCE_ACTIONS.system,
    label: 'Appearance: System',
    icon: 'Monitor',
    group: 'Actions',
  },
  {id: PALETTE_APPEARANCE_ACTIONS.light, label: 'Appearance: Light', icon: 'Sun', group: 'Actions'},
  {id: PALETTE_APPEARANCE_ACTIONS.dark, label: 'Appearance: Dark', icon: 'Moon', group: 'Actions'},
];

const APPEARANCE_MODE_BY_ACTION: Readonly<Record<string, ThemeMode>> = {
  [PALETTE_APPEARANCE_ACTIONS.system]: 'system',
  [PALETTE_APPEARANCE_ACTIONS.light]: 'light',
  [PALETTE_APPEARANCE_ACTIONS.dark]: 'dark',
};

/** Where the account lives on a phone: the More page, or the top bar's avatar menu. */
export type AccountOnPhone = 'more' | 'avatar';

/**
 * The signed-in account shown as the top bar avatar and its menu. `name`, `email` and
 * `pictureUrl` put an identity header at the top of the menu (and on the More page); an app that
 * passes only `label` and `menuItems` keeps the menu as it was. Build `menuItems` with
 * `accountMenu()`.
 */
export interface AppLayoutAccount extends AccountIdentity {
  /** Avatar text: initials, a name, or an email; the top bar reduces it to initials. */
  label: string;
  menuItems: MenuItem[];
}

/** The large title lines up with `cmn-page-container`'s default box; the page's own top padding spaces it. */
const LARGE_TITLE_BOX_CLASSES =
  'mx-auto w-full max-w-[1200px] px-cmn-4 pt-cmn-4 md:px-cmn-8 md:pt-cmn-8';

/** Only the phone shell shows the tab bar; the other shells show the sidebar or its rail. */
const PHONE_ONLY_CLASSES = 'hidden';

/** Phone overlay: in the phone shell the bars sit over main instead of in flow. */
const OVERLAY_TOP_BAR_CLASSES = 'absolute inset-x-0 top-0 z-30';
const OVERLAY_TAB_BAR_CLASSES = 'absolute inset-x-0 bottom-0 z-30';
/**
 * Notices (install hint, offline banner, update prompt) pin to the top of main, in flow below
 * the top bar. Sticky offsets are measured from main's content box, which main's overlay
 * padding already shifts below the bar, so top-0 is flush under it on every size.
 */
const NOTICES_BASE_CLASSES = 'sticky top-0 z-20 flex flex-col empty:hidden';
/** Overscroll stops at main: it never chains to the browser (pull-to-refresh, page bounce). */
const MAIN_BASE_CLASSES = 'flex-1 overflow-y-auto overscroll-y-contain';
/**
 * Clears the top bar by its measured cover (`--cmn-content-inset-top`). Scrolling an element into
 * view also clears the pinned notices (`--cmn-sticky-top`).
 */
const MAIN_OVERLAY_TOP_CLASSES =
  'pt-[var(--cmn-content-inset-top,0px)] ' +
  'scroll-pt-[calc(var(--cmn-content-inset-top,0px)+var(--cmn-sticky-top,0px))]';
/**
 * Clears the floating tab bar and floating action by their measured cover
 * (`--cmn-content-inset-bottom`). The padding follows the content frame and the spacer after it
 * (see `publishContentInsets`), so the last row clears the bar whatever the page is made of.
 */
const MAIN_OVERLAY_BOTTOM_CLASSES =
  'pb-[var(--cmn-content-inset-bottom,0px)] scroll-pb-[var(--cmn-content-inset-bottom,0px)]';
/** Breathing room between the last row and the bar or floating action it scrolls clear of. */
const INSET_BREATHING_PX = 8;

/**
 * The CSS custom properties the shell publishes on main (its scroll container), in px. 0 outside
 * the phone overlay, where nothing covers main. Pages read them through `var()` with a 0px fallback.
 */
export const CMN_CONTENT_INSET_PROPERTIES = {
  /** How far the top bar covers main's top edge. */
  top: '--cmn-content-inset-top',
  /** How far the tab bar and the floating action (plus breathing room) cover main's bottom edge. */
  bottom: '--cmn-content-inset-bottom',
  /** Height of the pinned notices: where a content sticky header sticks, below main's top padding. */
  sticky: '--cmn-sticky-top',
} as const;

@Component({
  selector: 'cmn-app-layout',
  imports: [BottomTabBarComponent, SidebarNavComponent, TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ShellNavigationService],
  host: {'(window:keydown)': 'onWindowKeydown($event)'},
  template: `
    <!-- Pinned with fixed/inset-0, not viewport units: h-screen/h-dvh overshoot the real
         viewport in iOS home-screen apps, which scrolls the document -->
    <div class="fixed inset-0 flex overflow-hidden bg-surface-bg">
      <!-- The sidebar, or its rail, outside the phone shell; the phone shell has the bottom tab bar -->
      <cmn-sidebar-nav
        [items]="navItems()"
        [activeRoute]="effectiveActiveRoute()"
        [versionLabel]="versionLabel()"
        [versionDot]="versionDot()"
        [versionClickable]="versionClickable()"
        [brand]="brand()"
        [rail]="shellMode() === 'rail'"
        [class]="sidebarClasses()"
        (navClick)="navClick.emit($event)"
        (collapsedChange)="collapsedChange.emit($event)"
        (versionClick)="versionClick.emit()"
      />
      <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <cmn-top-bar
          [class]="overlay() ? overlayTopBarClasses : ''"
          [overlay]="overlay()"
          [title]="barTitle()"
          [showBack]="back() !== null"
          [actions]="pageActions()"
          [largeTitle]="largeTitleMode()"
          [isDark]="isDark()"
          [showThemeToggle]="showThemeToggle()"
          [avatarLabel]="effectiveAvatarLabel()"
          [avatarMenuItems]="effectiveAvatarMenuItems()"
          [avatarIdentity]="account()"
          [showAvatar]="showAvatar()"
          (searchClick)="onSearchClick()"
          (themeToggle)="onThemeToggle()"
          (avatarMenuSelect)="onAvatarMenuSelect($event)"
          (backClick)="onBack()"
          (actionClick)="onPageAction($event)"
        />
        <!-- In the phone overlay main carries the measured content insets as custom properties -->
        <main #main [class]="mainClass()" [style.--cmn-fab-clearance.px]="fabClearance()">
          <!-- The page's large title, declared in route data; shrinks into the top bar on scroll -->
          @if (largeTitle(); as text) {
            <div [class]="largeTitleBoxClasses">
              <h1
                #largeTitle
                class="font-headline text-cmn-3xl break-words font-semibold text-text-primary"
              >
                {{ text }}
              </h1>
            </div>
          }
          <div #notices [class]="noticesClasses"><ng-content select="[cmnAppLayoutNotice]" /></div>
          <!-- The frame page hosts size against; whatever overflows it gets a spacer in the overlay -->
          <div #page class="h-full"><ng-content /></div>
          <div #pageOverflow aria-hidden="true"></div>
        </main>
        <!-- Hidden while a bottom sheet is open; the slot's own element keeps its fixed position -->
        <div #fab [class]="sheetOpen() ? 'hidden' : 'contents'">
          <ng-content select="[cmnAppLayoutFab]" />
        </div>
        <cmn-bottom-tab-bar
          [items]="phoneTabs()"
          [more]="phoneMore()"
          [activeRoute]="phoneActiveRoute()"
          [floating]="overlay()"
          [class]="tabBarClasses()"
          (navClick)="onTabClick($event)"
        />
      </div>
    </div>
  `,
})
export class AppLayoutComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(CmnDialogService);
  private readonly themeService = inject(ThemeService);
  private readonly appearance = inject(AppearanceService);
  private readonly location = inject(Location);
  private readonly pageActionsService = inject(CmnPageActionsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly shell = inject(ShellNavigationService);
  private readonly shellService = inject(CmnShellService);
  private paletteOpen = false;

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private readonly topBarRef = viewChild.required(TopBarComponent, {read: ElementRef});
  private readonly tabBarRef = viewChild.required(BottomTabBarComponent, {read: ElementRef});
  private readonly noticesRef = viewChild.required<ElementRef<HTMLElement>>('notices');
  private readonly fabRef = viewChild.required<ElementRef<HTMLElement>>('fab');
  private readonly pageRef = viewChild.required<ElementRef<HTMLElement>>('page');
  private readonly pageOverflowRef = viewChild.required<ElementRef<HTMLElement>>('pageOverflow');
  private readonly largeTitleRef = viewChild<ElementRef<HTMLElement>>('largeTitle');
  /** The large title has scrolled under the top bar; set by an IntersectionObserver only. */
  private readonly largeTitleScrolledAway = signal(false);

  private readonly routerUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => event.urlAfterRedirects)
    ),
    {initialValue: this.router.url}
  );
  /** The page being shown (deepest primary route), whose data declares the chrome. */
  private readonly page = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => leafRoute(this.router.routerState.snapshot.root))
    ),
    {initialValue: leafRoute(this.router.routerState.snapshot.root)}
  );
  private readonly theme = toSignal(this.themeService.activeTheme$, {initialValue: 'light'});
  /** Nav items that are not phone tabs: they live behind the More page. */
  private readonly overflowItems = computed<NavItem[]>(() =>
    overflowNavItems(this.navItems(), this.tabRoutes())
  );

  private readonly hasTabBar = computed<boolean>(
    () => this.navItems().length > 0 || this.moreRoute() !== ''
  );

  /** Every route the shell treats as a destination: the nav items and the More page. */
  private readonly destinations = computed<string[]>(() => {
    const more = this.moreRoute();
    const routes = this.navItems().map(({route}) => route);
    return more ? [...routes, more] : routes;
  });

  public readonly navItems = input<NavItem[]>([]);
  /**
   * Route (from `navItems`) shown as active. Left unset, the layout derives it from the router's
   * current URL; set it only to override that.
   */
  public readonly activeRoute = input<string | undefined>(undefined);
  /** Top-bar title for pages that declare none in route data (`data.title` takes precedence). */
  public readonly title = input<string>('');
  /**
   * Renders the top bar's light/dark toggle (both desktop and phone). Off by default: the toggle can
   * only flip between light and dark and pin the result, so it can never go back to System. The
   * override lives in Settings (`cmn-appearance-settings`) and in the palette
   * (`APPEARANCE_PALETTE_ITEMS`).
   */
  public readonly showThemeToggle = input<boolean>(false);
  /**
   * The signed-in account; takes precedence over `avatarLabel` and `avatarMenuItems`. A menu item
   * whose id is an absolute path (the Settings item `accountMenu()` builds) is navigated by the
   * layout itself; `avatarMenuSelect` still reports every selection, so an app handles only
   * Sign out (`ACCOUNT_SIGN_OUT_ID`) and its own extras.
   */
  public readonly account = input<AppLayoutAccount | undefined>(undefined);
  /**
   * Where the account lives in the phone shell. `more`: on the More page (`cmn-more-page`), and
   * the top bar drops its avatar; `avatar`: the avatar and its menu stay in the top bar. Left
   * unset it is `more` when `moreRoute` is set, and `avatar` otherwise: with no More page, or no
   * `account` for it to show (the deprecated `avatarLabel` / `avatarMenuItems` only reach the
   * avatar menu), there is nowhere else to reach the account, so `more` also keeps the avatar.
   * Outside the phone shell the avatar always shows.
   */
  public readonly accountOnPhone = input<AccountOnPhone | undefined>(undefined);
  /** @deprecated Goes once both apps pass `account`; `account` takes precedence. */
  public readonly avatarLabel = input<string>('');
  /** @deprecated Goes once both apps pass `account`; `account` takes precedence. */
  public readonly avatarMenuItems = input<MenuItem[]>([]);
  /**
   * Entries for the command palette, which the layout owns: the search button and Cmd/Ctrl-K
   * open it, choosing a page entry navigates there, and the built-in appearance actions
   * (`APPEARANCE_PALETTE_ITEMS`) set System, Light or Dark.
   */
  public readonly paletteItems = input<CommandPaletteItem[]>([]);
  public readonly versionLabel = input<string>('');
  /** Marks the sidebar's version footer with a dot, e.g. while there is something new to read. */
  public readonly versionDot = input<boolean>(false);
  /** Product name shown in the sidebar header; defaults to "Lifekit". */
  public readonly brand = input<string>('Lifekit');
  /**
   * Routes (from `navItems`) shown as bottom tabs in the phone shell, in this order, at
   * most four. Empty means the first four nav items. Every other nav item is reached from the
   * More page (`moreRoute`).
   */
  public readonly tabRoutes = input<string[]>([]);
  /**
   * The route of the app's own More page. Set, the phone tab bar ends in a "More" tab that opens
   * it like any other tab: a page the app fills (the nav items past the tabs, account items,
   * anything else), with its title and back declared in route data like every page. The tab is
   * active on this route and on any nav item that is not a tab; a dot marks it while one of
   * those items has a badge. Left empty there is no More tab, so nav items past the tabs are not
   * reachable on a phone. The phone shell only: the sidebar never lists it.
   */
  public readonly moreRoute = input<string>('');
  /**
   * Opt-in edge-to-edge phone layout, for PWAs that draw under the status bar: in the phone shell the top
   * bar and a floating tab bar sit translucent over main, which scrolls under both and is padded
   * (including safe-area insets) so nothing is hidden at rest. Only the phone shell (see
   * `CmnShellService`) takes the overlay; the rail and the sidebar are unchanged.
   */
  public readonly phoneOverlay = input<boolean>(false);
  /**
   * Height in px that a consumer's floating action button (e.g. a chat launcher) occupies above
   * the tab bar, including its own gap to the bar. With `phoneOverlay`, main reserves this much
   * extra space at the bottom so the last row scrolls clear of the button instead of under it.
   * 0 (default) reserves nothing; it has no effect outside the phone shell or without `phoneOverlay`,
   * where the button is expected not to overlap content. Project the button into the
   * `[cmnAppLayoutFab]` slot and the layout hides it while a bottom sheet is open. Banners
   * project into `[cmnAppLayoutNotice]`: they render in flow below the top bar, never over it.
   */
  public readonly floatingActionClearance = input<number>(0);

  /**
   * A nav item was pressed. A notification for the sidebar, which leaves navigating to the app;
   * on the phone tab bar the shell also navigates (the tab's last screen, or its root on a
   * re-tap), so an app must not navigate on this event itself or it fights the shell.
   */
  public readonly navClick = output<NavItem>();
  public readonly collapsedChange = output<boolean>();
  /** The sidebar's version footer was pressed. Binding it makes the footer a button; unbound it stays static text. */
  public readonly versionClick = output<void>();
  public readonly searchClick = output<void>();
  public readonly themeToggle = output<void>();
  public readonly avatarMenuSelect = output<MenuItem>();
  /** A palette action entry was chosen (the built-in theme toggle is handled by the layout). */
  public readonly paletteAction = output<string>();
  /**
   * A top-bar action the page declared in `data.actions` was pressed (also delivered to the page
   * through `CmnPageActionsService`).
   */
  public readonly pageAction = output<string>();

  public readonly phoneTabs = computed<NavItem[]>(() =>
    phoneTabItems(this.navItems(), this.tabRoutes())
  );

  /** The More tab, or undefined when the app declares no More page. */
  public readonly phoneMore = computed<NavItem | undefined>(() => {
    const route = this.moreRoute();
    if (!route) {
      return undefined;
    }
    const overflow = this.overflowItems();
    return {
      label: 'More',
      icon: 'Ellipsis',
      route,
      badge: () => overflow.reduce((total, item) => total + (item.badge?.() ?? 0), 0),
    };
  });

  public readonly mainClass = computed<string>(() =>
    this.overlay()
      ? `${MAIN_BASE_CLASSES} ${MAIN_OVERLAY_TOP_CLASSES} ${MAIN_OVERLAY_BOTTOM_CLASSES}`
      : MAIN_BASE_CLASSES
  );

  /** The shell this window and device call for: tab bar, rail or sidebar. */
  protected readonly shellMode = this.shellService.mode;

  /** The phone overlay applies: opted in, and the phone shell is showing. */
  protected readonly overlay = computed<boolean>(
    () => this.phoneOverlay() && this.shellService.isPhone()
  );

  /** What the current page declares in route data, or null when it declares nothing. */
  protected readonly chrome = computed<PageChromeData | null>(() =>
    readPageChrome(this.page().data)
  );

  protected readonly back = computed<BackTarget>(() => {
    const path = this.routerUrl().split(/[?#]/, 1)[0];
    return resolveBack(this.chrome(), {
      isTabRoot: path === this.moreRoute() || this.navItems().some(item => item.route === path),
      hasHistory: !!this.router.lastSuccessfulNavigation()?.previousNavigation,
    });
  });

  protected readonly largeTitle = computed<string>(() => this.chrome()?.title ?? '');

  protected readonly barTitle = computed<string>(() => this.largeTitle() || this.title());

  protected readonly largeTitleMode = computed<TopBarLargeTitle>(() => {
    if (!this.largeTitle()) {
      return 'none';
    }
    return this.largeTitleScrolledAway() ? 'collapsed' : 'visible';
  });

  protected readonly pageActions = computed<PageAction[]>(() => this.chrome()?.actions ?? []);

  protected readonly isDark = computed<boolean>(() => this.theme() === 'dark');

  protected readonly effectiveActiveRoute = computed<string>(() => {
    const explicit = this.activeRoute();
    if (explicit !== undefined) {
      return explicit;
    }
    return matchTab(this.routerUrl(), this.destinations());
  });

  /** What the tab bar highlights: a nav item behind the More page lights the More tab. */
  protected readonly phoneActiveRoute = computed<string>(() => {
    const active = this.effectiveActiveRoute();
    const more = this.moreRoute();
    return more && this.overflowItems().some(item => item.route === active) ? more : active;
  });

  protected readonly effectiveAvatarLabel = computed<string>(
    () => this.account()?.label ?? this.avatarLabel()
  );

  protected readonly effectiveAvatarMenuItems = computed<MenuItem[]>(
    () => this.account()?.menuItems ?? this.avatarMenuItems()
  );

  /** The phone shell shows the account on the More page, so the top bar leaves its avatar out. */
  protected readonly showAvatar = computed<boolean>(() => {
    const onMore =
      (this.accountOnPhone() ?? 'more') === 'more' &&
      this.moreRoute() !== '' &&
      this.account() !== undefined;
    return !(onMore && this.shellService.isPhone());
  });

  protected readonly fabClearance = computed<number | null>(() => {
    const clearance = this.floatingActionClearance();
    return this.overlay() && this.hasTabBar() && clearance > 0 ? clearance : null;
  });

  protected readonly sidebarClasses = computed<string>(() =>
    this.shellService.isPhone() ? PHONE_ONLY_CLASSES : 'block'
  );

  protected readonly tabBarClasses = computed<string>(() => {
    if (!this.shellService.isPhone()) {
      return PHONE_ONLY_CLASSES;
    }
    return this.overlay() ? OVERLAY_TAB_BAR_CLASSES : '';
  });

  protected readonly noticesClasses = NOTICES_BASE_CLASSES;

  protected readonly sheetOpen = inject(CmnDrawerService).sheetOpen;

  protected readonly largeTitleBoxClasses = LARGE_TITLE_BOX_CLASSES;
  protected readonly overlayTopBarClasses = OVERLAY_TOP_BAR_CLASSES;
  protected readonly overlayTabBarClasses = OVERLAY_TAB_BAR_CLASSES;

  constructor() {
    this.shell.connect({
      scroller: () => this.main().nativeElement,
      tabs: () => this.destinations(),
      activeTab: () => this.effectiveActiveRoute(),
    });
    this.publishContentInsets();
    // A plain effect, not afterRenderEffect: the title element exists once its query resolves, the
    // observers report asynchronously, and afterRenderEffect costs every consumer ~1.8 kB of runtime.
    effect(onCleanup => {
      const title = this.largeTitleRef()?.nativeElement;
      if (!title || typeof IntersectionObserver === 'undefined') {
        return;
      }
      const main = this.main().nativeElement;
      let observer: IntersectionObserver | undefined;
      // Rebuilt when main resizes: under the phone overlay the top bar covers main's top padding,
      // so the title counts as gone once it passes under the bar, and that padding is per size.
      const resize = new ResizeObserver(() => {
        observer?.disconnect();
        const covered = parseFloat(getComputedStyle(main).paddingTop) || 0;
        observer = new IntersectionObserver(
          ([entry]) => {
            const rootTop = entry.rootBounds?.top ?? 0;
            this.largeTitleScrolledAway.set(
              !entry.isIntersecting && entry.boundingClientRect.bottom <= rootTop
            );
          },
          {root: main, rootMargin: `-${covered}px 0px 0px 0px`}
        );
        observer.observe(title);
      });
      resize.observe(main);
      onCleanup(() => {
        resize.disconnect();
        observer?.disconnect();
      });
    });
  }

  /**
   * Measures what covers main in the phone overlay and publishes it on main (see
   * `CMN_CONTENT_INSET_PROPERTIES`), so content clears the bars whatever their height: safe-area
   * insets, a taller tab bar, a floating action. Written straight to main's style from the
   * ResizeObserver, which runs before paint, so the first frame is already padded.
   *
   * The page content sits in a frame that is exactly main's content height, which is what an
   * `h-full` page host resolves against. Content longer than the frame overflows it, past any
   * padding on main, so a spacer after the frame is sized to that overflow: main's bottom padding
   * then lands after the last row, whether the content is bare, several siblings, or inside a host
   * that caps its own height.
   */
  private publishContentInsets(): void {
    effect(onCleanup => {
      const main = this.main().nativeElement;
      const page = this.pageRef().nativeElement;
      const pageOverflow = this.pageOverflowRef().nativeElement;
      const clearance = this.fabClearance() ?? 0;
      if (!this.overlay() || typeof ResizeObserver === 'undefined') {
        for (const property of Object.values(CMN_CONTENT_INSET_PROPERTIES)) {
          main.style.removeProperty(property);
        }
        pageOverflow.style.removeProperty('height');
        return;
      }
      const topBar = this.topBarRef().nativeElement as HTMLElement;
      const tabBar = this.tabBarRef().nativeElement as HTMLElement;
      const notices = this.noticesRef().nativeElement;
      const fab = this.fabRef().nativeElement;
      const measure = (): void => {
        const box = main.getBoundingClientRect();
        const bar = topBar.getBoundingClientRect();
        const nav = (tabBar.querySelector('nav') ?? tabBar).getBoundingClientRect();
        const top = bar.height ? Math.max(0, bar.bottom - box.top) : 0;
        // The declared clearance stacks on the tab bar; a measured floating action covers both.
        let bottom = nav.height ? Math.max(0, box.bottom - nav.top) + clearance : 0;
        for (const action of Array.from(fab.children)) {
          const rect = action.getBoundingClientRect();
          if (rect.height) {
            bottom = Math.max(bottom, box.bottom - rect.top);
          }
        }
        const insets = {
          top,
          bottom: bottom > 0 ? bottom + INSET_BREATHING_PX : 0,
          sticky: notices.getBoundingClientRect().height,
        };
        for (const [key, property] of Object.entries(CMN_CONTENT_INSET_PROPERTIES)) {
          main.style.setProperty(property, `${Math.ceil(insets[key as keyof typeof insets])}px`);
        }
        pageOverflow.style.height = `${Math.ceil(Math.max(0, page.scrollHeight - page.clientHeight))}px`;
      };
      const observer = new ResizeObserver(measure);
      const observeAll = (): void => {
        observer.disconnect();
        const targets = [main, topBar, tabBar, notices, ...fab.children, ...page.children];
        for (const target of targets) {
          observer.observe(target, {box: 'border-box'});
        }
      };
      observeAll();
      // Children added or removed anywhere in the page change what overflows the frame, which no
      // resize reports; only the slots' own children are (un)observed.
      const changes = new MutationObserver(records => {
        if (records.some(record => record.target === fab || record.target === page)) {
          observeAll();
        }
        measure();
      });
      changes.observe(fab, {childList: true});
      changes.observe(page, {childList: true, subtree: true});
      onCleanup(() => {
        observer.disconnect();
        changes.disconnect();
      });
    });
  }

  /** The footer is a button only when the app listens; this layout forwards the output either way. */
  protected versionClickable(): boolean {
    return isOutputObserved(this.versionClick);
  }

  protected onWindowKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openPalette();
    }
  }

  protected onSearchClick(): void {
    this.searchClick.emit();
    this.openPalette();
  }

  /**
   * A bottom tab was pressed. `navClick` still reports it, but the shell moves: it reopens the
   * tab's last screen, or on the active tab scrolls to the top and then pops to the tab root.
   */
  protected onTabClick(item: NavItem): void {
    this.navClick.emit(item);
    this.shell.selectTab(item.route);
  }

  protected onBack(): void {
    const back = this.back();
    if (back?.kind === 'parent') {
      this.shell.returnTo(
        this.router.serializeUrl(createUrlTreeFromSnapshot(this.page(), [back.parent]))
      );
    } else if (back?.kind === 'history') {
      this.location.back();
    }
  }

  protected onPageAction(action: PageAction): void {
    if (action.route) {
      this.navigateFromPage(action.route);
    }
    this.pageActionsService.press(action.id);
    this.pageAction.emit(action.id);
  }

  protected onAvatarMenuSelect(item: MenuItem): void {
    if (isRouteMenuItem(item)) {
      void this.router.navigateByUrl(item.id);
    }
    this.avatarMenuSelect.emit(item);
  }

  protected onThemeToggle(): void {
    this.themeToggle.emit();
    this.appearance.toggle();
  }

  private openPalette(): void {
    if (this.paletteOpen) {
      return;
    }
    this.paletteOpen = true;
    const ref = this.dialog.open<PaletteResult | undefined, CommandPaletteItem[]>(
      CommandPaletteComponent,
      {
        data: this.paletteItems(),
        container: CmnDialogBareContainerComponent,
        hasBackdrop: false,
        panelClass: [],
        autoFocus: false,
        disableClose: true,
      }
    );
    this.destroyRef.onDestroy(() => ref.close());
    ref.afterClosed().subscribe(result => {
      this.paletteOpen = false;
      if (result) {
        this.handlePaletteResult(result);
      }
    });
  }

  /** Navigates to an absolute path, or one relative to the current page (`..`). */
  private navigateFromPage(path: string): void {
    void this.router.navigateByUrl(createUrlTreeFromSnapshot(this.page(), [path]));
  }

  private handlePaletteResult(result: PaletteResult): void {
    if (result.type === 'navigate') {
      void this.router.navigateByUrl(result.id);
    } else if (result.id === PALETTE_THEME_ACTION) {
      this.appearance.toggle();
    } else if (Object.hasOwn(APPEARANCE_MODE_BY_ACTION, result.id)) {
      this.appearance.setMode(APPEARANCE_MODE_BY_ACTION[result.id]);
    } else {
      this.paletteAction.emit(result.id);
    }
  }
}
