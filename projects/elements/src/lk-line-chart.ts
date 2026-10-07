import {
  buildLineChartConfig,
  type ChartDomain,
  type ChartPoint,
  type ChartScrubPoint,
  type ChartValueFormat,
  type ChartXSpacing,
  resolveLineChartTokens,
  updateLineChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';
import {css, html, LitElement, type PropertyDeclarations, type TemplateResult} from 'lit';

export type {
  ChartDomain,
  ChartPoint,
  ChartScrubPoint,
  ChartValueFormat,
  ChartXSpacing,
} from '@lifekit-hq/charts-core';

/**
 * Framework-free line chart powered by Chart.js and themed via @lifekit/tokens CSS custom
 * properties. CSS custom properties pierce shadow DOM, making the tokens layer the sole theming
 * contract — no Tailwind classes or Angular-specific binding needed.
 *
 * Data flows in via the `points` property (array — must be set as a DOM property, not an
 * attribute). Theming is passive: import `@lifekit-hq/tokens/theme.css` in the host page and the
 * element resolves the correct values automatically.
 *
 * Values render as currency by default; set `valueFormat` (`value-format` attribute) to `number`
 * or `percent` for unit-less series, or assign a `(value, compact) => string` function property.
 *
 * Set `compact` (attribute) for a sparkline: only the line, filling the host - no title, frame,
 * axes, gridlines or tooltip, and no animation. Size it with a `height` on the element (it
 * defaults to 2rem).
 *
 * Two optional, additive scale controls work in both modes. `yDomain` (`{min?, max?}`, property
 * only) fixes the y range instead of auto-scaling it to the data, so a series keeps its height
 * against a known scale. `xSpacing="time"` (`x-spacing` attribute) places each point by the
 * epoch-ms `time` on it instead of in an equal slot, so a burst of points reads as a burst;
 * points without a `time` are then left out.
 *
 * Set `scrubbable` (attribute) to opt into scrub-to-read: a crosshair follows a held pointer (a
 * touch, or a hovering mouse) and `lk-line-chart-scrub` (`detail` is a `ChartScrubPoint`) reports
 * the point under it, so the host's headline number can follow; `lk-line-chart-scrub-end` fires on
 * release. The chart's own tooltip steps aside; a `compact` chart ignores it.
 *
 * @example
 * <lk-line-chart label="Net Worth" currency="USD"></lk-line-chart>
 * <script>
 *   document.querySelector('lk-line-chart').points = [{label:'Jan', value:1400000}];
 * </script>
 */
export class LkLineChart extends LitElement {
  private chart: Chart | null = null;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: block;
    }

    .wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--space-3, 0.75rem);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border-default, #d9e0e3);
      background: var(--color-surface-card, #ffffff);
      padding: var(--space-4, 1rem);
    }

    :host([compact]) {
      min-height: 2rem;
    }

    :host([compact]) .wrapper {
      height: 100%;
      min-height: inherit;
      gap: 0;
      border: 0;
      border-radius: 0;
      background: none;
      padding: 0;
    }

    :host([compact]) .chart-area {
      flex: 1;
      height: auto;
      min-height: inherit;
    }

    .label {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .chart-area {
      position: relative;
      height: 12rem;
    }

    canvas {
      position: absolute;
      inset: 0;
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    points: {type: Array},
    label: {type: String},
    currency: {type: String},
    valueFormat: {attribute: 'value-format'},
    compact: {type: Boolean, reflect: true},
    yDomain: {attribute: false},
    xSpacing: {attribute: 'x-spacing'},
    scrubbable: {type: Boolean},
  };

  declare public points: ChartPoint[];
  declare public label: string;
  declare public currency: string;
  declare public valueFormat: ChartValueFormat;
  declare public compact: boolean;
  declare public yDomain: ChartDomain | undefined;
  declare public xSpacing: ChartXSpacing;
  declare public scrubbable: boolean;

  constructor() {
    super();
    this.points = [];
    this.label = '';
    this.currency = 'USD';
    this.valueFormat = 'currency';
    this.compact = false;
    this.yDomain = undefined;
    this.xSpacing = 'even';
    this.scrubbable = false;
  }

  protected override firstUpdated(): void {
    const canvas = this.shadowRoot?.querySelector('canvas') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!ctx) {
      return;
    }
    this.chart = new Chart(
      ctx,
      buildLineChartConfig(
        this.points,
        resolveLineChartTokens(),
        this.currency,
        this.valueFormat,
        this.compact,
        {yDomain: this.yDomain, xSpacing: this.xSpacing},
        this.scrubbable
          ? {
              onScrub: point => this.emitScrub(point),
              onRelease: () => this.emitScrubEnd(),
            }
          : undefined
      )
    );
  }

  private emitScrub(point: ChartScrubPoint): void {
    this.dispatchEvent(
      new CustomEvent<ChartScrubPoint>('lk-line-chart-scrub', {
        detail: point,
        bubbles: true,
        composed: true,
      })
    );
  }

  private emitScrubEnd(): void {
    this.dispatchEvent(new CustomEvent('lk-line-chart-scrub-end', {bubbles: true, composed: true}));
  }

  public override updated(changed: Map<string, unknown>): void {
    // `compact`, `xSpacing` and `scrubbable` shape the chart config, so a later change rebuilds it
    // (the first update already built it).
    if (
      this.chart &&
      ((changed.has('compact') && changed.get('compact') !== undefined) ||
        (changed.has('xSpacing') && changed.get('xSpacing') !== undefined) ||
        (changed.has('scrubbable') && changed.get('scrubbable') !== undefined))
    ) {
      this.rebuildChart();
      return;
    }
    if (
      this.chart &&
      (changed.has('points') ||
        changed.has('currency') ||
        changed.has('valueFormat') ||
        changed.has('yDomain'))
    ) {
      updateLineChart(
        this.chart,
        this.points,
        {currency: this.currency, valueFormat: this.valueFormat},
        {yDomain: this.yDomain, xSpacing: this.xSpacing}
      );
    }
  }

  private rebuildChart(): void {
    this.chart?.destroy();
    this.chart = null;
    this.firstUpdated();
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.chart?.destroy();
    this.chart = null;
  }

  protected override render(): TemplateResult {
    return html`
      <div class="wrapper">
        ${this.label && !this.compact ? html`<span class="label">${this.label}</span>` : ''}
        <div class="chart-area">
          <canvas></canvas>
        </div>
      </div>
    `;
  }
}

customElements.define('lk-line-chart', LkLineChart);
