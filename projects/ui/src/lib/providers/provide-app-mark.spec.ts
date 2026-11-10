import {ApplicationInitStatus} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {APP_MARK, AppMarkService} from '../services/app-mark/app-mark.service';
import {LOCAL_STORAGE, ThemeService} from '../services/theme/theme.service';
import {provideAppMark} from './provide-app-mark';

const SHIPPED = '/favicon.svg';

function addFavicon(): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = SHIPPED;
  document.head.append(link);
  return link;
}

describe('provideAppMark', () => {
  let storage: Storage;

  beforeEach(() => {
    TestBed.resetTestingModule();
    const map = new Map<string, string>();
    storage = {
      get length() {
        return map.size;
      },
      clear: () => map.clear(),
      getItem: key => map.get(key) ?? null,
      key: index => Array.from(map.keys())[index] ?? null,
      removeItem: key => void map.delete(key),
      setItem: (key, value) => void map.set(key, value),
    };
  });

  afterEach(() => {
    document.head.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());
    document.documentElement.removeAttribute('style');
  });

  it('sets the app the mark and the favicon draw', () => {
    TestBed.configureTestingModule({providers: [provideAppMark('bk')]});
    expect(TestBed.inject(APP_MARK)).toBe('bk');
  });

  it('rejects an app that has no mark', () => {
    expect(() => provideAppMark('zz' as 'bk')).toThrow(/no mark for "zz"/);
  });

  it('starts the favicon following the colour at bootstrap', async () => {
    const link = addFavicon();
    TestBed.configureTestingModule({
      providers: [{provide: LOCAL_STORAGE, useValue: storage}, provideAppMark('bk')],
    });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    TestBed.inject(ThemeService).setSeed('#e5484d');
    expect(link.getAttribute('href')).toMatch(/^data:image\/svg\+xml,/);
  });

  it('leaves the favicon alone with followSeed off', async () => {
    const link = addFavicon();
    TestBed.configureTestingModule({
      providers: [
        {provide: LOCAL_STORAGE, useValue: storage},
        provideAppMark('bk', {followSeed: false}),
      ],
    });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    TestBed.inject(ThemeService).setSeed('#e5484d');
    expect(link.getAttribute('href')).toBe(SHIPPED);
    expect(TestBed.inject(AppMarkService).app).toBe('bk');
  });
});
