/**
 * Angular consumption proof for <lk-infinite-list>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects on the
 * package) cannot tree-shake away the module's customElements.define() call.
 */
import {LkInfiniteList} from '@lifekit-hq/elements';

if (!customElements.get('lk-infinite-list')) {
  customElements.define('lk-infinite-list', LkInfiniteList);
}

import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  type OnDestroy,
  signal,
} from '@angular/core';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

const PAGE_SIZE = 8;
const PAGES = 4;
const PAGE_DELAY_MS = 600;

function range(page: number): number[] {
  return Array.from({length: PAGE_SIZE}, (_, i) => page * PAGE_SIZE + i + 1);
}

/**
 * A store's paging in miniature: the rows so far, whether another page exists, and the two
 * request flags the element reads. `failFirst` makes the second page fail once, so the inline
 * retry can be seen.
 */
@Component({
  selector: 'cmn-story-feed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <lk-infinite-list
      [hasMore]="hasMore()"
      [loading]="loading()"
      [failed]="failed()"
      [skeletonRows]="skeletonRows"
      (lk-infinite-list-load-more)="load()"
      (lk-infinite-list-retry)="load()"
    >
      @for (row of rows(); track row) {
        <div class="flex items-center gap-cmn-3 border-b border-border-default px-cmn-4 py-cmn-3">
          <span class="size-10 shrink-0 rounded-full bg-surface-raised"></span>
          <span class="min-w-0 flex-1 truncate text-cmn-sm text-text-primary"
            >Payment {{ row }}</span
          >
          <span class="text-cmn-sm tabular-nums text-text-primary">-€12.24</span>
        </div>
      }
    </lk-infinite-list>
  `,
})
export class StoryFeedComponent implements OnDestroy {
  private page = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private hasFailedOnce = false;

  public skeletonRows = 3;
  public failFirst = false;

  protected readonly rows = signal<number[]>(range(0));
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly hasMore = signal(true);

  protected load(): void {
    this.failed.set(false);
    this.loading.set(true);
    this.timer = setTimeout(() => {
      this.loading.set(false);
      if (this.failFirst && this.page === 1 && !this.hasFailedOnce) {
        this.hasFailedOnce = true;
        this.failed.set(true);
        return;
      }
      this.page += 1;
      this.rows.update(rows => [...rows, ...range(this.page)]);
      this.hasMore.set(this.page < PAGES);
    }, PAGE_DELAY_MS);
  }

  public ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}

const meta: Meta<StoryFeedComponent> = {
  title: 'Elements/LkInfiniteList',
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [StoryFeedComponent]})],
  render: args => ({
    props: args,
    template: `
      <div class="max-w-sm rounded-cmn-md border border-border-default bg-surface-card">
        <cmn-story-feed [failFirst]="failFirst" />
      </div>
      <p class="mt-cmn-2 text-cmn-xs text-text-secondary">Scroll to the end of the page to load the next one.</p>
    `,
  }),
};

export default meta;
type Story = StoryObj<StoryFeedComponent>;

/**
 * The paging contract: the host owns `hasMore`, `loading` and `failed`; the element asks with
 * `lk-infinite-list-load-more` when the end nears. Skeleton rows show while a page appends and
 * the end marker closes the list.
 */
export const Continuous: Story = {args: {failFirst: false}};

/** The second page fails once: the list stops asking and shows an inline Retry. */
export const FailedPage: Story = {args: {failFirst: true}};

/** A list that is already complete: no skeleton, no retry, only the end marker. */
export const EndOnly: Story = {
  render: () => ({
    template: `
      <div class="max-w-sm rounded-cmn-md border border-border-default bg-surface-card">
        <lk-infinite-list>
          <div class="border-b border-border-default px-cmn-4 py-cmn-3 text-cmn-sm text-text-primary">Payment 1</div>
          <div class="border-b border-border-default px-cmn-4 py-cmn-3 text-cmn-sm text-text-primary">Payment 2</div>
        </lk-infinite-list>
      </div>
    `,
  }),
};

/** Skeleton rows only: a page is being appended. */
export const Appending: Story = {
  render: () => ({
    template: `
      <div class="max-w-sm rounded-cmn-md border border-border-default bg-surface-card">
        <lk-infinite-list has-more loading skeleton-rows="2">
          <div class="border-b border-border-default px-cmn-4 py-cmn-3 text-cmn-sm text-text-primary">Payment 1</div>
        </lk-infinite-list>
      </div>
    `,
  }),
};
