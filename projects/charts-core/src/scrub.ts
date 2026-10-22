import {type Chart, type Plugin} from 'chart.js';

import {type ChartScrubHandlers, type ChartScrubPoint, type ChartScrubValue} from './types';

/** Radius (px) of the dot marking a series' value at the scrubbed point. */
const DOT_RADIUS = 4;
const FULL_TURN = Math.PI + Math.PI;

function datumValue(datum: unknown): number | null {
  const value = typeof datum === 'object' && datum !== null ? (datum as {y?: unknown}).y : datum;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function datumX(datum: unknown, label: string): string | number {
  const x = typeof datum === 'object' && datum !== null ? (datum as {x?: unknown}).x : undefined;
  return typeof x === 'number' ? x : label;
}

/** The label of point `index`: a category label, or the one a time-spaced datum carries. */
function datumLabel(chart: Chart, index: number): string {
  const category = chart.data.labels?.[index];
  if (typeof category === 'string' || typeof category === 'number') {
    return String(category);
  }
  const datum = chart.data.datasets[0]?.data[index] as {label?: unknown} | undefined;
  return typeof datum?.label === 'string' ? datum.label : '';
}

/**
 * What the chart reads at point `index`, or null when no visible series has a value there.
 * A stacked chart's headline is the total of its bands; any other chart's is its first series.
 */
export function scrubPointAt(chart: Chart, index: number): ChartScrubPoint | null {
  const values: ChartScrubValue[] = [];
  chart.data.datasets.forEach((dataset, i) => {
    const value = chart.isDatasetVisible(i) ? datumValue(dataset.data[index]) : null;
    if (value !== null) {
      values.push({label: dataset.label ?? '', value});
    }
  });
  if (values.length === 0) {
    return null;
  }
  const total = values.reduce((sum, v) => sum + v.value, 0);
  const label = datumLabel(chart, index);
  const stacked =
    (chart.options.scales?.['y'] as {stacked?: boolean} | undefined)?.stacked === true;
  return {
    index,
    label,
    x: datumX(chart.data.datasets[0].data[index], label),
    y: stacked ? total : values[0].value,
    total,
    values,
  };
}

/** Index of the entry in `xs` closest to `x`; `xs` is ascending. -1 when empty. */
export function nearestIndex(xs: readonly number[], x: number): number {
  let best = -1;
  xs.forEach((candidate, i) => {
    if (best === -1 || Math.abs(candidate - x) < Math.abs(xs[best] - x)) {
      best = i;
    }
  });
  return best;
}

function pointXs(chart: Chart): number[] {
  return chart.getDatasetMeta(0).data.map(element => element.x);
}

/** The direction a scrub key reads in: +1 toward the last point, -1 toward the first. */
type KeyDirection = 1 | -1;

/**
 * Where scrub key `key` moves a reading at `current` (null when nothing is read yet) among
 * `count` points, and the way to keep looking if that point has nothing to read; null when `key`
 * is not a scrub key. ArrowRight and ArrowLeft step one point (from nothing, they start at the
 * first and the last point); Home and End jump to the ends.
 */
export function scrubKeyStep(
  key: string,
  current: number | null,
  count: number
): {index: number; direction: KeyDirection} | null {
  if (count === 0) {
    return null;
  }
  const last = count - 1;
  switch (key) {
    case 'ArrowRight':
      return {index: current === null ? 0 : Math.min(current + 1, last), direction: 1};
    case 'ArrowLeft':
      return {index: current === null ? last : Math.max(current - 1, 0), direction: -1};
    case 'Home':
      return {index: 0, direction: 1};
    case 'End':
      return {index: last, direction: -1};
    default:
      return null;
  }
}

/** What a chart's keyboard reading does; the plugin that owns the reading supplies each step. */
export interface ChartKeyHandlers {
  /** The index read now, or null when nothing is. */
  current(): number | null;
  /** How many points or items the keys step through. */
  count(): number;
  /** Reads `index`; false when it has nothing to read, so the key keeps looking past it. */
  readAt(index: number): boolean;
  /** Escape or a lost focus: stop reading. */
  release(): void;
}

/**
 * Wires the scrub keys onto a focusable canvas: ArrowLeft/ArrowRight, Home and End move the
 * reading (skipping points with nothing to read), Escape and blur end it. Returns the detach.
 * The canvas only takes key events once the host makes it focusable (a `tabindex`).
 */
export function attachScrubKeys(canvas: HTMLCanvasElement, keys: ChartKeyHandlers): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      keys.release();
      return;
    }
    const count = keys.count();
    const step = scrubKeyStep(event.key, keys.current(), count);
    if (!step) {
      return;
    }
    // The keys read the chart rather than scroll the page.
    event.preventDefault();
    for (let i = step.index; i >= 0 && i < count; i += step.direction) {
      if (i === keys.current() || keys.readAt(i)) {
        return;
      }
    }
  };
  const onBlur = (): void => keys.release();
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('blur', onBlur);
  return () => {
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('blur', onBlur);
  };
}

/**
 * Scrub-to-read for a Chart.js line chart: while a pointer is on the chart a crosshair marks the
 * point under it and `handlers.onScrub` reports it; `handlers.onRelease` fires when the pointer
 * lifts or leaves. A mouse or pen scrubs while hovering; touch scrubs while the finger is down
 * (horizontal drag reads the chart, vertical drag still scrolls the page). A focused canvas reads
 * by key too: ArrowLeft/ArrowRight step a point, Home and End jump to the ends, and Escape or
 * leaving the canvas releases (see `attachScrubKeys`).
 *
 * The crosshair is the only thing drawn; colouring the host's number is the host's business.
 */
export function scrubPlugin(handlers: ChartScrubHandlers, crosshairColor: string): Plugin {
  let active: number | null = null;
  let touchId: number | null = null;
  let detach: (() => void) | null = null;

  function release(chart: Chart): void {
    if (active === null) {
      return;
    }
    active = null;
    chart.draw();
    handlers.onRelease();
  }

  /** Reads point `index`; false when no visible series has a value there. */
  function scrubAt(chart: Chart, index: number): boolean {
    const point = scrubPointAt(chart, index);
    if (!point) {
      return false;
    }
    active = index;
    chart.draw();
    handlers.onScrub(point);
    return true;
  }

  function scrubTo(chart: Chart, event: PointerEvent): void {
    const rect = chart.canvas.getBoundingClientRect();
    const {left, right} = chart.chartArea;
    const x = Math.min(Math.max(event.clientX - rect.left, left), right);
    const index = nearestIndex(pointXs(chart), x);
    if (index !== -1 && index !== active) {
      scrubAt(chart, index);
    }
  }

  function attach(chart: Chart): () => void {
    const canvas = chart.canvas;
    const previous = {touchAction: canvas.style.touchAction, userSelect: canvas.style.userSelect};
    // Vertical pans stay with the page; horizontal ones are the scrub.
    canvas.style.touchAction = 'pan-y';
    canvas.style.userSelect = 'none';

    const isTouch = (event: PointerEvent): boolean => event.pointerType === 'touch';
    const onDown = (event: PointerEvent): void => {
      if (isTouch(event)) {
        touchId = event.pointerId;
      }
      scrubTo(chart, event);
    };
    const onMove = (event: PointerEvent): void => {
      if (!isTouch(event) || touchId === event.pointerId) {
        scrubTo(chart, event);
      }
    };
    const onEnd = (event: PointerEvent): void => {
      if (isTouch(event) && touchId === event.pointerId) {
        touchId = null;
        release(chart);
      }
    };
    const onCancel = (event: PointerEvent): void => {
      if (isTouch(event)) {
        touchId = null;
      }
      release(chart);
    };
    const onLeave = (event: PointerEvent): void => {
      if (!isTouch(event)) {
        release(chart);
      }
    };
    // A long press must not open the browser's context menu mid-scrub.
    const onContextMenu = (event: Event): void => {
      if (touchId !== null) {
        event.preventDefault();
      }
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onEnd);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('contextmenu', onContextMenu);
    const detachKeys = attachScrubKeys(canvas, {
      current: () => active,
      count: () => pointXs(chart).length,
      readAt: index => scrubAt(chart, index),
      release: () => release(chart),
    });
    return () => {
      detachKeys();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onEnd);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.style.touchAction = previous.touchAction;
      canvas.style.userSelect = previous.userSelect;
    };
  }

  return {
    id: 'scrub',
    afterInit(chart) {
      detach = attach(chart);
    },
    afterUpdate(chart) {
      // New data changes what the held point reads: report it again, or snap back rather than
      // read a ghost when the index is now past the end.
      if (active === null) {
        return;
      }
      const point =
        active < chart.getDatasetMeta(0).data.length ? scrubPointAt(chart, active) : null;
      if (point) {
        handlers.onScrub(point);
      } else {
        release(chart);
      }
    },
    afterDatasetsDraw(chart) {
      const index = active;
      const x = index === null ? undefined : chart.getDatasetMeta(0).data[index]?.x;
      if (index === null || x === undefined) {
        return;
      }
      const {top, bottom} = chart.chartArea;
      const {ctx} = chart;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = crosshairColor;
      ctx.stroke();
      // A dot on each visible series marks exactly what the headline reads.
      chart.data.datasets.forEach((dataset, i) => {
        const element = chart.isDatasetVisible(i) ? chart.getDatasetMeta(i).data[index] : undefined;
        if (element) {
          ctx.beginPath();
          ctx.arc(element.x, element.y, DOT_RADIUS, 0, FULL_TURN);
          ctx.fillStyle =
            typeof dataset.borderColor === 'string' ? dataset.borderColor : crosshairColor;
          ctx.fill();
        }
      });
      ctx.restore();
    },
    afterDestroy() {
      detach?.();
      detach = null;
      touchId = null;
      if (active !== null) {
        active = null;
        handlers.onRelease();
      }
    },
  };
}
