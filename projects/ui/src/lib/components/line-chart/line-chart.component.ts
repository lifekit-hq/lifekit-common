import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  bindChartHighlight,
  buildLineChartConfig,
  type ChartDomain,
  type ChartPoint,
  type ChartScrubPoint,
  type ChartValueFormat,
  type ChartXSpacing,
  describeLineChart,
  describeSeriesAt,
  drawnLinePoints,
  resolveLineChartTokens,
  seriesTable,
  updateLineChart,
  valueFormatter,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

import {ChartA11yComponent} from '../../chart-a11y/chart-a11y.component';
import {injectChartThemeKey} from '../../chart-theme/chart-theme';

export type {
  ChartDomain,
  ChartPoint,
  ChartScrubPoint,
  ChartValueFormat,
  ChartXSpacing,
} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-line-chart',
  imports: [ChartA11yComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[style.display]': "compact() ? 'block' : null"},
  template: `
    <div
      [class]="
        compact()
          ? 'h-full min-h-8 w-full'
          : 'flex w-full flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4'
      "
    >
      @if (!compact()) {
        <span class="font-label text-cmn-xs font-semibold text-text-secondary">
          {{ label() }}
        </span>
      }
      <div [class]="compact() ? 'relative h-full min-h-8' : 'relative h-48'">
        <canvas
          #chartCanvas
          [attr.aria-label]="accessibleName()"
          [attr.tabindex]="readable() ? 0 : null"
          [class.invisible]="isEmpty()"
          [class.absolute]="compact()"
          [class.inset-0]="compact()"
          role="img"
          class="rounded-cmn-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        ></canvas>
        @if (isEmpty() && !compact()) {
          <p
            class="absolute inset-0 flex items-center justify-center text-center text-cmn-sm text-text-secondary"
            data-testid="chart-empty"
          >
            {{ emptyMessage() }}
          </p>
        }
      </div>
      <cmn-chart-a11y
        [announcement]="announcement()"
        [caption]="name()"
        [table]="table()"
        [visible]="showDataTable()"
      />
    </div>
  `,
})
export class LineChartComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;
  private builtCompact = false;
  private builtXSpacing: ChartXSpacing = 'even';
  private builtScrubbable = false;
  private builtThemeKey = '';
  private readonly themeKey = injectChartThemeKey();
  private readonly drawn = computed(() => drawnLinePoints(this.data(), this.xSpacing()));
  private readonly format = computed(() => {
    const format = valueFormatter(this.valueFormat(), this.currency());
    return (value: number): string => format(value, false);
  });
  private readonly series = computed(() => [
    {label: this.label() || 'Value', points: this.drawn()},
  ]);

  public readonly data = input<ChartPoint[]>([]);
  public readonly label = input<string>('');
  public readonly currency = input<string>('USD');
  /**
   * How values render in ticks and tooltips: `'currency'` (default, uses `currency`), `'number'`,
   * `'percent'`, or a `(value, compact) => string` formatter for anything else.
   */
  public readonly valueFormat = input<ChartValueFormat>('currency');
  /** Shown in place of the plot when there is nothing to draw. */
  public readonly emptyMessage = input<string>('No data yet');
  /**
   * Renders a sparkline: just the line, filling the host - no title, frame, axes, gridlines or
   * tooltip, and no animation. Size it with a `height` on `cmn-line-chart` (min 2rem).
   */
  public readonly compact = input<boolean>(false);
  /** Fixes the y range (`{min?, max?}`) instead of auto-scaling it to the data; an omitted bound stays auto. */
  public readonly yDomain = input<ChartDomain | undefined>(undefined);
  /**
   * `'time'` places each point by the epoch-ms `time` on it instead of in an equal slot, so a
   * burst of points reads as a burst; points without a `time` are then left out. Default `'even'`.
   */
  public readonly xSpacing = input<ChartXSpacing>('even');
  /**
   * Opts into scrub-to-read: a crosshair follows a held pointer (a touch, or a hovering mouse) and
   * `scrub` reports the point under it, so the host's headline number can follow; `scrubEnd`
   * fires on release. The chart's own tooltip steps aside. Ignored when `compact`.
   */
  public readonly scrubbable = input<boolean>(false);
  /** The point under a held pointer; only while `scrubbable`. */
  public readonly scrub = output<ChartScrubPoint>();
  /** The pointer lifted or left the chart: snap the headline back. */
  public readonly scrubEnd = output<void>();
  /**
   * Replaces the derived summary in the canvas' accessible name (by default its span, first and
   * last values and the trend between them), e.g. to say what the trend means.
   */
  public readonly summary = input<string | undefined>(undefined);
  /** Shows the data table under the chart; otherwise only a screen reader reaches it. Ignored when `compact`. */
  public readonly showDataTable = input<boolean>(false);
  protected readonly isEmpty = computed(() => this.data().length === 0);
  /** A focused chart reads its points by key; a compact one is a still glyph. */
  protected readonly readable = computed(() => !this.compact() && !this.isEmpty());
  protected readonly name = computed(() => this.label() || 'Line chart');
  protected readonly accessibleName = computed(() => {
    const summary = this.isEmpty()
      ? this.emptyMessage()
      : (this.summary() ?? describeLineChart(this.drawn(), this.format()));
    return summary ? `${this.name()}. ${summary}` : this.name();
  });
  /** A sparkline's name carries its summary; a table per row of sparklines would bury the page. */
  protected readonly table = computed(() =>
    this.readable() ? seriesTable(this.series(), this.format()) : null
  );
  protected readonly announcement = signal('');

  constructor() {
    effect(() => {
      const points = this.data();
      const format = {currency: this.currency(), valueFormat: this.valueFormat()};
      const compact = this.compact();
      const scale = {yDomain: this.yDomain(), xSpacing: this.xSpacing()};
      const scrubbable = this.scrubbable();
      const themeKey = this.themeKey();
      if (!this.chart) {
        return;
      }
      if (
        compact === this.builtCompact &&
        scale.xSpacing === this.builtXSpacing &&
        scrubbable === this.builtScrubbable &&
        themeKey === this.builtThemeKey
      ) {
        updateLineChart(this.chart, points, format, scale);
      } else {
        // `compact`, `xSpacing` and `scrubbable` shape the whole chart config, as do the token colours a theme change rewrites, so changing one rebuilds the chart.
        this.chart.destroy();
        this.buildChart();
      }
    });
  }

  public ngAfterViewInit(): void {
    this.buildChart();
  }

  public ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private buildChart(): void {
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }
    this.builtCompact = this.compact();
    this.builtXSpacing = this.xSpacing();
    this.builtScrubbable = this.scrubbable();
    this.builtThemeKey = this.themeKey();
    const scrubbing = this.scrubbable() && !this.compact();
    const config = buildLineChartConfig(
      this.data(),
      resolveLineChartTokens(),
      this.currency(),
      this.valueFormat(),
      this.compact(),
      {yDomain: this.yDomain(), xSpacing: this.xSpacing()},
      scrubbing
        ? {
            onScrub: point => {
              this.announce(point.index);
              this.scrub.emit(point);
            },
            onRelease: () => {
              this.announcement.set('');
              this.scrubEnd.emit();
            },
          }
        : undefined
    );
    // Without scrub, the chart's own hover reads the points; the highlight announces them and
    // gives the keyboard the same reading. A compact chart reads nothing.
    this.chart = new Chart(
      ctx,
      scrubbing || this.compact()
        ? config
        : bindChartHighlight(config, {
            onHighlight: index => this.announce(index),
            onRelease: () => this.announcement.set(''),
          })
    );
  }

  private announce(index: number): void {
    this.announcement.set(describeSeriesAt(this.series(), index, this.format()));
  }
}
