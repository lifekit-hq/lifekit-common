import {Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {Chart} from 'chart.js';

import {AreaChartComponent, type AreaSeries, type ChartPointClick} from './area-chart.component';

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

  describe('scrub-to-read', () => {
    function pointer(type: string, fraction: number): void {
      const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(
        new PointerEvent(type, {
          clientX: rect.left + rect.width * fraction,
          pointerType: 'mouse',
          bubbles: true,
        })
      );
    }

    it('is off by default and emits nothing', () => {
      const scrubs: unknown[] = [];
      fixture.componentInstance.scrub.subscribe(p => scrubs.push(p));
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
      pointer('pointermove', 1);
      expect(scrubs).toEqual([]);
    });

    it('emits the stacked total and every band, then scrubEnd on release', () => {
      const scrubs: {index: number; y: number; values: {label: string}[]}[] = [];
      let ends = 0;
      fixture.componentInstance.scrub.subscribe(p => scrubs.push(p));
      fixture.componentInstance.scrubEnd.subscribe(() => ends++);
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.componentRef.setInput('scrubbable', true);
      fixture.detectChanges();
      pointer('pointermove', 1);
      pointer('pointerleave', 0);
      expect(scrubs).toHaveLength(1);
      expect(scrubs[0].index).toBe(1);
      expect(scrubs[0].y).toBe(175);
      expect(scrubs[0].values.map(v => v.label)).toEqual(['Banking', 'Crypto']);
      expect(ends).toBe(1);
    });

    it('keeps updating data after scrubbing is switched on', () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.componentRef.setInput('scrubbable', true);
      fixture.detectChanges();
      fixture.componentRef.setInput('stacked', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('canvas')).toBeTruthy();
    });
  });

  describe('pointClick output', () => {
    @Component({
      imports: [AreaChartComponent],
      template: `<cmn-area-chart
        [series]="series"
        [stacked]="stacked()"
        (pointClick)="clicks.push($event)"
      />`,
    })
    class BoundHostComponent {
      public series = SAMPLE;
      public readonly stacked = signal(true);
      public readonly clicks: ChartPointClick[] = [];
    }

    /** Settles the chart at its final geometry; `y` of each series' point at `index`, in canvas px. */
    function settle(root: HTMLElement, index: number) {
      const canvas = root.querySelector('canvas') as HTMLCanvasElement;
      const chart = Chart.getChart(canvas) as Chart;
      // A still-running entrance animation would overwrite the final geometry read below.
      chart.stop();
      chart.update('none');
      const tops = chart.data.datasets.map(
        (_, i) => (chart.getDatasetMeta(i).data[index] as unknown as {x: number; y: number}).y
      );
      const x = (chart.getDatasetMeta(0).data[index] as unknown as {x: number}).x;
      return {canvas, chart, x, tops, bottom: chart.chartArea.bottom, top: chart.chartArea.top};
    }

    /** Chart.js handles pointer events on the next animation frame, so wait one out. */
    async function pointer(
      canvas: HTMLCanvasElement,
      type: string,
      x: number,
      y: number
    ): Promise<void> {
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(
        new MouseEvent(type, {clientX: rect.left + x, clientY: rect.top + y, bubbles: true})
      );
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });
    }

    function bound(): {
      host: BoundHostComponent;
      root: HTMLElement;
      hostFixture: ComponentFixture<BoundHostComponent>;
    } {
      const hostFixture = TestBed.createComponent(BoundHostComponent);
      hostFixture.detectChanges();
      return {host: hostFixture.componentInstance, root: hostFixture.nativeElement, hostFixture};
    }

    it('emits the stacked band under the pointer with its own value, not the running total', async () => {
      const {host, root} = bound();
      const {canvas, x, tops, bottom} = settle(root, 1);

      // Lower band (Banking) sits between the baseline and its top; upper band (Crypto) above it.
      await pointer(canvas, 'click', x, (tops[0] + bottom) / 2);
      await pointer(canvas, 'click', x, (tops[0] + tops[1]) / 2);

      expect(host.clicks).toEqual([
        {index: 1, seriesIndex: 0, label: 'Feb', seriesLabel: 'Banking', value: 120},
        {index: 1, seriesIndex: 1, label: 'Feb', seriesLabel: 'Crypto', value: 55},
      ]);
    });

    it('picks the nearest line when unstacked', async () => {
      const {host, root, hostFixture} = bound();
      host.stacked.set(false);
      hostFixture.detectChanges();
      const {canvas, x, tops} = settle(root, 0);

      await pointer(canvas, 'click', x, tops[1] - 1);
      await pointer(canvas, 'click', x, tops[0] - 1);

      expect(host.clicks.map(c => [c.seriesLabel, c.value])).toEqual([
        ['Crypto', 40],
        ['Banking', 100],
      ]);
    });

    it('emits nothing outside the plot area', async () => {
      const {host, root} = bound();
      const {canvas, x, bottom} = settle(root, 0);
      await pointer(canvas, 'click', x, bottom + 14);

      expect(host.clicks).toEqual([]);
    });

    it('shows a pointer cursor over the plot when bound', async () => {
      const {root} = bound();
      const {canvas, x, tops, bottom} = settle(root, 0);
      await pointer(canvas, 'mousemove', x, (tops[0] + bottom) / 2);
      expect(canvas.style.cursor).toBe('pointer');
    });

    it('stays inert when nothing listens: no emission, no pointer cursor', async () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
      const {canvas, x, tops, bottom} = settle(fixture.nativeElement, 1);
      const y = (tops[0] + bottom) / 2;

      await expect(pointer(canvas, 'click', x, y)).resolves.toBeUndefined();
      await pointer(canvas, 'mousemove', x, y);
      expect(canvas.style.cursor).toBe('');
    });
  });
});
