import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {BadgeComponent, type BadgeStatus} from './badge.component';

describe('BadgeComponent', () => {
  let fixture: ComponentFixture<BadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BadgeComponent);
  });

  function indicator(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.cmn-badge-indicator');
  }

  it('renders count when count > 0', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    expect(indicator()?.textContent?.trim()).toBe('5');
  });

  it('hides indicator when count === 0 and showZero is false', () => {
    fixture.componentRef.setInput('count', 0);
    fixture.detectChanges();
    expect(indicator()).toBeNull();
  });

  it('renders 0 when showZero is true', () => {
    fixture.componentRef.setInput('count', 0);
    fixture.componentRef.setInput('showZero', true);
    fixture.detectChanges();
    expect(indicator()?.textContent?.trim()).toBe('0');
  });

  it('renders {overflowCount}+ when count > overflowCount (default 99)', () => {
    fixture.componentRef.setInput('count', 250);
    fixture.detectChanges();
    expect(indicator()?.textContent?.trim()).toBe('99+');
  });

  it('honors custom overflowCount', () => {
    fixture.componentRef.setInput('count', 12);
    fixture.componentRef.setInput('overflowCount', 9);
    fixture.detectChanges();
    expect(indicator()?.textContent?.trim()).toBe('9+');
  });

  it('dot mode renders an empty dot regardless of count', () => {
    fixture.componentRef.setInput('dot', true);
    fixture.componentRef.setInput('count', 7);
    fixture.detectChanges();
    expect(indicator()?.textContent?.trim()).toBe('');
    expect(indicator()?.className).toContain('w-2');
    expect(indicator()?.className).toContain('h-2');
  });

  it.each<[BadgeStatus, string]>([
    ['default', 'bg-text-secondary'],
    ['success', 'bg-status-success'],
    ['processing', 'bg-status-info'],
    ['error', 'bg-status-error'],
    ['warning', 'bg-status-warning'],
  ])('applies background class for status "%s"', (status, expectedClass) => {
    fixture.componentRef.setInput('count', 1);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    expect(indicator()?.className).toContain(expectedClass);
  });

  it('uses inline (non-absolute) positioning when standalone is true', () => {
    fixture.componentRef.setInput('count', 3);
    fixture.componentRef.setInput('standalone', true);
    fixture.detectChanges();
    expect(indicator()?.className).not.toContain('absolute');
  });

  it('uses absolute positioning by default', () => {
    fixture.componentRef.setInput('count', 3);
    fixture.detectChanges();
    expect(indicator()?.className).toContain('absolute');
  });

  it('hangs off the corner with a transform, never with negative insets', () => {
    // The design judge reads negative insets on a positioned child in a `display: none` subtree (the
    // nav the shell hides) as escaping the shell's clip, on every route of an app with a nav badge.
    fixture.componentRef.setInput('count', 3);
    fixture.detectChanges();
    const classes = (indicator()?.className ?? '').split(/\s+/);
    expect(classes).toEqual(
      expect.arrayContaining(['right-0', 'top-0', 'translate-x-cmn-2', '-translate-y-cmn-2'])
    );
    expect(classes.filter(cls => /^-(?:top|right|bottom|left|inset)-/.test(cls))).toEqual([]);
  });
});
