import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {beforeEach, describe, expect, it} from 'vitest';

import {type MenuItem} from '../menu/menu.component';
import {AppLayoutComponent, type NavItem} from './app-layout.component';

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

describe('AppLayoutComponent', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
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

  it('should render the sidebar', () => {
    const sidebar = fixture.debugElement.query(By.css('cmn-sidebar-nav'));
    expect(sidebar).toBeTruthy();
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
      expect(routes(layout.phoneMoreItems())).toEqual(['/alerts', '/settings']);
    });

    it('should take tabs from tabRoutes in the given order and put the rest under More', () => {
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
      expect(routes(layout.phoneMoreItems())).toEqual(['/budgets', '/settings']);
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
      expect(routes(layout.phoneMoreItems())).toEqual(['/dashboard', '/transactions']);
    });

    it('should emit navClick when a bottom tab is pressed', () => {
      const emitted: NavItem[] = [];
      fixture.componentInstance.navClick.subscribe(item => emitted.push(item));
      const tabs = fixture.debugElement.queryAll(By.css('cmn-bottom-tab-bar nav > button'));
      tabs[1]?.triggerEventHandler('click', null);
      expect(emitted).toEqual([NAV_ITEMS[1]]);
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
      expect(el('main').className).toBe('flex-1 overflow-y-auto');
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
      expect(main).toContain('max-md:pb-[calc(4rem+16px+env(safe-area-inset-bottom))]');
      expect(main).toContain('max-md:scroll-pb-[calc(4rem+16px+env(safe-area-inset-bottom))]');
    });

    it('should skip the bottom padding when there is no tab bar to clear', () => {
      fixture.componentRef.setInput('navItems', []);
      fixture.componentRef.setInput('phoneOverlay', true);
      fixture.detectChanges();
      expect(el('main').className).toContain('max-md:pt-');
      expect(el('main').className).not.toContain('max-md:pb-');
    });
  });
});
