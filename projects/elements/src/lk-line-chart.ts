import {
  buildLineChartConfig,
  type ChartPoint,
  resolveLineChartTokens,
  updateLineChart,
} from '@lifekit-hq/charts-core';
import {Chart} from 'chart.js';
import {css, html, LitElement, type PropertyDeclarations, type TemplateResult} from 'lit';

export type {ChartPoint} from '@lifekit-hq/charts-core';

/**
 * Framework-free line chart powered by Chart.js and themed via @lifekit/tokens CSS custom
 * properties. CSS custom properties pierce shadow DOM, making the tokens layer the sole theming
 * contract — no Tailwind classes or Angular-specific binding needed.
 *
 * Data flows in via the `points` property (array — must be set as a DOM property, not an
 * attribute). Theming is passive: import `@lifekit-hq/tokens/theme.css` in the host page and the
 * element resolves the correct values automatically.
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
      border-radius: var(--radius-lg, 0.5rem);
      border: 1px solid var(--color-border-default, #c7c4d8);
      background: var(--color-surface-card, #ffffff);
      padding: var(--space-4, 1rem);
    }

    .label {
      font-family: Inter, sans-serif;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #464555);
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
  };

  declare public points: ChartPoint[];
  declare public label: string;
  declare public currency: string;

  constructor() {
    super();
    this.points = [];
    this.label = '';
    this.currency = 'USD';
  }

  protected override firstUpdated(): void {
    const canvas = this.shadowRoot?.querySelector('canvas') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!ctx) {
      return;
    }
    this.chart = new Chart(
      ctx,
      buildLineChartConfig(this.points, resolveLineChartTokens(), this.currency)
    );
  }

  public override updated(changed: Map<string, unknown>): void {
    if (this.chart && (changed.has('points') || changed.has('currency'))) {
      updateLineChart(this.chart, this.points);
    }
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.chart?.destroy();
    this.chart = null;
  }

  protected override render(): TemplateResult {
    return html`
      <div class="wrapper">
        ${this.label ? html`<span class="label">${this.label}</span>` : ''}
        <div class="chart-area">
          <canvas></canvas>
        </div>
      </div>
    `;
  }
}

customElements.define('lk-line-chart', LkLineChart);
