import {
  type ActiveElement,
  type Chart,
  type ChartConfiguration,
  type ChartType,
  type Plugin,
} from 'chart.js';

import {attachScrubKeys} from './scrub';
import {type ChartHighlightHandlers} from './types';

/** Every visible series' element at `index`: a column of bars, a line point, or a ring segment. */
function elementsAt(chart: Chart, index: number): ActiveElement[] {
  const active: ActiveElement[] = [];
  chart.data.datasets.forEach((_, datasetIndex) => {
    const element = chart.isDatasetVisible(datasetIndex)
      ? chart.getDatasetMeta(datasetIndex).data[index]
      : undefined;
    if (element) {
      active.push({datasetIndex, index, element});
    }
  });
  return active;
}

/**
 * Highlight-to-read for a chart whose own hover already highlights (bars, ring segments, and line
 * and area charts that do not scrub): `handlers.onHighlight` reports the item a pointer or a key
 * lands on, so the host can announce it, and `handlers.onRelease` fires when nothing is
 * highlighted any more. A pointer highlights through Chart.js' own hover (a touch drags across the
 * items, while a vertical drag still scrolls the page); a focused canvas steps with
 * ArrowLeft/ArrowRight, Home and End, which set the same hover style and tooltip, and Escape or
 * leaving the canvas clears it.
 */
export function highlightPlugin(handlers: ChartHighlightHandlers): Plugin {
  let current: number | null = null;
  let detach: (() => void) | null = null;

  function report(index: number | null): void {
    if (index === current) {
      return;
    }
    current = index;
    if (index === null) {
      handlers.onRelease();
    } else {
      handlers.onHighlight(index);
    }
  }

  function show(chart: Chart, active: ActiveElement[]): void {
    const [first] = active;
    chart.setActiveElements(active);
    chart.tooltip?.setActiveElements(active, {x: first?.element.x ?? 0, y: first?.element.y ?? 0});
    chart.update();
  }

  function attach(chart: Chart): () => void {
    const canvas = chart.canvas;
    const previousTouchAction = canvas.style.touchAction;
    // Vertical pans stay with the page; horizontal ones drag the highlight across the items.
    canvas.style.touchAction = 'pan-y';
    const detachKeys = attachScrubKeys(canvas, {
      current: () => current,
      count: () => chart.getDatasetMeta(0).data.length,
      readAt: index => {
        const active = elementsAt(chart, index);
        if (active.length === 0) {
          return false;
        }
        show(chart, active);
        report(index);
        return true;
      },
      release: () => {
        if (current !== null) {
          show(chart, []);
          report(null);
        }
      },
    });
    return () => {
      detachKeys();
      canvas.style.touchAction = previousTouchAction;
    };
  }

  return {
    id: 'highlight',
    afterInit(chart) {
      detach = attach(chart);
    },
    afterEvent(chart) {
      // Chart.js has already moved its hover to whatever the pointer is over.
      const [first] = chart.getActiveElements();
      report(first ? first.index : null);
    },
    afterUpdate(chart) {
      // New data can leave the highlighted item past the end: clear rather than read a ghost.
      if (current !== null && current >= chart.getDatasetMeta(0).data.length) {
        report(null);
      }
    },
    afterDestroy() {
      detach?.();
      detach = null;
      report(null);
    },
  };
}

/** The config with highlight-to-read wired in; build the chart from the result. */
export function bindChartHighlight<TType extends ChartType>(
  config: ChartConfiguration<TType>,
  handlers: ChartHighlightHandlers
): ChartConfiguration<TType> {
  return {
    ...config,
    plugins: [...(config.plugins ?? []), highlightPlugin(handlers) as Plugin<TType>],
  };
}
