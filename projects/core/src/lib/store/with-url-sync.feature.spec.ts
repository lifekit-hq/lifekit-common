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
