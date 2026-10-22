import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  input,
} from '@angular/core';

import {
  CmnCellDirective,
  CmnHeaderCellDirective,
  CmnSummaryCellDirective,
} from './data-table-cell.directive';

export type CmnColumnAlign = 'left' | 'right' | 'center';

/**
 * Where a column's cell lands in the data-table's list-row layout (phone width):
 * `leading` (avatar/logo), `primary` (first line), `secondary` (muted second line;
 * several columns are joined with a middle dot), `trailing` (right-aligned value)
 * and `trailing-secondary` (muted line under the trailing value). Columns without
 * a slot are hidden in list mode.
 */
export type CmnListSlot = 'leading' | 'primary' | 'secondary' | 'trailing' | 'trailing-secondary';

@Component({
  selector: 'cmn-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class CmnColumnComponent<T = any> {
  public readonly key = input.required<string>();
  public readonly header = input<string>('');
  public readonly align = input<CmnColumnAlign>('left');
  public readonly listSlot = input<CmnListSlot | null>(null);
  /** Any CSS width (`8rem`, `15%`) applied to the header and cells in table layout; list rows ignore it. */
  public readonly width = input<string | null>(null);
  /** Opt in to sorting: the header becomes a button that cycles ascending, descending, unsorted. */
  public readonly sortable = input(false, {transform: booleanAttribute});
  /**
   * The client-side sort order for ascending. Defaults to comparing `row[key]`: numbers and dates
   * by value, text by locale with numeric collation; empty values sort last either way.
   */
  public readonly compare = input<((a: T, b: T) => number) | null>(null);
  /**
   * Cuts long cell text to one line with an ellipsis in table layout. The full value (`row[key]`)
   * shows in a tooltip while the text is cut off, and screen readers read the whole text.
   */
  public readonly truncate = input(false, {transform: booleanAttribute});
  /** This column's text in the summary row; a `cmnSummaryCell` template replaces it. */
  public readonly summary = input<string | null>(null);

  public readonly cell = contentChild(CmnCellDirective<T>);
  public readonly headerCell = contentChild(CmnHeaderCellDirective);
  public readonly summaryCell = contentChild(CmnSummaryCellDirective);

  /** True when the column contributes to the summary row. */
  public hasSummary(): boolean {
    return this.summary() !== null || this.summaryCell() !== undefined;
  }
}
