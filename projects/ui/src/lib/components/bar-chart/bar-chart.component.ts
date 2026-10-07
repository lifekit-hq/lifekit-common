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
  type BarSeries,
  type BarValueFormat,
  bindChartClick,
  buildBarChartConfig,
  type ChartPointClick,
  isSeriesEmpty,
  resolveBarChartTokens,
  resolveBarClick,
  updateBarChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

import {isOutputObserved} from '../../chart-click/output-observed';

export type {BarSeries, BarValueFormat, ChartPointClick} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex w-full flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
    >
      <span class="font-label text-cmn-xs font-semibold text-text-secondary">
        {{ label() }}
      </span>
      <div class="relative h-64">
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
export class BarChartComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  public readonly series = input<BarSeries[]>([]);
  public readonly label = input<string>('');
  public readonly currency = input<string>('USD');
  /** Shown in place of the plot when there is nothing to draw. */
  public readonly emptyMessage = input<string>('No data yet');
  public readonly stacked = input<boolean>(false);
  public readonly valueFormat = input<BarValueFormat>('currency');
  /**
   * Emits the bar a click landed on: its x position, its series and the bar's value. Binding it
   * makes the bars clickable (pointer cursor); unbound, the chart behaves as before.
   * Pointer only - the canvas has no focusable items, so offer a keyboard-reachable equivalent.
   */
  public readonly barClick = output<ChartPointClick>();
  protected readonly isEmpty = computed(() => isSeriesEmpty(this.series()));

  constructor() {
    effect(() => {
      const series = this.series();
      if (this.chart) {
        updateBarChart(this.chart, series);
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
    const config = buildBarChartConfig(
      this.series(),
      resolveBarChartTokens(),
      this.currency(),
      this.stacked(),
      this.valueFormat()
    );
    const bound = bindChartClick(config, {
      resolve: resolveBarClick,
      isActive: () => isOutputObserved(this.barClick),
      emit: hit => this.barClick.emit(hit),
    });
    this.chart = new Chart(ctx, bound);
  }
}
