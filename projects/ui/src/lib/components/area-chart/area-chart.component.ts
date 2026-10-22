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
  type AreaSeries,
  bindChartClick,
  bindChartHighlight,
  buildAreaChartConfig,
  type ChartPointClick,
  type ChartScrubPoint,
  describeAreaChart,
  describeSeriesAt,
  isSeriesEmpty,
  money,
  resolveAreaChartTokens,
  resolveAreaClick,
  seriesTable,
  updateAreaChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

import {ChartA11yComponent} from '../../chart-a11y/chart-a11y.component';
import {isOutputObserved} from '../../chart-click/output-observed';
import {injectChartThemeKey} from '../../chart-theme/chart-theme';

export type {AreaSeries, ChartPointClick, ChartScrubPoint} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-area-chart',
  imports: [ChartA11yComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex w-full flex-col gap-cmn-3 rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4"
    >
      <span class="font-label text-cmn-xs font-semibold text-text-secondary">
        {{ label() }}
      </span>
      <div class="relative h-64">
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
  `,
})
export class AreaChartComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;
  private builtScrubbable = false;
  private builtThemeKey = '';
  private readonly themeKey = injectChartThemeKey();
  private readonly format = computed(() => {
    const currency = this.currency();
    return (value: number): string => money(value, currency);
  });

  public readonly series = input<AreaSeries[]>([]);
  public readonly label = input<string>('');
  public readonly currency = input<string>('USD');
  /** Shown in place of the plot when there is nothing to draw. */
  public readonly emptyMessage = input<string>('No data yet');
  /** `true` stacks the bands into a cumulative total from a zero baseline; `false` draws independent, unfilled lines. */
  public readonly stacked = input<boolean>(true);
  /**
   * Opts into scrub-to-read: a crosshair follows a held pointer (a touch, or a hovering mouse) and
   * `scrub` reports the point under it (its `y` is the stacked total), so the host's headline
   * number can follow; `scrubEnd` fires on release. The chart's own tooltip steps aside.
   */
  public readonly scrubbable = input<boolean>(false);
  /** The point under a held pointer; only while `scrubbable`. */
  public readonly scrub = output<ChartScrubPoint>();
  /** The pointer lifted or left the chart: snap the headline back. */
  public readonly scrubEnd = output<void>();
  /**
   * Emits the point a click landed on: its x position, its series and the series' value there.
   * Binding it makes the plot clickable (pointer cursor); unbound, the chart behaves as before.
   * Pointer only - keys read the chart but do not click it, so offer a keyboard-reachable equivalent.
   */
  public readonly pointClick = output<ChartPointClick>();
  /**
   * Replaces the derived summary in the canvas' accessible name (by default
   * the bands, their span and how the total moved across it).
   */
  public readonly summary = input<string | undefined>(undefined);
  /** Shows the data table under the chart; otherwise only a screen reader reaches it. */
  public readonly showDataTable = input<boolean>(false);
  protected readonly isEmpty = computed(() => isSeriesEmpty(this.series()));
  protected readonly name = computed(() => this.label() || 'Area chart');
  protected readonly accessibleName = computed(() => {
    const summary = this.isEmpty()
      ? this.emptyMessage()
      : (this.summary() ?? describeAreaChart(this.series(), this.format(), this.stacked()));
    return summary ? `${this.name()}. ${summary}` : this.name();
  });
  protected readonly table = computed(() =>
    this.isEmpty() ? null : seriesTable(this.series(), this.format(), this.stacked())
  );
  protected readonly announcement = signal('');

  constructor() {
    effect(() => {
      const series = this.series();
      const stacked = this.stacked();
      const scrubbable = this.scrubbable();
      const themeKey = this.themeKey();
      if (!this.chart) {
        return;
      }
      if (scrubbable === this.builtScrubbable && themeKey === this.builtThemeKey) {
        updateAreaChart(this.chart, series, stacked);
      } else {
        // The scrub plugin and the token colours are part of the chart config, so toggling the
        // plugin or switching theme rebuilds the chart.
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
    this.builtScrubbable = this.scrubbable();
    this.builtThemeKey = this.themeKey();
    const config = buildAreaChartConfig(
      this.series(),
      resolveAreaChartTokens(),
      this.currency(),
      this.stacked(),
      this.scrubbable()
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
    // gives the keyboard the same reading.
    const read = this.scrubbable()
      ? config
      : bindChartHighlight(config, {
          onHighlight: index => this.announce(index),
          onRelease: () => this.announcement.set(''),
        });
    const bound = bindChartClick(read, {
      resolve: (chart, event) => resolveAreaClick(chart, event, this.stacked()),
      isActive: () => isOutputObserved(this.pointClick),
      emit: hit => this.pointClick.emit(hit),
    });
    this.chart = new Chart(ctx, bound);
  }

  private announce(index: number): void {
    this.announcement.set(describeSeriesAt(this.series(), index, this.format(), this.stacked()));
  }
}
