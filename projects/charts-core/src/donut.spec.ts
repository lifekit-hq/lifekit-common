import {type Chart} from 'chart.js';
import {describe, expect, it} from 'vitest';

import {
  buildDonutChartConfig,
  type DonutChartTokens,
  resolveDonutChartTokens,
  updateDonutChart,
} from './donut';
import {type DonutSegment} from './types';

const TOKENS: DonutChartTokens = {textSecondary: '#464555'};

const SEGMENTS: DonutSegment[] = [
  {label: 'Banking', value: 4200},
  {label: 'Brokerage', value: 6100},
  {label: 'Crypto', value: 1800},
];

function legendDisplay(target: {options?: unknown}): boolean | undefined {
  return (target.options as {plugins?: {legend?: {display?: boolean}}} | undefined)?.plugins?.legend
    ?.display;
}

function tooltipLabel(
  config: ReturnType<typeof buildDonutChartConfig>,
  parsed: number,
  data: number[]
): string {
  const callbacks = (
    config.options as {
      plugins?: {
        tooltip?: {
          callbacks?: {label?: (ctx: {parsed: number; dataset: {data: number[]}}) => string};
        };
      };
    }
  )?.plugins?.tooltip?.callbacks;
  return callbacks?.label?.({parsed, dataset: {data}}) ?? '';
}

describe('buildDonutChartConfig', () => {
  it('maps every segment onto a label and a value', () => {
    const config = buildDonutChartConfig(SEGMENTS, TOKENS, 'USD', true);
    expect(config.data.labels).toEqual(['Banking', 'Brokerage', 'Crypto']);
    expect(config.data.datasets[0].data).toEqual([4200, 6100, 1800]);
  });

  it('assigns distinct default colors and cycles them past the palette length', () => {
    const many: DonutSegment[] = Array.from({length: 10}, (_, i) => ({
      label: `S${i}`,
      value: i + 1,
    }));
    const colors = buildDonutChartConfig(many, TOKENS, 'USD', false).data.datasets[0]
      .backgroundColor as string[];
    expect(colors[0]).not.toBe(colors[1]);
    expect(colors[8]).toBe(colors[0]);
    expect(colors[9]).toBe(colors[1]);
  });

  it('lets a segment override its color', () => {
    const config = buildDonutChartConfig(
      [{label: 'Custom', value: 1, color: '#abcdef'}],
      TOKENS,
      'USD',
      false
    );
    expect((config.data.datasets[0].backgroundColor as string[])[0]).toBe('#abcdef');
  });

  it('honours the legend flag', () => {
    expect(legendDisplay(buildDonutChartConfig(SEGMENTS, TOKENS, 'USD', true))).toBe(true);
    expect(legendDisplay(buildDonutChartConfig(SEGMENTS, TOKENS, 'USD', false))).toBe(false);
  });

  it('renders an empty chart for no segments', () => {
    const config = buildDonutChartConfig([], TOKENS, 'USD', true);
    expect(config.data.labels).toEqual([]);
    expect(config.data.datasets[0].data).toEqual([]);
  });

  it('colors the legend from the supplied tokens', () => {
    const config = buildDonutChartConfig(SEGMENTS, TOKENS, 'USD', true);
    const color = (config.options as {plugins?: {legend?: {labels?: {color?: string}}}} | undefined)
      ?.plugins?.legend?.labels?.color;
    expect(color).toBe(TOKENS.textSecondary);
  });

  it('shows the amount and its share of the total in the tooltip', () => {
    const config = buildDonutChartConfig(SEGMENTS, TOKENS, 'USD', true);
    expect(tooltipLabel(config, 4200, [4200, 6100, 1800])).toBe('$4,200 (34.7%)');
  });

  it('reports 0.0% rather than dividing by zero when every segment is zero', () => {
    const config = buildDonutChartConfig(SEGMENTS, TOKENS, 'USD', true);
    expect(tooltipLabel(config, 0, [0, 0, 0])).toBe('$0 (0.0%)');
  });
});

describe('resolveDonutChartTokens', () => {
  it('falls back to a built-in value when the CSS variable is unset', () => {
    expect(resolveDonutChartTokens().textSecondary).toBeTruthy();
  });
});

describe('updateDonutChart', () => {
  it('replaces labels, values and colors in place, then repaints without animation', () => {
    const chart = {
      data: {labels: ['old'], datasets: [{data: [1], backgroundColor: ['#000']}]},
      update: (mode?: string) => {
        chart.lastMode = mode;
      },
      lastMode: undefined as string | undefined,
    };

    updateDonutChart(chart as unknown as Chart, SEGMENTS);

    expect(chart.data.labels).toEqual(['Banking', 'Brokerage', 'Crypto']);
    expect(chart.data.datasets[0].data).toEqual([4200, 6100, 1800]);
    expect(chart.data.datasets[0].backgroundColor).toHaveLength(3);
    expect(chart.lastMode).toBe('none');
  });

  it('clears the chart when the segments go away', () => {
    const chart = {
      data: {labels: ['Banking'], datasets: [{data: [1], backgroundColor: ['#000']}]},
      update: () => void 0,
    };

    updateDonutChart(chart as unknown as Chart, []);
    expect(chart.data.labels).toEqual([]);
    expect(chart.data.datasets[0].data).toEqual([]);
    expect(chart.data.datasets[0].backgroundColor).toEqual([]);
  });
});
