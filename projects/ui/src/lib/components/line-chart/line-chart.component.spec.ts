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
});
