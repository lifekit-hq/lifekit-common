import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  ACCOUNT_SIGN_OUT_ID,
  accountMenu,
  type AppLayoutAccount,
} from '../app-layout/app-layout.component';
import {type MenuItem} from '../menu/menu.component';
import {type NavItem} from '../sidebar-nav/sidebar-nav.component';
import {MorePageComponent} from './more-page.component';

const UNREAD = 3;

const ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts', badge: () => UNREAD},
  {label: 'Rules', icon: 'ListFilter', route: '/rules'},
];

const ACCOUNT: AppLayoutAccount = {
  label: 'Ada Lovelace',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  menuItems: accountMenu({
    settingsRoute: '/settings',
    extras: [{id: 'report', label: 'Report a problem', icon: 'Flag'}],
  }),
};

describe('MorePageComponent', () => {
  let fixture: ComponentFixture<MorePageComponent>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (selector: string): string[] =>
    Array.from(host().querySelectorAll(selector)).map(
      el => el.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    );
  const section = (name: string): HTMLElement | null =>
    host().querySelector(`[data-more-section="${name}"]`);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MorePageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(MorePageComponent);
    fixture.componentRef.setInput('items', ITEMS);
    fixture.componentRef.setInput('tabRoutes', [
      '/dashboard',
      '/accounts',
      '/transactions',
      '/budgets',
    ]);
    fixture.componentRef.setInput('account', ACCOUNT);
    fixture.detectChanges();
  });

  it('should list the nav items that are not tabs, as links', () => {
    const links = Array.from(section('nav')?.querySelectorAll('a') ?? []);
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/alerts', '/rules']);
    expect(links[0]?.textContent).toContain('Alerts');
  });

  it('should show an overflow item badge as a count', () => {
    expect(section('nav')?.querySelector('.cmn-badge-indicator')?.textContent?.trim()).toBe(
      `${UNREAD}`
    );
  });

  it('should leave the nav card out when every item is a tab', () => {
    fixture.componentRef.setInput('items', ITEMS.slice(0, 4));
    fixture.detectChanges();
    expect(section('nav')).toBeNull();
  });

  it('should show the identity as text, not as a link or button', () => {
    const identity = host().querySelector('[data-more-identity]');
    expect(identity?.textContent).toContain('Ada Lovelace');
    expect(identity?.textContent).toContain('ada@example.com');
    expect(identity?.closest('a, button')).toBeNull();
  });

  it('should show only the email when the account has no name', () => {
    fixture.componentRef.setInput('account', {...ACCOUNT, name: undefined});
    fixture.detectChanges();
    const identity = host().querySelector('[data-more-identity]');
    expect(identity?.querySelectorAll('p').length).toBe(1);
    expect(identity?.textContent).toContain('ada@example.com');
  });

  it('should show no identity for an account that is only a label and items', () => {
    fixture.componentRef.setInput('account', {label: 'AL', menuItems: ACCOUNT.menuItems});
    fixture.detectChanges();
    expect(host().querySelector('[data-more-identity]')).toBeNull();
  });

  it('should render no account card for a label-only account without items', () => {
    fixture.componentRef.setInput('account', {label: 'AL', menuItems: []});
    fixture.detectChanges();
    expect(section('account')).toBeNull();
  });

  it('should still render the identity card for an account without items', () => {
    fixture.componentRef.setInput('account', {...ACCOUNT, menuItems: []});
    fixture.detectChanges();
    expect(host().querySelector('[data-more-identity]')).not.toBeNull();
  });

  it('should link Settings and leave the app its other items as buttons', () => {
    const account = section('account');
    expect(account?.querySelector('a')?.getAttribute('href')).toBe('/settings');
    expect(
      Array.from(account?.querySelectorAll('button') ?? []).map(b => b.textContent?.trim())
    ).toEqual(['Report a problem']);
  });

  it('should render every card as a block so the stack spacing applies', () => {
    // cmn-card's host is inline; margins from the wrapper's space-y only apply to block boxes.
    const cards = Array.from(host().querySelectorAll('cmn-card'));
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.classList).toContain('block');
    }
  });

  it('should put Sign out in a card of its own, last, with a tinted icon', () => {
    const cards = Array.from(host().querySelectorAll('[data-more-section="account"]'));
    expect(cards).toHaveLength(2);
    const signOut = cards[1]?.querySelector('button');
    expect(signOut?.textContent?.trim()).toBe('Sign out');
    expect(signOut?.querySelector('cmn-icon')?.classList).toContain('text-status-error');
  });

  it('should report a button item and leave the app to handle it', () => {
    const selected: MenuItem[] = [];
    fixture.componentInstance.itemSelect.subscribe(item => selected.push(item));

    const buttons = host().querySelectorAll('button');
    buttons[buttons.length - 1]?.click();

    expect(selected.map(item => item.id)).toEqual([ACCOUNT_SIGN_OUT_ID]);
  });

  it('should navigate a route item by its link, and report it', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const selected: MenuItem[] = [];
    fixture.componentInstance.itemSelect.subscribe(item => selected.push(item));

    section('account')?.querySelector('a')?.click();

    expect(selected.map(item => item.id)).toEqual(['/settings']);
    navigate.mockRestore();
  });

  it('should not make a disabled route item a link', () => {
    fixture.componentRef.setInput('account', {
      label: 'AL',
      menuItems: [{id: '/settings', label: 'Settings', disabled: true}],
    });
    fixture.detectChanges();

    const row = section('account')?.querySelector('button');
    expect(row?.disabled).toBe(true);
    expect(section('account')?.querySelector('a')).toBeNull();
  });

  it('should show the version caption only when there is one', () => {
    expect(host().querySelector('[data-more-version]')).toBeNull();
    fixture.componentRef.setInput('versionLabel', 'v3.2.0');
    fixture.detectChanges();
    expect(text('[data-more-version]')).toEqual(['v3.2.0']);
  });

  it('should show only the nav items without an account', () => {
    fixture.componentRef.setInput('account', undefined);
    fixture.detectChanges();
    expect(section('account')).toBeNull();
    expect(section('nav')).toBeTruthy();
  });
});
