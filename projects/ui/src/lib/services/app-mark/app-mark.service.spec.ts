import {TestBed} from '@angular/core/testing';
import {markSvg, seedMarkColors} from '@lifekit-hq/tokens/brand/mark';
import {seedTokenNames} from '@lifekit-hq/tokens/engine';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {provideAppMark} from '../../providers/provide-app-mark';
import {LOCAL_STORAGE, ThemeService} from '../theme/theme.service';
import {APP_MARK, AppMarkService, DEFAULT_APP_MARK} from './app-mark.service';

const SHIPPED = '/favicon.svg';
const VIOLET = '#7c3aed';
const CORAL = '#e5484d';

function dataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>();

  public get length(): number {
    return this.map.size;
  }

  public clear(): void {
    this.map.clear();
  }

  public getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  public key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  public removeItem(key: string): void {
    this.map.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

function setup(app?: 'bk', withLink = true): {service: AppMarkService; theme: ThemeService} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{provide: LOCAL_STORAGE, useValue: new MemoryStorage()}],
  });
  if (withLink) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = SHIPPED;
    document.head.append(link);
  }
  if (app) {
    TestBed.configureTestingModule({providers: [provideAppMark(app)]});
  }
  return {service: TestBed.inject(AppMarkService), theme: TestBed.inject(ThemeService)};
}

function href(): string | null {
  return (
    document.querySelector('link[rel~="icon"][type="image/svg+xml"]')?.getAttribute('href') ?? null
  );
}

describe('AppMarkService', () => {
  beforeEach(() => {
    for (const name of seedTokenNames()) {
      document.documentElement.style.removeProperty(name);
    }
  });

  afterEach(() => {
    document.head.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());
  });

  it('draws the lifekit mark until an app sets its own', () => {
    expect(TestBed.inject(APP_MARK)).toBe(DEFAULT_APP_MARK);
    expect(setup().service.app).toBe('lk');
  });

  it('takes the app from provideAppMark', () => {
    expect(setup('bk').service.app).toBe('bk');
  });

  it('leaves the shipped favicon while the user has no colour of their own', () => {
    const {service} = setup('bk');
    service.followSeed();
    expect(href()).toBe(SHIPPED);
  });

  it('points the favicon at the mark in the chosen colour', () => {
    const {service, theme} = setup('bk');
    service.followSeed();
    theme.setSeed(CORAL);
    expect(href()).toBe(dataUri(markSvg({app: 'bk', ...seedMarkColors(CORAL)})));
  });

  it('follows a later colour change', () => {
    const {service, theme} = setup('bk');
    service.followSeed();
    theme.setSeed(CORAL);
    const coral = href();
    theme.setSeed(VIOLET);
    expect(href()).not.toBe(coral);
    expect(href()).toBe(dataUri(markSvg({app: 'bk', ...seedMarkColors(VIOLET)})));
  });

  it('restores the shipped favicon when the colour is reset', () => {
    const {service, theme} = setup('bk');
    service.followSeed();
    theme.setSeed(CORAL);
    theme.resetSeed();
    expect(href()).toBe(SHIPPED);
  });

  it('picks up a colour stored by an earlier visit', () => {
    TestBed.resetTestingModule();
    const storage = new MemoryStorage();
    TestBed.configureTestingModule({providers: [{provide: LOCAL_STORAGE, useValue: storage}]});
    TestBed.inject(ThemeService).setSeed(CORAL);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{provide: LOCAL_STORAGE, useValue: storage}, provideAppMark('bk')],
    });
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = SHIPPED;
    document.head.append(link);
    TestBed.inject(AppMarkService).followSeed();
    expect(href()).toBe(dataUri(markSvg({app: 'bk', ...seedMarkColors(CORAL)})));
  });

  it('follows once, however often it is asked', () => {
    const {service, theme} = setup('bk');
    service.followSeed();
    service.followSeed();
    theme.setSeed(CORAL);
    theme.resetSeed();
    expect(href()).toBe(SHIPPED);
  });

  it('does nothing when the page has no SVG favicon', () => {
    const {service, theme} = setup('bk', false);
    service.followSeed();
    theme.setSeed(CORAL);
    expect(href()).toBeNull();
  });
});
