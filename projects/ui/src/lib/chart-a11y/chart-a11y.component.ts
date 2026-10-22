import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {type ChartTable} from '@lifekit-hq/charts-core';

/**
 * The text a chart carries beside its canvas: a polite live region that announces what a pointer
 * or a key is reading, and the chart's data as a table, visually hidden unless `visible`.
 * Internal to the chart components, which render it next to their canvas.
 */
@Component({
  selector: 'cmn-chart-a11y',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'contents'},
  template: `
    <p aria-atomic="true" aria-live="polite" class="sr-only" data-testid="chart-announcement">
      {{ announcement() }}
    </p>
    @if (table(); as t) {
      <div [class]="visible() ? 'overflow-x-auto' : 'sr-only'" data-testid="chart-data-table">
        <table class="w-full text-cmn-sm">
          <caption class="sr-only">
            {{
              caption()
            }}
          </caption>
          <thead>
            <tr>
              @for (header of t.headers; track $index) {
                <th
                  [class.text-left]="$first"
                  [class.text-right]="!$first"
                  scope="col"
                  class="px-cmn-2 py-cmn-2 font-label text-cmn-xs font-semibold text-text-secondary"
                >
                  {{ header }}
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of body(); track $index) {
              <tr class="border-t border-border-default">
                <th scope="row" class="px-cmn-2 py-cmn-2 text-left font-normal text-text-secondary">
                  {{ row.label }}
                </th>
                @for (cell of row.cells; track $index) {
                  <td class="px-cmn-2 py-cmn-2 text-right tabular-nums text-text-primary">
                    {{ cell }}
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class ChartA11yComponent {
  /** Names the table for a screen reader: the chart's own name. */
  public readonly caption = input<string>('');
  /** The chart's data; null renders no table (an empty chart). */
  public readonly table = input<ChartTable | null>(null);
  /** Shows the table under the chart instead of only to a screen reader. */
  public readonly visible = input<boolean>(false);
  /** What the chart is reading now; empty when nothing is. */
  public readonly announcement = input<string>('');

  protected readonly body = computed(() =>
    (this.table()?.rows ?? []).map(([label, ...cells]) => ({label, cells}))
  );
}
