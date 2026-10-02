import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {type NavItem} from '../sidebar-nav/sidebar-nav.component';
import {BottomTabBarComponent} from './bottom-tab-bar.component';

const UNREAD_ALERTS = 3;

const TABS: NavItem[] = [
  {label: 'Home', icon: 'House', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts', badge: () => UNREAD_ALERTS},
];

const MORE: NavItem[] = [
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

describe('BottomTabBarComponent', () => {
  let fixture: ComponentFixture<BottomTabBarComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomTabBarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BottomTabBarComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('items', TABS);
    fixture.componentRef.setInput('moreItems', MORE);
    fixture.componentRef.setInput('activeRoute', '/dashboard');
    fixture.detectChanges();
  });

  function tabButtons(): HTMLButtonElement[] {
    return Array.from(host.querySelectorAll<HTMLButtonElement>('nav > button'));
  }

  function moreButton(): HTMLButtonElement {
    const button = tabButtons().find(b => b.textContent?.includes('More'));
    if (!button) {
      throw new Error('More tab not rendered');
    }
    return button;
  }

  function sheet(): HTMLElement | null {
    return host.querySelector('[role="dialog"]');
  }

  function labels(): (string | undefined)[] {
    return tabButtons().map(b => b.querySelector('span.truncate')?.textContent?.trim());
  }

  it('renders each tab plus a More tab', () => {
    expect(labels()).toEqual(['Home', 'Accounts', 'Transactions', 'Alerts', 'More']);
  });

  it('caps the primary tabs at four', () => {
    fixture.componentRef.setInput('items', [...TABS, ...MORE]);
    fixture.componentRef.setInput('moreItems', []);
    fixture.detectChanges();
    expect(labels()).toEqual(['Home', 'Accounts', 'Transactions', 'Alerts']);
  });

  it('omits the More tab when there is nothing to put in it', () => {
    fixture.componentRef.setInput('moreItems', []);
    fixture.detectChanges();
    expect(labels()).not.toContain('More');
  });

  it('renders nothing when there are no destinations at all', () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('moreItems', []);
    fixture.detectChanges();
    expect(host.querySelector('nav')).toBeNull();
  });

  it('marks the active tab with aria-current', () => {
    const current = tabButtons().map(b => b.getAttribute('aria-current'));
    expect(current).toEqual(['page', null, null, null, null]);
  });

  it('shows the badge count on a tab that has one', () => {
    const alerts = tabButtons()[3];
    expect(alerts.querySelector('.cmn-badge-indicator')?.textContent?.trim()).toBe(
      `${UNREAD_ALERTS}`
    );
    expect(tabButtons()[0].querySelector('.cmn-badge-indicator')).toBeNull();
  });

  it('emits navClick for a primary tab', () => {
    const emitted: NavItem[] = [];
    fixture.componentInstance.navClick.subscribe(item => emitted.push(item));
    tabButtons()[1].click();
    expect(emitted).toEqual([TABS[1]]);
  });

  it('opens the More sheet with the remaining destinations', () => {
    expect(sheet()).toBeNull();
    moreButton().click();
    fixture.detectChanges();

    expect(moreButton().getAttribute('aria-expanded')).toBe('true');
    const items = Array.from(sheet()?.querySelectorAll('button') ?? []).map(b =>
      b.textContent?.trim()
    );
    expect(items).toEqual(['Budgets', 'Settings']);
  });

  it('moves focus into the sheet on open and back to the More tab on close', async () => {
    moreButton().focus();
    moreButton().click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve));
    expect(document.activeElement?.tagName).toBe('H2');

    fixture.componentInstance.closeMore();
    fixture.detectChanges();
    expect(document.activeElement).toBe(moreButton());
  });

  it('emits navClick and closes the sheet when a More item is picked', () => {
    const emitted: NavItem[] = [];
    fixture.componentInstance.navClick.subscribe(item => emitted.push(item));
    moreButton().click();
    fixture.detectChanges();

    sheet()?.querySelectorAll('button')[1]?.click();
    fixture.detectChanges();

    expect(emitted).toEqual([MORE[1]]);
    expect(sheet()).toBeNull();
  });

  it('closes the sheet on a backdrop click', () => {
    moreButton().click();
    fixture.detectChanges();
    host.querySelector<HTMLElement>('.cmn-drawer-backdrop')?.click();
    fixture.detectChanges();
    expect(sheet()).toBeNull();
  });

  it('closes the sheet on Escape', () => {
    moreButton().click();
    fixture.detectChanges();
    sheet()?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    fixture.detectChanges();
    expect(sheet()).toBeNull();
  });

  it('closes the sheet when the More tab is pressed again', () => {
    moreButton().click();
    fixture.detectChanges();
    fixture.componentInstance.toggleMore();
    fixture.detectChanges();
    expect(sheet()).toBeNull();
  });

  it('highlights More when the active route lives in the sheet', () => {
    fixture.componentRef.setInput('activeRoute', '/settings');
    fixture.detectChanges();
    expect(moreButton().getAttribute('aria-current')).toBe('page');
    expect(tabButtons()[0].getAttribute('aria-current')).toBeNull();
  });

  it('marks the More tab with a dot when a sheet item has a badge', () => {
    expect(moreButton().querySelector('.cmn-badge-indicator')).toBeNull();
    fixture.componentRef.setInput('moreItems', [{...MORE[0], badge: () => 1}, MORE[1]]);
    fixture.detectChanges();
    expect(moreButton().querySelector('.cmn-badge-indicator')).toBeTruthy();
  });

  describe('floating', () => {
    function nav(): HTMLElement {
      return host.querySelector('nav') as HTMLElement;
    }

    it('docks edge to edge with a safe-area pad by default', () => {
      expect(nav().classList).toContain('border-t');
      expect(nav().classList).toContain('pb-[env(safe-area-inset-bottom)]');
      expect(nav().classList).not.toContain('rounded-cmn-full');
      expect(tabButtons()[0]?.classList).not.toContain('bg-accent-subtle');
    });

    it('floats as an inset translucent pill above the safe-area inset', () => {
      fixture.componentRef.setInput('floating', true);
      fixture.detectChanges();
      expect(nav().classList).toContain('rounded-cmn-full');
      expect(nav().classList).toContain('backdrop-blur-md');
      expect(nav().classList).toContain('mb-[calc(env(safe-area-inset-bottom)+8px)]');
      expect(nav().classList).not.toContain('border-t');
    });

    it('highlights only the active tab with a pill when floating', () => {
      fixture.componentRef.setInput('floating', true);
      fixture.detectChanges();
      const [active, inactive] = tabButtons();
      expect(active?.classList).toContain('bg-accent-subtle');
      expect(active?.classList).toContain('rounded-cmn-full');
      expect(inactive?.classList).not.toContain('bg-accent-subtle');
      expect(inactive?.classList).toContain('rounded-cmn-full');
    });
  });
});
