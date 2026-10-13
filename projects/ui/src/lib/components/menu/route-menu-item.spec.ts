import {describe, expect, it} from 'vitest';

import {isRouteMenuItem} from './route-menu-item';

describe('isRouteMenuItem', () => {
  it('should treat an absolute path id as a route', () => {
    expect(isRouteMenuItem({id: '/settings', label: 'Settings'})).toBe(true);
  });

  it('should treat any other id as an action', () => {
    expect(isRouteMenuItem({id: '_signOut', label: 'Sign out'})).toBe(false);
    expect(isRouteMenuItem({id: 'settings', label: 'Settings'})).toBe(false);
  });
});
