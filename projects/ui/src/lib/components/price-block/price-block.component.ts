import {_IdGenerator} from '@angular/cdk/a11y';
import {Directionality} from '@angular/cdk/bidi';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {
  buildPriceChartConfig,
  buildPriceView,
  type ChartScrubPoint,
  describeLineChart,
  describeSeriesAt,
  PRICE_PERIOD_LABELS,
  PRICE_PERIOD_PHRASES,
  PRICE_PERIODS,
  type PriceChartModel,
  priceChartModel,
  priceDelta,
  priceFormatter,
  type PriceMarker,
  type PriceModeSetting,
  type PricePeriod,
  type PriceReferenceLine,
  type PriceSeries,
  type PriceValueFormat,
  resolvePriceChartTokens,
  seriesTable,
  signedAmount,
  signedPercent,
  updatePriceChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';

import {injectChartThemeKey} from '../../chart-theme/chart-theme';
import {ChartFrameComponent} from '../chart-frame/chart-frame.component';
import {IconComponent, LucideIconName} from '../icon/icon.component';
import {TagComponent, TagVariant} from '../tag/tag.component';

export type {
  PriceMarker,
  PriceMarkerKind,
  PriceModeSetting,
  PricePeriod,
  PricePoint,
  PriceReferenceLine,
  PriceSeries,
  PriceValueFormat,
} from '@lifekit-hq/charts-core';
export {PRICE_PERIODS} from '@lifekit-hq/charts-core';

/** Height of one line of the tooltip pill (the date, or one series), and the pill's own padding and border. */
const PILL_ROW_PX = 16;
const PILL_CHROME_PX = 12;
/** Clear air between the pill and the top of the plot. */
const PILL_GAP_PX = 4;
const PERCENT_OF = 100;

const TAB_BASE =
  'inline-flex h-cmn-size-md min-w-0 flex-1 items-center justify-center whitespace-nowrap ' +
  'max-md:min-h-cmn-touch px-cmn-1 text-cmn-sm transition-colors duration-cmn-short ease-cmn-standard ' +
  'border-b-cmn-tab focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ' +
  'focus-visible:outline-border-focus';
const TAB_ACTIVE = 'border-accent-default font-semibold text-text-primary';
const TAB_INACTIVE =
  'border-transparent text-text-secondary hover:border-border-strong hover:text-text-primary';

/** What the combined tooltip pill reads at the scrubbed point. */
interface PillReading {
  /** Pixel x of the point inside the canvas, and the canvas width. */
  x: number;
  width: number;
  date: string;
  rows: {label: string; color: string; text: string}[];
}

/**
 * A price chart with the mechanics of a market detail view: the instrument's price and its change
 * over the chosen period (a pill coloured by the sign of that change), a dotted line at the
 * period's starting value, underlined period tabs, and a crosshair whose one combined pill carries
 * the date and every series' value. Overlaying a benchmark (a second series) switches the chart to
 * percent change since the period began, so the lines start from the same place.
 *
 * Pass the whole history as `series` (the first is the instrument, the rest overlay it); the block
 * cuts it to the period. Periods count back from the last price, not from today, so the same data
 * reads the same on every day. Draws in `cmn-chart-frame`, so it shares the frame's Table chip,
 * live region and caption.
 *
 * On touch, a horizontal drag across the plot reads the chart and a vertical one still scrolls the
 * page; the pill sits in its own band above the plot so a finger never covers it.
 */
@Component({
  selector: 'cmn-price-block',
  imports: [ChartFrameComponent, IconComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <cmn-chart-frame
      [announcement]="announcement()"
      [caption]="caption()"
      [label]="label()"
      [table]="table()"
      [tableName]="name()"
      [tableOpen]="showDataTable()"
    >
      <div chartHeader class="flex flex-col items-start gap-cmn-2">
        <p
          class="flex h-cmn-size-md items-center font-headline text-cmn-2xl font-semibold tabular-nums text-text-primary"
          data-testid="price-headline"
        >
          {{ headline() }}
        </p>
        <div class="flex h-cmn-size-sm items-center">
          @if (delta(); as d) {
            <cmn-tag [variant]="d.tone" size="lg" data-testid="price-delta">
              <span class="inline-flex items-center gap-cmn-1 tabular-nums">
                <cmn-icon [name]="d.icon" size="sm" />
                <span class="sr-only">{{ d.label }}: </span>
                {{ d.text }}
              </span>
            </cmn-tag>
          }
        </div>
      </div>

      <div
        [attr.aria-labelledby]="selectedTabId()"
        [id]="panelId"
        class="relative h-64"
        role="tabpanel"
      >
        <canvas
          #chartCanvas
          [attr.aria-label]="accessibleName()"
          [attr.tabindex]="view() ? 0 : null"
          [class.invisible]="!view()"
          role="img"
          class="rounded-cmn-role-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        ></canvas>
        @if (!view()) {
          <p
            class="absolute inset-0 flex items-center justify-center text-center text-cmn-sm text-text-secondary"
            data-testid="chart-empty"
          >
            {{ emptyMessage() }}
          </p>
        }
        @if (reading(); as r) {
          <div
            [style.left.px]="r.x"
            [style.transform]="pillTransform()"
            aria-hidden="true"
            class="pointer-events-none absolute top-0 z-10 flex flex-col whitespace-nowrap rounded-cmn-role-inset border border-border-default bg-surface-raised px-cmn-2 py-px text-cmn-xs leading-4 shadow-cmn-card"
            data-testid="price-pill"
          >
            <span class="text-text-secondary" data-testid="price-pill-date">{{ r.date }}</span>
            @for (row of r.rows; track $index) {
              <span class="flex items-center gap-cmn-2 tabular-nums" data-testid="price-pill-row">
                <span
                  [style.background-color]="row.color"
                  class="size-2 shrink-0 rounded-full"
                ></span>
                @if (r.rows.length > 1) {
                  <span class="text-text-secondary">{{ row.label }}</span>
                }
                <span class="font-semibold text-text-primary">{{ row.text }}</span>
              </span>
            }
          </div>
        }
      </div>

      <div
        [attr.aria-label]="'Period'"
        chartControls
        class="flex max-md:-mx-cmn-2"
        data-testid="price-periods"
        role="tablist"
      >
        @for (p of periods(); track p; let index = $index) {
          <button
            #periodTab
            [attr.aria-controls]="panelId"
            [attr.aria-selected]="p === period()"
            [attr.tabindex]="index === focusableIndex() ? 0 : -1"
            [class]="tabClass(p === period())"
            [id]="tabId(p)"
            (click)="period.set(p)"
            (keydown)="onTabKeydown($event, index)"
            role="tab"
            type="button"
          >
            {{ periodLabels[p] }}
          </button>
        }
      </div>
    </cmn-chart-frame>
  `,
})
export class PriceBlockComponent implements AfterViewInit, OnDestroy {
  private readonly idPrefix = inject(_IdGenerator).getId('cmn-price-block-');
  private readonly direction = inject(Directionality);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('periodTab');
  private readonly themeKey = injectChartThemeKey();
  private chart: Chart | null = null;
  private builtSeriesCount = -1;
  private builtThemeKey = '';
  private readonly scrubIndex = signal<number | null>(null);
  private readonly seriesCount = computed(() => Math.max(this.series().length, 1));
  private readonly headroom = computed(
    () => PILL_ROW_PX * (this.seriesCount() + 1) + PILL_CHROME_PX + PILL_GAP_PX
  );
  private readonly chartModel = computed<PriceChartModel>(() => {
    const view = this.view();
    return view
      ? priceChartModel(view, this.headroom())
      : {
          series: [],
          format: priceFormatter(this.valueFormat(), this.currency(), 'price'),
          baseline: null,
          reference: null,
          markers: [],
          headroom: this.headroom(),
        };
  });

  /**
   * The price history: the first series is the instrument, every further one overlays it (a
   * benchmark). Give the whole history; the block cuts it to the period. Prices are in `currency`
   * and need not share timestamps (an overlay holds its last price over a day its market was closed).
   */
  public readonly series = input<readonly PriceSeries[]>([]);
  /** The block's title. */
  public readonly label = input<string>('');
  /** The plain-language line under the plot: what each line is and what the dotted one marks. */
  public readonly caption = input<string>('');
  /** The selected period. Two-way, so a host can remember it. */
  public readonly period = model<PricePeriod>('1Y');
  /** The periods offered, in order. */
  public readonly periods = input<readonly PricePeriod[]>(PRICE_PERIODS);
  /**
   * What the chart reads in: `'auto'` (default) is percent change since the period began while a
   * benchmark overlays and the price otherwise; `'price'` and `'percent'` hold one.
   */
  public readonly mode = input<PriceModeSetting>('auto');
  public readonly currency = input<string>('USD');
  /** How a price renders: `'price'` (default) is currency to the cent; the chart formats are as on `cmn-line-chart`. */
  public readonly valueFormat = input<PriceValueFormat>('price');
  /** Shown in place of the plot when the period holds no prices. */
  public readonly emptyMessage = input<string>('No prices for this period');
  /**
   * Dated points drawn on the price: a triangle under the line for a `'buy'`, over it for a
   * `'sell'`, at the marker's `value` (the fill price) or else on the price that day. Markers
   * outside the selected period are left out; those inside are named in the chart's description.
   */
  public readonly markers = input<readonly PriceMarker[]>([]);
  /**
   * A dashed horizontal line at a price (the average cost of a holding), with its label beside
   * it. The price axis stretches to hold it, as it does for a marker at a price off the line.
   */
  public readonly referenceLine = input<PriceReferenceLine | null>(null);
  /** Opens the block with its data table showing in place of the plot. */
  public readonly showDataTable = input<boolean>(false);

  protected readonly periodLabels = PRICE_PERIOD_LABELS;
  protected readonly panelId = `${this.idPrefix}-panel`;
  protected readonly announcement = signal('');
  protected readonly reading = signal<PillReading | null>(null);

  protected readonly view = computed(() => {
    // The series colours are read from the tokens, so a theme change redraws them.
    this.themeKey();
    return buildPriceView({
      series: this.series(),
      period: this.period(),
      mode: this.mode(),
      valueFormat: this.valueFormat(),
      currency: this.currency(),
      markers: this.markers(),
      reference: this.referenceLine(),
    });
  });
  protected readonly name = computed(() => this.label() || 'Price chart');
  protected readonly table = computed(() => {
    const view = this.view();
    return view ? seriesTable(view.drawn, value => view.format(value, false)) : null;
  });
  protected readonly accessibleName = computed(() => {
    const view = this.view();
    if (!view) {
      return `${this.name()}. ${this.emptyMessage()}`;
    }
    const format = (value: number): string => view.priceFormat(value, false);
    const benchmarks = view.drawn.slice(1).map(s => s.label);
    const compared =
      view.mode === 'percent' && benchmarks.length > 0
        ? ` Compared with ${benchmarks.join(' and ')}, each shown as its percent change since the period began.`
        : '';
    return `${this.name()}, ${PRICE_PERIOD_PHRASES[this.period()]}. ${describeLineChart(view.prices, format)}.${compared}${this.annotationSummary(view)}`;
  });

  /** The price shown large: the instrument's last price, or its price at the scrubbed point. */
  protected readonly headline = computed(() => {
    const view = this.view();
    if (!view) {
      return '—';
    }
    const index = this.scrubIndex();
    const value = index === null ? view.end : (view.prices[index]?.value ?? view.end);
    return view.priceFormat(value, false);
  });

  /** The change since the period began (to the scrubbed point, while scrubbing), as a pill. */
  protected readonly delta = computed<{
    tone: TagVariant;
    icon: LucideIconName;
    text: string;
    label: string;
  } | null>(() => {
    const view = this.view();
    if (!view) {
      return null;
    }
    const index = this.scrubIndex();
    const to = index === null ? view.end : (view.prices[index]?.value ?? view.end);
    const change = priceDelta(view.start, to);
    const amount = signedAmount(change.change, view.priceFormat);
    const percent = change.percent === null ? null : signedPercent(change.percent);
    // The sign of what the pill shows: a move that rounds to nothing reads as no change.
    const flat = change.direction === 0 || amount === view.priceFormat(0, false);
    const text = percent === null ? amount : `${percent} · ${amount}`;
    const label =
      index === null
        ? `Change ${PRICE_PERIOD_PHRASES[this.period()]}`
        : `Change to ${view.prices[index]?.label ?? ''}`;
    return {
      tone: flat ? 'neutral' : change.direction > 0 ? 'success' : 'error',
      icon: flat ? 'Minus' : change.direction > 0 ? 'TrendingUp' : 'TrendingDown',
      text,
      label,
    };
  });

  protected readonly pillTransform = computed(() => {
    const r = this.reading();
    return r && r.width > 0 ? `translateX(-${(r.x / r.width) * PERCENT_OF}%)` : null;
  });

  /** The one tab in the page's tab order: the selected one, or the first when none is. */
  protected readonly focusableIndex = computed(() =>
    Math.max(this.periods().indexOf(this.period()), 0)
  );
  protected readonly selectedTabId = computed(() => this.tabId(this.period()));

  constructor() {
    effect(() => {
      const chartModel = this.chartModel();
      const themeKey = this.themeKey();
      if (!this.chart) {
        return;
      }
      if (themeKey === this.builtThemeKey && chartModel.series.length === this.builtSeriesCount) {
        updatePriceChart(this.chart, chartModel, resolvePriceChartTokens());
      } else {
        // The series count shapes the chart's datasets and a theme change rewrites its token
        // colours, so either rebuilds it.
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

  protected tabId(period: PricePeriod): string {
    return `${this.idPrefix}-tab-${period}`;
  }

  protected tabClass(active: boolean): string {
    return `${TAB_BASE} ${active ? TAB_ACTIVE : TAB_INACTIVE}`;
  }

  /** Arrow keys, Home and End move between periods, and the focused period is selected. */
  protected onTabKeydown(event: KeyboardEvent, focused: number): void {
    const periods = this.periods();
    const rtl = this.direction.value === 'rtl';
    const forward = rtl ? -1 : 1;
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const step = event.key === 'ArrowRight' ? forward : -forward;
      next = (focused + step + periods.length) % periods.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = periods.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    this.period.set(periods[next]);
    this.tabButtons()[next]?.nativeElement.focus();
  }

  /** What the markers and the reference line say, for the chart's spoken description. */
  private annotationSummary(view: NonNullable<ReturnType<typeof this.view>>): string {
    const parts = view.markers.map(m => {
      const what = m.kind === 'buy' ? 'Bought' : 'Sold';
      const detail = m.label ? ` ${m.label}` : '';
      return `${what}${detail} at ${view.priceFormat(m.value, false)} on ${m.date}`;
    });
    if (view.reference) {
      parts.push(`${view.reference.label} ${view.priceFormat(view.reference.value, false)}`);
    }
    return parts.length > 0 ? ` ${parts.join('. ')}.` : '';
  }

  private buildChart(): void {
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }
    const chartModel = this.chartModel();
    this.builtSeriesCount = chartModel.series.length;
    this.builtThemeKey = this.themeKey();
    this.chart = new Chart(
      ctx,
      buildPriceChartConfig(chartModel, resolvePriceChartTokens(), {
        onScrub: point => this.read(point),
        onRelease: () => {
          this.scrubIndex.set(null);
          this.reading.set(null);
          this.announcement.set('');
        },
      })
    );
  }

  /** The scrub reached `point`: move the headline and the pill, and say what it reads. */
  private read(point: ChartScrubPoint): void {
    const view = this.view();
    const chart = this.chart;
    const element = chart?.getDatasetMeta(0).data[point.index];
    if (!view || !chart || !element) {
      return;
    }
    this.scrubIndex.set(point.index);
    this.reading.set({
      x: element.x,
      width: chart.width,
      date: point.label,
      rows: point.values.map((value, i) => ({
        label: value.label,
        color: view.drawn[i]?.color ?? '',
        text: view.format(value.value, false),
      })),
    });
    this.announcement.set(
      describeSeriesAt(view.drawn, point.index, value => view.format(value, false))
    );
  }
}
