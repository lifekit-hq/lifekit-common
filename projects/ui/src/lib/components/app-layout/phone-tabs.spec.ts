import {describe, expect, it} from 'vitest';

import {MAX_BOTTOM_TABS} from '../bottom-tab-bar/bottom-tab-bar.component';
import {type NavItem} from '../sidebar-nav/sidebar-nav.component';
import {overflowNavItems, phoneTabItems} from './phone-tabs';

const ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

const routes = (items: NavItem[]): string[] => items.map(item => item.route);

describe('phoneTabItems', () => {
  it('should take the first items when no tab routes are named', () => {
    expect(phoneTabItems(ITEMS)).toHaveLength(MAX_BOTTOM_TABS);
    expect(routes(phoneTabItems(ITEMS))[0]).toBe('/dashboard');
  });

  it('should follow the order of the named routes', () => {
    expect(routes(phoneTabItems(ITEMS, ['/alerts', '/dashboard']))).toEqual([
      '/alerts',
      '/dashboard',
    ]);
  });

  it('should skip a named route that is not a nav item', () => {
    expect(routes(phoneTabItems(ITEMS, ['/nowhere', '/accounts']))).toEqual(['/accounts']);
  });

  it('should keep at most the tab bar can hold', () => {
    const named = ITEMS.map(item => item.route);
    expect(phoneTabItems(ITEMS, named)).toHaveLength(MAX_BOTTOM_TABS);
  });
});

describe('overflowNavItems', () => {
  it('should be the items that are not tabs', () => {
    expect(routes(overflowNavItems(ITEMS))).toEqual(['/alerts', '/settings']);
  });

  it('should leave out the named tab routes', () => {
    expect(routes(overflowNavItems(ITEMS, ['/alerts', '/dashboard']))).toEqual([
      '/accounts',
      '/transactions',
      '/budgets',
      '/settings',
    ]);
  });

  it('should be empty when every item is a tab', () => {
    expect(overflowNavItems(ITEMS.slice(0, MAX_BOTTOM_TABS))).toEqual([]);
  });
});
