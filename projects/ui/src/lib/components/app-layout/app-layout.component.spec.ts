import {Location} from '@angular/common';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {provideRouter, Router, type Routes} from '@angular/router';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDialogService} from '../../services/dialog/dialog.service';
import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {CmnPageActionsService} from '../../services/page-actions/page-actions.service';
import {ThemeService} from '../../services/theme/theme.service';
import {type CommandPaletteItem} from '../command-palette/command-palette-item.model';
import {type MenuItem} from '../menu/menu.component';
import {AppLayoutComponent, type NavItem, type PageAction} from './app-layout.component';

const NAV_ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
];

const FULL_NAV: NavItem[] = [
  ...NAV_ITEMS,
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

const AVATAR_MENU_ITEMS: MenuItem[] = [
  {id: '/settings', label: 'Settings', icon: 'Settings2'},
  {id: '_logout', label: 'Log out', icon: 'LogOut', destructive: true},
];

@Component({
  selector: 'cmn-test-sheet-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>Sheet</p>',
})
class SheetContentComponent {}

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [provideRouter([{path: '**', children: []}])],
    }).compileComponents();
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('navItems', NAV_ITEMS);
    fixture.componentRef.setInput('activeRoute', '/dashboard');
    fixture.componentRef.setInput('title', 'Dashboard');
    fixture.componentRef.setInput('avatarLabel', 'D');
    fixture.componentRef.setInput('avatarMenuItems', AVATAR_MENU_ITEMS);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should pin the shell to the viewport without viewport units', () => {
    const root = (fixture.nativeElement as HTMLElement).firstElementChild?.classList;
    expect(root).toContain('fixed');
    expect(root).toContain('inset-0');
    expect(root).not.toContain('h-screen');
    expect(root).not.toContain('h-dvh');
  });

  it('should keep overscroll inside main and chrome text unselectable', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('main')?.classList).toContain('overscroll-y-contain');
    for (const chrome of ['cmn-top-bar', 'cmn-sidebar-nav', 'cmn-bottom-tab-bar']) {
      const el = host.querySelector(chrome) as HTMLElement;
      expect(el.classList, chrome).toContain('select-none');
    }
  });

  it('should render the sidebar', () => {
    const sidebar = fixture.debugElement.query(By.css('cmn-sidebar-nav'));
    expect(sidebar).toBeTruthy();
  });

  it('should brand the sidebar as Lifekit by default', () => {
    expect(
      fixture.debugElement.query(By.css('cmn-sidebar-nav')).nativeElement.textContent
    ).toContain('Lifekit');
  });

  it('should pass a custom brand through to the sidebar', () => {
    fixture.componentRef.setInput('brand', 'Acme Console');
    fixture.detectChanges();
    const text: string = fixture.debugElement.query(By.css('cmn-sidebar-nav')).nativeElement
      .textContent;
    expect(text).toContain('Acme Console');
    expect(text).not.toContain('Lifekit');
  });

  it('should render the top bar with title', () => {
    expect(fixture.nativeElement.textContent).toContain('Dashboard');
  });

  it('should emit navClick when a nav item is clicked', () => {
    const emitted: NavItem[] = [];
    fixture.componentInstance.navClick.subscribe(item => emitted.push(item));
    const navButtons = fixture.debugElement.queryAll(By.css('cmn-sidebar-nav button'));
    navButtons[1]?.triggerEventHandler('click', null);
    expect(emitted.length).toBe(1);
  });

  it('should emit themeToggle from top bar', () => {
    const emitted: void[] = [];
    fixture.componentInstance.themeToggle.subscribe(() => emitted.push(undefined));
    const topBarButtons = fixture.debugElement.queryAll(By.css('cmn-top-bar button'));
    const themeBtn = topBarButtons[1];
    themeBtn?.triggerEventHandler('click', null);
    expect(emitted.length).toBe(1);
  });

  describe('phone mode', () => {
    function routes(items: NavItem[]): string[] {
      return items.map(item => item.route);
    }

    it('should render a bottom tab bar alongside the sidebar, each limited by breakpoint', () => {
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('cmn-bottom-tab-bar')?.classList).toContain('md:hidden');
      expect(host.querySelector('cmn-sidebar-nav')?.classList).toContain('md:block');
    });

    it('should use the first four nav items as tabs by default', () => {
      fixture.componentRef.setInput('navItems', FULL_NAV);
      fixture.detectChanges();
      const layout = fixture.componentInstance;
      expect(routes(layout.phoneTabs())).toEqual([
        '/dashboard',
        '/accounts',
        '/transactions',
        '/budgets',
      ]);
    });

    it('should take tabs from tabRoutes in the given order', () => {
      fixture.componentRef.setInput('navItems', FULL_NAV);
      fixture.componentRef.setInput('tabRoutes', [
        '/dashboard',
        '/accounts',
        '/transactions',
        '/alerts',
      ]);
      fixture.detectChanges();
      const layout = fixture.componentInstance;
      expect(routes(layout.phoneTabs())).toEqual([
        '/dashboard',
        '/accounts',
        '/transactions',
        '/alerts',
      ]);
    });

    it('should skip tabRoutes that are not in navItems and cap tabs at four', () => {
      fixture.componentRef.setInput('navItems', FULL_NAV);
      fixture.componentRef.setInput('tabRoutes', [
        '/missing',
        '/settings',
        '/alerts',
        '/budgets',
        '/accounts',
        '/dashboard',
      ]);
      fixture.detectChanges();
      const layout = fixture.componentInstance;
      expect(routes(layout.phoneTabs())).toEqual(['/settings', '/alerts', '/budgets', '/accounts']);
    });

    it('should emit navClick when a bottom tab is pressed', () => {
      const emitted: NavItem[] = [];
      fixture.componentInstance.navClick.subscribe(item => emitted.push(item));
      const tabs = fixture.debugElement.queryAll(By.css('cmn-bottom-tab-bar nav > button'));
      tabs[1]?.triggerEventHandler('click', null);
      expect(emitted).toEqual([NAV_ITEMS[1]]);
    });
  });

  describe('More page', () => {
    const MORE_ROUTE = '/more';
    const UNREAD = 4;

    const tabLabels = (): string[] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('cmn-bottom-tab-bar nav > button')
      ).map(button => button.textContent?.trim() ?? '');

    const moreTab = (): HTMLButtonElement =>
      (fixture.nativeElement as HTMLElement).querySelector(
        'cmn-bottom-tab-bar nav > button:last-child'
      ) as HTMLButtonElement;

    const current = (): (string | null)[] =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('cmn-bottom-tab-bar nav > button')
      ).map(button => button.getAttribute('aria-current'));

    beforeEach(() => {
      localStorage.clear();
      fixture.componentRef.setInput('navItems', [
        ...FULL_NAV.slice(0, 4),
        {label: 'Alerts', icon: 'Bell', route: '/alerts', badge: () => UNREAD},
        FULL_NAV[5],
      ]);
      fixture.componentRef.setInput('tabRoutes', [
        '/dashboard',
        '/accounts',
        '/transactions',
        '/budgets',
      ]);
    });

    it('should not render a More tab until the app declares a More page', () => {
      fixture.detectChanges();
      expect(tabLabels()).toEqual(['Dashboard', 'Accounts', 'Transactions', 'Budgets']);
    });

    it('should end the tab bar with a More tab once moreRoute is set', () => {
      fixture.componentRef.setInput('moreRoute', MORE_ROUTE);
      fixture.detectChanges();
      expect(tabLabels()).toEqual(['Dashboard', 'Accounts', 'Transactions', 'Budgets', 'More']);
    });

    it('should open the More page like any tab and report it through navClick', async () => {
      fixture.componentRef.setInput('moreRoute', MORE_ROUTE);
      fixture.detectChanges();
      const emitted: NavItem[] = [];
      fixture.componentInstance.navClick.subscribe(item => emitted.push(item));

      moreTab().click();
      await fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe(MORE_ROUTE);
      expect(emitted.map(item => item.route)).toEqual([MORE_ROUTE]);
      expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).toBeNull();
    });

    it('should highlight More on the More page and on a nav item that is not a tab', () => {
      fixture.componentRef.setInput('moreRoute', MORE_ROUTE);
      fixture.componentRef.setInput('activeRoute', MORE_ROUTE);
      fixture.detectChanges();
      expect(current()).toEqual([null, null, null, null, 'page']);

      fixture.componentRef.setInput('activeRoute', '/settings');
      fixture.detectChanges();
      expect(current()).toEqual([null, null, null, null, 'page']);

      fixture.componentRef.setInput('activeRoute', '/accounts');
      fixture.detectChanges();
      expect(current()).toEqual([null, 'page', null, null, null]);
    });

    it('should follow the router onto the More page', async () => {
      fixture.componentRef.setInput('moreRoute', MORE_ROUTE);
      fixture.componentRef.setInput('activeRoute', undefined);
      await TestBed.inject(Router).navigateByUrl('/more/profile');
      fixture.detectChanges();
      expect(current()).toEqual([null, null, null, null, 'page']);
    });

    it('should dot the More tab while a nav item behind it has a badge', () => {
      fixture.componentRef.setInput('moreRoute', MORE_ROUTE);
      fixture.detectChanges();
      expect(moreTab().querySelector('.cmn-badge-indicator')).toBeTruthy();

      fixture.componentRef.setInput('navItems', FULL_NAV);
      fixture.detectChanges();
      expect(moreTab().querySelector('.cmn-badge-indicator')).toBeNull();
    });

    it('should leave the sidebar without a More entry', () => {
      fixture.componentRef.setInput('moreRoute', MORE_ROUTE);
      fixture.detectChanges();
      const sidebar = (fixture.nativeElement as HTMLElement).querySelector('cmn-sidebar-nav');
      expect(sidebar?.textContent).not.toContain('More');
    });
  });

  it('should show the theme toggle by default', () => {
    expect(fixture.nativeElement.querySelector('button[aria-label="Toggle theme"]')).toBeTruthy();
  });

  it('should not render the theme toggle when showThemeToggle is false', () => {
    fixture.componentRef.setInput('showThemeToggle', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[aria-label="Toggle theme"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Search"]')).toBeTruthy();
  });

  describe('phone overlay', () => {
    function el(selector: string): HTMLElement {
      return (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;
    }

    it('should keep the bars in flow and main unpadded by default', () => {
      expect(el('cmn-top-bar').className).not.toContain('absolute');
      expect(el('cmn-bottom-tab-bar').className).not.toContain('absolute');
      expect(el('main').className).toBe('flex-1 overflow-y-auto overscroll-y-contain');
      expect(el('cmn-bottom-tab-bar nav').classList).not.toContain('rounded-cmn-full');
    });

    it('should lay both bars over main below md and float the tab bar', () => {
      fixture.componentRef.setInput('phoneOverlay', true);
      fixture.detectChanges();
      expect(el('cmn-top-bar').classList).toContain('max-md:absolute');
      expect(el('cmn-top-bar').classList).toContain('max-md:top-0');
      expect(el('cmn-top-bar header').classList).toContain('max-md:backdrop-blur-md');
      expect(el('cmn-bottom-tab-bar').classList).toContain('max-md:absolute');
      expect(el('cmn-bottom-tab-bar').classList).toContain('max-md:bottom-0');
      // The static breakpoint class survives the class binding.
      expect(el('cmn-bottom-tab-bar').classList).toContain('md:hidden');
      expect(el('cmn-bottom-tab-bar nav').classList).toContain('rounded-cmn-full');
    });

    it('should pad and scroll-pad main by both bar heights plus safe-area insets', () => {
      fixture.componentRef.setInput('phoneOverlay', true);
      fixture.detectChanges();
      const main = el('main').classList;
      expect(main).toContain('max-md:pt-[calc(3.5rem+env(safe-area-inset-top))]');
      expect(main).toContain('max-md:scroll-pt-[calc(3.5rem+env(safe-area-inset-top))]');
      expect(main).toContain(
        'max-md:pb-[calc(64px+16px+env(safe-area-inset-bottom)+var(--cmn-fab-clearance,0px))]'
      );
      expect(main).toContain(
        'max-md:scroll-pb-[calc(64px+16px+env(safe-area-inset-bottom)+var(--cmn-fab-clearance,0px))]'
      );
    });

    it('should reserve no floating action clearance by default', () => {
      fixture.componentRef.setInput('phoneOverlay', true);
      fixture.detectChanges();
      expect(el('main').style.getPropertyValue('--cmn-fab-clearance')).toBe('');
    });

    it('should expose the floating action clearance in px to the bottom padding', () => {
      fixture.componentRef.setInput('phoneOverlay', true);
      fixture.componentRef.setInput('floatingActionClearance', 56);
      fixture.detectChanges();
      expect(el('main').style.getPropertyValue('--cmn-fab-clearance')).toBe('56px');
    });

    it('should ignore the clearance without phoneOverlay or without a tab bar', () => {
      fixture.componentRef.setInput('floatingActionClearance', 56);
      fixture.detectChanges();
      expect(el('main').style.getPropertyValue('--cmn-fab-clearance')).toBe('');
      fixture.componentRef.setInput('phoneOverlay', true);
      fixture.componentRef.setInput('navItems', []);
      fixture.detectChanges();
      expect(el('main').style.getPropertyValue('--cmn-fab-clearance')).toBe('');
    });

    it('should skip the bottom padding when there is no tab bar to clear', () => {
      fixture.componentRef.setInput('navItems', []);
      fixture.componentRef.setInput('phoneOverlay', true);
      fixture.detectChanges();
      expect(el('main').className).toContain('max-md:pt-');
      expect(el('main').className).not.toContain('max-md:pb-');
    });
  });

  describe('notices and floating action slots', () => {
    @Component({
      imports: [AppLayoutComponent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `
        <cmn-app-layout [phoneOverlay]="true" [floatingActionClearance]="56">
          <div cmnAppLayoutNotice class="notice">Offline</div>
          <button cmnAppLayoutFab class="fab" type="button">Ask</button>
          <p>Body</p>
        </cmn-app-layout>
      `,
    })
    class HostComponent {}

    let host: ComponentFixture<HostComponent>;

    function q(selector: string): HTMLElement {
      return (host.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;
    }

    beforeEach(() => {
      host = TestBed.createComponent(HostComponent);
      host.detectChanges();
    });

    it('should render notices inside main, stuck below the top bar', () => {
      const notices = q('main .notice').parentElement as HTMLElement;
      expect(notices.classList).toContain('sticky');
      expect(notices.classList).toContain('top-0');
      expect(notices.className).not.toContain('max-md:top-');
      expect(q('cmn-top-bar').contains(notices)).toBe(false);
      expect(q('cmn-bottom-tab-bar').contains(notices)).toBe(false);
    });

    it('should stick at the top of main without the phone overlay', () => {
      const plain = TestBed.createComponent(AppLayoutComponent);
      plain.detectChanges();
      const classes = (plain.nativeElement as HTMLElement).querySelector('main > div')?.classList;
      expect(classes).toContain('sticky');
      expect(classes).toContain('top-0');
      expect(classes).not.toContain('max-md:top-[calc(3.5rem+env(safe-area-inset-top))]');
    });

    it('should show the floating action while no sheet is open', () => {
      expect((q('.fab').parentElement as HTMLElement).classList).toContain('contents');
    });

    it('should hide the floating action while a bottom sheet is open', () => {
      TestBed.inject(CmnDrawerService).open(SheetContentComponent, {mode: 'sheet'});
      host.detectChanges();
      expect((q('.fab').parentElement as HTMLElement).classList).toContain('hidden');
    });
  });

  describe('shell glue', () => {
    const PALETTE_ITEMS: CommandPaletteItem[] = [
      {id: '/accounts', label: 'Accounts', icon: 'Building2', group: 'Pages'},
      {id: '_theme', label: 'Toggle theme', icon: 'Sun', group: 'Actions'},
      {id: '_logout', label: 'Log out', icon: 'LogOut', group: 'Actions'},
    ];

    const keydown = (init: KeyboardEventInit): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', {cancelable: true, ...init});
      window.dispatchEvent(event);
      return event;
    };

    const stubPalette = (result: unknown): {open: ReturnType<typeof vi.fn>} => {
      const open = vi.fn(() => ({
        afterClosed: () => ({subscribe: (fn: (r: unknown) => void) => fn(result)}),
        close: vi.fn(),
      }));
      vi.spyOn(TestBed.inject(CmnDialogService), 'open').mockImplementation(open as never);
      return {open};
    };

    const topBarText = (): string =>
      (fixture.debugElement.query(By.css('cmn-top-bar')).nativeElement as HTMLElement)
        .textContent ?? '';

    beforeEach(() => {
      localStorage.clear();
    });

    it('should match the active route on segment boundaries, longest first', async () => {
      const items: NavItem[] = [
        {label: 'Budgets', route: '/budgets', icon: 'Zap'},
        {label: 'Recurring', route: '/budgets/recurring', icon: 'Zap'},
      ];
      fixture.componentRef.setInput('activeRoute', undefined);
      fixture.componentRef.setInput('navItems', items);
      const router = TestBed.inject(Router);
      const active = (): string =>
        fixture.debugElement.query(By.css('cmn-sidebar-nav')).componentInstance.activeRoute();
      await router.navigateByUrl('/budgets/recurring/1?tab=a#top');
      fixture.detectChanges();
      expect(active()).toBe('/budgets/recurring');
      await router.navigateByUrl('/budgets-archive');
      fixture.detectChanges();
      expect(active()).toBe('');
      await router.navigateByUrl('/budgets?x=1');
      fixture.detectChanges();
      expect(active()).toBe('/budgets');
    });

    it('should derive the active route from the router when none is passed', async () => {
      fixture.componentRef.setInput('activeRoute', undefined);
      fixture.componentRef.setInput('navItems', NAV_ITEMS);
      await TestBed.inject(Router).navigateByUrl('/accounts/list');
      fixture.detectChanges();
      const sidebar = fixture.debugElement.query(By.css('cmn-sidebar-nav'));
      expect(sidebar.componentInstance.activeRoute()).toBe('/accounts');
    });

    it('should leave the active route empty when no nav item matches the URL', async () => {
      fixture.componentRef.setInput('activeRoute', undefined);
      await TestBed.inject(Router).navigateByUrl('/elsewhere');
      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('cmn-sidebar-nav')).componentInstance.activeRoute()
      ).toBe('');
    });

    it('should prefer an explicit active route over the router', async () => {
      await TestBed.inject(Router).navigateByUrl('/accounts');
      fixture.detectChanges();
      expect(
        fixture.debugElement.query(By.css('cmn-sidebar-nav')).componentInstance.activeRoute()
      ).toBe('/dashboard');
    });

    it('should follow the theme service and toggle it', () => {
      const theme = TestBed.inject(ThemeService);
      theme.setTheme('light');
      const topBar = fixture.debugElement.query(By.css('cmn-top-bar')).componentInstance;
      fixture.detectChanges();
      expect(topBar.isDark()).toBe(false);
      fixture.componentInstance.themeToggle.subscribe(() => undefined);
      topBar.themeToggle.emit();
      fixture.detectChanges();
      expect(theme.getTheme()).toBe('dark');
      expect(topBar.isDark()).toBe(true);
    });

    it('should show the account label and menu, ahead of the legacy inputs', () => {
      fixture.componentRef.setInput('account', {
        label: 'Ada Lovelace',
        menuItems: AVATAR_MENU_ITEMS,
      });
      fixture.detectChanges();
      const topBar = fixture.debugElement.query(By.css('cmn-top-bar')).componentInstance;
      expect(topBar.avatarLabel()).toBe('Ada Lovelace');
      expect(topBar.avatarMenuItems()).toBe(AVATAR_MENU_ITEMS);
      expect(topBarText()).toContain('AL');
    });

    it('should open the palette on Cmd-K and Ctrl-K, preventing the browser default', () => {
      const {open} = stubPalette(undefined);
      fixture.componentRef.setInput('paletteItems', PALETTE_ITEMS);
      fixture.detectChanges();
      expect(keydown({key: 'k', metaKey: true}).defaultPrevented).toBe(true);
      expect(keydown({key: 'K', ctrlKey: true}).defaultPrevented).toBe(true);
      expect(open).toHaveBeenCalledTimes(2);
      expect(open.mock.calls[0]).toEqual([
        expect.anything(),
        expect.objectContaining({data: PALETTE_ITEMS}),
      ]);
    });

    it('should ignore plain k and other shortcuts', () => {
      const {open} = stubPalette(undefined);
      fixture.componentRef.setInput('paletteItems', PALETTE_ITEMS);
      fixture.detectChanges();
      expect(keydown({key: 'k'}).defaultPrevented).toBe(false);
      expect(keydown({key: 'j', metaKey: true}).defaultPrevented).toBe(false);
      expect(open).not.toHaveBeenCalled();
    });

    it('should open the palette from the search button and still emit searchClick', () => {
      const {open} = stubPalette(undefined);
      fixture.componentRef.setInput('paletteItems', PALETTE_ITEMS);
      fixture.detectChanges();
      let searches = 0;
      fixture.componentInstance.searchClick.subscribe(() => searches++);
      fixture.debugElement.query(By.css('cmn-top-bar')).componentInstance.searchClick.emit();
      expect(open).toHaveBeenCalledTimes(1);
      expect(searches).toBe(1);
    });

    it('should navigate when a page entry is chosen', () => {
      stubPalette({type: 'navigate', id: '/accounts'});
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
      fixture.componentRef.setInput('paletteItems', PALETTE_ITEMS);
      fixture.detectChanges();
      keydown({key: 'k', metaKey: true});
      expect(navigate).toHaveBeenCalledWith('/accounts');
    });

    it('should toggle the theme for the built-in theme action', () => {
      stubPalette({type: 'action', id: '_theme'});
      const theme = TestBed.inject(ThemeService);
      theme.setTheme('light');
      fixture.componentRef.setInput('paletteItems', PALETTE_ITEMS);
      fixture.detectChanges();
      keydown({key: 'k', metaKey: true});
      expect(theme.getTheme()).toBe('dark');
    });

    it('should emit other palette actions and nothing when the palette is dismissed', () => {
      const actions: string[] = [];
      fixture.componentInstance.paletteAction.subscribe(id => actions.push(id));
      fixture.componentRef.setInput('paletteItems', PALETTE_ITEMS);
      fixture.detectChanges();
      stubPalette({type: 'action', id: '_logout'});
      keydown({key: 'k', metaKey: true});
      stubPalette(undefined);
      keydown({key: 'k', ctrlKey: true});
      expect(actions).toEqual(['_logout']);
    });

    it('should not stack a second palette while one is open', () => {
      const open = vi.fn(() => ({
        afterClosed: () => ({subscribe: () => undefined}),
        close: vi.fn(),
      }));
      vi.spyOn(TestBed.inject(CmnDialogService), 'open').mockImplementation(open as never);
      fixture.componentRef.setInput('paletteItems', PALETTE_ITEMS);
      fixture.detectChanges();
      keydown({key: 'k', metaKey: true});
      keydown({key: 'k', metaKey: true});
      expect(open).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AppLayoutComponent page chrome', () => {
  const ADD: PageAction = {id: 'add', label: 'Add account', icon: 'Plus'};
  const NEW: PageAction = {id: 'new', label: 'New note', icon: 'Plus', route: 'new'};
  const TALL_CONTENT_PX = 3000;
  const MAIN_HEIGHT_PX = 400;
  const SCROLL_PAST_TITLE_PX = 600;

  const ROUTES: Routes = [
    {path: 'dashboard', children: [], data: {title: 'Dashboard'}},
    {
      path: 'accounts',
      children: [
        {path: '', children: [], data: {title: 'Accounts', actions: [ADD]}},
        {path: ':id', children: [], data: {title: 'Account', parent: '..'}},
      ],
    },
    {path: 'settings', children: []},
    {path: 'settings/profile', children: [], data: {title: 'Profile', parent: '/settings'}},
    {path: 'notes', children: [], data: {title: 'Notes', actions: [NEW]}},
    {path: 'notes/new', children: []},
    {path: 'plain', children: []},
    {path: 'more', children: [], data: {title: 'More'}},
  ];

  let fixture: ComponentFixture<AppLayoutComponent>;
  let router: Router;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const backButton = (): HTMLButtonElement | null =>
    host().querySelector('cmn-top-bar button[aria-label="Back"]');
  const largeTitle = (): HTMLElement | null => host().querySelector('main h1');
  const inlineTitle = (): HTMLElement | null =>
    host().querySelector('cmn-top-bar [data-inline-title]');

  async function go(url: string): Promise<void> {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [provideRouter(ROUTES)],
    }).compileComponents();
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('navItems', NAV_ITEMS);
    fixture.componentRef.setInput('title', 'Shell title');
    fixture.detectChanges();
  });

  it('should keep the layout title and no back on a page that declares nothing', async () => {
    await go('/dashboard');
    await go('/plain');
    expect(host().querySelector('cmn-top-bar h1')?.textContent?.trim()).toBe('Shell title');
    expect(largeTitle()).toBeNull();
    expect(backButton()).toBeNull();
  });

  it('should show the declared title once as the large title, over the layout title', async () => {
    await go('/accounts');
    expect(largeTitle()?.textContent?.trim()).toBe('Accounts');
    expect(host().querySelectorAll('h1').length).toBe(1);
    expect(inlineTitle()?.textContent?.trim()).toBe('Accounts');
    expect(host().textContent).not.toContain('Shell title');
  });

  it('should show no back on a tab root', async () => {
    await go('/accounts');
    await go('/dashboard');
    expect(backButton()).toBeNull();
  });

  it('should treat the More page as a tab root with no back', async () => {
    fixture.componentRef.setInput('moreRoute', '/more');
    await go('/dashboard');
    await go('/more');
    expect(largeTitle()?.textContent?.trim()).toBe('More');
    expect(backButton()).toBeNull();
  });

  it('should show a back on the More page when the app declares no moreRoute', async () => {
    await go('/dashboard');
    await go('/more');
    expect(backButton()).not.toBeNull();
  });

  it('should go back to an absolute parent, even on a deep link', async () => {
    await go('/settings/profile');
    backButton()?.click();
    await fixture.whenStable();
    expect(router.url).toBe('/settings');
  });

  it('should resolve a relative parent from the page route', async () => {
    await go('/accounts/42');
    backButton()?.click();
    await fixture.whenStable();
    expect(router.url).toBe('/accounts');
  });

  it('should go back through history for a child page without a parent', async () => {
    const back = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);
    await go('/dashboard');
    await go('/notes');
    backButton()?.click();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('should show no back on a deep link with no parent and no history', async () => {
    await go('/notes');
    expect(backButton()).toBeNull();
  });

  it('should deliver an action press to the page, the output and its route', async () => {
    const pressed: string[] = [];
    const emitted: string[] = [];
    TestBed.inject(CmnPageActionsService)
      .on('new')
      .subscribe(() => pressed.push('new'));
    fixture.componentInstance.pageAction.subscribe(id => emitted.push(id));
    await go('/notes');
    host().querySelector<HTMLButtonElement>('cmn-top-bar button[aria-label="New note"]')?.click();
    await fixture.whenStable();
    expect(pressed).toEqual(['new']);
    expect(emitted).toEqual(['new']);
    expect(router.url).toBe('/notes/new');
  });

  it('should render only the current page actions', async () => {
    await go('/accounts');
    expect(host().querySelector('button[aria-label="Add account"]')).toBeTruthy();
    await go('/accounts/42');
    expect(host().querySelector('button[aria-label="Add account"]')).toBeNull();
  });

  it('should shrink the large title into the bar once it scrolls away', async () => {
    await go('/accounts');
    const main = host().querySelector('main') as HTMLElement;
    main.style.display = 'block';
    main.style.height = `${MAIN_HEIGHT_PX}px`;
    main.style.overflowY = 'auto';
    const tall = document.createElement('div');
    tall.style.height = `${TALL_CONTENT_PX}px`;
    main.append(tall);
    const settle = async (): Promise<void> => {
      await new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve)))
      );
      fixture.detectChanges();
    };

    await settle();
    expect(inlineTitle()?.classList).toContain('opacity-0');

    main.scrollTop = SCROLL_PAST_TITLE_PX;
    await settle();
    expect(inlineTitle()?.classList).not.toContain('opacity-0');

    main.scrollTop = 0;
    await settle();
    expect(inlineTitle()?.classList).toContain('opacity-0');
  });
});
