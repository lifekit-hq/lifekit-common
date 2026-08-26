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
  buildDonutChartConfig,
  type DonutSegment,
  resolveDonutChartTokens,
  updateDonutChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

export type {DonutSegment} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chrome()) {
      <div
        class="flex flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
      >
        <span
          class="font-label text-cmn-xs font-semibold uppercase tracking-wide text-text-secondary"
        >
          {{ label() }}
        </span>
        <div class="relative w-full" style="min-height: 280px">
          <canvas #chartCanvas></canvas>
        </div>
      </div>
    } @else {
      <div class="relative h-full w-full" style="min-height: 220px">
        <canvas #chartCanvas></canvas>
      </div>
    }
  `,
})
export class DonutChartComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  public readonly segments = input<DonutSegment[]>([]);
  public readonly label = input<string>('');
  public readonly currency = input<string>('USD');
  /** When false, renders only the ring (no bordered card, no title) for embedding. */
  public readonly chrome = input<boolean>(true);
  /** When false, hides the chart's built-in legend (host renders its own). */
  public readonly showLegend = input<boolean>(true);

  constructor() {
    effect(() => {
      const segs = this.segments();
      if (this.chart) {
        updateDonutChart(this.chart, segs);
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
      buildDonutChartConfig(
        this.segments(),
        resolveDonutChartTokens(),
        this.currency(),
        this.showLegend()
      )
    );
  }
}
