import {ApplicationRef, ChangeDetectionStrategy, Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {NavigationEnd, provideRouter, Router} from '@angular/router';
import {patchState, signalStore, withState} from '@ngrx/signals';
import {beforeEach, describe, expect, it} from 'vitest';

import {type UrlParamCodec, withUrlSync} from './with-url-sync.feature';

interface LedgerState {
  query: string;
  page: number;
  archived: boolean;
  tags: string[];
}

const INITIAL: LedgerState = {query: '', page: 1, archived: false, tags: []};

const TAGS_CODEC: UrlParamCodec<string[]> = {
  encode: v => v.join(','),
  decode: v => (v ? v.split(',') : []),
};

// `protectedState: false` so the spec can drive state from outside the store,
// standing in for the methods a real feature store would expose.
const LedgerStore = signalStore(
  {providedIn: 'root', protectedState: false},
  withState<LedgerState>(INITIAL),
  withUrlSync<LedgerState>({
    query: {param: 'q', default: ''},
    page: {param: 'page', default: 1, codec: 'number'},
    archived: {param: 'archived', default: false, codec: 'boolean'},
    tags: {param: 'tags', default: [], codec: TAGS_CODEC},
  })
);

@Component({template: '', changeDetection: ChangeDetectionStrategy.OnPush})
class BlankComponent {}

async function navigateTo(url: string): Promise<InstanceType<typeof LedgerStore>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideRouter([{path: '**', component: BlankComponent}])],
  });
  const router = TestBed.inject(Router);
  const harness = TestBed.createComponent(BlankComponent);
  harness.detectChanges();
  await router.navigateByUrl(url);
  const store = TestBed.inject(LedgerStore);
  // Consume the effect's first run, which hydrates without navigating.
  TestBed.inject(ApplicationRef).tick();
  return store;
}

function currentUrl(): string {
  return TestBed.inject(Router).url;
}

const SETTLE_TIMEOUT_MS = 500;

/**
 * The write-back is a root effect: it only runs on an application tick, and the
 * navigation it triggers resolves a turn later. Tick, then wait for the router
 * to land (or give up, for the cases that deliberately navigate nowhere).
 */
async function settle(): Promise<void> {
  const landed = new Promise<void>(resolve => {
    const sub = TestBed.inject(Router).events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        sub.unsubscribe();
        resolve();
      }
    });
    setTimeout(() => {
      sub.unsubscribe();
      resolve();
    }, SETTLE_TIMEOUT_MS);
  });

  TestBed.inject(ApplicationRef).tick();
  await landed;
}

describe('withUrlSync', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('keeps the initial state when the URL carries no params', async () => {
    const store = await navigateTo('/ledger');
    expect(store.query()).toBe('');
    expect(store.page()).toBe(1);
    expect(store.archived()).toBe(false);
    expect(store.tags()).toEqual([]);
  });

  it('hydrates a string param', async () => {
    const store = await navigateTo('/ledger?q=coffee');
    expect(store.query()).toBe('coffee');
  });

  it('hydrates a number param through the built-in number codec', async () => {
    const store = await navigateTo('/ledger?page=4');
    expect(store.page()).toBe(4);
  });

  it.each<[string, boolean]>([
    ['archived=true', true],
    ['archived=false', false],
    ['archived=yes', false],
  ])('decodes "%s" as %s through the boolean codec', async (query, expected) => {
    const store = await navigateTo(`/ledger?${query}`);
    expect(store.archived()).toBe(expected);
  });

  it('hydrates through a custom codec', async () => {
    const store = await navigateTo('/ledger?tags=food,travel');
    expect(store.tags()).toEqual(['food', 'travel']);
  });

  it('leaves fields absent from the URL at their initial value', async () => {
    const store = await navigateTo('/ledger?q=coffee');
    expect(store.page()).toBe(1);
    expect(store.archived()).toBe(false);
  });

  it('writes a changed field back to the query string', async () => {
    const store = await navigateTo('/ledger');
    patchState(store, {query: 'coffee'});
    await settle();
    expect(currentUrl()).toContain('q=coffee');
  });

  it('encodes a number and a boolean on the way out', async () => {
    const store = await navigateTo('/ledger');
    patchState(store, {page: 3, archived: true});
    await settle();
    expect(currentUrl()).toContain('page=3');
    expect(currentUrl()).toContain('archived=true');
  });

  it('encodes through a custom codec on the way out', async () => {
    const store = await navigateTo('/ledger');
    patchState(store, {tags: ['food', 'travel']});
    await settle();
    expect(decodeURIComponent(currentUrl())).toContain('tags=food,travel');
  });

  it('drops a param once its field returns to the default', async () => {
    const store = await navigateTo('/ledger?q=coffee');
    patchState(store, {query: ''});
    await settle();
    expect(currentUrl()).not.toContain('q=');
  });

  it('treats a deep-equal default as unchanged — no param for an empty array', async () => {
    const store = await navigateTo('/ledger');
    patchState(store, {tags: []});
    await settle();
    expect(currentUrl()).not.toContain('tags=');
  });

  it('does not navigate on the first run — hydration must not rewrite the URL', async () => {
    const store = await navigateTo('/ledger?q=coffee');
    await settle();
    expect(store.query()).toBe('coffee');
    expect(currentUrl()).toContain('q=coffee');
  });
});

describe('withUrlSync - nested fields and CSV', () => {
  interface FilterState {
    filters: {category: string[]; type: string; range: {min: number}};
    page: number;
  }

  const FilterStore = signalStore(
    {providedIn: 'root', protectedState: false},
    withState<FilterState>({filters: {category: [], type: '', range: {min: 0}}, page: 1}),
    withUrlSync<FilterState>({
      'filters.category': {param: 'category', default: [], codec: 'csv'},
      'filters.type': {param: 'type', default: ''},
      'filters.range.min': {param: 'min', default: 0, codec: 'number'},
      page: {param: 'page', default: 1, codec: 'number'},
    })
  );

  async function open(url: string): Promise<InstanceType<typeof FilterStore>> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([{path: '**', component: BlankComponent}])],
    });
    const router = TestBed.inject(Router);
    TestBed.createComponent(BlankComponent).detectChanges();
    await router.navigateByUrl(url);
    const store = TestBed.inject(FilterStore);
    TestBed.inject(ApplicationRef).tick();
    return store;
  }

  it('hydrates several params into one nested filters object', async () => {
    const store = await open('/ledger?category=food,travel&type=debit&min=5&page=2');
    expect(store.filters()).toEqual({
      category: ['food', 'travel'],
      type: 'debit',
      range: {min: 5},
    });
    expect(store.page()).toBe(2);
  });

  it('writes the nested object back as flat ?category= and ?type= params, byte for byte', async () => {
    const store = await open('/ledger');
    patchState(store, {filters: {category: ['food', 'travel'], type: 'debit', range: {min: 0}}});
    await settle();
    expect(currentUrl()).toBe('/ledger?category=food,travel&type=debit');
  });

  it('leaves sibling nested fields alone when only one param is present', async () => {
    const store = await open('/ledger?type=credit');
    expect(store.filters()).toEqual({category: [], type: 'credit', range: {min: 0}});
  });

  it('drops a nested param once its field returns to the default', async () => {
    const store = await open('/ledger?category=food&type=debit');
    patchState(store, {filters: {...store.filters(), type: ''}});
    await settle();
    expect(currentUrl()).toBe('/ledger?category=food');
  });

  it('reads a repeated param through the csv codec', async () => {
    const store = await open('/ledger?category=food&category=travel,fun');
    expect(store.filters.category()).toEqual(['food', 'travel', 'fun']);
  });

  it('reads an empty csv param as an empty array', async () => {
    const store = await open('/ledger?category=');
    expect(store.filters.category()).toEqual([]);
  });

  it('encodes an array that differs from its default as one csv param', async () => {
    const store = await open('/ledger');
    patchState(store, {filters: {...store.filters(), category: ['a']}});
    await settle();
    expect(currentUrl()).toBe('/ledger?category=a');
  });
});

describe('withUrlSync - following the URL after init', () => {
  async function open(url: string): Promise<InstanceType<typeof LedgerStore>> {
    return navigateTo(url);
  }

  async function follow(url: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    TestBed.inject(ApplicationRef).tick();
  }

  it('picks up a changed param on same-route navigation', async () => {
    const store = await open('/ledger?q=coffee');
    await follow('/ledger?q=tea');
    expect(store.query()).toBe('tea');
  });

  it('replaces a stale filter when the next link carries a different value', async () => {
    const store = await open('/transactions?q=debit');
    await follow('/transactions?q=credit');
    expect(store.query()).toBe('credit');
  });

  it('falls back to the default when a followed link drops the param', async () => {
    const store = await open('/ledger?q=coffee&page=3&tags=a,b');
    await follow('/ledger');
    expect(store.query()).toBe('');
    expect(store.page()).toBe(1);
    expect(store.tags()).toEqual([]);
  });

  it('does not rewrite the URL it just followed', async () => {
    await open('/ledger?q=coffee');
    await follow('/ledger?q=tea');
    await settle();
    expect(currentUrl()).toBe('/ledger?q=tea');
  });

  it('does not let the echo of its own write clobber a newer state', async () => {
    const store = await open('/ledger');
    patchState(store, {query: 'a'});
    TestBed.inject(ApplicationRef).tick();
    patchState(store, {query: 'ab'});
    await settle();
    expect(store.query()).toBe('ab');
    expect(currentUrl()).toContain('q=ab');
  });

  it('keeps following after its own writes', async () => {
    const store = await open('/ledger');
    patchState(store, {query: 'coffee'});
    await settle();
    await follow('/ledger?q=tea');
    expect(store.query()).toBe('tea');
  });
});
