import {
  type Chart,
  type ChartConfiguration,
  type ChartEvent,
  type ChartOptions,
  type ChartType,
  type Plugin,
} from 'chart.js';

import {type ChartPointClick, type DonutSegmentClick} from './types';

interface Hit {
  index: number;
  datasetIndex: number;
  element: {y: number};
}

function labelAt(chart: Chart, index: number): string {
  const label = chart.data.labels?.[index];
  return typeof label === 'string' ? label : '';
}

function hitsAt(
  chart: Chart,
  event: ChartEvent,
  mode: 'index' | 'nearest',
  intersect: boolean
): Hit[] {
  return chart.getElementsAtEventForMode(
    event as unknown as Event,
    mode,
    {intersect},
    false
  ) as unknown as Hit[];
}

function pointClick(chart: Chart, hit: Hit): ChartPointClick {
  const dataset = chart.data.datasets[hit.datasetIndex];
  return {
    index: hit.index,
    seriesIndex: hit.datasetIndex,
    label: labelAt(chart, hit.index),
    seriesLabel: dataset.label ?? '',
    value: dataset.data[hit.index] as number,
  };
}

/**
 * The point under an area-chart pointer. The pointer picks a column (anywhere in the plot, as
 * the tooltip does) and, within it, a series: the band it sits in when stacked, else the line
 * nearest to it. A hidden series is never picked.
 */
export function resolveAreaClick(
  chart: Chart,
  event: ChartEvent,
  stacked: boolean
): ChartPointClick | null {
  const hits = hitsAt(chart, event, 'index', false);
  if (hits.length === 0) {
    return null;
  }
  const pointerY = event.y ?? 0;
  const picked = stacked
    ? // Bands stack upward from the first series, so the pointer is in the first one whose top is above it.
      (hits.find(h => pointerY >= h.element.y) ?? hits[hits.length - 1])
    : hits.reduce((nearest, h) =>
        Math.abs(h.element.y - pointerY) < Math.abs(nearest.element.y - pointerY) ? h : nearest
      );
  return pointClick(chart, picked);
}

/** The bar under a bar-chart pointer; null between bars. */
export function resolveBarClick(chart: Chart, event: ChartEvent): ChartPointClick | null {
  const [hit] = hitsAt(chart, event, 'nearest', true);
  return hit ? pointClick(chart, hit) : null;
}

/** The ring segment under a donut-chart pointer; null off the ring. */
export function resolveDonutClick(chart: Chart, event: ChartEvent): DonutSegmentClick | null {
  const [hit] = hitsAt(chart, event, 'nearest', true);
  if (!hit) {
    return null;
  }
  return {
    index: hit.index,
    label: labelAt(chart, hit.index),
    value: chart.data.datasets[hit.datasetIndex].data[hit.index] as number,
  };
}

export interface ChartClickBinding<T> {
  /** What a pointer event is over, or null when it is over nothing clickable. */
  resolve: (chart: Chart, event: ChartEvent) => T | null;
  /** Whether anything listens; with no listener the chart neither emits nor shows a pointer cursor. */
  isActive: () => boolean;
  emit: (hit: T) => void;
}

/** The config with click emission and the pointer cursor wired in; build the chart from the result. */
export function bindChartClick<TType extends ChartType, T>(
  config: ChartConfiguration<TType>,
  binding: ChartClickBinding<T>
): ChartConfiguration<TType> {
  const handlers: Pick<ChartOptions, 'onClick'> = {
    onClick: (event, _elements, chart) => {
      const hit = binding.isActive() ? binding.resolve(chart, event) : null;
      if (hit) {
        binding.emit(hit);
      }
    },
  };
  // `onHover` only fires inside the plot, so it could never clear the cursor on the way out;
  // a plugin's `afterEvent` sees every pointer event on the canvas.
  const cursor: Plugin = {
    id: 'chartClickCursor',
    afterEvent: (chart, {event, inChartArea}) => {
      const clickable =
        binding.isActive() &&
        inChartArea &&
        event.type !== 'mouseout' &&
        binding.resolve(chart, event) !== null;
      // eslint-disable-next-line no-param-reassign
      chart.canvas.style.cursor = clickable ? 'pointer' : '';
    },
  };
  const options: ChartOptions<TType> = Object.assign({}, config.options, handlers);
  return {...config, options, plugins: [...(config.plugins ?? []), cursor as Plugin<TType>]};
}
