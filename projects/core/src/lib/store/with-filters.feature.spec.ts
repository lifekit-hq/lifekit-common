import {TestBed} from '@angular/core/testing';
import {signalStore} from '@ngrx/signals';
import {beforeEach, describe, expect, it} from 'vitest';

import {withFilters} from './with-filters.feature';

interface LedgerFilters {
  query: string;
  accountId: string | null;
  includeArchived: boolean;
}

const INITIAL: LedgerFilters = {query: '', accountId: null, includeArchived: false};

const LedgerStore = signalStore({providedIn: 'root'}, withFilters<LedgerFilters>(INITIAL));

describe('withFilters', () => {
  let store: InstanceType<typeof LedgerStore>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    store = TestBed.inject(LedgerStore);
  });

  it('starts at the initial filters with none active', () => {
    expect(store.filters()).toEqual(INITIAL);
    expect(store.hasActiveFilters()).toBe(false);
  });

  it('merges a partial patch instead of replacing the whole object', () => {
    store.setFilters({query: 'coffee'});
    expect(store.filters()).toEqual({...INITIAL, query: 'coffee'});
  });

  it('flags active filters once one differs from the initial value', () => {
    store.setFilters({includeArchived: true});
    expect(store.hasActiveFilters()).toBe(true);
  });

  it('reports no active filters when a patch restores the initial value', () => {
    store.setFilters({query: 'coffee'});
    store.setFilters({query: ''});
    expect(store.hasActiveFilters()).toBe(false);
  });

  it('accumulates successive patches', () => {
    store.setFilters({query: 'coffee'});
    store.setFilters({accountId: 'acc-1'});
    expect(store.filters()).toEqual({query: 'coffee', accountId: 'acc-1', includeArchived: false});
  });

  it('resets every filter back to the initial object', () => {
    store.setFilters({query: 'coffee', accountId: 'acc-1', includeArchived: true});
    store.resetFilters();
    expect(store.filters()).toEqual(INITIAL);
    expect(store.hasActiveFilters()).toBe(false);
  });

  it('ignores an empty patch', () => {
    store.setFilters({});
    expect(store.filters()).toEqual(INITIAL);
    expect(store.hasActiveFilters()).toBe(false);
  });
});
