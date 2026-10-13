import {describe, expect, it} from 'vitest';

import {ACCOUNT_SIGN_OUT_ID, accountMenu} from './account-menu';

describe('accountMenu', () => {
  it('should be Settings then Sign out, with the standard ids, icons and labels', () => {
    expect(accountMenu({settingsRoute: '/settings'})).toEqual([
      {id: '/settings', label: 'Settings', icon: 'Settings2'},
      {
        id: ACCOUNT_SIGN_OUT_ID,
        label: 'Sign out',
        icon: 'LogOut',
        destructive: true,
        separatorBefore: true,
      },
    ]);
  });

  it('should use the route it is given as the Settings id', () => {
    expect(accountMenu({settingsRoute: '/account/settings'})[0]?.id).toBe('/account/settings');
  });

  it('should put the extras between Settings and Sign out', () => {
    const items = accountMenu({
      settingsRoute: '/settings',
      extras: [
        {id: 'whatsNew', label: "What's new", icon: 'Sparkles'},
        {id: 'report', label: 'Report a problem', icon: 'Flag'},
      ],
    });

    expect(items.map(item => item.id)).toEqual([
      '/settings',
      'whatsNew',
      'report',
      ACCOUNT_SIGN_OUT_ID,
    ]);
  });

  it('should leave Sign out off when the app does not sign in', () => {
    expect(accountMenu({settingsRoute: '/settings', signOut: false}).map(item => item.id)).toEqual([
      '/settings',
    ]);
  });

  it('should leave Settings off without a route', () => {
    expect(accountMenu().map(item => item.id)).toEqual([ACCOUNT_SIGN_OUT_ID]);
  });

  it('should not draw a separator above Sign out when it is the only item', () => {
    expect(accountMenu()[0]?.separatorBefore).toBe(false);
  });

  it('should build a new list each call, so an app cannot change another way', () => {
    expect(accountMenu({settingsRoute: '/settings'})).not.toBe(
      accountMenu({settingsRoute: '/settings'})
    );
  });
});
