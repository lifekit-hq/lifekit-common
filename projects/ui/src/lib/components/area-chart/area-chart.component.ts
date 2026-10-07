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
  type AreaSeries,
  buildAreaChartConfig,
  isSeriesEmpty,
  resolveAreaChartTokens,
  updateAreaChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

export type {AreaSeries} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-area-chart',
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
export class AreaChartComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  public readonly series = input<AreaSeries[]>([]);
  public readonly label = input<string>('');
  public readonly currency = input<string>('USD');
  /** Shown in place of the plot when there is nothing to draw. */
  public readonly emptyMessage = input<string>('No data yet');
  /** `true` stacks the bands into a cumulative total from a zero baseline; `false` draws independent, unfilled lines. */
  public readonly stacked = input<boolean>(true);
  protected readonly isEmpty = computed(() => isSeriesEmpty(this.series()));

  constructor() {
    effect(() => {
      const series = this.series();
      const stacked = this.stacked();
      if (this.chart) {
        updateAreaChart(this.chart, series, stacked);
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
      buildAreaChartConfig(this.series(), resolveAreaChartTokens(), this.currency(), this.stacked())
    );
  }
}
