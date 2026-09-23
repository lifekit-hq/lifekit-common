import {TestBed} from '@angular/core/testing';
import {signalStore} from '@ngrx/signals';
import {beforeEach, describe, expect, it} from 'vitest';

import {withPagination} from './with-pagination.feature';

const DefaultStore = signalStore({providedIn: 'root'}, withPagination());
const SmallPageStore = signalStore({providedIn: 'root'}, withPagination(10));

function build<T>(store: new (...args: never[]) => T): T {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(store as never);
}

describe('withPagination', () => {
  let store: InstanceType<typeof SmallPageStore>;

  beforeEach(() => {
    store = build(SmallPageStore);
  });

  it('starts on the first page with nothing loaded', () => {
    expect(store.offset()).toBe(0);
    expect(store.limit()).toBe(10);
    expect(store.totalCount()).toBe(0);
    expect(store.currentPage()).toBe(1);
    expect(store.totalPages()).toBe(1);
    expect(store.pagination().hasMore).toBe(false);
  });

  it('defaults the page size to 50', () => {
    expect(build(DefaultStore).limit()).toBe(50);
  });

  it('reports more pages once the total exceeds one page', () => {
    store.setTotalCount(25);
    expect(store.pagination().hasMore).toBe(true);
    expect(store.totalPages()).toBe(3);
  });

  it('reports no more pages when the total fits on one page', () => {
    store.setTotalCount(10);
    expect(store.pagination().hasMore).toBe(false);
    expect(store.totalPages()).toBe(1);
  });

  it('advances one page at a time', () => {
    store.setTotalCount(25);
    store.nextPage();
    expect(store.offset()).toBe(10);
    expect(store.currentPage()).toBe(2);
  });

  it('refuses to advance past the last page', () => {
    store.setTotalCount(25);
    store.nextPage();
    store.nextPage();
    expect(store.offset()).toBe(20);
    expect(store.pagination().hasMore).toBe(false);

    store.nextPage();
    expect(store.offset()).toBe(20);
  });

  it('steps back a page', () => {
    store.setTotalCount(25);
    store.nextPage();
    store.previousPage();
    expect(store.offset()).toBe(0);
  });

  it('clamps the offset at zero when stepping back from the first page', () => {
    store.previousPage();
    expect(store.offset()).toBe(0);
    expect(store.currentPage()).toBe(1);
  });

  it('jumps to a one-based page number', () => {
    store.setTotalCount(100);
    store.goToPage(4);
    expect(store.offset()).toBe(30);
    expect(store.currentPage()).toBe(4);
  });

  it('clamps a zero or negative page to the first page', () => {
    store.setTotalCount(100);
    store.goToPage(0);
    expect(store.offset()).toBe(0);

    store.goToPage(-3);
    expect(store.offset()).toBe(0);
  });

  it('returns to the first page when the page size changes', () => {
    store.setTotalCount(100);
    store.goToPage(5);
    store.setLimit(25);
    expect(store.limit()).toBe(25);
    expect(store.offset()).toBe(0);
    expect(store.totalPages()).toBe(4);
  });

  it('exposes the whole pagination shape in one computed', () => {
    store.setTotalCount(25);
    store.nextPage();
    expect(store.pagination()).toEqual({totalCount: 25, offset: 10, limit: 10, hasMore: true});
  });

  it('resets the offset without touching the page size or total', () => {
    store.setTotalCount(25);
    store.nextPage();
    store.resetOffset();
    expect(store.offset()).toBe(0);
    expect(store.limit()).toBe(10);
    expect(store.totalCount()).toBe(25);
  });

  it('degrades to a single page when the limit is zero — no divide-by-zero', () => {
    store.setTotalCount(25);
    store.setLimit(0);
    expect(store.currentPage()).toBe(1);
    expect(store.totalPages()).toBe(1);
  });

  it('rounds a partial last page up', () => {
    store.setTotalCount(21);
    expect(store.totalPages()).toBe(3);
  });
});
