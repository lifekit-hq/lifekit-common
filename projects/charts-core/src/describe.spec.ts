import {describe, expect, it} from 'vitest';

import {
  describeAreaChart,
  describeBarChart,
  describeDonutChart,
  describeLineChart,
  describeSegmentAt,
  describeSeriesAt,
  segmentsTable,
  seriesTable,
} from './describe';
import {type ChartPoint, type DonutSegment} from './types';

const usd = (value: number): string => `$${value}`;
const POINTS: ChartPoint[] = [
  {label: 'Jan', value: 100},
  {label: 'Feb', value: 200},
  {label: 'Mar', value: 150},
];
const CASH = {label: 'Cash', points: POINTS};
const STOCKS = {label: 'Stocks', points: POINTS.map(p => ({...p, value: p.value * 2}))};
const SEGMENTS: DonutSegment[] = [
  {label: 'Housing', value: 600},
  {label: 'Food', value: 300},
  {label: 'Fun', value: 100},
];

describe('describeLineChart', () => {
  it('reads the span, the ends and the trend between them', () => {
    expect(describeLineChart(POINTS, usd)).toBe('3 points from Jan to Mar: $100 to $150, up 50.0%');
  });

  it('reads a fall, no change, and a change from zero', () => {
    const fall = [POINTS[1], POINTS[0]];
    expect(describeLineChart(fall, usd)).toContain('down 50.0%');
    expect(describeLineChart([POINTS[0], POINTS[0]], usd)).toContain('unchanged');
    expect(describeLineChart([{label: 'A', value: 0}, POINTS[0]], usd)).toContain('up $100');
  });

  it('reads a single point as it is, and nothing as nothing', () => {
    expect(describeLineChart([POINTS[0]], usd)).toBe('Jan: $100');
    expect(describeLineChart([], usd)).toBe('');
  });
});

describe('describeAreaChart', () => {
  it('names the bands and reads how the stacked total moved', () => {
    expect(describeAreaChart([CASH, STOCKS], usd, true)).toBe(
      'Cash and Stocks, 3 points from Jan to Mar; total $300 to $450, up 50.0%'
    );
  });

  it('reads one band without calling it a total', () => {
    expect(describeAreaChart([CASH], usd, false)).toBe(
      'Cash, 3 points from Jan to Mar; $100 to $150, up 50.0%'
    );
  });

  it('leaves overlapping bands without a total, which they do not show', () => {
    expect(describeAreaChart([CASH, STOCKS], usd, false)).toBe(
      'Cash and Stocks, 3 points from Jan to Mar'
    );
  });

  it('lists three or more bands with commas', () => {
    expect(describeAreaChart([CASH, STOCKS, {...CASH, label: 'Bonds'}], usd, false)).toMatch(
      /^Cash, Stocks and Bonds,/
    );
  });

  it('reads a single point, and nothing for no points', () => {
    expect(describeAreaChart([{label: 'Cash', points: [POINTS[0]]}], usd, true)).toBe(
      'Cash, 1 point at Jan; $100'
    );
    expect(describeAreaChart([], usd, true)).toBe('');
  });
});

describe('describeBarChart', () => {
  it('reads the span and the highest and lowest bar of one series', () => {
    expect(describeBarChart([CASH], usd)).toBe(
      '3 bars from Jan to Mar; highest Feb, $200; lowest Jan, $100'
    );
  });

  it('names the series of a grouped chart', () => {
    expect(describeBarChart([CASH, STOCKS], usd)).toBe('Cash and Stocks, 3 groups from Jan to Mar');
  });

  it('reads a single bar, and nothing for no bars', () => {
    expect(describeBarChart([{label: 'Cash', points: [POINTS[1]]}], usd)).toBe('Feb: $200');
    expect(describeBarChart([], usd)).toBe('');
  });
});

describe('describeDonutChart', () => {
  it('reads the count, the total and the largest share', () => {
    expect(describeDonutChart(SEGMENTS, usd)).toBe(
      '3 segments totalling $1000; largest Housing, $600 (60.0%)'
    );
  });

  it('reads nothing for no segments or nothing to share', () => {
    expect(describeDonutChart([], usd)).toBe('');
    expect(describeDonutChart([{label: 'A', value: 0}], usd)).toBe('');
  });
});

describe('describeSeriesAt', () => {
  it('reads one series as its label and value', () => {
    expect(describeSeriesAt([CASH], 1, usd)).toBe('Feb: $200');
  });

  it('reads every series, with their total when asked', () => {
    expect(describeSeriesAt([CASH, STOCKS], 0, usd)).toBe('Jan: Cash $100, Stocks $200');
    expect(describeSeriesAt([CASH, STOCKS], 0, usd, true)).toBe(
      'Jan: Cash $100, Stocks $200, total $300'
    );
  });

  it('leaves out a series that has no point there, and reads nothing past the end', () => {
    const short = {label: 'Short', points: [POINTS[0]]};
    expect(describeSeriesAt([CASH, short], 1, usd)).toBe('Feb: Cash $200');
    expect(describeSeriesAt([CASH], 9, usd)).toBe('');
  });
});

describe('describeSegmentAt', () => {
  it('reads the segment with its share', () => {
    expect(describeSegmentAt(SEGMENTS, 1, usd)).toBe('Food: $300, 30.0%');
  });

  it('reads nothing past the end, and no share of nothing', () => {
    expect(describeSegmentAt(SEGMENTS, 9, usd)).toBe('');
    expect(describeSegmentAt([{label: 'A', value: 0}], 0, usd)).toBe('A: $0, 0.0%');
  });
});

describe('seriesTable', () => {
  it('has a row per label and a column per series', () => {
    expect(seriesTable([CASH, STOCKS], usd)).toEqual({
      headers: ['Label', 'Cash', 'Stocks'],
      rows: [
        ['Jan', '$100', '$200'],
        ['Feb', '$200', '$400'],
        ['Mar', '$150', '$300'],
      ],
    });
  });

  it('adds a total column for stacked series, but not for one', () => {
    expect(seriesTable([CASH, STOCKS], usd, true).rows[0]).toEqual(['Jan', '$100', '$200', '$300']);
    expect(seriesTable([CASH], usd, true).headers).toEqual(['Label', 'Cash']);
  });

  it('leaves a cell blank where a series has no point', () => {
    const short = {label: 'Short', points: [POINTS[0]]};
    expect(seriesTable([CASH, short], usd).rows[1]).toEqual(['Feb', '$200', '']);
  });
});

describe('segmentsTable', () => {
  it('has a row per segment with its value and share', () => {
    expect(segmentsTable(SEGMENTS, usd)).toEqual({
      headers: ['Segment', 'Value', 'Share'],
      rows: [
        ['Housing', '$600', '60.0%'],
        ['Food', '$300', '30.0%'],
        ['Fun', '$100', '10.0%'],
      ],
    });
  });
});
