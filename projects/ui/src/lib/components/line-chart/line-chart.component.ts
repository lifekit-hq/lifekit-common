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
  buildLineChartConfig,
  type ChartPoint,
  resolveLineChartTokens,
  updateLineChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

export type {ChartPoint} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-line-chart',
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
      <div class="relative h-48">
        <canvas #chartCanvas></canvas>
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

  constructor() {
    effect(() => {
      const points = this.data();
      if (this.chart) {
        updateLineChart(this.chart, points);
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
      buildLineChartConfig(this.data(), resolveLineChartTokens(), this.currency())
    );
  }
}
