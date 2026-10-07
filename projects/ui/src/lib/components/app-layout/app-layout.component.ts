import {Location} from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {createUrlTreeFromSnapshot, NavigationEnd, Router} from '@angular/router';
import {filter, map} from 'rxjs';

import {CmnDialogService} from '../../services/dialog/dialog.service';
import {CmnPageActionsService} from '../../services/page-actions/page-actions.service';
import {ThemeService} from '../../services/theme/theme.service';
import {BottomTabBarComponent, MAX_BOTTOM_TABS} from '../bottom-tab-bar/bottom-tab-bar.component';
import {CommandPaletteComponent} from '../command-palette/command-palette.component';
import {
  type CommandPaletteItem,
  type PaletteResult,
} from '../command-palette/command-palette-item.model';
import {CmnDialogBareContainerComponent} from '../dialog/dialog-bare-container.component';
import {type MenuItem} from '../menu/menu.component';
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

export {type NavItem} from '../sidebar-nav/sidebar-nav.component';
export * from './page-chrome';

/** Palette action id the layout handles itself: toggles the theme. */
export const PALETTE_THEME_ACTION = '_theme';

/** The signed-in account shown as the top bar avatar and its menu. */
export interface AppLayoutAccount {
  /** Avatar text: initials, a name, or an email; the top bar reduces it to initials. */
  label: string;
  menuItems: MenuItem[];
}

/** The large title lines up with `cmn-page-container`'s default box; the page's own top padding spaces it. */
const LARGE_TITLE_BOX_CLASSES =
  'mx-auto w-full max-w-[1200px] px-cmn-4 pt-cmn-4 md:px-cmn-8 md:pt-cmn-8';

/** Phone overlay: the bars sit over main below md instead of in flow. */
const OVERLAY_TOP_BAR_CLASSES = 'max-md:absolute max-md:inset-x-0 max-md:top-0 max-md:z-30';
const OVERLAY_TAB_BAR_CLASSES = 'max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-30';
const MAIN_BASE_CLASSES = 'flex-1 overflow-y-auto';
/** Clears the top bar: its 3.5rem height plus the top safe-area inset. */
const MAIN_OVERLAY_TOP_CLASSES =
  'max-md:pt-[calc(3.5rem+env(safe-area-inset-top))] max-md:scroll-pt-[calc(3.5rem+env(safe-area-inset-top))]';
/**
 * Clears the floating tab bar: its 64px height, the 8px gap under it, the bottom safe-area
 * inset, and 8px of breathing room so the last item scrolls clear of the pill. Adds the
 * consumer's floating action clearance (--cmn-fab-clearance, set on main from
 * `floatingActionClearance`; 0px when none is declared).
 */
const MAIN_OVERLAY_BOTTOM_CLASSES =
  'max-md:pb-[calc(64px+16px+env(safe-area-inset-bottom)+var(--cmn-fab-clearance,0px))] ' +
  'max-md:scroll-pb-[calc(64px+16px+env(safe-area-inset-bottom)+var(--cmn-fab-clearance,0px))]';

@Component({
  selector: 'cmn-app-layout',
  imports: [BottomTabBarComponent, SidebarNavComponent, TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'(window:keydown)': 'onWindowKeydown($event)'},
  template: `
    <!-- Pinned with fixed/inset-0, not viewport units: h-screen/h-dvh overshoot the real
         viewport in iOS home-screen apps, which scrolls the document -->
    <div class="fixed inset-0 flex overflow-hidden bg-surface-bg">
      <!-- Sidebar from md up; below md the bottom tab bar takes over -->
      <cmn-sidebar-nav
        [items]="navItems()"
        [activeRoute]="effectiveActiveRoute()"
        [versionLabel]="versionLabel()"
        [brand]="brand()"
        (navClick)="navClick.emit($event)"
        (collapsedChange)="collapsedChange.emit($event)"
        class="hidden md:block"
      />
      <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <cmn-top-bar
          [class]="phoneOverlay() ? overlayTopBarClasses : ''"
          [overlay]="phoneOverlay()"
          [title]="barTitle()"
          [showBack]="back() !== null"
          [actions]="pageActions()"
          [largeTitle]="largeTitleMode()"
          [isDark]="isDark()"
          [showThemeToggle]="showThemeToggle()"
          [avatarLabel]="effectiveAvatarLabel()"
          [avatarMenuItems]="effectiveAvatarMenuItems()"
          (searchClick)="onSearchClick()"
          (themeToggle)="onThemeToggle()"
          (avatarMenuSelect)="avatarMenuSelect.emit($event)"
          (backClick)="onBack()"
          (actionClick)="onPageAction($event)"
        />
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
          <ng-content />
        </main>
        <cmn-bottom-tab-bar
          [items]="phoneTabs()"
          [moreItems]="phoneMoreItems()"
          [activeRoute]="effectiveActiveRoute()"
          [floating]="phoneOverlay()"
          [class]="phoneOverlay() ? overlayTabBarClasses : ''"
          (navClick)="navClick.emit($event)"
          class="md:hidden"
        />
      </div>
    </div>
  `,
})
export class AppLayoutComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(CmnDialogService);
  private readonly themeService = inject(ThemeService);
  private readonly location = inject(Location);
  private readonly pageActionsService = inject(CmnPageActionsService);
  private readonly destroyRef = inject(DestroyRef);
  private paletteOpen = false;

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
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

  public readonly navItems = input<NavItem[]>([]);
  /**
   * Route (from `navItems`) shown as active. Left unset, the layout derives it from the router's
   * current URL; set it only to override that.
   */
  public readonly activeRoute = input<string | undefined>(undefined);
  /** Top-bar title for pages that declare none in route data (`data.title` takes precedence). */
  public readonly title = input<string>('');
  /** Renders the top bar's theme toggle (both desktop and phone); false removes it. */
  public readonly showThemeToggle = input<boolean>(true);
  /** The signed-in account; takes precedence over `avatarLabel` and `avatarMenuItems`. */
  public readonly account = input<AppLayoutAccount | undefined>(undefined);
  /** @deprecated Goes once both apps pass `account`; `account` takes precedence. */
  public readonly avatarLabel = input<string>('');
  /** @deprecated Goes once both apps pass `account`; `account` takes precedence. */
  public readonly avatarMenuItems = input<MenuItem[]>([]);
  /**
   * Entries for the command palette, which the layout owns: the search button and Cmd/Ctrl-K
   * open it, choosing a page entry navigates there, and the built-in theme action toggles the
   * theme.
   */
  public readonly paletteItems = input<CommandPaletteItem[]>([]);
  public readonly versionLabel = input<string>('');
  /** Product name shown in the sidebar header; defaults to "Lifekit". */
  public readonly brand = input<string>('Lifekit');
  /**
   * Routes (from `navItems`) shown as bottom tabs below the md breakpoint, in this order, at
   * most four. Empty means the first four nav items. Every other nav item goes under "More".
   */
  public readonly tabRoutes = input<string[]>([]);
  /**
   * Opt-in edge-to-edge phone layout, for PWAs that draw under the status bar: below md the top
   * bar and a floating tab bar sit translucent over main, which scrolls under both and is padded
   * (including safe-area insets) so nothing is hidden at rest. Desktop is unchanged.
   */
  public readonly phoneOverlay = input<boolean>(false);
  /**
   * Height in px that a consumer's floating action button (e.g. a chat launcher) occupies above
   * the tab bar, including its own gap to the bar. With `phoneOverlay`, main reserves this much
   * extra space at the bottom so the last row scrolls clear of the button instead of under it.
   * 0 (default) reserves nothing; it has no effect at md and up or without `phoneOverlay`,
   * where the button is expected not to overlap content.
   */
  public readonly floatingActionClearance = input<number>(0);

  public readonly navClick = output<NavItem>();
  public readonly collapsedChange = output<boolean>();
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

  public readonly phoneTabs = computed<NavItem[]>(() => {
    const items = this.navItems();
    const routes = this.tabRoutes();
    const tabs = routes.length
      ? routes.flatMap(route => items.filter(item => item.route === route))
      : items;
    return tabs.slice(0, MAX_BOTTOM_TABS);
  });

  public readonly phoneMoreItems = computed<NavItem[]>(() => {
    const tabs = this.phoneTabs();
    return this.navItems().filter(item => !tabs.includes(item));
  });

  public readonly mainClass = computed<string>(() => {
    if (!this.phoneOverlay()) {
      return MAIN_BASE_CLASSES;
    }
    // The tab bar renders nothing without destinations, so there is nothing to clear below.
    const bottom = this.navItems().length ? ` ${MAIN_OVERLAY_BOTTOM_CLASSES}` : '';
    return `${MAIN_BASE_CLASSES} ${MAIN_OVERLAY_TOP_CLASSES}${bottom}`;
  });

  /** What the current page declares in route data, or null when it declares nothing. */
  protected readonly chrome = computed<PageChromeData | null>(() =>
    readPageChrome(this.page().data)
  );

  protected readonly back = computed<BackTarget>(() => {
    const path = this.routerUrl().split(/[?#]/, 1)[0];
    return resolveBack(this.chrome(), {
      isTabRoot: this.navItems().some(item => item.route === path),
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
    const path = this.routerUrl().split(/[?#]/, 1)[0];
    return this.navItems().reduce(
      (best, {route}) =>
        (path === route || path.startsWith(`${route}/`)) && route.length > best.length
          ? route
          : best,
      ''
    );
  });

  protected readonly effectiveAvatarLabel = computed<string>(
    () => this.account()?.label ?? this.avatarLabel()
  );

  protected readonly effectiveAvatarMenuItems = computed<MenuItem[]>(
    () => this.account()?.menuItems ?? this.avatarMenuItems()
  );

  protected readonly fabClearance = computed<number | null>(() => {
    const clearance = this.floatingActionClearance();
    return this.phoneOverlay() && this.navItems().length && clearance > 0 ? clearance : null;
  });

  protected readonly largeTitleBoxClasses = LARGE_TITLE_BOX_CLASSES;
  protected readonly overlayTopBarClasses = OVERLAY_TOP_BAR_CLASSES;
  protected readonly overlayTabBarClasses = OVERLAY_TAB_BAR_CLASSES;

  constructor() {
    afterRenderEffect(onCleanup => {
      const title = this.largeTitleRef()?.nativeElement;
      const main = this.main().nativeElement;
      if (!title || typeof IntersectionObserver === 'undefined') {
        return;
      }
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

  protected onBack(): void {
    const back = this.back();
    if (back?.kind === 'parent') {
      this.navigateFromPage(back.parent);
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

  protected onThemeToggle(): void {
    this.themeToggle.emit();
    this.themeService.toggle();
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
      this.themeService.toggle();
    } else {
      this.paletteAction.emit(result.id);
    }
  }
}
