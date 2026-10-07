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
  bindChartClick,
  buildDonutChartConfig,
  type DonutSegment,
  type DonutSegmentClick,
  isDonutEmpty,
  resolveDonutChartTokens,
  resolveDonutClick,
  updateDonutChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

import {isOutputObserved} from '../../chart-click/output-observed';

export type {DonutSegment, DonutSegmentClick} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A custom element is inline by default, which lets the ring-only wrapper's percentage
  // height collapse; block gives Chart.js a real box to size against.
  host: {class: 'block'},
  template: `
    @if (chrome()) {
      <div
        class="flex flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
      >
        <span class="font-label text-cmn-xs font-semibold text-text-secondary">
          {{ label() }}
        </span>
        <div class="relative w-full" style="min-height: 280px">
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
    } @else {
      <div class="relative h-full w-full" style="min-height: 220px">
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
  /** Shown in place of the ring when there is nothing to draw. */
  public readonly emptyMessage = input<string>('No data yet');
  /**
   * Emits the ring segment a click landed on: its index, label and value. Binding it makes the
   * segments clickable (pointer cursor); unbound, the chart behaves as before.
   * Pointer only - the canvas has no focusable items, so offer a keyboard-reachable equivalent.
   */
  public readonly segmentClick = output<DonutSegmentClick>();
  protected readonly isEmpty = computed(() => isDonutEmpty(this.segments()));

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
    const config = buildDonutChartConfig(
      this.segments(),
      resolveDonutChartTokens(),
      this.currency(),
      this.showLegend()
    );
    const bound = bindChartClick(config, {
      resolve: resolveDonutClick,
      isActive: () => isOutputObserved(this.segmentClick),
      emit: hit => this.segmentClick.emit(hit),
    });
    this.chart = new Chart(ctx, bound);
  }
}
