import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {DonutChartComponent} from './donut-chart.component';

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
});
