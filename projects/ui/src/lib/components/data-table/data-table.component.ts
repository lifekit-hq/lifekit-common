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
                (click)="rowClick.emit(row)"
                class="flex items-center gap-cmn-3 px-cmn-4 py-cmn-3 transition-colors hover:bg-surface-raised"
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
      <div class="overflow-x-auto rounded-cmn-lg border border-border-default bg-surface-card">
        @if (loading()) {
          <div class="p-cmn-4 space-y-cmn-3">
            @for (_ of skeletonRows; track $index) {
              <div class="flex gap-cmn-4">
                <cmn-skeleton height="1rem" width="20%" />
                <cmn-skeleton height="1rem" width="35%" />
                <cmn-skeleton height="1rem" width="25%" />
                <cmn-skeleton height="1rem" width="20%" />
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

            <tr
              *cdkHeaderRowDef="columnKeys()"
              cdk-header-row
              class="border-b border-border-default"
            ></tr>
            <tr
              *cdkRowDef="let row; columns: columnKeys()"
              (click)="rowClick.emit(row)"
              cdk-row
              class="border-b border-border-default last:border-0 transition-colors hover:bg-surface-raised"
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

  protected readonly skeletonRows = Array.from({length: SKELETON_ROWS});

  public headerCellClass(align: CmnColumnAlign): string {
    return `px-cmn-4 py-cmn-3 font-label text-cmn-xs font-semibold uppercase tracking-wide text-text-secondary ${this.alignClass(align)}`;
  }

  public dataCellClass(align: CmnColumnAlign): string {
    return `px-cmn-4 py-cmn-3 text-text-primary ${this.alignClass(align)}`;
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
    return `text-${align}`;
  }
}
