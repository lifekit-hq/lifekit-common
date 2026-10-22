import {BreakpointObserver} from '@angular/cdk/layout';
import {CdkTableModule} from '@angular/cdk/table';
import {NgTemplateOutlet} from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  model,
  output,
  TrackByFunction,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {map} from 'rxjs';

import {TooltipDirective} from '../../directives/tooltip/tooltip.directive';
import {CMN_MEDIA_MD} from '../../tokens/breakpoints';
import {ButtonComponent} from '../button/button.component';
import {CardComponent} from '../card/card.component';
import {IconComponent, type LucideIconName} from '../icon/icon.component';
import {SelectComponent, type SelectOption, type SelectValue} from '../select/select.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';
import {CmnColumnAlign, CmnColumnComponent, CmnListSlot} from './data-table-column.component';
import {type CmnPageChange, type CmnTablePagination} from './data-table-pagination.model';
import {type CmnSortDirection, type CmnSortMode, type CmnTableSort} from './data-table-sort.model';

const SKELETON_ROWS = 5;

/** Bar widths cycled across a skeleton row, one bar per declared column. */
const SKELETON_BAR_WIDTHS = ['20%', '35%', '25%'];

const ALIGN_CLASSES: Record<CmnColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** The table's own frame. Inside a `cmn-card` the card frames it, so it is dropped (no nested card). */
const FRAME_CLASSES = 'rounded-cmn-lg border border-border-default bg-surface-card';

/** The table's scroll box: focusable so a keyboard can scroll it, with an inset focus ring. */
const SCROLL_CLASSES =
  'min-h-0 flex-1 overflow-auto focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-inset focus-visible:ring-border-focus';

/** A sortable header's button; it keeps the header's type and lifts to primary on hover. */
const SORT_BUTTON_CLASSES =
  'inline-flex items-center gap-cmn-1 rounded-cmn-sm font-semibold hover:text-text-primary ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';

/** A truncated cell's text box: focusable so a keyboard reaches the full-value tooltip. */
const TRUNCATE_CLASSES =
  'truncate rounded-cmn-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ' +
  'focus-visible:ring-border-focus';

const PAGE_BUTTON_BASE =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-cmn-md px-cmn-2 font-label ' +
  'text-cmn-sm tabular-nums transition-colors focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-border-focus';
const PAGE_BUTTON_CURRENT = 'bg-accent-default text-text-inverse';
const PAGE_BUTTON_OTHER = 'text-text-primary hover:bg-surface-raised';

/** Up to this many pages are all listed; past it the pager elides runs with an ellipsis. */
const MAX_LISTED_PAGES = 7;
/** Pages kept on each side of the current page when the pager elides. */
const PAGE_SIBLINGS = 1;
/** How many pages from an end the current page can be and still share a run with that end. */
const PAGE_EDGE_RUN = 4;

/** Stands in for an empty cell, so a blank never reads as missing data. */
const EMPTY_CELL_TEXT = '\u2014';

const SORT_COLLATOR = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

const SORT_ICONS: Record<'asc' | 'desc' | 'none', LucideIconName> = {
  asc: 'ArrowUp',
  desc: 'ArrowDown',
  none: 'ArrowUpDown',
};

const ARIA_SORT: Record<'asc' | 'desc' | 'none', string> = {
  asc: 'ascending',
  desc: 'descending',
  none: 'none',
};

const ROW_BASE_CLASS = 'transition-colors';
const ROW_ACTIONABLE_CLASS =
  'cursor-pointer hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus';

/**
 * `responsive` (default) renders list rows below `md` when at least one column
 * declares a `listSlot`, and the table otherwise; `table` and `list` pin one layout.
 */
export type CmnTableMode = 'responsive' | 'table' | 'list';

type ListSlotColumns = Record<CmnListSlot, CmnColumnComponent[]>;

/** A page number in the pager, or `null` where a run of pages is elided. */
type PagerItem = number | null;

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim());
}

/** The default ascending order: numbers and dates by value, anything else as text. */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  return SORT_COLLATOR.compare(String(a), String(b));
}

@Component({
  selector: 'cmn-data-table',
  imports: [
    ButtonComponent,
    CdkTableModule,
    FormsModule,
    IconComponent,
    NgTemplateOutlet,
    SelectComponent,
    SkeletonComponent,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'flex h-full min-h-0 flex-col'},
  template: `
    <ng-template #cellContent let-col let-row="row" let-i="index">
      @if (col.cell(); as c) {
        <ng-container *ngTemplateOutlet="c.template; context: {$implicit: row, index: i}" />
      } @else {
        @let text = defaultCell(row, col.key());
        @if (text) {
          {{ text }}
        } @else {
          <span [attr.aria-label]="emptyCellLabel()" role="img">{{ emptyCellText }}</span>
        }
      }
    </ng-template>

    <ng-template #headerContent let-col>
      @if (col.headerCell(); as h) {
        <ng-container *ngTemplateOutlet="h.template" />
      } @else {
        {{ col.header() }}
      }
    </ng-template>

    <ng-template #summaryContent let-col>
      @if (col.summaryCell(); as s) {
        <ng-container *ngTemplateOutlet="s.template" />
      } @else {
        {{ col.summary() }}
      }
    </ng-template>

    @if (showList()) {
      <div [class]="frameClasses">
        @if (loading()) {
          <div class="divide-y divide-border-default" data-testid="list-skeleton">
            @for (_ of skeletonRows; track $index) {
              <div class="flex items-center gap-cmn-3 px-cmn-4 py-cmn-3">
                <div class="flex flex-1 flex-col gap-cmn-2">
                  <cmn-skeleton height="0.875rem" width="60%" />
                  <cmn-skeleton height="0.75rem" width="40%" />
                </div>
                <cmn-skeleton height="0.875rem" width="4rem" />
              </div>
            }
          </div>
        } @else {
          <ul class="divide-y divide-border-default" role="list">
            @for (row of displayRows(); track trackRow($index, row); let i = $index) {
              <li
                [attr.tabindex]="rowsActionable() ? 0 : null"
                [class]="listRowClass()"
                (click)="rowClick.emit(row)"
                (keydown.enter)="onRowKey($event, row)"
                (keydown.space)="onRowKey($event, row)"
                data-testid="list-row"
              >
                @for (col of listColumns().leading; track col.key()) {
                  <div class="shrink-0">
                    <ng-container
                      *ngTemplateOutlet="cellContent; context: {$implicit: col, row, index: i}"
                    />
                  </div>
                }
                <div class="min-w-0 flex-1">
                  @if (listColumns().primary.length) {
                    <div
                      class="truncate font-label text-cmn-sm font-medium text-text-primary"
                      data-testid="list-primary"
                    >
                      @for (col of listColumns().primary; track col.key(); let last = $last) {
                        <ng-container
                          *ngTemplateOutlet="cellContent; context: {$implicit: col, row, index: i}"
                        />
                        @if (!last) {
                          {{ ' ' }}
                        }
                      }
                    </div>
                  }
                  @if (listColumns().secondary.length) {
                    <div
                      class="truncate text-cmn-xs text-text-secondary"
                      data-testid="list-secondary"
                    >
                      @for (col of listColumns().secondary; track col.key(); let last = $last) {
                        <ng-container
                          *ngTemplateOutlet="cellContent; context: {$implicit: col, row, index: i}"
                        />
                        @if (!last) {
                          <span aria-hidden="true"> · </span>
                        }
                      }
                    </div>
                  }
                </div>
                @if (listColumns().trailing.length || listColumns()['trailing-secondary'].length) {
                  <div class="shrink-0 text-right">
                    @for (col of listColumns().trailing; track col.key()) {
                      <div
                        class="font-label text-cmn-sm font-medium tabular-nums text-text-primary"
                        data-testid="list-trailing"
                      >
                        <ng-container
                          *ngTemplateOutlet="cellContent; context: {$implicit: col, row, index: i}"
                        />
                      </div>
                    }
                    @for (col of listColumns()['trailing-secondary']; track col.key()) {
                      <div
                        class="text-cmn-xs tabular-nums text-text-secondary"
                        data-testid="list-trailing-secondary"
                      >
                        <ng-container
                          *ngTemplateOutlet="cellContent; context: {$implicit: col, row, index: i}"
                        />
                      </div>
                    }
                  </div>
                }
              </li>
            } @empty {
              <li class="py-cmn-6 text-center text-cmn-sm text-text-secondary">
                {{ emptyMessage() }}
              </li>
            }
            @if (hasSummary() && rows().length) {
              <li
                class="flex items-center gap-cmn-3 bg-surface-raised px-cmn-4 py-cmn-3 font-label text-cmn-sm font-semibold text-text-primary"
                data-testid="list-summary"
              >
                <div class="min-w-0 flex-1 truncate">
                  @for (col of listSummaryColumns().start; track col.key(); let last = $last) {
                    <ng-container *ngTemplateOutlet="summaryContent; context: {$implicit: col}" />
                    @if (!last) {
                      {{ ' ' }}
                    }
                  }
                </div>
                @for (col of listSummaryColumns().end; track col.key()) {
                  <div class="shrink-0 text-right tabular-nums">
                    <ng-container *ngTemplateOutlet="summaryContent; context: {$implicit: col}" />
                  </div>
                }
              </li>
            }
          </ul>
        }
      </div>
    } @else {
      <div [class]="scrollClasses" tabindex="0">
        @if (loading()) {
          <div class="p-cmn-4 space-y-cmn-3" data-testid="table-skeleton">
            @for (_ of skeletonRows; track $index) {
              <div class="flex gap-cmn-4" data-testid="skeleton-row">
                @for (width of skeletonBarWidths(); track $index) {
                  <cmn-skeleton [style.width]="width" height="1rem" />
                }
              </div>
            }
          </div>
        } @else {
          <!-- CDK reads footer row defs once, so the table is rebuilt when a summary comes or goes. -->
          @for (withSummary of [hasSummary()]; track withSummary) {
            <table [dataSource]="displayRows()" cdk-table class="w-full text-cmn-sm">
              @for (col of columns(); track col.key()) {
                <ng-container [cdkColumnDef]="col.key()">
                  <th
                    *cdkHeaderCellDef
                    [attr.aria-sort]="col.sortable() ? ariaSort(col.key()) : null"
                    [class]="headerCellClass(col.align())"
                    [style.width]="col.width()"
                    cdk-header-cell
                  >
                    @if (col.sortable()) {
                      <button
                        [class]="sortButtonClass(col.align())"
                        (click)="toggleSort(col.key())"
                        type="button"
                      >
                        <span>
                          <ng-container
                            *ngTemplateOutlet="headerContent; context: {$implicit: col}"
                          />
                        </span>
                        <cmn-icon
                          [class]="sortIconClass(col.key())"
                          [name]="sortIcon(col.key())"
                          size="sm"
                        />
                      </button>
                    } @else {
                      <ng-container *ngTemplateOutlet="headerContent; context: {$implicit: col}" />
                    }
                  </th>
                  <td
                    *cdkCellDef="let row; let i = index"
                    [class]="dataCellClass(col.align(), truncatesCell(col, row))"
                    [style.width]="col.width()"
                    cdk-cell
                  >
                    @if (truncatesCell(col, row)) {
                      <div
                        [class]="truncateClasses"
                        [cmnTooltip]="defaultCell(row, col.key())"
                        cmnTooltipTruncatedOnly
                        data-testid="truncated-cell"
                        tabindex="0"
                      >
                        <ng-container
                          *ngTemplateOutlet="cellContent; context: {$implicit: col, row, index: i}"
                        />
                      </div>
                    } @else {
                      <ng-container
                        *ngTemplateOutlet="cellContent; context: {$implicit: col, row, index: i}"
                      />
                    }
                  </td>
                  <td
                    *cdkFooterCellDef
                    [class]="summaryCellClass(col.align())"
                    [style.width]="col.width()"
                    cdk-footer-cell
                  >
                    <ng-container *ngTemplateOutlet="summaryContent; context: {$implicit: col}" />
                  </td>
                </ng-container>
              }

              <tr *cdkHeaderRowDef="columnKeys()" cdk-header-row></tr>
              <tr
                *cdkRowDef="let row; columns: columnKeys()"
                [attr.tabindex]="rowsActionable() ? 0 : null"
                [class]="tableRowClass()"
                (click)="rowClick.emit(row)"
                (keydown.enter)="onRowKey($event, row)"
                (keydown.space)="onRowKey($event, row)"
                cdk-row
              ></tr>
              @if (withSummary) {
                <tr
                  *cdkFooterRowDef="columnKeys()"
                  [class.hidden]="!rows().length"
                  cdk-footer-row
                  data-testid="summary-row"
                ></tr>
              }

              <tr *cdkNoDataRow class="cdk-row">
                <td
                  [attr.colspan]="columns().length"
                  class="py-cmn-6 text-center text-cmn-sm text-text-secondary"
                >
                  {{ emptyMessage() }}
                </td>
              </tr>
            </table>
          }
        }
      </div>
    }

    @if (!loading() && pagination(); as p) {
      @if (p.totalCount > 0) {
        <div
          class="flex flex-wrap items-center justify-between gap-cmn-3 mt-cmn-4"
          role="navigation"
          aria-label="Pagination"
        >
          @if (pageSizeOptions().length) {
            <div class="flex items-center gap-cmn-2 text-cmn-sm text-text-secondary">
              <span aria-hidden="true">{{ pageSizeLabel() }}</span>
              <cmn-select
                [aria-label]="pageSizeLabel()"
                [ngModel]="pageSizeValue(p)"
                [options]="pageSizeSelectOptions()"
                (ngModelChange)="onPageSize($event)"
                data-testid="page-size"
                size="sm"
              />
            </div>
          }
          <div class="flex flex-1 items-center justify-between gap-cmn-2">
            <cmn-button
              [disabled]="p.offset <= 0"
              (clicked)="onPreviousPage(p)"
              variant="secondary"
              size="sm"
              aria-label="Previous page"
            >
              Previous
            </cmn-button>
            <span
              [class]="
                showPageNumbers()
                  ? 'text-cmn-sm text-text-secondary md:hidden'
                  : 'text-cmn-sm text-text-secondary'
              "
            >
              Page {{ currentPage(p) }} of {{ totalPages(p) }}
            </span>
            @if (showPageNumbers()) {
              <ol class="hidden items-center gap-cmn-1 md:flex" data-testid="page-numbers">
                @for (item of pagerItems(p); track $index) {
                  <li>
                    @if (item === null) {
                      <span class="px-cmn-1 text-cmn-sm text-text-secondary">&hellip;</span>
                    } @else {
                      <button
                        [attr.aria-current]="item === currentPage(p) ? 'page' : null"
                        [attr.aria-label]="'Page ' + item"
                        [class]="pageButtonClass(item === currentPage(p))"
                        (click)="goToPage(p, item)"
                        type="button"
                      >
                        {{ item }}
                      </button>
                    }
                  </li>
                }
              </ol>
            }
            <cmn-button
              [disabled]="!p.hasMore"
              (clicked)="onNextPage(p)"
              variant="secondary"
              size="sm"
              aria-label="Next page"
            >
              Next
            </cmn-button>
          </div>
        </div>
      }
    }
  `,
})
export class DataTableComponent<T = Record<string, unknown>> {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly isWide = toSignal(
    this.breakpoints.observe(CMN_MEDIA_MD).pipe(map(state => state.matches)),
    {initialValue: this.breakpoints.isMatched(CMN_MEDIA_MD)}
  );

  public readonly mode = input<CmnTableMode>('responsive');
  public readonly rows = input<T[]>([]);
  public readonly emptyMessage = input<string>('No data');
  public readonly loading = input<boolean>(false);
  public readonly trackBy = input<TrackByFunction<T> | null>(null);
  public readonly pagination = input<CmnTablePagination | null>(null);
  /** Lists page numbers in the pager from `md` up; off (the default) keeps "Page X of Y" only. */
  public readonly showPageNumbers = input(false, {transform: booleanAttribute});
  /** Page sizes offered next to the pager; empty (the default) hides the choice. */
  public readonly pageSizeOptions = input<readonly number[]>([]);
  public readonly pageSizeLabel = input<string>('Rows per page');

  /** The active sort, for columns marked `sortable`; two-way bindable as `[(sort)]`. */
  public readonly sort = model<CmnTableSort | null>(null);
  public readonly sortMode = input<CmnSortMode>('client');

  /** Read to screen readers in place of the dash an empty cell shows. */
  public readonly emptyCellLabel = input<string>('No value');

  /**
   * Opt in when `rowClick` is handled: rows become focusable with a pointer cursor,
   * hover highlight and focus ring, and activate on Enter/Space. Off by default so
   * read-only rows stay inert.
   */
  public readonly rowsActionable = input<boolean>(false);

  /** Emits when a row is clicked, or activated with Enter/Space while `rowsActionable` is set. */
  public readonly rowClick = output<T>();
  public readonly previousPage = output<void>();
  public readonly nextPage = output<void>();
  /**
   * Emits the page to fetch from every pager control: Previous, Next, a page number, or a new
   * page size (which goes back to the first page). Handle it or `previousPage`/`nextPage`, not both.
   */
  public readonly pageChange = output<CmnPageChange>();

  public readonly columns = contentChildren(CmnColumnComponent<T>);
  public readonly columnKeys = computed(() => this.columns().map(c => c.key()));

  /** `rows` in display order: sorted here under a client-side sort, as given otherwise. */
  public readonly displayRows = computed(() => {
    const rows = this.rows();
    const sort = this.sort();
    if (!sort || this.sortMode() === 'server') {
      return rows;
    }
    const col = this.columns().find(c => c.key() === sort.key && c.sortable());
    if (!col) {
      return rows;
    }
    const compare = col.compare();
    const sign = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (compare) {
        return sign * compare(a, b);
      }
      const va = (a as Record<string, unknown>)[sort.key];
      const vb = (b as Record<string, unknown>)[sort.key];
      const emptyA = isEmptyValue(va);
      const emptyB = isEmptyValue(vb);
      if (emptyA || emptyB) {
        return Number(emptyA) - Number(emptyB);
      }
      return sign * compareValues(va, vb);
    });
  });

  public readonly hasSummary = computed(() => this.columns().some(c => c.hasSummary()));

  /** True when rows render as stacked list rows instead of table rows. */
  public readonly showList = computed(() => {
    switch (this.mode()) {
      case 'list':
        return true;
      case 'table':
        return false;
      default:
        return !this.isWide() && this.columns().some(c => c.listSlot() !== null);
    }
  });

  protected readonly emptyCellText = EMPTY_CELL_TEXT;
  protected readonly truncateClasses = TRUNCATE_CLASSES;

  protected readonly frameClasses = inject(CardComponent, {optional: true}) ? '' : FRAME_CLASSES;
  protected readonly scrollClasses = `${SCROLL_CLASSES} ${this.frameClasses}`;

  protected readonly listColumns = computed(() => {
    const slots: ListSlotColumns = {
      leading: [],
      primary: [],
      secondary: [],
      trailing: [],
      'trailing-secondary': [],
    };
    for (const col of this.columns()) {
      const slot = col.listSlot();
      if (slot) {
        slots[slot].push(col);
      }
    }
    return slots;
  });

  /** The summary row on a phone: primary and secondary text at the start, trailing values at the end. */
  protected readonly listSummaryColumns = computed(() => {
    const slots = this.listColumns();
    const withSummary = (cols: CmnColumnComponent[]): CmnColumnComponent[] =>
      cols.filter(c => c.hasSummary());
    return {
      start: withSummary([...slots.primary, ...slots.secondary]),
      end: withSummary(slots.trailing),
    };
  });

  protected readonly pageSizeSelectOptions = computed<SelectOption[]>(() =>
    this.pageSizeOptions().map(size => ({label: String(size), value: String(size)}))
  );

  protected readonly tableRowClass = computed(
    () =>
      `border-b border-border-default last:border-0 ${ROW_BASE_CLASS}${this.rowsActionable() ? ' ' + ROW_ACTIONABLE_CLASS : ''}`
  );

  protected readonly listRowClass = computed(
    () =>
      `flex items-center gap-cmn-3 px-cmn-4 py-cmn-3 ${ROW_BASE_CLASS}${this.rowsActionable() ? ' ' + ROW_ACTIONABLE_CLASS : ''}`
  );

  protected readonly skeletonRows = Array.from({length: SKELETON_ROWS});

  /** One bar per column so the loading state matches the table's shape. */
  protected readonly skeletonBarWidths = computed(() =>
    this.columns().map((_, i) => SKELETON_BAR_WIDTHS[i % SKELETON_BAR_WIDTHS.length])
  );

  public headerCellClass(align: CmnColumnAlign): string {
    return `sticky top-0 z-10 bg-surface-card shadow-[inset_0_-1px_0_var(--color-border-default)] px-cmn-4 py-cmn-3 font-label text-cmn-xs font-semibold text-text-secondary ${this.alignClass(align)}`;
  }

  /** A truncated cell gets no min-content width of its own, so its text cuts off instead of widening the table. */
  public dataCellClass(align: CmnColumnAlign, truncate = false): string {
    return `px-cmn-4 py-cmn-3 text-text-primary ${this.alignClass(align)}${truncate ? ' max-w-0' : ''}`;
  }

  public summaryCellClass(align: CmnColumnAlign): string {
    return `sticky bottom-0 z-10 bg-surface-raised shadow-[inset_0_1px_0_var(--color-border-default)] px-cmn-4 py-cmn-3 font-label font-semibold text-text-primary tabular-nums ${this.alignClass(align)}`;
  }

  /** Cycles a column through ascending, descending and unsorted; another column starts ascending. */
  public toggleSort(key: string): void {
    const sort = this.sort();
    if (sort?.key !== key) {
      this.sort.set({key, direction: 'asc'});
    } else if (sort.direction === 'asc') {
      this.sort.set({key, direction: 'desc'});
    } else {
      this.sort.set(null);
    }
  }

  protected ariaSort(key: string): string {
    return ARIA_SORT[this.sortState(key)];
  }

  protected sortIcon(key: string): LucideIconName {
    return SORT_ICONS[this.sortState(key)];
  }

  protected sortIconClass(key: string): string {
    return this.sortState(key) === 'none'
      ? 'inline-flex opacity-50'
      : 'inline-flex text-text-primary';
  }

  protected sortButtonClass(align: CmnColumnAlign): string {
    // A right-aligned header keeps its text on the right edge, with the arrow before it.
    return align === 'right' ? `${SORT_BUTTON_CLASSES} flex-row-reverse` : SORT_BUTTON_CLASSES;
  }

  protected onRowKey(event: Event, row: T): void {
    // Keys pressed inside a cell control (button, link) belong to that control.
    if (!this.rowsActionable() || event.target !== event.currentTarget) {
      return;
    }
    event.preventDefault();
    this.rowClick.emit(row);
  }

  protected trackRow(index: number, row: T): unknown {
    const trackBy = this.trackBy();
    return trackBy ? trackBy(index, row) : row;
  }

  protected currentPage(p: CmnTablePagination): number {
    return p.limit > 0 ? Math.floor(p.offset / p.limit) + 1 : 1;
  }

  protected totalPages(p: CmnTablePagination): number {
    return p.limit > 0 ? Math.max(1, Math.ceil(p.totalCount / p.limit)) : 1;
  }

  /** Every page when there are few; otherwise the ends, the current page and its neighbours. */
  protected pagerItems(p: CmnTablePagination): PagerItem[] {
    const total = this.totalPages(p);
    const current = this.currentPage(p);
    if (total <= MAX_LISTED_PAGES) {
      return this.range(1, total);
    }
    if (current <= PAGE_EDGE_RUN) {
      return [...this.range(1, PAGE_EDGE_RUN + 1), null, total];
    }
    if (current >= total - PAGE_EDGE_RUN + 1) {
      return [1, null, ...this.range(total - PAGE_EDGE_RUN, total)];
    }
    return [1, null, ...this.range(current - PAGE_SIBLINGS, current + PAGE_SIBLINGS), null, total];
  }

  protected pageButtonClass(current: boolean): string {
    return `${PAGE_BUTTON_BASE} ${current ? PAGE_BUTTON_CURRENT : PAGE_BUTTON_OTHER}`;
  }

  protected goToPage(p: CmnTablePagination, page: number): void {
    if (page !== this.currentPage(p)) {
      this.pageChange.emit({offset: (page - 1) * p.limit, limit: p.limit});
    }
  }

  protected onPreviousPage(p: CmnTablePagination): void {
    this.previousPage.emit();
    this.pageChange.emit({offset: Math.max(0, p.offset - p.limit), limit: p.limit});
  }

  protected onNextPage(p: CmnTablePagination): void {
    this.nextPage.emit();
    this.pageChange.emit({offset: p.offset + p.limit, limit: p.limit});
  }

  protected pageSizeValue(p: CmnTablePagination): string {
    return String(p.limit);
  }

  protected onPageSize(value: SelectValue): void {
    const limit = Number(value);
    if (limit > 0) {
      this.pageChange.emit({offset: 0, limit});
    }
  }

  /** Only a default text cell with a value truncates; a custom template and an empty cell render as they are. */
  protected truncatesCell(col: CmnColumnComponent<T>, row: T): boolean {
    return col.truncate() && !col.cell() && !!this.defaultCell(row, col.key());
  }

  /** A cell's own text, or `''` when the value is empty (the template then shows a dash). */
  protected defaultCell(row: T, key: string): string {
    const value = (row as Record<string, unknown>)[key];
    if (isEmptyValue(value)) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value as string | number | boolean | bigint | symbol);
  }

  private sortState(key: string): CmnSortDirection | 'none' {
    const sort = this.sort();
    return sort?.key === key ? sort.direction : 'none';
  }

  private range(from: number, to: number): number[] {
    return Array.from({length: to - from + 1}, (_, i) => from + i);
  }

  private alignClass(align: CmnColumnAlign): string {
    return ALIGN_CLASSES[align];
  }
}
