import {Location} from '@angular/common';
import {provideLocationMocks} from '@angular/common/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {NavigationEnd, provideRouter, Router, type Routes} from '@angular/router';
import {filter, firstValueFrom} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {LOCAL_STORAGE} from '../../services/theme/theme.service';
import {AppLayoutComponent, type NavItem} from './app-layout.component';
import {LAST_TAB_STORAGE_KEY, matchTab, pathOf} from './shell-navigation.service';

const NAV_ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
];

const ROUTES: Routes = [
  {path: 'dashboard', children: []},
  {path: 'accounts', children: [], data: {title: 'Accounts'}},
  {path: 'accounts/:id', children: [], data: {title: 'Account', parent: '/accounts'}},
  {path: 'transactions', children: [], data: {title: 'Transactions'}},
  {path: 'transactions/:id', children: [], data: {title: 'Transaction', parent: '/transactions'}},
  {path: '', redirectTo: 'dashboard', pathMatch: 'full'},
];

const MAIN_HEIGHT_PX = 400;
const TALL_CONTENT_PX = 3000;
const SCROLLED_PX = 700;
const OTHER_SCROLLED_PX = 450;

describe('matchTab', () => {
  it('should match on path-segment boundaries, longest first, ignoring query and fragment', () => {
    const routes = ['/budgets', '/budgets/recurring'];
    expect(matchTab('/budgets/recurring/1?tab=a#top', routes)).toBe('/budgets/recurring');
    expect(matchTab('/budgets?x=1', routes)).toBe('/budgets');
    expect(matchTab('/budgets-archive', routes)).toBe('');
    expect(pathOf('/budgets/1?x=1#top')).toBe('/budgets/1');
  });
});

describe('ShellNavigationService', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  let router: Router;
  let main: HTMLElement;
  let storage: Storage;

  const settle = async (): Promise<void> => {
    await new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve)))
    );
    fixture.detectChanges();
  };

  const go = async (url: string): Promise<void> => {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await settle();
  };

  /** The browser's back button: waits for the router to finish the navigation it triggers. */
  const browserBack = async (): Promise<void> => {
    const ended = firstValueFrom(router.events.pipe(filter(e => e instanceof NavigationEnd)));
    TestBed.inject(Location).back();
    await ended;
    fixture.detectChanges();
    await settle();
  };

  const tab = (label: string): HTMLButtonElement => {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'cmn-bottom-tab-bar nav button'
      )
    );
    const found = buttons.find(b => b.textContent?.includes(label));
    if (!found) {
      throw new Error(`no tab named ${label}`);
    }
    return found;
  };

  const press = async (label: string): Promise<void> => {
    tab(label).click();
    await fixture.whenStable();
    fixture.detectChanges();
    await settle();
  };

  const scrollTo = async (top: number): Promise<void> => {
    main.scrollTop = top;
    // Let the scroll land so the shell reads it when the next navigation starts.
    await settle();
  };

  async function create(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter(ROUTES),
        provideLocationMocks(),
        {provide: LOCAL_STORAGE, useFactory: () => storage},
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    // Back and forward reach the router through this listener, which bootstrap sets up in an app.
    router.setUpLocationChangeListener();
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('navItems', NAV_ITEMS);
    fixture.detectChanges();
    main = (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;
    main.style.display = 'block';
    main.style.height = `${MAIN_HEIGHT_PX}px`;
    main.style.overflowY = 'auto';
    const tall = document.createElement('div');
    tall.style.height = `${TALL_CONTENT_PX}px`;
    main.append(tall);
  }

  beforeEach(() => {
    storage = window.localStorage;
    storage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('scroll', () => {
    beforeEach(create);

    it('should start a new screen at the top', async () => {
      await go('/accounts');
      await scrollTo(SCROLLED_PX);
      await go('/accounts/1');
      expect(main.scrollTop).toBe(0);
    });

    it('should restore the scroll of the screen that back returns to', async () => {
      await go('/accounts');
      await scrollTo(SCROLLED_PX);
      await go('/accounts/1');
      await browserBack();
      expect(router.url).toBe('/accounts');
      expect(main.scrollTop).toBe(SCROLLED_PX);
    });

    it('should keep a separate position for each screen in the history', async () => {
      await go('/accounts');
      await scrollTo(SCROLLED_PX);
      await go('/accounts/1');
      await scrollTo(OTHER_SCROLLED_PX);
      await go('/accounts/2');
      await browserBack();
      expect(main.scrollTop).toBe(OTHER_SCROLLED_PX);
      await browserBack();
      expect(main.scrollTop).toBe(SCROLLED_PX);
    });

    it('should leave the scroll alone when only the query changes', async () => {
      await go('/accounts');
      await scrollTo(SCROLLED_PX);
      await go('/accounts?range=3m');
      expect(main.scrollTop).toBe(SCROLLED_PX);
    });

    it('should stop restoring once the reader scrolls themselves', async () => {
      await go('/accounts');
      await scrollTo(SCROLLED_PX);
      await go('/accounts/1');
      const content = main.querySelector('div') as HTMLElement;
      content.style.height = '0px';
      const ended = firstValueFrom(router.events.pipe(filter(e => e instanceof NavigationEnd)));
      TestBed.inject(Location).back();
      await ended;
      main.dispatchEvent(new Event('wheel'));
      content.style.height = `${TALL_CONTENT_PX}px`;
      await settle();
      expect(main.scrollTop).toBe(0);
    });

    it('should wait for content that arrives after the navigation', async () => {
      await go('/accounts');
      await scrollTo(SCROLLED_PX);
      await go('/accounts/1');
      const content = main.querySelector('div') as HTMLElement;
      content.style.height = '0px';
      const ended = firstValueFrom(router.events.pipe(filter(e => e instanceof NavigationEnd)));
      TestBed.inject(Location).back();
      await ended;
      expect(main.scrollTop).toBe(0);
      content.style.height = `${TALL_CONTENT_PX}px`;
      await settle();
      expect(main.scrollTop).toBe(SCROLLED_PX);
    });
  });

  describe('tabs', () => {
    beforeEach(create);

    it('should reopen the screen a tab was last showing, scrolled where it was left', async () => {
      await go('/accounts');
      await go('/accounts/1');
      await scrollTo(SCROLLED_PX);
      await press('Transactions');
      expect(router.url).toBe('/transactions');
      expect(main.scrollTop).toBe(0);
      await press('Accounts');
      expect(router.url).toBe('/accounts/1');
      expect(main.scrollTop).toBe(SCROLLED_PX);
    });

    it('should open a tab that was never visited at its root', async () => {
      await go('/dashboard');
      await press('Transactions');
      expect(router.url).toBe('/transactions');
    });

    it('should still report the press through navClick', async () => {
      await go('/dashboard');
      const pressed: string[] = [];
      fixture.componentInstance.navClick.subscribe(item => pressed.push(item.route));
      await press('Accounts');
      expect(pressed).toEqual(['/accounts']);
    });

    it('should scroll the active tab to the top on a re-tap, then pop to its root', async () => {
      await go('/accounts');
      await go('/accounts/1');
      await scrollTo(SCROLLED_PX);

      await press('Accounts');
      await vi.waitFor(() => expect(main.scrollTop).toBe(0));
      expect(router.url).toBe('/accounts/1');

      await press('Accounts');
      expect(router.url).toBe('/accounts');
    });

    it('should forget the popped screen: the tab reopens at its root afterwards', async () => {
      await go('/accounts/1');
      await press('Accounts');
      expect(router.url).toBe('/accounts');
      await press('Transactions');
      await press('Accounts');
      expect(router.url).toBe('/accounts');
    });

    it('should do nothing on a re-tap of a tab root already at the top', async () => {
      await go('/accounts');
      const navigated = vi.spyOn(router, 'navigateByUrl');
      await press('Accounts');
      expect(navigated).not.toHaveBeenCalled();
      expect(main.scrollTop).toBe(0);
    });

    it('should jump to the top without animation under reduced motion', async () => {
      const reduced = vi
        .spyOn(window, 'matchMedia')
        .mockReturnValue({matches: true} as MediaQueryList);
      await go('/accounts');
      await scrollTo(SCROLLED_PX);
      const scrollSpy = vi.spyOn(main, 'scrollTo');
      await press('Accounts');
      expect(scrollSpy).toHaveBeenCalledWith({top: 0, behavior: 'auto'});
      reduced.mockRestore();
    });
  });

  describe('launch', () => {
    it('should persist the tab the reader is on', async () => {
      await create();
      await go('/accounts/1');
      expect(storage.getItem(LAST_TAB_STORAGE_KEY)).toBe('/accounts');
    });

    it('should reopen the last tab on a launch from the root', async () => {
      storage.setItem(LAST_TAB_STORAGE_KEY, '/transactions');
      await create();
      await go('/');
      expect(router.url).toBe('/transactions');
      expect(storage.getItem(LAST_TAB_STORAGE_KEY)).toBe('/transactions');
    });

    it('should leave a launch alone when the last tab is already the one it opens', async () => {
      storage.setItem(LAST_TAB_STORAGE_KEY, '/dashboard');
      await create();
      await go('/');
      expect(router.url).toBe('/dashboard');
    });

    it('should not override a deep link', async () => {
      storage.setItem(LAST_TAB_STORAGE_KEY, '/transactions');
      await create();
      await go('/accounts/1');
      expect(router.url).toBe('/accounts/1');
    });

    it('should ignore a remembered tab the app no longer has', async () => {
      storage.setItem(LAST_TAB_STORAGE_KEY, '/retired');
      await create();
      await go('/');
      expect(router.url).toBe('/dashboard');
    });

    it('should reopen the last tab for a layout built after the launch navigation', async () => {
      storage.setItem(LAST_TAB_STORAGE_KEY, '/transactions');
      await TestBed.configureTestingModule({
        imports: [AppLayoutComponent],
        providers: [
          provideRouter(ROUTES),
          provideLocationMocks(),
          {provide: LOCAL_STORAGE, useFactory: () => storage},
        ],
      }).compileComponents();
      router = TestBed.inject(Router);
      await router.navigateByUrl('/');
      fixture = TestBed.createComponent(AppLayoutComponent);
      fixture.componentRef.setInput('navItems', NAV_ITEMS);
      fixture.detectChanges();
      await fixture.whenStable();
      await vi.waitFor(() => expect(router.url).toBe('/transactions'));
    });

    it('should work with storage that throws', async () => {
      const blocked = {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
      } as unknown as Storage;
      storage = blocked;
      await create();
      await go('/');
      await go('/accounts');
      expect(router.url).toBe('/accounts');
    });
  });
});
