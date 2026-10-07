import {Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {Chart} from 'chart.js';

import {BarChartComponent, type BarSeries, type ChartPointClick} from './bar-chart.component';

const SAMPLE: BarSeries[] = [
  {
    label: 'Income',
    points: [
      {label: 'Jan', value: 3000},
      {label: 'Feb', value: 3200},
    ],
  },
  {
    label: 'Spending',
    points: [
      {label: 'Jan', value: 2100},
      {label: 'Feb', value: 2400},
    ],
  },
];

describe('BarChartComponent', () => {
  let fixture: ComponentFixture<BarChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BarChartComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a canvas element', () => {
    expect(fixture.nativeElement.querySelector('canvas')).toBeTruthy();
  });

  it('should display the label', () => {
    fixture.componentRef.setInput('label', 'Income vs Spending');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Income vs Spending');
  });

  it('should accept grouped series without throwing', () => {
    expect(() => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
    }).not.toThrow();
  });

  it('should accept percent value format without throwing', () => {
    expect(() => {
      fixture.componentRef.setInput('valueFormat', 'percent');
      fixture.componentRef.setInput('series', [
        {label: 'Savings rate', points: [{label: 'Jan', value: 30}]},
      ]);
      fixture.detectChanges();
    }).not.toThrow();
  });

  describe('barClick output', () => {
    @Component({
      imports: [BarChartComponent],
      template: '<cmn-bar-chart [series]="series" (barClick)="clicks.push($event)" />',
    })
    class BoundHostComponent {
      public readonly series = SAMPLE;
      public readonly clicks: ChartPointClick[] = [];
    }

    /** Settles the chart at its final geometry and returns the pixel centre of one bar. */
    function barCentre(root: HTMLElement, seriesIndex: number, index: number) {
      const canvas = root.querySelector('canvas') as HTMLCanvasElement;
      const chart = Chart.getChart(canvas) as Chart;
      // A still-running entrance animation would overwrite the final geometry read below.
      chart.stop();
      chart.update('none');
      const bar = chart.getDatasetMeta(seriesIndex).data[index] as unknown as {
        x: number;
        y: number;
        base: number;
      };
      return {canvas, x: bar.x, y: (bar.y + bar.base) / 2};
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

    function bound(): {host: BoundHostComponent; root: HTMLElement} {
      const hostFixture = TestBed.createComponent(BoundHostComponent);
      hostFixture.detectChanges();
      return {host: hostFixture.componentInstance, root: hostFixture.nativeElement};
    }

    it('emits the clicked bar with its column, series and value', async () => {
      const {host, root} = bound();
      const {canvas, x, y} = barCentre(root, 1, 1);
      await pointer(canvas, 'click', x, y);
      expect(host.clicks).toEqual([
        {index: 1, seriesIndex: 1, label: 'Feb', seriesLabel: 'Spending', value: 2400},
      ]);
    });

    it('emits nothing for a click between the bars', async () => {
      const {host, root} = bound();
      const {canvas} = barCentre(root, 0, 0);
      await pointer(canvas, 'click', 2, 2);

      expect(host.clicks).toEqual([]);
    });

    it('shows a pointer cursor over a bar when bound, and clears it off the bars', async () => {
      const {root} = bound();
      const {canvas, x, y} = barCentre(root, 0, 0);
      await pointer(canvas, 'mousemove', x, y);
      expect(canvas.style.cursor).toBe('pointer');

      await pointer(canvas, 'mousemove', 2, 2);
      expect(canvas.style.cursor).toBe('');
    });

    it('stays inert when nothing listens: no emission, no pointer cursor', async () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
      const {canvas, x, y} = barCentre(fixture.nativeElement, 0, 0);

      await expect(pointer(canvas, 'click', x, y)).resolves.toBeUndefined();
      await pointer(canvas, 'mousemove', x, y);
      expect(canvas.style.cursor).toBe('');
    });
  });
});
