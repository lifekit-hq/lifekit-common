import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {DEFAULT_DURATION_MS, ToastComponent, type ToastVariant} from './toast.component';

describe('ToastComponent', () => {
  let fixture: ComponentFixture<ToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
  });

  function container(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('[role]') as HTMLElement;
  }

  it('renders the message', () => {
    fixture.componentRef.setInput('message', 'Saved');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Saved');
  });

  it.each<[ToastVariant, string]>([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'alert'],
    ['error', 'alert'],
  ])('announces variant "%s" through the "%s" role', (variant, role) => {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    expect(container().getAttribute('role')).toBe(role);
  });

  it.each<[ToastVariant, string]>([
    ['info', 'Info'],
    ['success', 'CircleCheck'],
    ['warning', 'TriangleAlert'],
    ['error', 'CircleAlert'],
  ])('picks the icon for variant "%s"', (variant, icon) => {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    expect(fixture.componentInstance.iconName()).toBe(icon);
  });

  it.each<[ToastVariant, string]>([
    ['info', 'bg-status-info'],
    ['success', 'bg-status-success'],
    ['warning', 'bg-status-warning'],
    ['error', 'bg-status-error'],
  ])('applies the container background for variant "%s"', (variant, expected) => {
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
    expect(container().className).toContain(expected);
  });

  it('always offers a dismiss control and emits when it is used', () => {
    let count = 0;
    fixture.componentInstance.dismissed.subscribe(() => count++);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Dismiss"]'
    );
    expect(button).not.toBeNull();
    button?.click();
    expect(count).toBe(1);
  });

  it('publishes a positive default duration for the service to use', () => {
    expect(DEFAULT_DURATION_MS).toBeGreaterThan(0);
  });
});
