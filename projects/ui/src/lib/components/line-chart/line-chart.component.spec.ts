import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {LineChartComponent} from './line-chart.component';

describe('LineChartComponent', () => {
  let fixture: ComponentFixture<LineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineChartComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(LineChartComponent);
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
    fixture.componentRef.setInput('label', 'Net Worth Performance');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Net Worth Performance');
  });

  it('shows the empty message when there are no points and hides it with data', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="chart-empty"]')).toBeTruthy();
    fixture.componentRef.setInput('data', [{label: 'May', value: 1}]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="chart-empty"]')).toBeNull();
  });

  it('defaults valueFormat to currency', () => {
    expect(fixture.componentInstance.valueFormat()).toBe('currency');
  });

  it('accepts a unit-less valueFormat', () => {
    fixture.componentRef.setInput('valueFormat', 'number');
    fixture.componentRef.setInput('data', [{label: 'May', value: 25}]);
    fixture.detectChanges();
    expect(fixture.componentInstance.valueFormat()).toBe('number');
  });

  describe('compact', () => {
    const POINTS = [
      {label: 'May', value: 1},
      {label: 'Jun', value: 3},
    ];

    interface BuiltOptions {
      animation: unknown;
      scales: Record<string, {display: boolean}>;
    }

    function chartOptions(): BuiltOptions {
      const instance = fixture.componentInstance as unknown as {chart: {options: BuiltOptions}};
      return instance.chart.options;
    }

    it('defaults to the framed chart card', () => {
      expect(fixture.componentInstance.compact()).toBe(false);
      expect(fixture.nativeElement.querySelector('.border')).toBeTruthy();
      expect(chartOptions().scales['y'].display).toBe(true);
    });

    it('draws no title, frame or empty message, and makes the host a block', async () => {
      fixture.componentRef.setInput('label', 'Trend');
      fixture.componentRef.setInput('compact', true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).not.toContain('Trend');
      expect(fixture.nativeElement.querySelector('.border')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="chart-empty"]')).toBeNull();
      expect(fixture.nativeElement.style.display).toBe('block');
    });

    it('rebuilds the chart without axes or animation when compact turns on', async () => {
      fixture.componentRef.setInput('data', POINTS);
      fixture.componentRef.setInput('compact', true);
      fixture.detectChanges();
      await fixture.whenStable();
      const options = chartOptions();
      expect(options.animation).toBe(false);
      expect(options.scales['x'].display).toBe(false);
      expect(options.scales['y'].display).toBe(false);
    });
  });

  describe('yDomain and xSpacing', () => {
    interface BuiltChart {
      options: {scales: Record<string, {type?: string; min?: number; max?: number}>};
      data: {datasets: {data: unknown[]}[]};
    }
    const chart = (): BuiltChart =>
      (fixture.componentInstance as unknown as {chart: BuiltChart}).chart;
    const TIMED = [
      {label: 'a', value: 1, time: 1_000},
      {label: 'b', value: 2, time: 9_000},
    ];

    it('defaults to an auto-scaled y and even x spacing', () => {
      expect(fixture.componentInstance.yDomain()).toBeUndefined();
      expect(fixture.componentInstance.xSpacing()).toBe('even');
      expect(chart().options.scales['y'].min).toBeUndefined();
      expect(chart().options.scales['x'].type).toBe('category');
    });

    it('fixes the y range, in compact mode too, and follows later changes', async () => {
      fixture.componentRef.setInput('compact', true);
      fixture.componentRef.setInput('yDomain', {min: 0, max: 3});
      fixture.detectChanges();
      await fixture.whenStable();
      expect(chart().options.scales['y'].min).toBe(0);
      expect(chart().options.scales['y'].max).toBe(3);
      fixture.componentRef.setInput('yDomain', {min: 1, max: 4});
      fixture.detectChanges();
      await fixture.whenStable();
      expect(chart().options.scales['y'].max).toBe(4);
    });

    it('rebuilds on a time x scale when xSpacing turns to time', async () => {
      fixture.componentRef.setInput('data', TIMED);
      fixture.componentRef.setInput('xSpacing', 'time');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(chart().options.scales['x'].type).toBe('linear');
      expect(chart().data.datasets[0].data).toEqual([
        {x: 1_000, y: 1, label: 'a'},
        {x: 9_000, y: 2, label: 'b'},
      ]);
      fixture.componentRef.setInput('data', [{label: 'c', value: 5, time: 4_000}]);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(chart().data.datasets[0].data).toEqual([{x: 4_000, y: 5, label: 'c'}]);
    });
  });

  describe('scrub-to-read', () => {
    const POINTS = [
      {label: 'May', value: 100},
      {label: 'Jun', value: 300},
      {label: 'Jul', value: 200},
    ];

    function hover(fraction: number): void {
      const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      canvas.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: rect.left + rect.width * fraction,
          pointerType: 'mouse',
          bubbles: true,
        })
      );
    }

    function leave(): void {
      fixture.nativeElement
        .querySelector('canvas')
        .dispatchEvent(new PointerEvent('pointerleave', {pointerType: 'mouse'}));
    }

    it('is off by default and emits nothing', () => {
      const scrubs: unknown[] = [];
      fixture.componentInstance.scrub.subscribe(p => scrubs.push(p));
      fixture.componentRef.setInput('data', POINTS);
      fixture.detectChanges();
      hover(0.5);
      expect(fixture.componentInstance.scrubbable()).toBe(false);
      expect(scrubs).toEqual([]);
    });

    it('emits the point under the pointer, then scrubEnd on release', () => {
      const scrubs: {index: number; y: number}[] = [];
      let ends = 0;
      fixture.componentInstance.scrub.subscribe(p => scrubs.push(p));
      fixture.componentInstance.scrubEnd.subscribe(() => ends++);
      fixture.componentRef.setInput('data', POINTS);
      fixture.componentRef.setInput('scrubbable', true);
      fixture.detectChanges();
      hover(0.5);
      hover(1);
      leave();
      expect(scrubs.map(p => [p.index, p.y])).toEqual([
        [1, 300],
        [2, 200],
      ]);
      expect(ends).toBe(1);
    });

    it('rebuilds with scrubbing off again when it is switched off', () => {
      const scrubs: unknown[] = [];
      fixture.componentInstance.scrub.subscribe(p => scrubs.push(p));
      fixture.componentRef.setInput('data', POINTS);
      fixture.componentRef.setInput('scrubbable', true);
      fixture.detectChanges();
      fixture.componentRef.setInput('scrubbable', false);
      fixture.detectChanges();
      hover(0.5);
      expect(scrubs).toEqual([]);
    });
  });
});
