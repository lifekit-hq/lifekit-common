import {describe, expect, it} from 'vitest';

import {accountMenu} from '../app-layout/account-menu';
import {WHATS_NEW_MENU_ID, whatsNewMenuItem} from './whats-new-menu-item';

describe('whatsNewMenuItem', () => {
  it('carries the dot while the running version is unread, and none after', () => {
    expect(whatsNewMenuItem(true)).toMatchObject({id: WHATS_NEW_MENU_ID, dot: true});
    expect(whatsNewMenuItem(false).dot).toBe(false);
  });

  it('sits between Settings and Sign out in the account menu', () => {
    const ids = accountMenu({
      settingsRoute: '/settings',
      extras: [whatsNewMenuItem(false)],
    }).map(item => item.id);

    expect(ids).toEqual(['/settings', WHATS_NEW_MENU_ID, '_signOut']);
  });
});
