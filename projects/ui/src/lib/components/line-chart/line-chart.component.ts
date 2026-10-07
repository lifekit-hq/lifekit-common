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
  viewChild,
} from '@angular/core';
import {
  buildLineChartConfig,
  type ChartDomain,
  type ChartPoint,
  type ChartScrubPoint,
  type ChartValueFormat,
  type ChartXSpacing,
  resolveLineChartTokens,
  updateLineChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

export type {
  ChartDomain,
  ChartPoint,
  ChartScrubPoint,
  ChartValueFormat,
  ChartXSpacing,
} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-line-chart',
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
          [class.invisible]="isEmpty()"
          [class.absolute]="compact()"
          [class.inset-0]="compact()"
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
    </div>
  `,
})
export class LineChartComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;
  private builtCompact = false;
  private builtXSpacing: ChartXSpacing = 'even';
  private builtScrubbable = false;

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
  protected readonly isEmpty = computed(() => this.data().length === 0);

  constructor() {
    effect(() => {
      const points = this.data();
      const format = {currency: this.currency(), valueFormat: this.valueFormat()};
      const compact = this.compact();
      const scale = {yDomain: this.yDomain(), xSpacing: this.xSpacing()};
      const scrubbable = this.scrubbable();
      if (!this.chart) {
        return;
      }
      if (
        compact === this.builtCompact &&
        scale.xSpacing === this.builtXSpacing &&
        scrubbable === this.builtScrubbable
      ) {
        updateLineChart(this.chart, points, format, scale);
      } else {
        // `compact`, `xSpacing` and `scrubbable` shape the whole chart config, so changing one rebuilds the chart.
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
    this.chart = new Chart(
      ctx,
      buildLineChartConfig(
        this.data(),
        resolveLineChartTokens(),
        this.currency(),
        this.valueFormat(),
        this.compact(),
        {yDomain: this.yDomain(), xSpacing: this.xSpacing()},
        this.scrubbable()
          ? {
              onScrub: point => this.scrub.emit(point),
              onRelease: () => this.scrubEnd.emit(),
            }
          : undefined
      )
    );
  }
}
