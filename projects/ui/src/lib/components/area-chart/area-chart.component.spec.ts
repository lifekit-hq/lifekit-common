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
    /** Tallest single point — what an unstacked y-axis has to reach, and no more. */
    const TALLEST_POINT = Math.max(...SAMPLE.flatMap(s => s.points.map(p => p.value)));
    /** Tallest column total — what a genuinely stacked y-axis has to reach. */
    const TALLEST_COLUMN = Math.max(
      ...SAMPLE[0].points.map((_, i) =>
        SAMPLE.reduce((sum, s) => sum + (s.points[i]?.value ?? 0), 0)
      )
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

    /**
     * The top of the data the y-axis actually plots — the observable proof that stacking
     * applied, since Chart.js only sums the columns here when the scale is stacked. Read
     * through `getMinMax` rather than `scale.max`, which is rounded out to a tick.
     */
    function plottedMax(chart: Chart): number {
      return chart.scales['y'].getMinMax(true).max;
    }

    function liveChart(): Chart {
      const chart = Chart.getChart(
        fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement
      );
      expect(chart).toBeTruthy();
      return chart as Chart;
    }

    /**
     * The fill target the Filler plugin resolved for each dataset — `false` when filling is
     * off, `'origin'` when it is on. Read here rather than off `dataset.fill`, which is only
     * a read-back of what the builder wrote and so proves nothing about Filler acting on it.
     */
    function resolvedFills(chart: Chart): unknown[] {
      return chart.data.datasets.map(
        (_, i) => (chart.getDatasetMeta(i) as unknown as {$filler?: {fill?: unknown}}).$filler?.fill
      );
    }

    beforeEach(() => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
    });

    it('defaults to stacked bands so the shipped behaviour is unchanged', () => {
      expect(fixture.componentInstance.stacked()).toBe(true);
      expect(stacking(liveChart())).toEqual({x: true, y: true});
      expect(resolvedFills(liveChart())).toEqual(['origin', 'origin']);
      expect(plottedMax(liveChart())).toBe(TALLEST_COLUMN);
    });

    it('switches the live chart to independent unfilled lines when set to false', () => {
      fixture.componentRef.setInput('stacked', false);
      fixture.detectChanges();

      expect(stacking(liveChart())).toEqual({x: false, y: false});
      expect(resolvedFills(liveChart())).toEqual([false, false]);
      // Each series is plotted from zero, so the axis tops out at the tallest single point.
      expect(plottedMax(liveChart())).toBe(TALLEST_POINT);
    });

    it('toggles back to stacked without recreating the chart or refetching series', () => {
      const before = liveChart();
      fixture.componentRef.setInput('stacked', false);
      fixture.detectChanges();
      fixture.componentRef.setInput('stacked', true);
      fixture.detectChanges();

      expect(liveChart()).toBe(before);
      expect(stacking(liveChart())).toEqual({x: true, y: true});
      expect(resolvedFills(liveChart())).toEqual(['origin', 'origin']);
      expect(plottedMax(liveChart())).toBe(TALLEST_COLUMN);
      expect(liveChart().data.labels).toEqual(['Jan', 'Feb']);
    });
  });
});
