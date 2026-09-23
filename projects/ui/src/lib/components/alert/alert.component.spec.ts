import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {AlertComponent, type AlertVariant} from './alert.component';

describe('AlertComponent', () => {
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertComponent);
  });

  function container(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[role]');
  }

  it.each<[AlertVariant, string]>([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'alert'],
    ['error', 'alert'],
    ['accent', 'note'],
  ])('maps variant "%s" to the "%s" landmark role', (variant, role) => {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    expect(container()?.getAttribute('role')).toBe(role);
    expect(fixture.componentInstance.role()).toBe(role);
  });

  it.each<[AlertVariant, string]>([
    ['info', 'Info'],
    ['success', 'CircleCheck'],
    ['warning', 'TriangleAlert'],
    ['error', 'CircleAlert'],
    ['accent', 'Sparkles'],
  ])('picks the default icon for variant "%s"', (variant, icon) => {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    expect(fixture.componentInstance.resolvedIcon()).toBe(icon);
  });

  it('lets an explicit icon override the variant default', () => {
    fixture.componentRef.setInput('variant', 'error');
    fixture.componentRef.setInput('icon', 'Bell');
    fixture.detectChanges();
    expect(fixture.componentInstance.resolvedIcon()).toBe('Bell');
  });

  it('colors the icon from the variant token', () => {
    fixture.componentRef.setInput('variant', 'warning');
    fixture.detectChanges();
    expect(fixture.componentInstance.iconColor()).toBe('var(--color-status-warning)');
  });

  it('renders the title only when one is given', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('p')).toBeNull();

    fixture.componentRef.setInput('title', 'Sync failed');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('p')?.textContent?.trim()).toBe(
      'Sync failed'
    );
  });

  it('hides the dismiss button unless the alert is dismissible', () => {
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Dismiss"]')
    ).toBeNull();
  });

  it('emits dismissed when the dismiss button is pressed', () => {
    let count = 0;
    fixture.componentInstance.dismissed.subscribe(() => count++);
    fixture.componentRef.setInput('dismissible', true);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Dismiss"]')
      ?.click();
    expect(count).toBe(1);
  });

  it('applies the variant container classes', () => {
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();
    expect(fixture.componentInstance.containerClasses()).toContain('border-status-success');
  });
});
