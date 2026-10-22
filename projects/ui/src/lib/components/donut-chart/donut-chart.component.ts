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
  bindChartClick,
  bindChartHighlight,
  buildDonutChartConfig,
  describeDonutChart,
  describeSegmentAt,
  type DonutSegment,
  type DonutSegmentClick,
  isDonutEmpty,
  money,
  resolveDonutChartTokens,
  resolveDonutClick,
  segmentsTable,
  updateDonutChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

import {ChartA11yComponent} from '../../chart-a11y/chart-a11y.component';
import {isOutputObserved} from '../../chart-click/output-observed';
import {injectChartThemeKey} from '../../chart-theme/chart-theme';

export type {DonutSegment, DonutSegmentClick} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-donut-chart',
  imports: [ChartA11yComponent],
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
          <canvas
            #chartCanvas
            [attr.aria-label]="accessibleName()"
            [attr.tabindex]="isEmpty() ? null : 0"
            [class.invisible]="isEmpty()"
            role="img"
            class="rounded-cmn-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          ></canvas>
          @if (isEmpty()) {
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
    } @else {
      <div class="relative h-full w-full" style="min-height: 220px">
        <canvas
          #chartCanvas
          [attr.aria-label]="accessibleName()"
          [attr.tabindex]="isEmpty() ? null : 0"
          [class.invisible]="isEmpty()"
          role="img"
          class="rounded-cmn-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        ></canvas>
        @if (isEmpty()) {
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
    }
  `,
})
export class DonutChartComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;
  private builtThemeKey = '';
  private readonly themeKey = injectChartThemeKey();
  private readonly format = computed(() => {
    const currency = this.currency();
    return (value: number): string => money(value, currency);
  });

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
   * Pointer only - keys read the chart but do not click it, so offer a keyboard-reachable equivalent.
   */
  public readonly segmentClick = output<DonutSegmentClick>();
  /**
   * Replaces the derived summary in the canvas' accessible name (by default
   * how many segments, their total and the largest one's share).
   */
  public readonly summary = input<string | undefined>(undefined);
  /** Shows the data table under the chart; otherwise only a screen reader reaches it. */
  public readonly showDataTable = input<boolean>(false);
  protected readonly isEmpty = computed(() => isDonutEmpty(this.segments()));
  protected readonly name = computed(() => this.label() || 'Donut chart');
  protected readonly accessibleName = computed(() => {
    const summary = this.isEmpty()
      ? this.emptyMessage()
      : (this.summary() ?? describeDonutChart(this.segments(), this.format()));
    return summary ? `${this.name()}. ${summary}` : this.name();
  });
  protected readonly table = computed(() =>
    this.isEmpty() ? null : segmentsTable(this.segments(), this.format())
  );
  protected readonly announcement = signal('');

  constructor() {
    effect(() => {
      const segs = this.segments();
      const themeKey = this.themeKey();
      if (!this.chart) {
        return;
      }
      if (themeKey === this.builtThemeKey) {
        updateDonutChart(this.chart, segs);
      } else {
        // The token colours are part of the chart config, so a theme change rebuilds the chart.
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
    this.builtThemeKey = this.themeKey();
    const config = buildDonutChartConfig(
      this.segments(),
      resolveDonutChartTokens(),
      this.currency(),
      this.showLegend()
    );
    // The chart's own hover highlights a segment; this announces it and lets the keyboard step it.
    const read = bindChartHighlight(config, {
      onHighlight: index =>
        this.announcement.set(describeSegmentAt(this.segments(), index, this.format())),
      onRelease: () => this.announcement.set(''),
    });
    const bound = bindChartClick(read, {
      resolve: resolveDonutClick,
      isActive: () => isOutputObserved(this.segmentClick),
      emit: hit => this.segmentClick.emit(hit),
    });
    this.chart = new Chart(ctx, bound);
  }
}
