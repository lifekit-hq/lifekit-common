import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from 'lit';

/** Placeholder rows drawn while a page is being appended, unless `skeleton-rows` says otherwise. */
const DEFAULT_SKELETON_ROWS = 3;

/** How far below the scrolling area the next page starts loading: about one phone screen ahead. */
const DEFAULT_ROOT_MARGIN = '0px 0px 600px 0px';

const SCROLLING_OVERFLOW = /auto|scroll|overlay/;

/**
 * The nearest ancestor that scrolls vertically, crossing shadow roots, or null for the viewport.
 * `rootMargin` only reaches ahead of the root the observer uses, so inside a scrolling shell the
 * root has to be that scroller rather than the viewport.
 */
function findScrollRoot(start: Element): Element | null {
  let node: Node | null = start;
  while (node) {
    const parent: Node | null =
      node.parentNode instanceof ShadowRoot ? node.parentNode.host : node.parentNode;
    if (parent instanceof Element && SCROLLING_OVERFLOW.test(getComputedStyle(parent).overflowY)) {
      return parent;
    }
    node = parent;
  }
  return null;
}

/**
 * A list that keeps loading as the reader nears its end, instead of ending in a Load More button
 * or a pager. The rows are the element's children; it draws what follows them: skeleton rows while
 * a page is being appended, an inline retry when that fails, and an end marker once there is
 * nothing more.
 *
 * It owns no data. A host (an app store) drives it through three properties and two events, the
 * paging contract:
 *
 * - `hasMore`: the store has another page to fetch (it has a cursor, or the last page was full).
 * - `loading`: a page is being fetched (the store's append request is in flight).
 * - `failed`: the last append request failed. The list stops asking until the reader presses Retry.
 * - `lk-infinite-list-load-more`: the end is within reach of the viewport and the store may fetch
 *   the next page. Fires only while `hasMore` is on and neither `loading` nor `failed` is.
 * - `lk-infinite-list-retry`: the reader pressed Retry. The host fetches again and clears `failed`.
 *
 * The element never changes those properties itself, so it cannot disagree with the store. It asks
 * again whenever `loading` or `failed` turns off while the end is still within reach, so a short
 * first page keeps filling until the screen is full. Without `IntersectionObserver` it draws a
 * 44px Load More button instead, firing the same event.
 *
 * The first page is not its job: draw that with the host's own loading state and put the list
 * under it once rows exist, so the skeleton rows here only ever mean "appending".
 *
 * @example
 * <lk-infinite-list has-more>
 *   <div>Row 1</div>
 *   <div>Row 2</div>
 * </lk-infinite-list>
 * <script>
 *   const list = document.querySelector('lk-infinite-list');
 *   list.addEventListener('lk-infinite-list-load-more', async () => {
 *     list.loading = true;
 *     const page = await fetchNextPage();
 *     list.append(...page.rows);
 *     list.hasMore = page.hasMore;
 *     list.loading = false;
 *   });
 * </script>
 */
export class LkInfiniteList extends LitElement {
  private observer: IntersectionObserver | undefined;
  private hasRows = false;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: block;
      min-width: 0;
      font-family: var(--font-sans);
      font-size: 0.875rem;
    }

    :host([hidden]) {
      display: none;
    }

    .sentinel {
      height: 1px;
      margin-top: -1px;
      visibility: hidden;
      pointer-events: none;
    }

    .row {
      display: flex;
      align-items: center;
      gap: var(--space-3, 0.75rem);
      box-sizing: border-box;
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      border-bottom: 1px solid var(--color-border-default, #d9e0e3);
    }

    .row:last-child {
      border-bottom: 0;
    }

    .disc,
    .bar {
      position: relative;
      overflow: hidden;
      flex: none;
      background-color: var(--color-skeleton, var(--color-surface-raised, #e8edef));
    }

    .disc {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--radius-full, 9999px);
    }

    .bar {
      height: 0.75rem;
      border-radius: var(--radius-sm, 0.25rem);
    }

    .bar.title {
      width: 55%;
      height: 0.875rem;
    }

    .bar.subtitle {
      width: 35%;
    }

    .bar.amount {
      width: 4rem;
      height: 0.875rem;
    }

    .lines {
      flex: 1;
      min-width: 0;
    }

    /* Each line sits in the line box the real row's text has, so the page does not shift. */
    .line {
      display: flex;
      align-items: center;
    }

    .line.label {
      height: 1.3125rem;
    }

    .line.sublabel {
      height: 0.9375rem;
    }

    .disc::after,
    .bar::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(
        90deg,
        transparent,
        var(--color-skeleton-sheen, var(--color-surface-card, #ffffff)),
        transparent
      );
      animation: sweep calc(var(--cmn-duration-long, 400ms) * 3.5)
        var(--cmn-ease-standard, cubic-bezier(0.2, 0, 0, 1)) infinite;
    }

    @keyframes sweep {
      to {
        transform: translateX(100%);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .disc::after,
      .bar::after {
        animation: none;
      }
    }

    .note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3, 0.75rem);
      min-height: var(--size-touch, 44px);
      padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
      color: var(--color-text-secondary, #46565e);
      text-align: center;
    }

    .note.error {
      color: var(--color-text-primary, #0f1a1f);
    }

    button {
      min-width: var(--size-touch, 44px);
      min-height: var(--size-touch, 44px);
      padding: 0 var(--space-4, 1rem);
      border: 1px solid var(--color-border-default, #d9e0e3);
      border-radius: var(--radius-md, 0.5rem);
      background: var(--color-surface-card, #ffffff);
      color: var(--color-accent-default, #175a6d);
      font: inherit;
      font-weight: 500;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    button:hover {
      background: var(--color-surface-hover, #dce3e6);
    }

    button:focus-visible {
      outline: 2px solid var(--color-border-focus, #1d6f85);
      outline-offset: 2px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    hasMore: {type: Boolean, attribute: 'has-more', reflect: true},
    loading: {type: Boolean, reflect: true},
    failed: {type: Boolean, reflect: true},
    skeletonRows: {type: Number, attribute: 'skeleton-rows'},
    rootMargin: {type: String, attribute: 'root-margin'},
    endLabel: {type: String, attribute: 'end-label'},
    loadingLabel: {type: String, attribute: 'loading-label'},
    errorLabel: {type: String, attribute: 'error-label'},
    retryLabel: {type: String, attribute: 'retry-label'},
    loadMoreLabel: {type: String, attribute: 'load-more-label'},
  };

  /** The store has another page to fetch. */
  declare public hasMore: boolean;
  /** A page is being fetched: skeleton rows show and no further page is asked for. */
  declare public loading: boolean;
  /** The last fetch failed: an inline Retry shows and no further page is asked for. */
  declare public failed: boolean;
  /** How many skeleton rows to draw while `loading`. */
  declare public skeletonRows: number;
  /**
   * `IntersectionObserver` margin: how far past the nearest scrolling ancestor (else the viewport)
   * the end counts as within reach.
   */
  declare public rootMargin: string;
  /** Shown at the end of a list that has rows and nothing more to load. */
  declare public endLabel: string;
  /** Read out, not shown, while a page loads. */
  declare public loadingLabel: string;
  /** Shown beside Retry when a page failed to load. */
  declare public errorLabel: string;
  declare public retryLabel: string;
  /** The button drawn instead of continuous loading where `IntersectionObserver` is missing. */
  declare public loadMoreLabel: string;

  constructor() {
    super();
    this.hasMore = false;
    this.loading = false;
    this.failed = false;
    this.skeletonRows = DEFAULT_SKELETON_ROWS;
    this.rootMargin = DEFAULT_ROOT_MARGIN;
    this.endLabel = "You've reached the end";
    this.loadingLabel = 'Loading more';
    this.errorLabel = "Couldn't load more.";
    this.retryLabel = 'Try again';
    this.loadMoreLabel = 'Load more';
  }

  private get sentinel(): Element | null {
    return this.shadowRoot?.querySelector('.sentinel') ?? null;
  }

  /** The list asks for a page only when nothing is in flight, nothing failed and there is more. */
  private get ready(): boolean {
    return this.hasMore && !this.loading && !this.failed;
  }

  private emit(name: 'lk-infinite-list-load-more' | 'lk-infinite-list-retry'): void {
    this.dispatchEvent(new CustomEvent<void>(name, {bubbles: true, composed: true}));
  }

  private observe(): void {
    const sentinel = this.sentinel;
    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting) && this.ready) {
          this.emit('lk-infinite-list-load-more');
        }
      },
      {root: findScrollRoot(this), rootMargin: this.rootMargin}
    );
    this.observer.observe(sentinel);
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this.observe();
    }
  }

  public override disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.observe();
  }

  protected override updated(changed: PropertyValues<this>): void {
    // An observer reports only a change of state. Observing again reports the current one, so a
    // sentinel that is still in reach once a page lands asks for the next page.
    if (
      this.observer &&
      (changed.has('loading') || changed.has('failed') || changed.has('hasMore'))
    ) {
      const sentinel = this.sentinel;
      if (sentinel) {
        this.observer.unobserve(sentinel);
        this.observer.observe(sentinel);
      }
    }
    if (changed.has('rootMargin') && this.hasUpdated && changed.get('rootMargin') !== undefined) {
      this.observe();
    }
  }

  private onSlotChange(event: Event): void {
    const rows = (event.target as HTMLSlotElement).assignedElements();
    const hasRows = rows.length > 0;
    if (hasRows !== this.hasRows) {
      this.hasRows = hasRows;
      this.requestUpdate();
    }
  }

  private renderSkeletonRows(): TemplateResult {
    const rows = Math.max(1, Math.round(this.skeletonRows));
    return html`
      <div role="status" data-skeleton>
        <span class="sr-only">${this.loadingLabel}</span>
        <div aria-hidden="true">
          ${Array.from(
            {length: rows},
            () => html`
              <div class="row">
                <div class="disc"></div>
                <div class="lines">
                  <div class="line label"><div class="bar title"></div></div>
                  <div class="line sublabel"><div class="bar subtitle"></div></div>
                </div>
                <div class="bar amount"></div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private renderFooter(): TemplateResult | typeof nothing {
    if (this.loading) {
      return this.renderSkeletonRows();
    }
    if (this.failed) {
      return html`
        <div class="note error" role="alert" data-error>
          <span>${this.errorLabel}</span>
          <button type="button" @click=${() => this.emit('lk-infinite-list-retry')}>
            ${this.retryLabel}
          </button>
        </div>
      `;
    }
    if (this.hasMore) {
      // No observer to ask for the next page: the reader asks.
      return typeof IntersectionObserver === 'undefined'
        ? html`
            <div class="note">
              <button type="button" @click=${() => this.emit('lk-infinite-list-load-more')}>
                ${this.loadMoreLabel}
              </button>
            </div>
          `
        : nothing;
    }
    return this.hasRows ? html`<p class="note" data-end>${this.endLabel}</p>` : nothing;
  }

  protected override render(): TemplateResult {
    return html`
      <slot @slotchange=${(event: Event) => this.onSlotChange(event)}></slot>
      <div class="sentinel" aria-hidden="true"></div>
      ${this.renderFooter()}
    `;
  }
}

customElements.define('lk-infinite-list', LkInfiniteList);
