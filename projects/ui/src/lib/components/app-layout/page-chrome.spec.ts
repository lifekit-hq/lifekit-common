import {describe, expect, it} from 'vitest';

import {type PageChromeData, readPageChrome, resolveBack} from './page-chrome';

describe('page chrome', () => {
  describe('readPageChrome', () => {
    it('should read nothing from data that declares no chrome', () => {
      expect(readPageChrome({})).toBeNull();
      expect(readPageChrome({providerName: 'Bank'})).toBeNull();
    });

    it('should read title, parent and actions', () => {
      const actions = [{id: 'add', label: 'Add', icon: 'Plus'}];
      expect(readPageChrome({title: 'Account', parent: '..', actions, other: 1})).toEqual({
        title: 'Account',
        parent: '..',
        actions,
      });
    });

    it('should count any single key as a declaration', () => {
      expect(readPageChrome({parent: '/accounts'})).toEqual({parent: '/accounts'});
      expect(readPageChrome({actions: []})).toEqual({actions: []});
    });
  });

  describe('resolveBack', () => {
    const child: PageChromeData = {title: 'Account'};
    const withParent: PageChromeData = {title: 'Account', parent: '/accounts'};

    it('should show no back for a page that declares nothing, even with history', () => {
      expect(resolveBack(null, {isTabRoot: false, hasHistory: true})).toBeNull();
    });

    it('should go to the declared parent, with or without history', () => {
      const parent = {kind: 'parent', parent: '/accounts'};
      expect(resolveBack(withParent, {isTabRoot: false, hasHistory: false})).toEqual(parent);
      expect(resolveBack(withParent, {isTabRoot: false, hasHistory: true})).toEqual(parent);
    });

    it('should honour a declared parent even on a tab root', () => {
      expect(resolveBack(withParent, {isTabRoot: true, hasHistory: false})).toEqual({
        kind: 'parent',
        parent: '/accounts',
      });
    });

    it('should fall back to history for a child page without a parent', () => {
      expect(resolveBack(child, {isTabRoot: false, hasHistory: true})).toEqual({kind: 'history'});
    });

    it('should show no back on a deep link with no parent and no in-app history', () => {
      expect(resolveBack(child, {isTabRoot: false, hasHistory: false})).toBeNull();
    });

    it('should show no back on a tab root without a parent', () => {
      expect(resolveBack(child, {isTabRoot: true, hasHistory: true})).toBeNull();
    });

    it('should ignore an empty parent', () => {
      expect(resolveBack({parent: ''}, {isTabRoot: false, hasHistory: true})).toEqual({
        kind: 'history',
      });
    });
  });
});
