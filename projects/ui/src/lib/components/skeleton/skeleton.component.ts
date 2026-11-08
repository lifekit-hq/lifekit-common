import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

export type SkeletonShape =
  'bar' | 'row' | 'stat' | 'chart' | 'section' | 'list' | 'card' | 'detail' | 'overview';

/**
 * The page presets: the body of a `cmn-page` of that kind, drawn from the parts above. Their host
 * is `display: contents`, so each block they draw is a top-level block of the page column and the
 * column's own section gap sits between them, as it does between the real blocks, only when the
 * preset is a direct child of the `cmn-page` column. Put them straight in `cmn-page`: inside
 * `cmn-async-state` (no display of its own) that gap does not apply, so use the part presets
 * (`row`, `section`, `stat`, `chart`) with its `skeletonShape`.
 */
const PAGE_SHAPES: readonly SkeletonShape[] = ['list', 'card', 'detail', 'overview'];

/** A step of the type ramp (`text-cmn-*`): the line a `text` skeleton stands in for. */
export type SkeletonText = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

// Spelled out in full: Tailwind finds classes by scanning for whole class names.
const TEXT_LINE_CLASSES: Record<SkeletonText, string> = {
  xs: 'flex items-center text-cmn-xs',
  sm: 'flex items-center text-cmn-sm',
  md: 'flex items-center text-cmn-md',
  lg: 'flex items-center text-cmn-lg',
  xl: 'flex items-center text-cmn-xl',
  '2xl': 'flex items-center text-cmn-2xl',
  '3xl': 'flex items-center text-cmn-3xl',
  '4xl': 'flex items-center text-cmn-4xl',
};

const BAR = 'cmn-skeleton-sweep block rounded-cmn-sm';
const DISC = 'cmn-skeleton-sweep block shrink-0 rounded-cmn-full';
const ROW_CLASSES =
  'flex min-h-cmn-size-lg items-center gap-cmn-3 border-b border-border-default px-cmn-4 py-cmn-3 last:border-b-0';
const CARD_CLASSES = 'rounded-cmn-md border border-border-default bg-surface-card';

/** Rows a `row` preset draws unless `count` says otherwise: one. A `section` draws three. */
const DEFAULT_ROWS = 1;
const DEFAULT_SECTION_ROWS = 3;
/** Lines a `card` draws under its title, and fact rows a `detail` draws, unless `count` says otherwise. */
const DEFAULT_CARD_LINES = 3;
const DEFAULT_FACT_ROWS = 4;
/** What a `detail` draws after its facts, and what a `list` and an `overview` draw of sections. */
const DETAIL_RELATED_ROWS = 2;
const LIST_SECTIONS = 2;
const OVERVIEW_STATS = 4;
const OVERVIEW_SECTIONS = 2;
const PAGE_CARD_CLASSES =
  'flex flex-col gap-cmn-2 rounded-cmn-md border border-border-default bg-surface-card p-cmn-4';
const FACTS_ROW_CLASSES = 'py-cmn-3 sm:grid sm:grid-cols-3 sm:gap-cmn-4';

/**
 * A loading placeholder. With no `shape` it is one bar sized by `width` and `height`; with `text` it
 * is one bar on a line of that step of the type ramp, as tall as the line of text it stands in for
 * whatever the ramp's line-height is (`1lh`), so a figure or a label never moves the page when it
 * arrives. A `shape`
 * draws the whole silhouette of a component instead, copying that component's box so the page
 * does not move when the content replaces it:
 *
 * - `row`: `count` two-line list rows (avatar, label and sublabel, amount), as `cmn-list-item-row`
 * - `stat`: a `cmn-stat-card` (label, value, delta)
 * - `chart`: a `cmn-line-chart` card. The plot reserves the chart's `h-48`, or `aspect` (e.g.
 *   `16 / 9`) when the chart is sized by ratio, so the box is the same before and after the data
 * - `section`: a `cmn-list-section` (sticky-heading height) over a card of `count` rows
 *
 * The page presets draw the body of a whole page of one kind (the title is the page's own), so a
 * first load and the loaded page are the same blocks in the same order. Place them directly in the
 * `cmn-page` column, not inside `cmn-async-state`:
 *
 * - `list`: two `section`s of `count` rows (default 3), as a `cmn-page kind="list"`
 * - `card`: one card, a title line over `count` lines of text (default 3)
 * - `detail`: an intro, a facts section of `count` key-value rows (default 4, as a
 *   `cmn-description-list`), then a section of two rows, as a `cmn-page kind="detail"`
 * - `overview`: a grid of four `stat` cards over two `section`s, as a `cmn-page kind="overview"`.
 *   The rail stacks under the main column on a phone, below the fold, so it is not drawn.
 *
 * The sheen sweeps across each block and stops under Reduce Motion, leaving the still block.
 */
@Component({
  selector: 'cmn-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: {
    '[class.block]': "(shape() !== 'bar' && !pageShape()) || text() !== null",
    '[class.contents]': 'pageShape()',
    '[attr.aria-hidden]': "shape() === 'bar' ? null : 'true'",
  },
  template: `
    @switch (shape()) {
      @case ('row') {
        <ng-container *ngTemplateOutlet="rows" />
      }
      @case ('section') {
        <ng-container *ngTemplateOutlet="heading" />
        <div [class]="card"><ng-container *ngTemplateOutlet="rows" /></div>
      }
      @case ('list') {
        @for (_ of listSections; track $index) {
          <cmn-skeleton [count]="count()" shape="section" />
        }
      }
      @case ('card') {
        <div [class]="pageCard">
          <div class="flex items-center" style="height: 1.3125rem">
            <div [class]="bar" style="width: 40%; height: 0.875rem"></div>
          </div>
          @for (_ of cardLines(); track $index) {
            <cmn-skeleton [width]="$last ? '60%' : '100%'" text="sm" />
          }
        </div>
      }
      @case ('detail') {
        <div class="flex flex-col gap-cmn-group-gap">
          <cmn-skeleton text="sm" width="45%" />
          <cmn-skeleton text="sm" width="100%" />
        </div>
        <div>
          <ng-container *ngTemplateOutlet="heading" />
          <div [class]="card">
            <div class="divide-y divide-border-default px-cmn-4">
              @for (_ of factRows(); track $index) {
                <div [class]="factsRow">
                  <div class="flex items-center" style="height: 1.3125rem">
                    <div [class]="bar" style="width: 50%; height: 0.875rem"></div>
                  </div>
                  <div class="mt-cmn-1 sm:col-span-2 sm:mt-0">
                    <div class="flex items-center" style="height: 1.3125rem">
                      <div [class]="bar" style="width: 75%; height: 0.875rem"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        <cmn-skeleton [count]="relatedRows" shape="section" />
      }
      @case ('overview') {
        <div class="grid grid-cols-2 gap-cmn-group-gap md:grid-cols-4">
          @for (_ of overviewStats; track $index) {
            <cmn-skeleton shape="stat" />
          }
        </div>
        @for (_ of overviewSections; track $index) {
          <cmn-skeleton [count]="count()" shape="section" />
        }
      }
      @case ('stat') {
        <div
          class="flex flex-col gap-cmn-2 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
        >
          <div class="flex items-center justify-between gap-cmn-2" style="height: 1rem">
            <div [class]="bar" style="width: 40%; height: 0.75rem"></div>
            <div [class]="bar" style="width: 1rem; height: 1rem"></div>
          </div>
          <div [class]="bar" style="width: 75%; height: 2.275rem"></div>
          <div class="flex items-center" style="height: 1rem">
            <div [class]="bar" style="width: 50%; height: 0.75rem"></div>
          </div>
        </div>
      }
      @case ('chart') {
        <div
          class="flex w-full flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
        >
          <div class="flex items-center text-cmn-xs" style="height: 1lh">
            <div [class]="bar" style="width: 35%; height: 0.75rem"></div>
          </div>
          <div
            [class]="bar"
            [style.height]="aspect() ? null : '12rem'"
            [style.aspect-ratio]="aspect() || null"
            class="w-full"
          ></div>
        </div>
      }
      @default {
        @if (textLine(); as line) {
          <!-- One line of the step's text: 1lh is its line box, so the ramp owns the height -->
          <div [class]="line" style="height: 1lh">
            <div [class]="classes()" [style.width]="width()" style="height: 0.75em"></div>
          </div>
        } @else {
          <div [class]="classes()" [style.width]="width()" [style.height]="height()"></div>
        }
      }
    }
    <!-- The heading's box: the group gap around one line of text-cmn-sm (1.3125rem), at least the 40px
         layout step, as the list section's heading is -->
    <ng-template #heading>
      <div class="flex min-h-cmn-size-md items-center px-cmn-1 py-cmn-group-gap">
        <div class="flex w-full items-center" style="height: 1.3125rem">
          <div [class]="bar" style="width: 30%; height: 0.875rem"></div>
        </div>
      </div>
    </ng-template>
    <ng-template #rows>
      @for (_ of rowIndexes(); track $index) {
        <div [class]="rowClasses">
          <div [class]="disc" style="width: 2.5rem; height: 2.5rem"></div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center" style="height: 1.3125rem">
              <div [class]="bar" style="width: 55%; height: 0.875rem"></div>
            </div>
            <div class="flex items-center text-cmn-xs" style="height: 1lh">
              <div [class]="bar" style="width: 35%; height: 0.75rem"></div>
            </div>
          </div>
          <div [class]="bar" class="shrink-0" style="width: 4rem; height: 0.875rem"></div>
        </div>
      }
    </ng-template>
  `,
})
export class SkeletonComponent {
  public readonly shape = input<SkeletonShape>('bar');
  /** `bar` only: the bar's width. */
  public readonly width = input<string>('100%');
  /** `bar` only: the bar's height. */
  public readonly height = input<string>('1.25rem');
  /** `bar` only: stand in for one line of this step of the type ramp; `height` is then ignored. */
  public readonly text = input<SkeletonText | null>(null);
  /** `bar` only: classes added to the bar. */
  public readonly className = input<string>('');
  /**
   * `row` and `section`: how many rows to draw (default 1, and 3 for a section). `list` and
   * `overview`: rows per section. `card`: lines of text. `detail`: fact rows.
   */
  public readonly count = input<number | null>(null);
  /** `chart`: reserve the plot as a width-to-height ratio (`16 / 9`) instead of the chart's fixed height. */
  public readonly aspect = input<string | null>(null);

  public readonly classes = computed(() => {
    const extra = this.className();
    return extra ? `${BAR} ${extra}` : BAR;
  });

  protected readonly textLine = computed<string | null>(() => {
    const step = this.text();
    return step ? TEXT_LINE_CLASSES[step] : null;
  });

  protected readonly pageShape = computed(() => PAGE_SHAPES.includes(this.shape()));

  protected readonly bar = BAR;
  protected readonly pageCard = PAGE_CARD_CLASSES;
  protected readonly factsRow = FACTS_ROW_CLASSES;
  protected readonly relatedRows = DETAIL_RELATED_ROWS;
  protected readonly listSections = Array.from({length: LIST_SECTIONS});
  protected readonly overviewStats = Array.from({length: OVERVIEW_STATS});
  protected readonly overviewSections = Array.from({length: OVERVIEW_SECTIONS});
  protected readonly disc = DISC;
  protected readonly card = CARD_CLASSES;
  protected readonly rowClasses = ROW_CLASSES;

  protected readonly cardLines = computed(() =>
    Array.from({length: Math.max(1, this.count() ?? DEFAULT_CARD_LINES)})
  );

  protected readonly factRows = computed(() =>
    Array.from({length: Math.max(1, this.count() ?? DEFAULT_FACT_ROWS)})
  );

  protected readonly rowIndexes = computed(() => {
    const fallback = this.shape() === 'section' ? DEFAULT_SECTION_ROWS : DEFAULT_ROWS;
    return Array.from({length: Math.max(1, this.count() ?? fallback)});
  });
}
