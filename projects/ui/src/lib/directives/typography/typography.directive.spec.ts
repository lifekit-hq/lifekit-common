import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {TypographyDirective, type TypographyLevel} from './typography.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TypographyDirective],
  template: '<p [cmnTypography]="level()">Body copy</p>',
})
class HostComponent {
  public readonly level = signal<TypographyLevel>('body');
}

describe('TypographyDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  function paragraph(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('p') as HTMLElement;
  }

  it.each<[TypographyLevel, string[]]>([
    ['display', ['font-headline', 'text-cmn-4xl', 'tracking-tight']],
    ['h1', ['font-headline', 'text-cmn-3xl']],
    ['h2', ['font-headline', 'text-cmn-2xl']],
    ['h3', ['font-headline', 'text-cmn-xl']],
    ['h4', ['font-headline', 'text-cmn-lg']],
    ['body', ['font-base', 'text-cmn-md']],
    ['small', ['font-base', 'text-cmn-sm']],
    ['caption', ['font-base', 'text-cmn-xs', 'text-text-secondary']],
    ['label', ['font-label', 'text-cmn-sm']],
    ['code', ['font-mono', 'text-cmn-sm']],
  ])('applies the "%s" level classes', (level, expected) => {
    fixture.componentInstance.level.set(level);
    fixture.detectChanges();
    for (const cls of expected) {
      expect(paragraph().classList.contains(cls)).toBe(true);
    }
  });

  it('removes the previous level classes when the level changes', () => {
    fixture.componentInstance.level.set('h1');
    fixture.detectChanges();
    expect(paragraph().classList.contains('text-cmn-3xl')).toBe(true);

    fixture.componentInstance.level.set('caption');
    fixture.detectChanges();
    expect(paragraph().classList.contains('text-cmn-3xl')).toBe(false);
    expect(paragraph().classList.contains('font-headline')).toBe(false);
    expect(paragraph().classList.contains('text-cmn-xs')).toBe(true);
  });

  it('defaults to body when the level is never set', () => {
    fixture.detectChanges();
    expect(paragraph().classList.contains('text-cmn-md')).toBe(true);
  });
});
