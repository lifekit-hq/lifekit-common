import {type Chart} from 'chart.js';
import {describe, expect, it, vi} from 'vitest';

import {
  alignToPrimary,
  buildPriceChartConfig,
  buildPriceView,
  periodStart,
  priceAnchor,
  priceAnnotationsPlugin,
  priceBaselinePlugin,
  priceChartModel,
  priceDateLabel,
  priceDelta,
  priceFormatter,
  priceMoney,
  type PricePoint,
  type PriceSeries,
  priceSeriesColor,
  priceTickFormatter,
  rebaseToPercent,
  resolvePriceMode,
  signedAmount,
  signedPercent,
  slicePriceSeries,
  updatePriceChart,
} from './price';

const TOKENS = {
  textSecondary: '#46565e',
  borderDefault: '#d9e0e3',
  surface: '#ffffff',
  success: '#0e7446',
  error: '#bb2530',
};
const DAY = 86_400_000;
const HOUR = 3_600_000;
const utc = (y: number, m: number, d: number): number => Date.UTC(y, m - 1, d);

/** One price a day from `start` for `days` days, rising by `step` from `first`. */
function daily(start: number, days: number, first: number, step: number): PricePoint[] {
  return Array.from({length: days}, (_, i) => ({time: start + i * DAY, value: first + i * step}));
}

const ANCHOR = utc(2026, 3, 15);

describe('periodStart', () => {
  it('counts calendar months back from the anchor', () => {
    expect(periodStart('1M', ANCHOR)).toBe(utc(2026, 2, 15));
    expect(periodStart('6M', ANCHOR)).toBe(utc(2025, 9, 15));
    expect(periodStart('1Y', ANCHOR)).toBe(utc(2025, 3, 15));
    expect(periodStart('5Y', ANCHOR)).toBe(utc(2021, 3, 15));
  });

  it('clamps to the last day of a shorter target month instead of rolling into the next', () => {
    expect(periodStart('1M', utc(2026, 3, 31))).toBe(utc(2026, 2, 28));
    expect(periodStart('1M', utc(2025, 12, 31))).toBe(utc(2025, 11, 30));
    expect(periodStart('6M', utc(2026, 8, 31))).toBe(utc(2026, 2, 28));
    expect(periodStart('1Y', utc(2028, 2, 29))).toBe(utc(2027, 2, 28));
    expect(periodStart('1M', utc(2028, 3, 31))).toBe(utc(2028, 2, 29));
  });

  it('keeps the time of day of the anchor', () => {
    const anchor = Date.UTC(2026, 2, 31, 16, 30);
    expect(periodStart('1M', anchor)).toBe(Date.UTC(2026, 1, 28, 16, 30));
  });

  it('starts year to date on 1 January of the anchor year', () => {
    expect(periodStart('YTD', ANCHOR)).toBe(utc(2026, 1, 1));
  });

  it('starts Max before everything', () => {
    expect(periodStart('MAX', ANCHOR)).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe('slicePriceSeries', () => {
  const history: PriceSeries[] = [{label: 'AAPL', points: daily(utc(2025, 1, 1), 500, 100, 1)}];

  it('anchors on the last point of the first series, not the clock', () => {
    expect(priceAnchor(history)).toBe(history[0].points[499].time);
    expect(priceAnchor([])).toBe(0);
    expect(priceAnchor([{label: 'x', points: []}])).toBe(0);
  });

  it('keeps only the points inside the period', () => {
    const [month] = slicePriceSeries(history, '1M');
    const last = history[0].points[499].time;
    expect(month.points[month.points.length - 1].time).toBe(last);
    expect(month.points[0].time).toBeGreaterThanOrEqual(periodStart('1M', last));
    expect(month.points.length).toBeLessThan(35);
  });

  it('returns the whole history for Max and for a period longer than the history', () => {
    expect(slicePriceSeries(history, 'MAX')[0].points).toHaveLength(500);
    expect(slicePriceSeries(history, '5Y')[0].points).toHaveLength(500);
  });

  it('puts unsorted points in time order and drops non-finite times', () => {
    const [sliced] = slicePriceSeries(
      [
        {
          label: 'x',
          points: [
            {time: 3, value: 3},
            {time: Number.NaN, value: 9},
            {time: 1, value: 1},
          ],
        },
      ],
      'MAX'
    );
    expect(sliced.points.map(p => p.time)).toEqual([1, 3]);
  });
});

describe('rebaseToPercent', () => {
  it('measures every point against the first', () => {
    const points = rebaseToPercent([
      {time: 1, value: 200},
      {time: 2, value: 250},
      {time: 3, value: 150},
    ]);
    expect(points.map(p => p.value)).toEqual([0, 25, -25]);
  });

  it('reads a zero base as no move, and empty as empty', () => {
    expect(
      rebaseToPercent([
        {time: 1, value: 0},
        {time: 2, value: 5},
      ]).map(p => p.value)
    ).toEqual([0, 0]);
    expect(rebaseToPercent([])).toEqual([]);
  });
});

describe('resolvePriceMode', () => {
  it('reads percent while a benchmark overlays and price otherwise', () => {
    expect(resolvePriceMode('auto', 1)).toBe('price');
    expect(resolvePriceMode('auto', 2)).toBe('percent');
  });

  it('obeys an explicit mode', () => {
    expect(resolvePriceMode('price', 3)).toBe('price');
    expect(resolvePriceMode('percent', 1)).toBe('percent');
  });
});

describe('priceDelta', () => {
  it('signs a rise, a fall and no change', () => {
    expect(priceDelta(100, 110)).toMatchObject({change: 10, percent: 10, direction: 1});
    expect(priceDelta(100, 90)).toMatchObject({change: -10, percent: -10, direction: -1});
    expect(priceDelta(100, 100)).toMatchObject({change: 0, direction: 0});
  });

  it('has no percent from a zero start', () => {
    expect(priceDelta(0, 5).percent).toBeNull();
  });
});

describe('formatting', () => {
  it('signs a percent and never signs a zero', () => {
    expect(signedPercent(2.4)).toBe('+2.40%');
    expect(signedPercent(-1.05)).toBe('−1.05%');
    expect(signedPercent(0)).toBe('0.00%');
    expect(signedPercent(0.001)).toBe('0.00%');
    expect(signedPercent(-0.001)).toBe('0.00%');
  });

  it('signs an amount in the given format', () => {
    const usd = priceFormatter('price', 'USD', 'price');
    expect(signedAmount(12.4, usd)).toBe('+$12.40');
    expect(signedAmount(-3, usd)).toBe('−$3.00');
    expect(signedAmount(0, usd)).toBe('$0.00');
    expect(signedAmount(0.001, usd)).toBe('$0.00');
  });

  it('writes a price to the cent and abbreviates on an axis', () => {
    expect(priceMoney(1234.5, 'USD')).toBe('$1,234.50');
    expect(priceMoney(1500, 'USD', true)).toBe('$1.5K');
  });

  it('picks the formatter by mode and format', () => {
    expect(priceFormatter('price', 'USD', 'price')(5, false)).toBe('$5.00');
    expect(priceFormatter('currency', 'USD', 'price')(5, false)).toBe('$5');
    expect(priceFormatter('price', 'USD', 'percent')(2.5, false)).toBe('+2.50%');
    expect(priceFormatter('price', 'USD', 'percent')(2.5, true)).toBe('2.5%');
  });

  it('writes a date in UTC', () => {
    expect(priceDateLabel(utc(2026, 3, 4))).toBe('Mar 4, 2026');
  });
});

describe('priceSeriesColor', () => {
  it('gives the instrument the accent and a benchmark the muted neutral', () => {
    const colors = [0, 1, 2, 3].map(priceSeriesColor);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('wraps rather than running off the ramp', () => {
    expect(priceSeriesColor(40)).toBeTruthy();
  });
});

describe('priceTickFormatter', () => {
  const ticks = (values: number[]): {value: number}[] => values.map(value => ({value}));

  it('labels days for a short span', () => {
    const t = ticks([utc(2026, 3, 1), utc(2026, 3, 8)]);
    expect(priceTickFormatter(30 * DAY)(t[0].value, 0, t)).toBe('Mar 1');
  });

  it('labels months for a year and years for a long span', () => {
    const t = ticks([utc(2026, 3, 1)]);
    expect(priceTickFormatter(300 * DAY)(t[0].value, 0, t)).toBe('Mar 26');
    expect(priceTickFormatter(2000 * DAY)(t[0].value, 0, t)).toBe('2026');
  });

  it('labels only the first tick of a run that would repeat', () => {
    const t = ticks([utc(2026, 3, 1), utc(2026, 3, 20)]);
    const format = priceTickFormatter(2000 * DAY);
    expect(format(t[0].value, 0, t)).toBe('2026');
    expect(format(t[1].value, 1, t)).toBeNull();
  });
});

describe('alignToPrimary', () => {
  const primary: PriceSeries = {label: 'A', points: daily(1 * DAY, 4, 10, 1)};

  it('holds an overlay price over the days its market was closed', () => {
    const [, overlay] = alignToPrimary([
      primary,
      {
        label: 'B',
        points: [
          {time: 1 * DAY, value: 50},
          {time: 3 * DAY, value: 60},
        ],
      },
    ]);
    expect(overlay.points.map(p => p.value)).toEqual([50, 50, 60, 60]);
    expect(overlay.points.map(p => p.time)).toEqual(primary.points.map(p => p.time));
  });

  it('holds the first price before an overlay begins', () => {
    const [, overlay] = alignToPrimary([
      primary,
      {label: 'B', points: [{time: 3 * DAY, value: 60}]},
    ]);
    expect(overlay.points.map(p => p.value)).toEqual([60, 60, 60, 60]);
  });

  it('leaves an empty overlay empty and an empty list empty', () => {
    expect(alignToPrimary([primary, {label: 'B', points: []}])[1].points).toEqual([]);
    expect(alignToPrimary([])).toEqual([]);
  });
});

describe('buildPriceView', () => {
  const instrument: PriceSeries = {label: 'AAPL', points: daily(utc(2025, 1, 1), 500, 100, 1)};
  const benchmark: PriceSeries = {label: 'S&P 500', points: daily(utc(2025, 1, 1), 500, 4000, 2)};
  const base = {
    period: '1Y' as const,
    mode: 'auto' as const,
    valueFormat: 'price' as const,
    currency: 'USD',
  };

  it('is null when there is nothing to draw', () => {
    expect(buildPriceView({...base, series: []})).toBeNull();
    expect(buildPriceView({...base, series: [{label: 'x', points: []}]})).toBeNull();
  });

  it('draws prices for one series, with the start and end of the period', () => {
    const view = buildPriceView({...base, series: [instrument]});
    expect(view?.mode).toBe('price');
    expect(view?.drawn).toHaveLength(1);
    expect(view?.start).toBe(view?.prices[0].value);
    expect(view?.end).toBe(599);
    expect(view?.drawn[0].points[0].label).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });

  it('switches to percent, each series from zero, when a benchmark overlays', () => {
    const view = buildPriceView({...base, series: [instrument, benchmark]});
    expect(view?.mode).toBe('percent');
    expect(view?.drawn).toHaveLength(2);
    expect(view?.drawn[0].points[0].value).toBe(0);
    expect(view?.drawn[1].points[0].value).toBe(0);
    expect(view?.prices[view.prices.length - 1].value).toBe(599);
    expect(view?.format(1.5, false)).toBe('+1.50%');
    expect(view?.priceFormat(599, false)).toBe('$599.00');
  });

  it('puts the baseline at the start price, or at zero in percent', () => {
    const price = buildPriceView({...base, series: [instrument]});
    const percent = buildPriceView({...base, series: [instrument, benchmark]});
    expect(price && priceChartModel(price, 0).baseline).toBe(price?.start);
    expect(percent && priceChartModel(percent, 0).baseline).toBe(0);
  });

  it('rebases a benchmark from its price at the period start, on a different calendar', () => {
    const everyDay: PriceSeries = {
      label: 'ACME',
      points: [
        {time: utc(2026, 2, 14), value: 90},
        {time: utc(2026, 2, 15), value: 100},
        {time: utc(2026, 2, 16), value: 101},
        {time: utc(2026, 3, 13), value: 102},
        {time: utc(2026, 3, 15), value: 103},
      ],
    };
    const weekdays: PriceSeries = {
      label: 'Index',
      points: [
        {time: utc(2026, 2, 13), value: 200},
        {time: utc(2026, 2, 16), value: 210},
        {time: utc(2026, 3, 13), value: 220},
      ],
    };
    const view = buildPriceView({...base, period: '1M', series: [everyDay, weekdays]});
    expect(view?.prices.map(p => p.value)).toEqual([100, 101, 102, 103]);
    expect(view?.drawn[1].points.map(p => p.value)).toEqual([0, 5, 10, 10]);
  });

  it('can hold percent mode on a single series', () => {
    expect(buildPriceView({...base, mode: 'percent', series: [instrument]})?.mode).toBe('percent');
  });
});

describe('buildPriceChartConfig', () => {
  const series: PriceSeries[] = [
    {label: 'AAPL', points: daily(utc(2026, 1, 1), 30, 100, 1)},
    {label: 'S&P 500', points: daily(utc(2026, 1, 1), 30, 4000, 2)},
  ];
  const view = buildPriceView({
    series,
    period: 'MAX',
    mode: 'auto',
    valueFormat: 'price',
    currency: 'USD',
  });
  const handlers = {onScrub: vi.fn(), onRelease: vi.fn()};

  function config() {
    if (!view) {
      throw new Error('no view');
    }
    return buildPriceChartConfig(priceChartModel(view, 56), TOKENS, handlers);
  }

  it('is a line chart with a dataset per series on a linear time axis', () => {
    const c = config();
    expect(c.type).toBe('line');
    expect(c.data.datasets).toHaveLength(2);
    expect(c.options?.scales?.['x']?.type).toBe('linear');
    expect(c.data.datasets[0].data[0]).toMatchObject({x: utc(2026, 1, 1), y: 0});
  });

  it('draws plain lines: no fill, no smoothing, no points', () => {
    const [first] = config().data.datasets;
    expect(first.fill).toBe(false);
    expect(first.tension).toBe(0);
    expect(first.pointRadius).toBe(0);
  });

  it('turns the chart tooltip off, since the host draws one combined pill', () => {
    expect(config().options?.plugins?.tooltip?.enabled).toBe(false);
  });

  it('reserves headroom above the plot for the pill', () => {
    expect(config().options?.layout?.padding).toEqual({top: 56});
  });

  it('carries the baseline value and its label in plugin options', () => {
    expect(config().options?.plugins?.priceBaseline).toMatchObject({value: 0, text: '0.00%'});
  });

  it('registers the scrub, baseline and annotations plugins', () => {
    const ids = (config().plugins ?? []).map(p => p.id);
    expect(ids).toEqual(['scrub', 'priceBaseline', 'priceAnnotations']);
  });

  it('formats y ticks with the view format', () => {
    const callback = config().options?.scales?.['y']?.ticks?.callback as (v: number) => string;
    expect(callback(2)).toBe('2%');
  });
});

describe('updatePriceChart', () => {
  it('re-points datasets, ticks, headroom and baseline, then redraws without animating', () => {
    const series: PriceSeries[] = [{label: 'AAPL', points: daily(utc(2026, 1, 1), 10, 100, 1)}];
    const first = buildPriceView({
      series,
      period: 'MAX',
      mode: 'auto',
      valueFormat: 'price',
      currency: 'USD',
    });
    const next = buildPriceView({
      series: [{label: 'AAPL', points: daily(utc(2026, 1, 1), 5, 200, 1)}],
      period: 'MAX',
      mode: 'auto',
      valueFormat: 'price',
      currency: 'USD',
    });
    if (!first || !next) {
      throw new Error('no view');
    }
    const config = buildPriceChartConfig(priceChartModel(first, 40), TOKENS, {
      onScrub: vi.fn(),
      onRelease: vi.fn(),
    });
    const update = vi.fn();
    const chart = {
      data: config.data,
      options: config.options,
      update,
    } as unknown as Chart;

    updatePriceChart(chart, priceChartModel(next, 24), TOKENS);

    expect(config.data.datasets[0].data).toHaveLength(5);
    expect(config.options?.layout?.padding).toEqual({top: 24});
    expect(config.options?.plugins?.priceBaseline?.value).toBe(200);
    expect(update).toHaveBeenCalledWith('none');
  });
});

describe('priceBaselinePlugin', () => {
  function chartWith(options: unknown, y: number) {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      strokeText: vi.fn(),
      fillText: vi.fn(),
    };
    const chart = {
      ctx,
      chartArea: {left: 10, right: 210, top: 20, bottom: 120},
      scales: {y: {getPixelForValue: () => y}},
    } as unknown as Chart;
    const run = () =>
      (priceBaselinePlugin.beforeDatasetsDraw as (c: Chart, a: unknown, o: unknown) => void)(
        chart,
        {},
        options
      );
    return {ctx, run};
  }

  const options = {value: 100, text: '$100.00', color: '#000', halo: '#fff', fontFamily: 'sans'};

  it('draws a dotted line across the plot with its label', () => {
    const {ctx, run} = chartWith(options, 60);
    run();
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 60);
    expect(ctx.lineTo).toHaveBeenCalledWith(210, 60);
    expect(ctx.setLineDash).toHaveBeenCalledWith([0, expect.any(Number)]);
    expect(ctx.fillText).toHaveBeenCalledWith('$100.00', expect.any(Number), expect.any(Number));
  });

  it('writes the label below the line when the line is at the top edge', () => {
    const above = chartWith(options, 60);
    above.run();
    const top = chartWith(options, 22);
    top.run();
    const yAbove = above.ctx.fillText.mock.calls[0][2] as number;
    const yTop = top.ctx.fillText.mock.calls[0][2] as number;
    expect(yAbove).toBeLessThan(60);
    expect(yTop).toBeGreaterThan(22);
  });

  it('draws nothing without a value or when the value is off the plot', () => {
    for (const [opts, y] of [
      [{...options, value: null}, 60],
      [options, 500],
      [options, Number.NaN],
      [undefined, 60],
    ] as const) {
      const {ctx, run} = chartWith(opts, y);
      run();
      expect(ctx.stroke).not.toHaveBeenCalled();
    }
  });
});

describe('price annotations', () => {
  const instrument: PriceSeries = {label: 'AAPL', points: daily(utc(2025, 1, 1), 500, 100, 1)};
  const benchmark: PriceSeries = {label: 'S&P 500', points: daily(utc(2025, 1, 1), 500, 4000, 2)};
  const base = {
    period: '1Y' as const,
    mode: 'auto' as const,
    valueFormat: 'price' as const,
    currency: 'USD',
  };
  const last = instrument.points[instrument.points.length - 1].time;
  const inside = last - 30 * DAY;
  const inputs = {
    markers: [
      {time: inside, kind: 'buy' as const, label: '5 shares'},
      {time: last - 10 * DAY, kind: 'sell' as const, value: 777},
      {time: utc(2025, 1, 2), kind: 'buy' as const},
    ],
    reference: {value: 400, label: 'Average cost'},
  };

  it("keeps the markers inside the period, in time order, at the fill or the day's price", () => {
    const view = buildPriceView({...base, ...inputs, series: [instrument]});
    expect(view?.markers.map(m => m.kind)).toEqual(['buy', 'sell']);
    const day = instrument.points.find(p => p.time === inside);
    expect(view?.markers[0]).toMatchObject({value: day?.value, label: '5 shares'});
    expect(view?.markers[1].value).toBe(777);
    expect(view?.markers[1].date).toBe(priceDateLabel(last - 10 * DAY));
  });

  it("keeps a fill with a time of day on the first and last day, drawn at that day's point", () => {
    const noon = {label: 'AAPL', points: daily(utc(2025, 1, 1) + 12 * HOUR, 500, 100, 1)};
    const lastNoon = noon.points[noon.points.length - 1];
    const first = buildPriceView({...base, series: [noon]})?.prices[0].time ?? 0;
    const view = buildPriceView({
      ...base,
      series: [noon],
      markers: [
        {time: lastNoon.time + 6 * HOUR, kind: 'buy', label: 'late'},
        {time: lastNoon.time + 13 * HOUR, kind: 'buy', label: 'tomorrow'},
        {time: first - 2 * HOUR, kind: 'sell', label: 'early'},
        {time: first - 13 * HOUR, kind: 'sell', label: 'yesterday'},
      ],
    });
    expect(view?.markers.map(m => m.label)).toEqual(['early', 'late']);
    expect(view?.markers.map(m => m.time)).toEqual([first, lastNoon.time]);
    expect(view?.markers[1].value).toBe(lastNoon.value);
  });

  it('treats a non-finite marker value as absent', () => {
    const view = buildPriceView({
      ...base,
      series: [instrument],
      markers: [{time: inside, kind: 'buy', value: Number.NaN}],
    });
    const day = instrument.points.find(p => p.time === inside);
    expect(view?.markers[0].value).toBe(day?.value);
  });

  it('has none by default', () => {
    const view = buildPriceView({...base, series: [instrument]});
    expect(view?.markers).toEqual([]);
    expect(view?.reference).toBeNull();
  });

  it('puts them on the chart model in price units, with the line labelled', () => {
    const view = buildPriceView({...base, ...inputs, series: [instrument]});
    if (!view) {
      throw new Error('no view');
    }
    const model = priceChartModel(view, 40);
    expect(model.reference).toEqual({value: 400, text: 'Average cost $400.00'});
    expect(model.markers?.[1]).toEqual({time: last - 10 * DAY, kind: 'sell', y: 777});
  });

  it('moves them to percent change since the start while a benchmark overlays', () => {
    const view = buildPriceView({...base, ...inputs, series: [instrument, benchmark]});
    if (!view) {
      throw new Error('no view');
    }
    const model = priceChartModel(view, 40);
    expect(model.reference?.value).toBeCloseTo(((400 - view.start) / view.start) * 100);
    expect(model.reference?.text).toBe('Average cost $400.00');
  });

  it('reaches the chart config and a live update', () => {
    const view = buildPriceView({...base, ...inputs, series: [instrument]});
    if (!view) {
      throw new Error('no view');
    }
    const config = buildPriceChartConfig(priceChartModel(view, 40), TOKENS, {
      onScrub: vi.fn(),
      onRelease: vi.fn(),
    });
    // The axis stretches to hold the line (400) and the highest fill (777).
    expect(config.options?.scales?.['y']).toMatchObject({suggestedMin: 400, suggestedMax: 777});
    expect(config.options?.plugins?.priceAnnotations).toMatchObject({
      reference: {value: 400},
      buyColor: TOKENS.success,
      sellColor: TOKENS.error,
    });
    const chart = {data: config.data, options: config.options, update: vi.fn()} as unknown as Chart;
    const bare = buildPriceView({...base, series: [instrument]});
    if (!bare) {
      throw new Error('no view');
    }
    updatePriceChart(chart, priceChartModel(bare, 40), TOKENS);
    expect(config.options?.scales?.['y']?.suggestedMin).toBeUndefined();
    expect(config.options?.plugins?.priceAnnotations?.markers).toEqual([]);
    expect(config.options?.plugins?.priceAnnotations?.reference).toBeNull();
  });
});

describe('priceAnnotationsPlugin', () => {
  function run(options: unknown, pixel: {x: number; y: number}) {
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      setLineDash: vi.fn(),
      strokeText: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '',
    };
    const chart = {
      ctx,
      chartArea: {left: 10, right: 210, top: 20, bottom: 120},
      scales: {x: {getPixelForValue: () => pixel.x}, y: {getPixelForValue: () => pixel.y}},
    } as unknown as Chart;
    (priceAnnotationsPlugin.afterDatasetsDraw as (c: Chart, a: unknown, o: unknown) => void)(
      chart,
      {},
      options
    );
    return ctx;
  }

  const options = {
    reference: {value: 100, text: 'Average cost $100.00'},
    markers: [{time: 1, y: 100, kind: 'buy' as const}],
    color: '#000',
    buyColor: '#0f0',
    sellColor: '#f00',
    halo: '#fff',
    fontFamily: 'sans',
  };

  it('draws a dashed line with its label at the left, and a marker', () => {
    const ctx = run(options, {x: 100, y: 60});
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 60);
    expect(ctx.lineTo).toHaveBeenCalledWith(210, 60);
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
    expect(ctx.fillText).toHaveBeenCalledWith('Average cost $100.00', 14, expect.any(Number));
    expect(ctx.fill).toHaveBeenCalledTimes(1);
  });

  it('points a buy up from below the price and a sell down from above it', () => {
    const buy = run(options, {x: 100, y: 60});
    const sell = run(
      {...options, reference: null, markers: [{time: 1, y: 1, kind: 'sell'}]},
      {x: 100, y: 60}
    );
    expect(buy.moveTo.mock.calls.at(-1)?.[1]).toBeGreaterThan(60);
    expect(sell.moveTo.mock.calls.at(-1)?.[1]).toBeLessThan(60);
  });

  it('colours a sell with the error colour', () => {
    const sell = run(
      {...options, reference: null, markers: [{time: 1, y: 1, kind: 'sell'}]},
      {x: 100, y: 60}
    );
    expect(sell.fillStyle).toBe('#f00');
  });

  it('skips a line off the plot and a marker outside it', () => {
    const ctx = run(options, {x: 500, y: 300});
    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('draws nothing without options', () => {
    expect(run(undefined, {x: 100, y: 60}).save).not.toHaveBeenCalled();
  });
});
