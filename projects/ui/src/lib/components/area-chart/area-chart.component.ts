import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';
import {
  type AreaSeries,
  buildAreaChartConfig,
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
      <span
        class="font-label text-cmn-xs font-semibold uppercase tracking-wide text-text-secondary"
      >
        {{ label() }}
      </span>
      <div class="relative h-64">
        <canvas #chartCanvas></canvas>
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
  /** `true` stacks the bands into a cumulative total; `false` draws independent, unfilled lines. */
  public readonly stacked = input<boolean>(true);

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
