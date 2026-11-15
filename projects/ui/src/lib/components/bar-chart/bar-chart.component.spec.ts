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

  describe('accessibility', () => {
    const canvas = (): HTMLCanvasElement => fixture.nativeElement.querySelector('canvas');
    const announcement = (): string =>
      fixture.nativeElement.querySelector('[data-testid="chart-announcement"]').textContent.trim();
    const table = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[data-testid="chart-data-table"]');
    const rows = (): string[] =>
      [...fixture.nativeElement.querySelectorAll('tbody tr')].map(tr =>
        tr.textContent.replace(/\s+/g, ' ').trim()
      );

    function press(key: string): void {
      canvas().dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}));
      fixture.detectChanges();
    }

    /** Moves a mouse onto item `index` and waits for Chart.js to read it. */
    async function hover(index: number): Promise<void> {
      const chart = (fixture.componentInstance as unknown as {chart: Chart}).chart;
      const element = chart.getDatasetMeta(0).data[index] as unknown as {
        getCenterPoint(): {x: number; y: number};
      };
      const {x, y} = element.getCenterPoint();
      const rect = canvas().getBoundingClientRect();
      canvas().dispatchEvent(
        new MouseEvent('mousemove', {clientX: rect.left + x, clientY: rect.top + y, bubbles: true})
      );
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });
      fixture.detectChanges();
    }

    it('names an empty chart by its empty message, out of the tab order and without a table', () => {
      expect(canvas().getAttribute('role')).toBe('img');
      expect(canvas().getAttribute('aria-label')).toBe('Bar chart. No data yet');
      expect(canvas().hasAttribute('tabindex')).toBe(false);
      expect(table()).toBeNull();
    });

    it('takes a summary over the derived one, under the generic name without a label', () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.componentRef.setInput('summary', 'Mostly steady');
      fixture.detectChanges();
      expect(canvas().getAttribute('aria-label')).toBe('Bar chart. Mostly steady');
    });

    it('shows the hidden table when asked', () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
      expect(canvas().getAttribute('tabindex')).toBe('0');
      expect(table()?.classList).toContain('sr-only');
      fixture.componentRef.setInput('showDataTable', true);
      fixture.detectChanges();
      expect(table()?.classList).not.toContain('sr-only');
    });

    it('names one series by its span and its highest and lowest bar', () => {
      fixture.componentRef.setInput('series', [SAMPLE[0]]);
      fixture.componentRef.setInput('label', 'Income');
      fixture.detectChanges();
      expect(canvas().getAttribute('aria-label')).toBe(
        'Income. 2 bars from Jan to Feb; highest Feb, $3,200; lowest Jan, $3,000'
      );
    });

    it('tables a column per series', () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
      expect(rows()).toEqual(['Jan $3,000 $2,100', 'Feb $3,200 $2,400']);
    });

    it('highlights and announces the column a key reads, and clears on Escape', () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
      press('ArrowLeft');
      expect(announcement()).toBe('Feb: Income $3,200, Spending $2,400');
      const chart = (fixture.componentInstance as unknown as {chart: Chart}).chart;
      expect(chart.getActiveElements().map(e => [e.datasetIndex, e.index])).toEqual([
        [0, 1],
        [1, 1],
      ]);
      press('Escape');
      expect(announcement()).toBe('');
      expect(chart.getActiveElements()).toEqual([]);
    });

    it('announces the bar a pointer highlights', async () => {
      fixture.componentRef.setInput('series', [SAMPLE[0]]);
      fixture.detectChanges();
      await hover(0);
      expect(announcement()).toBe('Jan: $3,000');
    });
  });

  describe('chart frame', () => {
    const chip = (): HTMLButtonElement | null =>
      fixture.nativeElement.querySelector('[data-testid="chart-table-chip"] button');
    const caption = (): HTMLElement | null =>
      fixture.nativeElement.querySelector('[data-testid="chart-caption"]');

    it('offers no Table chip while there is nothing to tabulate', () => {
      expect(chip()).toBeNull();
    });

    it('swaps the plot for the table with the Table chip', () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.detectChanges();
      const plot = fixture.nativeElement.querySelector('[data-testid="chart-plot"]');
      expect(plot.classList).not.toContain('hidden');
      chip()?.click();
      fixture.detectChanges();
      expect(plot.classList).toContain('hidden');
      expect(
        fixture.nativeElement.querySelector('[data-testid="chart-data-table"]').classList
      ).not.toContain('sr-only');
    });

    it('shows the caption under the plot', () => {
      fixture.componentRef.setInput('caption', 'Blue is income, green is spending.');
      fixture.detectChanges();
      expect(caption()?.textContent?.trim()).toBe('Blue is income, green is spending.');
    });

    it('adds a Source column from sources', () => {
      fixture.componentRef.setInput('series', SAMPLE);
      fixture.componentRef.setInput('sources', ['Bank feed', 'Manual entry']);
      fixture.detectChanges();
      const heads = [...fixture.nativeElement.querySelectorAll('th[scope="col"]')];
      expect(heads.at(-1)?.textContent?.trim()).toBe('Source');
      const first = fixture.nativeElement.querySelector('tbody tr').lastElementChild;
      expect(first.textContent.trim()).toBe('Bank feed');
    });
  });
});
