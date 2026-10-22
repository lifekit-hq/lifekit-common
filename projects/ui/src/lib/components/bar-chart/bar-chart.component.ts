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
  barFormat,
  type BarSeries,
  type BarValueFormat,
  bindChartClick,
  bindChartHighlight,
  buildBarChartConfig,
  type ChartPointClick,
  describeBarChart,
  describeSeriesAt,
  isSeriesEmpty,
  resolveBarChartTokens,
  resolveBarClick,
  seriesTable,
  updateBarChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

import {ChartA11yComponent} from '../../chart-a11y/chart-a11y.component';
import {isOutputObserved} from '../../chart-click/output-observed';
import {injectChartThemeKey} from '../../chart-theme/chart-theme';

export type {BarSeries, BarValueFormat, ChartPointClick} from '@lifekit-hq/charts-core';

@Component({
  selector: 'cmn-bar-chart',
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
export class BarChartComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;
  private builtThemeKey = '';
  private readonly themeKey = injectChartThemeKey();
  private readonly format = computed(() => {
    const valueFormat = this.valueFormat();
    const currency = this.currency();
    return (value: number): string => barFormat(value, valueFormat, currency);
  });

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
   * Pointer only - keys read the chart but do not click it, so offer a keyboard-reachable equivalent.
   */
  public readonly barClick = output<ChartPointClick>();
  /**
   * Replaces the derived summary in the canvas' accessible name (by default
   * its span and, for one series, its highest and lowest bar).
   */
  public readonly summary = input<string | undefined>(undefined);
  /** Shows the data table under the chart; otherwise only a screen reader reaches it. */
  public readonly showDataTable = input<boolean>(false);
  protected readonly isEmpty = computed(() => isSeriesEmpty(this.series()));
  protected readonly name = computed(() => this.label() || 'Bar chart');
  protected readonly accessibleName = computed(() => {
    const summary = this.isEmpty()
      ? this.emptyMessage()
      : (this.summary() ?? describeBarChart(this.series(), this.format()));
    return summary ? `${this.name()}. ${summary}` : this.name();
  });
  protected readonly table = computed(() =>
    this.isEmpty() ? null : seriesTable(this.series(), this.format(), this.stacked())
  );
  protected readonly announcement = signal('');

  constructor() {
    effect(() => {
      const series = this.series();
      const themeKey = this.themeKey();
      if (!this.chart) {
        return;
      }
      if (themeKey === this.builtThemeKey) {
        updateBarChart(this.chart, series);
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
    const config = buildBarChartConfig(
      this.series(),
      resolveBarChartTokens(),
      this.currency(),
      this.stacked(),
      this.valueFormat()
    );
    // The chart's own hover highlights a column; this announces it and lets the keyboard step it.
    const read = bindChartHighlight(config, {
      onHighlight: index =>
        this.announcement.set(
          describeSeriesAt(this.series(), index, this.format(), this.stacked())
        ),
      onRelease: () => this.announcement.set(''),
    });
    const bound = bindChartClick(read, {
      resolve: resolveBarClick,
      isActive: () => isOutputObserved(this.barClick),
      emit: hit => this.barClick.emit(hit),
    });
    this.chart = new Chart(ctx, bound);
  }
}
