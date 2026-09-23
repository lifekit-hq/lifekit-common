import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {CardComponent, type CardPadding} from './card.component';

describe('CardComponent', () => {
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
  });

  function inner(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('div');
  }

  it('renders the surface chrome by default', () => {
    fixture.detectChanges();
    const classes = inner()?.className ?? '';
    expect(classes).toContain('bg-surface-card');
    expect(classes).toContain('border-border-default');
    expect(classes).toContain('rounded-cmn-md');
  });

  it.each<[CardPadding, string | null]>([
    ['none', null],
    ['sm', 'p-cmn-2'],
    ['md', 'p-cmn-4'],
    ['lg', 'p-cmn-6'],
  ])('applies the "%s" padding', (padding, expected) => {
    fixture.componentRef.setInput('padding', padding);
    fixture.detectChanges();
    const classes = inner()?.className ?? '';
    if (expected === null) {
      expect(classes).not.toMatch(/\bp-cmn-\d/);
    } else {
      expect(classes).toContain(expected);
    }
  });

  it('adds the shadow only when elevated', () => {
    fixture.detectChanges();
    expect(inner()?.className).not.toContain('shadow-cmn-md');

    fixture.componentRef.setInput('elevated', true);
    fixture.detectChanges();
    expect(inner()?.className).toContain('shadow-cmn-md');
  });

  it('turns the host and the shell into a clipping flex column in fill mode', () => {
    fixture.componentRef.setInput('fill', true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('flex')).toBe(true);
    expect(host.classList.contains('flex-col')).toBe(true);
    expect(host.classList.contains('min-h-0')).toBe(true);

    const classes = inner()?.className ?? '';
    expect(classes).toContain('flex-1');
    expect(classes).toContain('overflow-hidden');
  });

  it('leaves the host unstyled when fill is off', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('flex')).toBe(false);
    expect(inner()?.className).not.toContain('overflow-hidden');
  });
});
