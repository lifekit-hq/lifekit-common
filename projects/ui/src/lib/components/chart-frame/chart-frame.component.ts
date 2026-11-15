import {ChangeDetectionStrategy, Component, computed, input, model} from '@angular/core';
import {type ChartTable} from '@lifekit-hq/charts-core';

import {ChartA11yComponent} from '../../chart-a11y/chart-a11y.component';
import {ChipComponent} from '../chip/chip.component';

const FRAME_CLASSES =
  'flex w-full flex-col gap-cmn-3 rounded-cmn-role-surface border border-cmn-card-border bg-surface-card shadow-cmn-card p-cmn-4';

/**
 * The frame every chart sits in: a title, a "Table" chip that swaps the plot for the same data as
 * an accessible table (with a source column when the data has sources), and a plain-language
 * caption under the plot that names each series and what its marks mean, in place of an in-plot
 * legend. The shape is borrowed from the Matrix detail view's charts.
 *
 * Project the plot (a canvas, an SVG, another chart's markup) as the content; the frame is
 * independent of the chart library behind it. `cmn-line-chart`, `cmn-bar-chart`,
 * `cmn-area-chart` and `cmn-donut-chart` already draw in it. Describe the series in `caption`,
 * or project richer markup with the `chartCaption` attribute.
 *
 * Two more slots hold what belongs to the chart but not to its plot, and so stays on screen when
 * the table replaces the plot: `chartHeader` (above the plot, e.g. a headline value) and
 * `chartControls` (below it, e.g. period tabs).
 */
@Component({
  selector: 'cmn-chart-frame',
  imports: [ChartA11yComponent, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Framed, the host is the box the figure fills; bare, it dissolves so the plot keeps the height it
  // is given (a sparkline fills its parent, a ring-only donut its wrapper).
  host: {'[class]': "bare() ? 'contents' : 'block'"},
  template: `
    <figure [class]="bare() ? 'contents' : frameClasses">
      @if (!bare()) {
        <div class="flex items-center justify-between gap-cmn-3">
          <span class="font-label text-cmn-xs font-semibold text-text-secondary">
            {{ label() }}
          </span>
          @if (table()) {
            <cmn-chip
              [selected]="tableOpen()"
              (clicked)="tableOpen.set(!tableOpen())"
              data-testid="chart-table-chip"
            >
              Table
            </cmn-chip>
          }
        </div>
      }
      <ng-content select="[chartHeader]" />
      <div [class]="swapped() ? 'hidden' : bare() ? 'contents' : 'block'" data-testid="chart-plot">
        <ng-content />
      </div>
      <cmn-chart-a11y
        [announcement]="announcement()"
        [caption]="name()"
        [sources]="sources()"
        [table]="table()"
        [visible]="swapped()"
      />
      <ng-content select="[chartControls]" />
      @if (!bare()) {
        <figcaption
          class="text-cmn-sm text-text-secondary empty:hidden"
          data-testid="chart-caption"
        >
          @if (caption()) {
            {{ caption() }}
          }
          <ng-content select="[chartCaption]" />
        </figcaption>
      }
    </figure>
  `,
})
export class ChartFrameComponent {
  /** The title above the plot. */
  public readonly label = input<string>('');
  /** Names the data table for a screen reader; defaults to `label`. */
  public readonly tableName = input<string>('');
  /**
   * The plain-language line under the plot: each series by how it is drawn, and what the marks
   * mean ("Spending (solid bars), forecast (hatched bars); the dashed line is the budget").
   */
  public readonly caption = input<string>('');
  /** The chart's data as a table; null (an empty chart) offers no chip and renders no table. */
  public readonly table = input<ChartTable | null>(null);
  /**
   * Where each row of `table` came from, in row order ("Bank feed", "Analyst consensus"); adds a
   * Source column. Leave it unset when the data has no sources.
   */
  public readonly sources = input<readonly string[] | undefined>(undefined);
  /** The table is showing in place of the plot. Two-way: the chip toggles it. */
  public readonly tableOpen = model<boolean>(false);
  /** What the plot is reading now, announced politely to a screen reader. */
  public readonly announcement = input<string>('');
  /** Draws the plot alone: no frame, title, chip or caption (a sparkline, a ring to embed). */
  public readonly bare = input<boolean>(false);

  protected readonly frameClasses = FRAME_CLASSES;
  protected readonly name = computed(() => this.tableName() || this.label());
  /** The table replaces the plot only when there is a table to show and a chip to bring it back. */
  protected readonly swapped = computed(
    () => this.tableOpen() && this.table() !== null && !this.bare()
  );
}
