import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {UsageChipComponent} from './usage-chip.component';

@Component({
  imports: [UsageChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<cmn-usage-chip
    [used]="used()"
    [total]="total()"
    [label]="label()"
    [unit]="unit()"
  />`,
})
class HostComponent {
  public readonly used = signal(12);
  public readonly total = signal(50);
  public readonly label = signal('');
  public readonly unit = signal('');
}

describe('UsageChipComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  const meter = (): HTMLElement => fixture.nativeElement.querySelector('[role="meter"]');
  const fill = (): HTMLElement => meter().firstElementChild as HTMLElement;

  it('renders the n of m readout', () => {
    expect(meter().textContent).toContain('12 of 50');
  });

  it('appends the unit and label when provided', () => {
    host.unit.set('calls');
    host.label.set('API');
    fixture.detectChanges();
    expect(meter().textContent).toContain('API');
    expect(meter().textContent).toContain('12 of 50 calls');
    expect(meter().getAttribute('aria-label')).toBe('API');
  });

  it('exposes meter semantics', () => {
    expect(meter().getAttribute('aria-valuemin')).toBe('0');
    expect(meter().getAttribute('aria-valuemax')).toBe('50');
    expect(meter().getAttribute('aria-valuenow')).toBe('12');
    expect(meter().getAttribute('aria-valuetext')).toBe('12 of 50');
  });

  it('sizes the fill proportionally', () => {
    expect(fill().style.width).toBe('24%');
  });

  it('uses the success tone below the warning threshold', () => {
    expect(fill().className).toContain('bg-status-success');
  });

  it('uses the warning tone near the limit', () => {
    host.used.set(45);
    fixture.detectChanges();
    expect(fill().className).toContain('bg-status-warning');
  });

  it('uses the error tone when the limit is reached and clamps the fill', () => {
    host.used.set(70);
    fixture.detectChanges();
    expect(fill().className).toContain('bg-status-error');
    expect(fill().style.width).toBe('100%');
    expect(meter().getAttribute('aria-valuenow')).toBe('50');
  });

  it('renders an empty fill when total is zero', () => {
    host.used.set(0);
    host.total.set(0);
    fixture.detectChanges();
    expect(fill().style.width).toBe('0%');
  });

  it('clamps negative usage to zero', () => {
    host.used.set(-5);
    fixture.detectChanges();
    expect(fill().style.width).toBe('0%');
  });
});
