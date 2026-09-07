import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {Chart} from 'chart.js';

import {AreaChartComponent, type AreaSeries} from './area-chart.component';

const SAMPLE: AreaSeries[] = [
  {
    label: 'Banking',
    points: [
      {label: 'Jan', value: 100},
      {label: 'Feb', value: 120},
    ],
  },
  {
    label: 'Crypto',
    points: [
      {label: 'Jan', value: 40},
      {label: 'Feb', value: 55},
    ],
  },
];

describe('AreaChartComponent', () => {
  let fixture: ComponentFixture<AreaChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AreaChartComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a canvas element', () => {
    expect(fixture.nativeElement.querySelector('canvas')).toBeTruthy();
  });

  it('should display the label', () => {
    fixture.componentRef.setInput('label', 'Net Worth Composition');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Net Worth Composition');
  });

  it('should accept multi-series input without throwing', () => {
    expect(() => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
    }).not.toThrow();
  });

  describe('stacked input', () => {
    /** Tallest single series — the y-axis has to span this in either mode. */
    const TALLEST_SERIES = Math.max(...SAMPLE.flatMap(s => s.points.map(p => p.value)));
    /** Tallest column total — only a genuinely stacked y-axis has to span this. */
    const TALLEST_COLUMN = Math.max(
      ...SAMPLE[0].points.map((_, i) => SAMPLE.reduce((sum, s) => sum + s.points[i].value, 0))
    );

    /**
     * Read stacking off the *built* scale, not `chart.options`: the options object echoes
     * back whatever was written to it, so asserting there passes even when Chart.js never
     * applied the change. Chart.js types scales as a union with no common `stacked`.
     */
    function stacking(chart: Chart): {x?: boolean; y?: boolean} {
      const scales = chart.scales as Record<string, {options: {stacked?: boolean}} | undefined>;
      return {x: scales['x']?.options.stacked, y: scales['y']?.options.stacked};
    }

    /** What the rendered y-axis actually spans — the observable proof that stacking applied. */
    function yAxisSpan(chart: Chart): number {
      return chart.scales['y'].max;
    }

    function liveChart(): Chart {
      const chart = Chart.getChart(
        fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement
      );
      expect(chart).toBeTruthy();
      return chart as Chart;
    }

    function fills(chart: Chart): unknown[] {
      return chart.data.datasets.map(d => (d as {fill?: unknown}).fill);
    }

    beforeEach(() => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
    });

    it('defaults to stacked bands so the shipped behaviour is unchanged', () => {
      expect(fixture.componentInstance.stacked()).toBe(true);
      expect(stacking(liveChart())).toEqual({x: true, y: true});
      expect(fills(liveChart())).toEqual([true, true]);
      expect(yAxisSpan(liveChart())).toBeGreaterThanOrEqual(TALLEST_COLUMN);
    });

    it('switches the live chart to independent unfilled lines when set to false', () => {
      fixture.componentRef.setInput('stacked', false);
      fixture.detectChanges();

      expect(stacking(liveChart())).toEqual({x: false, y: false});
      expect(fills(liveChart())).toEqual([false, false]);
      // Each series is plotted from zero, so the axis stops at the tallest one.
      expect(yAxisSpan(liveChart())).toBeGreaterThanOrEqual(TALLEST_SERIES);
      expect(yAxisSpan(liveChart())).toBeLessThan(TALLEST_COLUMN);
    });

    it('toggles back to stacked without recreating the chart or refetching series', () => {
      const before = liveChart();
      fixture.componentRef.setInput('stacked', false);
      fixture.detectChanges();
      fixture.componentRef.setInput('stacked', true);
      fixture.detectChanges();

      expect(liveChart()).toBe(before);
      expect(stacking(liveChart())).toEqual({x: true, y: true});
      expect(yAxisSpan(liveChart())).toBeGreaterThanOrEqual(TALLEST_COLUMN);
      expect(liveChart().data.labels).toEqual(['Jan', 'Feb']);
    });
  });
});
