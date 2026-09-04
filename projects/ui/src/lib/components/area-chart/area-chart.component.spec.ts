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
    /** Chart.js models scales as a deep-partial union, so read `stacked` structurally. */
    function stacking(chart: Chart): {x?: boolean; y?: boolean} {
      const scales = (chart.options as {scales?: Record<string, {stacked?: boolean}>}).scales;
      return {x: scales?.['x']?.stacked, y: scales?.['y']?.stacked};
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
    });

    it('switches the live chart to independent unfilled lines when set to false', () => {
      fixture.componentRef.setInput('stacked', false);
      fixture.detectChanges();

      expect(stacking(liveChart())).toEqual({x: false, y: false});
      expect(fills(liveChart())).toEqual([false, false]);
    });

    it('toggles back to stacked without recreating the chart or refetching series', () => {
      const before = liveChart();
      fixture.componentRef.setInput('stacked', false);
      fixture.detectChanges();
      fixture.componentRef.setInput('stacked', true);
      fixture.detectChanges();

      expect(liveChart()).toBe(before);
      expect(stacking(liveChart())).toEqual({x: true, y: true});
      expect(liveChart().data.labels).toEqual(['Jan', 'Feb']);
    });
  });
});
