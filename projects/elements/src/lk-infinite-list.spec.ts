import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// Value import - forces module evaluation so customElements.define('lk-infinite-list', ...)
// runs (package.json has sideEffects pointing at the built bundle only).
import {LkInfiniteList} from './lk-infinite-list';

/** Stands in for IntersectionObserver so a test decides when the sentinel comes into reach. */
class FakeObserver {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static instances: FakeObserver[] = [];

  public observed = 0;
  public disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit
  ) {
    FakeObserver.instances.push(this);
  }

  public observe(): void {
    this.observed += 1;
  }

  public unobserve(): void {
    return;
  }

  public disconnect(): void {
    this.disconnected = true;
  }

  public reach(isIntersecting = true): void {
    const entry: Partial<IntersectionObserverEntry> = {isIntersecting};
    this.callback([entry as IntersectionObserverEntry], this as never);
  }
}

const SKELETON_ROWS = 4;

async function mount(
  props: Partial<
    Pick<LkInfiniteList, 'hasMore' | 'loading' | 'failed' | 'skeletonRows' | 'endLabel'>
  > = {},
  rows = 3
): Promise<LkInfiniteList> {
  const el = document.createElement('lk-infinite-list') as LkInfiniteList;
  Object.assign(el, props);
  for (let i = 0; i < rows; i += 1) {
    el.append(Object.assign(document.createElement('div'), {textContent: `Row ${i + 1}`}));
  }
  document.body.appendChild(el);
  await el.updateComplete;
  // slotchange runs after the first render and re-renders the footer.
  await el.updateComplete;
  return el;
}

function observer(): FakeObserver {
  const found = FakeObserver.instances.at(-1);
  if (!found) {
    throw new Error('no observer');
  }
  return found;
}

function asked(el: LkInfiniteList, name: 'load-more' | 'retry'): () => number {
  let count = 0;
  el.addEventListener(`lk-infinite-list-${name}`, () => (count += 1));
  return () => count;
}

function part<T extends Element = HTMLElement>(el: LkInfiniteList, selector: string): T | null {
  return el.shadowRoot?.querySelector<T>(selector) ?? null;
}

describe('LkInfiniteList', () => {
  beforeEach(() => {
    FakeObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('registers as lk-infinite-list', () => {
    expect(customElements.get('lk-infinite-list')).toBe(LkInfiniteList);
  });

  it('asks for the next page when the end comes within reach', async () => {
    const el = await mount({hasMore: true});
    const loadMore = asked(el, 'load-more');
    observer().reach();
    expect(loadMore()).toBe(1);
  });

  it('observes against the nearest scrolling ancestor', async () => {
    const scroller = document.createElement('main');
    scroller.style.overflowY = 'auto';
    const wrapper = document.createElement('div');
    scroller.append(wrapper);
    document.body.append(scroller);
    const el = document.createElement('lk-infinite-list') as LkInfiniteList;
    el.hasMore = true;
    wrapper.append(el);
    await el.updateComplete;
    expect(observer().options?.root).toBe(scroller);
  });

  it('observes against the viewport when no ancestor scrolls', async () => {
    await mount({hasMore: true});
    expect(observer().options?.root).toBeNull();
  });

  it('crosses a shadow root to reach the scroller', async () => {
    const scroller = document.createElement('main');
    scroller.style.overflowY = 'scroll';
    const host = document.createElement('div');
    scroller.append(host);
    document.body.append(scroller);
    const shadow = host.attachShadow({mode: 'open'});
    const el = document.createElement('lk-infinite-list') as LkInfiniteList;
    el.hasMore = true;
    shadow.append(el);
    await el.updateComplete;
    expect(observer().options?.root).toBe(scroller);
  });

  it('does not ask while the end is out of reach', async () => {
    const el = await mount({hasMore: true});
    const loadMore = asked(el, 'load-more');
    observer().reach(false);
    expect(loadMore()).toBe(0);
  });

  it.each([
    ['there is no more', {hasMore: false}],
    ['a page is loading', {hasMore: true, loading: true}],
    ['the last page failed', {hasMore: true, failed: true}],
  ])('does not ask when %s', async (_name, props) => {
    const el = await mount(props);
    const loadMore = asked(el, 'load-more');
    observer().reach();
    expect(loadMore()).toBe(0);
  });

  it('looks again when a page lands, so a short page keeps filling the screen', async () => {
    const el = await mount({hasMore: true, loading: true});
    const seen = observer().observed;
    el.loading = false;
    await el.updateComplete;
    expect(observer().observed).toBe(seen + 1);
  });

  it('draws skeleton rows only while a page loads, and announces it', async () => {
    const el = await mount({hasMore: true, loading: true, skeletonRows: SKELETON_ROWS});
    expect(el.shadowRoot?.querySelectorAll('.row')).toHaveLength(SKELETON_ROWS);
    expect(part(el, '[role="status"] .sr-only')?.textContent).toBe('Loading more');
    el.loading = false;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelectorAll('.row')).toHaveLength(0);
  });

  it('marks the end once the rows are all there is', async () => {
    const el = await mount({hasMore: false});
    expect(part(el, '[data-end]')?.textContent?.trim()).toBe("You've reached the end");
    el.hasMore = true;
    await el.updateComplete;
    expect(part(el, '[data-end]')).toBeNull();
  });

  it('shows no end marker for a list with no rows', async () => {
    const el = await mount({hasMore: false}, 0);
    expect(part(el, '[data-end]')).toBeNull();
  });

  it('offers an inline retry when a page fails, and only the reader re-asks', async () => {
    const el = await mount({hasMore: true, failed: true});
    const retry = asked(el, 'retry');
    const loadMore = asked(el, 'load-more');
    expect(part(el, '[data-error]')?.getAttribute('role')).toBe('alert');
    part<HTMLButtonElement>(el, '[data-error] button')?.click();
    expect(retry()).toBe(1);
    expect(loadMore()).toBe(0);
  });

  it('stops observing when it leaves the page', async () => {
    const el = await mount({hasMore: true});
    el.remove();
    expect(observer().disconnected).toBe(true);
  });

  it('draws a Load more button where IntersectionObserver is missing', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const el = await mount({hasMore: true});
    const loadMore = asked(el, 'load-more');
    part<HTMLButtonElement>(el, 'button')?.click();
    expect(loadMore()).toBe(1);
  });
});
