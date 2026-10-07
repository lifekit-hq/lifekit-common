import {
  buildLineChartConfig,
  type ChartPoint,
  type ChartValueFormat,
  resolveLineChartTokens,
  updateLineChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';
import {css, html, LitElement, type PropertyDeclarations, type TemplateResult} from 'lit';

export type {ChartPoint, ChartValueFormat} from '@lifekit-hq/charts-core';

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
  };

  declare public points: ChartPoint[];
  declare public label: string;
  declare public currency: string;
  declare public valueFormat: ChartValueFormat;
  declare public compact: boolean;

  constructor() {
    super();
    this.points = [];
    this.label = '';
    this.currency = 'USD';
    this.valueFormat = 'currency';
    this.compact = false;
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
        this.compact
      )
    );
  }

  public override updated(changed: Map<string, unknown>): void {
    // `compact` shapes the chart config, so a later change rebuilds it (the first update already built it).
    if (this.chart && changed.has('compact') && changed.get('compact') !== undefined) {
      this.rebuildChart();
      return;
    }
    if (
      this.chart &&
      (changed.has('points') || changed.has('currency') || changed.has('valueFormat'))
    ) {
      updateLineChart(this.chart, this.points, {
        currency: this.currency,
        valueFormat: this.valueFormat,
      });
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
