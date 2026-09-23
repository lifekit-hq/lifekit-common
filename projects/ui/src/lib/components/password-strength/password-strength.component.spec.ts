import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {CmnPasswordStrengthComponent} from './password-strength.component';

describe('CmnPasswordStrengthComponent', () => {
  let fixture: ComponentFixture<CmnPasswordStrengthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CmnPasswordStrengthComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CmnPasswordStrengthComponent);
  });

  function setScore(score: number): void {
    fixture.componentRef.setInput('score', score);
    fixture.detectChanges();
  }

  function segments(): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.h-1'));
  }

  function labelText(): string {
    return (fixture.nativeElement as HTMLElement).querySelector('span')?.textContent?.trim() ?? '';
  }

  it('renders nothing at score 0 — an empty field gets no meter', () => {
    setScore(0);
    expect((fixture.nativeElement as HTMLElement).querySelector('div')).toBeNull();
  });

  it('always renders four segments once visible', () => {
    setScore(1);
    expect(segments()).toHaveLength(4);
  });

  it.each<[number, string, number]>([
    [1, 'Weak', 1],
    [2, 'Fair', 2],
    [3, 'Good', 3],
    [4, 'Strong', 4],
  ])('fills %i segment(s) and labels it "%s"', (score, label, filled) => {
    setScore(score);
    expect(labelText()).toBe(label);
    const active = segments().filter(s => !s.className.includes('bg-border-default'));
    expect(active).toHaveLength(filled);
  });

  it.each<[number, string]>([
    [1, 'bg-red-500'],
    [2, 'bg-amber-400'],
    [3, 'bg-blue-500'],
    [4, 'bg-green-500'],
  ])('colors the filled segments for score %i', (score, colorClass) => {
    setScore(score);
    expect(segments()[0].className).toContain(colorClass);
  });

  it('falls back to the inactive color and an empty label for an out-of-range score', () => {
    setScore(9);
    expect(labelText()).toBe('');
    expect(segments().every(s => s.className.includes('bg-border-default'))).toBe(true);
  });
});
