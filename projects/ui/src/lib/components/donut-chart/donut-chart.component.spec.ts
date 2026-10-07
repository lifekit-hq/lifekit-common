import {Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {Chart} from 'chart.js';

import {
  DonutChartComponent,
  type DonutSegment,
  type DonutSegmentClick,
} from './donut-chart.component';

const SEGMENTS: DonutSegment[] = [
  {label: 'Banks', value: 400},
  {label: 'Brokerage', value: 900},
  {label: 'Crypto', value: 100},
];

describe('DonutChartComponent', () => {
  let fixture: ComponentFixture<DonutChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonutChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DonutChartComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a canvas element', () => {
    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('should display the label', () => {
    fixture.componentRef.setInput('label', 'Allocation');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Allocation');
  });

  it('shows the empty message instead of a ring when there are no segments', () => {
    fixture.componentRef.setInput('segments', []);
    fixture.componentRef.setInput('emptyMessage', 'No holdings yet');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="chart-empty"]').textContent
    ).toContain('No holdings yet');
  });

  it('treats all-zero segments as empty and hides the message once data arrives', () => {
    fixture.componentRef.setInput('segments', [{label: 'A', value: 0}]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="chart-empty"]')).toBeTruthy();
    fixture.componentRef.setInput('segments', [{label: 'A', value: 5}]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="chart-empty"]')).toBeNull();
  });

  describe('segmentClick output', () => {
    @Component({
      imports: [DonutChartComponent],
      template: `<cmn-donut-chart
        [segments]="segments"
        [showLegend]="false"
        (segmentClick)="clicks.push($event)"
      />`,
    })
    class BoundHostComponent {
      public readonly segments = SEGMENTS;
      public readonly clicks: DonutSegmentClick[] = [];
    }

    /** Settles the chart at its final geometry and returns the pixel centre of one ring segment. */
    function segmentCentre(root: HTMLElement, index: number) {
      const canvas = root.querySelector('canvas') as HTMLCanvasElement;
      const chart = Chart.getChart(canvas) as Chart;
      // A still-running entrance animation would overwrite the final geometry read below.
      chart.stop();
      chart.update('none');
      const arc = chart.getDatasetMeta(0).data[index] as unknown as {
        x: number;
        y: number;
        startAngle: number;
        endAngle: number;
        innerRadius: number;
        outerRadius: number;
      };
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const radius = (arc.innerRadius + arc.outerRadius) / 2;
      return {
        canvas,
        x: arc.x + Math.cos(angle) * radius,
        y: arc.y + Math.sin(angle) * radius,
        centre: {x: arc.x, y: arc.y},
      };
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

    it('emits the clicked segment with its index, label and value', async () => {
      const {host, root} = bound();
      const {canvas, x, y} = segmentCentre(root, 1);
      await pointer(canvas, 'click', x, y);

      expect(host.clicks).toEqual([{index: 1, label: 'Brokerage', value: 900}]);
    });

    it('emits nothing for a click in the hole of the ring', async () => {
      const {host, root} = bound();
      const {canvas, centre} = segmentCentre(root, 0);
      await pointer(canvas, 'click', centre.x, centre.y);

      expect(host.clicks).toEqual([]);
    });

    it('shows a pointer cursor over a segment when bound, and clears it off the ring', async () => {
      const {root} = bound();
      const {canvas, x, y, centre} = segmentCentre(root, 2);
      await pointer(canvas, 'mousemove', x, y);
      expect(canvas.style.cursor).toBe('pointer');

      await pointer(canvas, 'mousemove', centre.x, centre.y);
      expect(canvas.style.cursor).toBe('');
    });

    it('stays inert when nothing listens: no emission, no pointer cursor', async () => {
      fixture.componentRef.setInput('segments', SEGMENTS);
      fixture.detectChanges();
      const {canvas, x, y} = segmentCentre(fixture.nativeElement, 0);

      await expect(pointer(canvas, 'click', x, y)).resolves.toBeUndefined();
      await pointer(canvas, 'mousemove', x, y);
      expect(canvas.style.cursor).toBe('');
    });
  });
});
