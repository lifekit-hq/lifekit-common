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

  it('renders a sweeping full-width bar by default', () => {
    fixture.detectChanges();
    expect(bar()?.className).toContain('cmn-skeleton-sweep');
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
    expect(classes).toContain('cmn-skeleton-sweep');
    expect(classes).toContain('rounded-full');
  });

  it('adds nothing beyond the base classes when no caller class is given', () => {
    fixture.detectChanges();
    const base = ['block', 'cmn-skeleton-sweep', 'rounded-cmn-sm'];
    const classes = (bar()?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    for (const cls of base) {
      expect(classes).toContain(cls);
    }
    expect(classes.filter(c => !base.includes(c))).toEqual([]);
  });

  describe('presets', () => {
    const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const sweeping = (): number => root().querySelectorAll('.cmn-skeleton-sweep').length;

    it('draws two-line rows, `count` of them, hidden from assistive tech', () => {
      fixture.componentRef.setInput('shape', 'row');
      fixture.componentRef.setInput('count', 4);
      fixture.detectChanges();
      expect(root().querySelectorAll('.border-b')).toHaveLength(4);
      // avatar + label + sublabel + amount per row
      expect(sweeping()).toBe(16);
      expect(root().getAttribute('aria-hidden')).toBe('true');
    });

    it('draws one row by default, and three under a section heading', () => {
      fixture.componentRef.setInput('shape', 'row');
      fixture.detectChanges();
      expect(root().querySelectorAll('.border-b')).toHaveLength(1);

      fixture.componentRef.setInput('shape', 'section');
      fixture.detectChanges();
      expect(root().querySelectorAll('.border-b')).toHaveLength(3);
    });

    it('draws a stat card with a label, a value and a delta', () => {
      fixture.componentRef.setInput('shape', 'stat');
      fixture.detectChanges();
      expect(root().querySelector('.rounded-cmn-lg')).not.toBeNull();
      expect(sweeping()).toBe(4);
    });

    it('reserves the chart plot at the chart height, or at an aspect ratio when given one', () => {
      fixture.componentRef.setInput('shape', 'chart');
      fixture.detectChanges();
      const plot = (): HTMLElement => {
        const el = root().querySelector<HTMLElement>('.w-full.cmn-skeleton-sweep');
        if (!el) {
          throw new Error('no chart plot rendered');
        }
        return el;
      };
      expect(plot().style.height).toBe('12rem');

      fixture.componentRef.setInput('aspect', '16 / 9');
      fixture.detectChanges();
      expect(plot().style.height).toBe('');
      expect(plot().style.aspectRatio).toBe('16 / 9');
    });

    it('leaves a plain bar visible to assistive tech', () => {
      fixture.detectChanges();
      expect(root().getAttribute('aria-hidden')).toBeNull();
    });
  });
});
