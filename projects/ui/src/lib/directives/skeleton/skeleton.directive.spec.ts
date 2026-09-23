import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {type SkeletonConfig, SkeletonDirective} from './skeleton.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonDirective],
  template: `
    <ng-container *cmnSkeleton="config()">
      <p class="loaded">Loaded</p>
    </ng-container>
  `,
})
class HostComponent {
  public readonly config = signal<SkeletonConfig>({loading: false});
}

describe('SkeletonDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  function skeletons(): NodeListOf<Element> {
    return (fixture.nativeElement as HTMLElement).querySelectorAll('cmn-skeleton');
  }

  function loaded(): Element | null {
    return (fixture.nativeElement as HTMLElement).querySelector('.loaded');
  }

  it('renders the real content when not loading', () => {
    fixture.detectChanges();
    expect(loaded()).not.toBeNull();
    expect(skeletons()).toHaveLength(0);
  });

  it('swaps the content for a single skeleton while loading', () => {
    fixture.componentInstance.config.set({loading: true});
    fixture.detectChanges();
    expect(loaded()).toBeNull();
    expect(skeletons()).toHaveLength(1);
  });

  it('renders one skeleton per requested count', () => {
    fixture.componentInstance.config.set({loading: true, count: 4});
    fixture.detectChanges();
    expect(skeletons()).toHaveLength(4);
  });

  it('spaces every skeleton but the last', () => {
    fixture.componentInstance.config.set({loading: true, count: 3});
    fixture.detectChanges();

    const bars = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('cmn-skeleton div')
    );
    expect(bars[0].className).toContain('mb-cmn-2');
    expect(bars[1].className).toContain('mb-cmn-2');
    expect(bars[2].className).not.toContain('mb-cmn-2');
  });

  it('forwards width, height and a caller class to each skeleton', () => {
    fixture.componentInstance.config.set({
      loading: true,
      width: '60%',
      height: '2rem',
      className: 'rounded-full',
    });
    fixture.detectChanges();

    const bar = (fixture.nativeElement as HTMLElement).querySelector(
      'cmn-skeleton div'
    ) as HTMLElement;
    expect(bar.style.width).toBe('60%');
    expect(bar.style.height).toBe('2rem');
    expect(bar.className).toContain('rounded-full');
  });

  it('restores the real content when loading flips back off', () => {
    fixture.componentInstance.config.set({loading: true, count: 2});
    fixture.detectChanges();
    expect(skeletons()).toHaveLength(2);

    fixture.componentInstance.config.set({loading: false});
    fixture.detectChanges();
    expect(skeletons()).toHaveLength(0);
    expect(loaded()).not.toBeNull();
  });
});
