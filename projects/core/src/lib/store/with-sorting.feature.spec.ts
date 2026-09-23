import {TestBed} from '@angular/core/testing';
import {signalStore} from '@ngrx/signals';
import {beforeEach, describe, expect, it} from 'vitest';

import {type Sort, withSorting} from './with-sorting.feature';

type Field = 'date' | 'amount' | 'description';

const DEFAULT_SORT: Sort<Field> = {field: 'date', dir: 'desc'};

const LedgerStore = signalStore({providedIn: 'root'}, withSorting<Field>(DEFAULT_SORT));

describe('withSorting', () => {
  let store: InstanceType<typeof LedgerStore>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    store = TestBed.inject(LedgerStore);
  });

  it('starts at the default sort', () => {
    expect(store.sort()).toEqual(DEFAULT_SORT);
  });

  it('sets an explicit sort', () => {
    store.setSort({field: 'amount', dir: 'asc'});
    expect(store.sort()).toEqual({field: 'amount', dir: 'asc'});
  });

  it('toggling a new field sorts it ascending first', () => {
    store.toggleSort('amount');
    expect(store.sort()).toEqual({field: 'amount', dir: 'asc'});
  });

  it('toggling the active field flips its direction', () => {
    store.toggleSort('amount');
    store.toggleSort('amount');
    expect(store.sort()).toEqual({field: 'amount', dir: 'desc'});

    store.toggleSort('amount');
    expect(store.sort()).toEqual({field: 'amount', dir: 'asc'});
  });

  it('toggling the default field flips it rather than restarting ascending', () => {
    store.toggleSort('date');
    expect(store.sort()).toEqual({field: 'date', dir: 'asc'});
  });

  it('switching fields restarts at ascending regardless of the previous direction', () => {
    store.setSort({field: 'amount', dir: 'desc'});
    store.toggleSort('description');
    expect(store.sort()).toEqual({field: 'description', dir: 'asc'});
  });

  it('resets to the default sort', () => {
    store.setSort({field: 'amount', dir: 'asc'});
    store.resetSort();
    expect(store.sort()).toEqual(DEFAULT_SORT);
  });
});
