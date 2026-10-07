import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import {
  buildLineChartConfig,
  type ChartPoint,
  type ChartValueFormat,
  resolveLineChartTokens,
  updateLineChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

export type {ChartPoint, ChartValueFormat} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex w-full flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
    >
      <span class="font-label text-cmn-xs font-semibold text-text-secondary">
        {{ label() }}
      </span>
      <div class="relative h-48">
        <canvas #chartCanvas [class.invisible]="isEmpty()"></canvas>
        @if (isEmpty()) {
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
  protected readonly isEmpty = computed(() => this.data().length === 0);

  constructor() {
    effect(() => {
      const points = this.data();
      const format = {currency: this.currency(), valueFormat: this.valueFormat()};
      if (this.chart) {
        updateLineChart(this.chart, points, format);
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
    this.chart = new Chart(
      ctx,
      buildLineChartConfig(
        this.data(),
        resolveLineChartTokens(),
        this.currency(),
        this.valueFormat()
      )
    );
  }
}
