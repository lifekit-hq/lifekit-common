import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

export type SkeletonShape = 'bar' | 'row' | 'stat' | 'chart' | 'section';

const BAR = 'cmn-skeleton-sweep block rounded-cmn-sm';
const DISC = 'cmn-skeleton-sweep block shrink-0 rounded-cmn-full';
const ROW_CLASSES =
  'flex items-center gap-cmn-3 border-b border-border-default px-cmn-4 py-cmn-3 last:border-b-0';
const CARD_CLASSES = 'rounded-cmn-md border border-border-default bg-surface-card';

/** Rows a `row` preset draws unless `count` says otherwise: one. A `section` draws three. */
const DEFAULT_ROWS = 1;
const DEFAULT_SECTION_ROWS = 3;

/**
 * A loading placeholder. With no `shape` it is one bar sized by `width` and `height`. A `shape`
 * draws the whole silhouette of a component instead, copying that component's box so the page
 * does not move when the content replaces it:
 *
 * - `row`: `count` two-line list rows (avatar, label and sublabel, amount), as `cmn-list-item-row`
 * - `stat`: a `cmn-stat-card` (label, value, delta)
 * - `chart`: a `cmn-line-chart` card. The plot reserves the chart's `h-48`, or `aspect` (e.g.
 *   `16 / 9`) when the chart is sized by ratio, so the box is the same before and after the data
 * - `section`: a `cmn-list-section` (sticky-heading height) over a card of `count` rows
 *
 * The sheen sweeps across each block and stops under Reduce Motion, leaving the still block.
 */
@Component({
  selector: 'cmn-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: {
    '[class.block]': "shape() !== 'bar'",
    '[attr.aria-hidden]': "shape() === 'bar' ? null : 'true'",
  },
  template: `
    @switch (shape()) {
      @case ('row') {
        <ng-container *ngTemplateOutlet="rows" />
      }
      @case ('section') {
        <div class="flex items-center px-cmn-1 py-cmn-2">
          <div [class]="bar" style="width: 30%; height: 0.75rem"></div>
        </div>
        <div [class]="card"><ng-container *ngTemplateOutlet="rows" /></div>
      }
      @case ('stat') {
        <div
          class="flex flex-col gap-cmn-2 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
        >
          <div class="flex items-center justify-between gap-cmn-2" style="height: 1rem">
            <div [class]="bar" style="width: 40%; height: 0.75rem"></div>
            <div [class]="bar" style="width: 1rem; height: 1rem"></div>
          </div>
          <div [class]="bar" style="width: 75%; height: 1.875rem"></div>
          <div class="flex items-center" style="height: 1rem">
            <div [class]="bar" style="width: 50%; height: 0.75rem"></div>
          </div>
        </div>
      }
      @case ('chart') {
        <div
          class="flex w-full flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
        >
          <div class="flex items-center" style="height: 0.9375rem">
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
        <div [class]="classes()" [style.width]="width()" [style.height]="height()"></div>
      }
    }
    <ng-template #rows>
      @for (_ of rowIndexes(); track $index) {
        <div [class]="rowClasses">
          <div [class]="disc" style="width: 2.5rem; height: 2.5rem"></div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center" style="height: 1.3125rem">
              <div [class]="bar" style="width: 55%; height: 0.875rem"></div>
            </div>
            <div class="flex items-center" style="height: 0.9375rem">
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
  /** `bar` only: classes added to the bar. */
  public readonly className = input<string>('');
  /** `row` and `section`: how many rows to draw (default 1, and 3 for a section). */
  public readonly count = input<number | null>(null);
  /** `chart`: reserve the plot as a width-to-height ratio (`16 / 9`) instead of the chart's fixed height. */
  public readonly aspect = input<string | null>(null);

  public readonly classes = computed(() => {
    const extra = this.className();
    return extra ? `${BAR} ${extra}` : BAR;
  });

  protected readonly bar = BAR;
  protected readonly disc = DISC;
  protected readonly card = CARD_CLASSES;
  protected readonly rowClasses = ROW_CLASSES;

  protected readonly rowIndexes = computed(() => {
    const fallback = this.shape() === 'section' ? DEFAULT_SECTION_ROWS : DEFAULT_ROWS;
    return Array.from({length: Math.max(1, this.count() ?? fallback)});
  });
}
