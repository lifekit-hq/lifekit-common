import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {ChipComponent} from './chip.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChipComponent],
  template: '<cmn-chip>3M</cmn-chip>',
})
class ChipHostComponent {}

describe('ChipComponent', () => {
  let fixture: ComponentFixture<ChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChipComponent);
  });

  it('reflects the selected state via aria-pressed', () => {
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector('button');
    expect(button?.getAttribute('aria-pressed')).toBe('true');
  });

  it('presses as a touch-sized button below md around a pill that keeps its size', () => {
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector('button');
    expect(button?.classList).toContain('max-md:min-h-cmn-touch');
    expect(button?.classList).toContain('max-md:min-w-cmn-touch');
    const pill = button?.querySelector('span');
    expect(pill?.classList).toContain('py-cmn-1');
    expect(pill?.classList).toContain('bg-accent-default');
  });

  it('projects its label into the pill', () => {
    const host = TestBed.createComponent(ChipHostComponent);
    host.detectChanges();
    const pill = (host.nativeElement as HTMLElement).querySelector('button > span');
    expect(pill?.textContent?.trim()).toBe('3M');
  });

  it('emits clicked when the button is pressed', () => {
    let count = 0;
    fixture.componentInstance.clicked.subscribe(() => count++);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>('button');
    button?.click();
    expect(count).toBe(1);
  });
});
