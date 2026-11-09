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

  it('stands in for one line of a step of the type ramp, as tall as that line', () => {
    fixture.componentRef.setInput('text', '2xl');
    fixture.componentRef.setInput('width', '50%');
    fixture.componentRef.setInput('height', '9rem');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const line = host.querySelector('div') as HTMLElement;
    const sweep = line.querySelector('.cmn-skeleton-sweep') as HTMLElement;
    expect(line.className).toContain('text-cmn-2xl');
    expect(line.style.height).toBe('1lh');
    expect(sweep.style.width).toBe('50%');
    expect(sweep.style.height).toBe('0.75em');
    expect(host.classList).toContain('block');
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
    const base = ['block', 'cmn-skeleton-sweep', 'rounded-cmn-role-inset'];
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
      expect(root().querySelector('.rounded-cmn-role-surface')).not.toBeNull();
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

    describe('page presets', () => {
      const dividers = (): number => root().querySelectorAll('.border-b').length;

      it('lets the page column space the blocks: the host is display: contents', () => {
        for (const shape of ['list', 'card', 'detail', 'overview']) {
          fixture.componentRef.setInput('shape', shape);
          fixture.detectChanges();
          expect(root().classList, shape).toContain('contents');
          expect(root().classList, shape).not.toContain('block');
          expect(root().getAttribute('aria-hidden'), shape).toBe('true');
        }
      });

      it('draws a list as two sections of three rows, or `count` rows each', () => {
        fixture.componentRef.setInput('shape', 'list');
        fixture.detectChanges();
        expect(root().querySelectorAll('cmn-skeleton')).toHaveLength(2);
        expect(dividers()).toBe(6);

        fixture.componentRef.setInput('count', 5);
        fixture.detectChanges();
        expect(dividers()).toBe(10);
      });

      it('draws a card as a title over three lines, or `count` lines', () => {
        fixture.componentRef.setInput('shape', 'card');
        fixture.detectChanges();
        expect(root().querySelectorAll('cmn-skeleton')).toHaveLength(3);
        expect(root().querySelectorAll('.cmn-skeleton-sweep')).toHaveLength(4);

        fixture.componentRef.setInput('count', 1);
        fixture.detectChanges();
        expect(root().querySelectorAll('cmn-skeleton')).toHaveLength(1);
      });

      it('draws a detail as an intro, a facts section and a related section', () => {
        fixture.componentRef.setInput('shape', 'detail');
        fixture.detectChanges();
        // intro (2 lines) + the related section; the facts are drawn by the preset itself
        expect(root().querySelectorAll('cmn-skeleton')).toHaveLength(3);
        // 4 fact rows, then the related section's 2 rows
        expect(dividers()).toBe(2);
        expect(root().querySelectorAll('.divide-y > div')).toHaveLength(4);

        fixture.componentRef.setInput('count', 6);
        fixture.detectChanges();
        expect(root().querySelectorAll('.divide-y > div')).toHaveLength(6);
      });

      it('draws an overview as four stat cards over two sections', () => {
        fixture.componentRef.setInput('shape', 'overview');
        fixture.detectChanges();
        expect(root().querySelectorAll('.grid > cmn-skeleton')).toHaveLength(4);
        expect(dividers()).toBe(6);
      });

      it('draws nothing for a page preset but its own blocks (no title, no gutter)', () => {
        fixture.componentRef.setInput('shape', 'list');
        fixture.detectChanges();
        expect(root().querySelector('h1')).toBeNull();
        expect(root().querySelector('.p-cmn-page-gutter')).toBeNull();
      });
    });

    it('leaves a plain bar visible to assistive tech', () => {
      fixture.detectChanges();
      expect(root().getAttribute('aria-hidden')).toBeNull();
    });
  });
});
