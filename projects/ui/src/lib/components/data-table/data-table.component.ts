import {BreakpointObserver} from '@angular/cdk/layout';
import {CdkTableModule} from '@angular/cdk/table';
import {NgTemplateOutlet} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  output,
  TrackByFunction,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';

import {CMN_MEDIA_MD} from '../../tokens/breakpoints';
import {ButtonComponent} from '../button/button.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';
import {CmnColumnAlign, CmnColumnComponent, CmnListSlot} from './data-table-column.component';
import {type CmnTablePagination} from './data-table-pagination.model';

const SKELETON_ROWS = 5;

/** Bar widths cycled across a skeleton row, one bar per declared column. */
const SKELETON_BAR_WIDTHS = ['20%', '35%', '25%'];

const ALIGN_CLASSES: Record<CmnColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
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

@Component({
  selector: 'cmn-data-table',
  imports: [ButtonComponent, CdkTableModule, NgTemplateOutlet, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'flex h-full min-h-0 flex-col'},
  template: `
    <ng-template #cellContent let-col let-row="row" let-i="index">
      @if (col.cell(); as c) {
        <ng-container *ngTemplateOutlet="c.template; context: {$implicit: row, index: i}" />
      } @else {
        {{ defaultCell(row, col.key()) }}
      }
    </ng-template>

    @if (showList()) {
      <div class="rounded-cmn-lg border border-border-default bg-surface-card">
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
            @for (row of rows(); track trackRow($index, row); let i = $index) {
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
          </ul>
        }
      </div>
    } @else {
      <div
        class="min-h-0 flex-1 overflow-auto rounded-cmn-lg border border-border-default bg-surface-card"
      >
        @if (loading()) {
          <div class="p-cmn-4 space-y-cmn-3" data-testid="table-skeleton">
            @for (_ of skeletonRows; track $index) {
              <div class="flex gap-cmn-4" data-testid="skeleton-row">
                @for (width of skeletonBarWidths(); track $index) {
                  <cmn-skeleton [width]="width" height="1rem" />
                }
              </div>
            }
          </div>
        } @else {
          <table [dataSource]="rows()" cdk-table class="w-full text-cmn-sm">
            @for (col of columns(); track col.key()) {
              <ng-container [cdkColumnDef]="col.key()">
                <th
                  *cdkHeaderCellDef
                  [class]="headerCellClass(col.align())"
                  [style.width]="col.width()"
                  cdk-header-cell
                >
                  @if (col.headerCell(); as h) {
                    <ng-container *ngTemplateOutlet="h.template" />
                  } @else {
                    {{ col.header() }}
                  }
                </th>
                <td
                  *cdkCellDef="let row; let i = index"
                  [class]="dataCellClass(col.align())"
                  [style.width]="col.width()"
                  cdk-cell
                >
                  <ng-container
                    *ngTemplateOutlet="cellContent; context: {$implicit: col, row, index: i}"
                  />
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
      </div>
    }

    @if (!loading() && pagination(); as p) {
      @if (p.totalCount > 0) {
        <div
          class="flex items-center justify-between mt-cmn-4"
          role="navigation"
          aria-label="Pagination"
        >
          <cmn-button
            [disabled]="p.offset <= 0"
            (clicked)="previousPage.emit()"
            variant="secondary"
            size="sm"
            aria-label="Previous page"
          >
            Previous
          </cmn-button>
          <span class="text-cmn-sm text-text-secondary">
            Page {{ currentPage(p) }} of {{ totalPages(p) }}
          </span>
          <cmn-button
            [disabled]="!p.hasMore"
            (clicked)="nextPage.emit()"
            variant="secondary"
            size="sm"
            aria-label="Next page"
          >
            Next
          </cmn-button>
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

  public readonly columns = contentChildren(CmnColumnComponent<T>);
  public readonly columnKeys = computed(() => this.columns().map(c => c.key()));

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
    return `sticky top-0 z-10 bg-surface-card shadow-[inset_0_-1px_0_var(--color-border-default)] px-cmn-4 py-cmn-3 font-label text-cmn-xs font-semibold uppercase tracking-wide text-text-secondary ${this.alignClass(align)}`;
  }

  public dataCellClass(align: CmnColumnAlign): string {
    return `px-cmn-4 py-cmn-3 text-text-primary ${this.alignClass(align)}`;
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

  protected defaultCell(row: T, key: string): string {
    const value = (row as Record<string, unknown>)[key];
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value as string | number | boolean | bigint | symbol);
  }

  private alignClass(align: CmnColumnAlign): string {
    return ALIGN_CLASSES[align];
  }
}
