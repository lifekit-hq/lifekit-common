import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {SkeletonComponent} from './skeleton.component';

describe('SkeletonComponent', () => {
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonComponent);
  });

  function bar(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('div');
  }

  it('renders a pulsing full-width bar by default', () => {
    fixture.detectChanges();
    expect(bar()?.className).toContain('animate-pulse');
    expect(bar()?.style.width).toBe('100%');
    expect(bar()?.style.height).toBe('1.25rem');
  });

  it('honours explicit dimensions', () => {
    fixture.componentRef.setInput('width', '8rem');
    fixture.componentRef.setInput('height', '3rem');
    fixture.detectChanges();
    expect(bar()?.style.width).toBe('8rem');
    expect(bar()?.style.height).toBe('3rem');
  });

  it('appends a caller class without dropping the base classes', () => {
    fixture.componentRef.setInput('className', 'rounded-full');
    fixture.detectChanges();
    const classes = bar()?.className ?? '';
    expect(classes).toContain('animate-pulse');
    expect(classes).toContain('rounded-full');
  });

  it('adds nothing beyond the base classes when no caller class is given', () => {
    fixture.detectChanges();
    const base = ['block', 'animate-pulse', 'rounded-cmn-sm', 'bg-surface-raised'];
    const classes = (bar()?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    for (const cls of base) {
      expect(classes).toContain(cls);
    }
    expect(classes.filter(c => !base.includes(c))).toEqual([]);
  });
});
