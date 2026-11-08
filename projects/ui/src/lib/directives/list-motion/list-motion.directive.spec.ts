import {Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnListMotionDirective, LIST_MOTION_MAX_ROWS} from './list-motion.directive';

@Component({
  selector: 'cmn-list-motion-host',
  imports: [CmnListMotionDirective],
  template: `
    <div cmnListMotion="p.row" style="position: relative">
      @for (id of ids(); track id) {
        <p class="row" style="margin: 0; height: 20px">{{ id }}</p>
      }
    </div>
  `,
})
class HostComponent {
  public readonly ids = signal<number[]>([1, 2, 3]);
}

@Component({
  selector: 'cmn-list-motion-chips-host',
  imports: [CmnListMotionDirective],
  template: `
    <div cmnListMotion="span.chip" style="position: relative; display: flex; flex-wrap: wrap">
      @for (id of ids(); track id) {
        <span class="chip" style="display: block; width: 30px; height: 20px">{{ id }}</span>
      }
    </div>
  `,
})
class ChipsHostComponent {
  public readonly ids = signal<number[]>([1, 2, 3]);
}

describe('CmnListMotionDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  const rows = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('p.row'));
  const live = (): HTMLElement[] => rows().filter(row => !row.hasAttribute('inert'));
  const text = (): string[] => live().map(row => row.textContent?.trim() ?? '');

  /** The observer reports a batch in a microtask after the DOM change. */
  async function change(ids: number[]): Promise<void> {
    fixture.componentInstance.ids.set(ids);
    fixture.detectChanges();
    await Promise.resolve();
  }

  function keyframes(row: HTMLElement): Keyframe[] {
    return (row.getAnimations()[0]?.effect as KeyframeEffect | undefined)?.getKeyframes() ?? [];
  }

  function timing(row: HTMLElement): EffectTiming | undefined {
    return row.getAnimations()[0]?.effect?.getTiming();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({imports: [HostComponent]});
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--cmn-duration-medium');
    document.documentElement.style.removeProperty('--cmn-duration-short');
    document.documentElement.style.removeProperty('--cmn-motion-distance-sm');
    vi.restoreAllMocks();
  });

  it('draws the rows it starts with as they are', () => {
    expect(rows().flatMap(row => row.getAnimations())).toHaveLength(0);
  });

  it('fades a new row in while it rises, on the medium duration from the token', async () => {
    document.documentElement.style.setProperty('--cmn-duration-medium', '123ms');
    document.documentElement.style.setProperty('--cmn-motion-distance-sm', '5px');
    await change([1, 2, 3, 4]);

    const added = live()[3];
    expect(added.getAnimations()).toHaveLength(1);
    expect(timing(added)?.duration).toBe(123);
    expect(keyframes(added)[0]).toMatchObject({opacity: '0', transform: 'translateY(5px)'});
    expect(keyframes(added)[1]).toMatchObject({opacity: '1'});
  });

  it('keeps a removed row drawn, inert, and fades it out on the short duration', async () => {
    document.documentElement.style.setProperty('--cmn-duration-short', '77ms');
    await change([1, 3]);

    const ghost = rows().find(row => row.hasAttribute('inert')) as HTMLElement;
    expect(ghost.textContent?.trim()).toBe('2');
    expect(ghost.getAttribute('aria-hidden')).toBe('true');
    expect(ghost.style.position).toBe('absolute');
    expect(ghost.style.pointerEvents).toBe('none');
    expect(timing(ghost)?.duration).toBe(77);
    expect(keyframes(ghost).map(frame => frame['opacity'])).toEqual(['1', '0']);

    const exits = ghost.getAnimations();
    exits.forEach(animation => animation.finish());
    await Promise.all(exits.map(animation => animation.finished));
    await new Promise(resolve => setTimeout(resolve));
    expect(ghost.isConnected).toBe(false);
  });

  it('slides the rows below a removed row up from where they were', async () => {
    await change([1, 3]);

    const moved = live()[1];
    expect(text()).toEqual(['1', '3']);
    expect(keyframes(moved)[0]).toMatchObject({transform: 'translate(0px, 20px)'});
    expect(keyframes(moved)[1]).toMatchObject({transform: 'none'});
    expect(live()[0].getAnimations()).toHaveLength(0);
  });

  it('slides rows that swap places', async () => {
    await change([3, 2, 1]);

    const [first, middle, last] = live();
    expect(text()).toEqual(['3', '2', '1']);
    expect(keyframes(first)[0]).toMatchObject({transform: 'translate(0px, 40px)'});
    expect(middle.getAnimations()).toHaveLength(0);
    expect(keyframes(last)[0]).toMatchObject({transform: 'translate(0px, -40px)'});
  });

  it('holds on to no exit once it has finished', async () => {
    await change([1, 3]);
    const ghost = rows().find(row => row.hasAttribute('inert')) as HTMLElement;
    const list = ghost.parentElement as HTMLElement;
    const exits = ghost.getAnimations();
    exits.forEach(animation => animation.finish());
    await Promise.all(exits.map(animation => animation.finished));
    await new Promise(resolve => setTimeout(resolve));
    expect(ghost.parentElement).toBeNull();

    list.append(ghost);
    fixture.destroy();

    expect(ghost.parentElement).toBe(list);
  });

  it('takes the exits still running off the screen when the list goes', async () => {
    await change([1, 3]);
    const ghost = rows().find(row => row.hasAttribute('inert')) as HTMLElement;
    expect(ghost.parentElement).not.toBeNull();

    fixture.destroy();

    expect(ghost.parentElement).toBeNull();
  });

  it('keeps the exit where the row was, between its neighbours', async () => {
    await change([1, 3]);

    expect(rows().map(row => row.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(rows()[1].hasAttribute('inert')).toBe(true);
  });

  it('keeps the exit of the last row after the rows that stay', async () => {
    await change([1, 2]);

    expect(rows().map(row => row.textContent?.trim())).toEqual(['1', '2', '3']);
    expect(rows()[2].hasAttribute('inert')).toBe(true);
  });

  it('never removes a row that was moved more than once in one batch', async () => {
    const first = rows()[0];
    const list = first.parentElement as HTMLElement;
    list.append(first);
    list.prepend(first);
    await Promise.resolve();

    expect(first.isConnected).toBe(true);
    expect(first.hasAttribute('inert')).toBe(false);
    expect(rows().some(row => row.hasAttribute('inert'))).toBe(false);
    expect(rows().flatMap(row => row.getAnimations())).toHaveLength(0);
  });

  it('moves nothing under Reduce Motion', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({matches: true} as MediaQueryList);
    await change([1, 4]);

    expect(rows().flatMap(row => row.getAnimations())).toHaveLength(0);
    expect(rows().some(row => row.hasAttribute('inert'))).toBe(false);
    expect(text()).toEqual(['1', '4']);
  });

  it('adds and removes rows without throwing where Element.animate does not exist', async () => {
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
    Object.defineProperty(Element.prototype, 'animate', {value: undefined, configurable: true});
    try {
      await change([1, 4, 5]);
      expect(text()).toEqual(['1', '4', '5']);
      expect(rows().some(row => row.hasAttribute('inert'))).toBe(false);
    } finally {
      Object.defineProperty(Element.prototype, 'animate', original as PropertyDescriptor);
    }
  });

  it('does not animate a page of rows arriving at once', async () => {
    const page = Array.from({length: LIST_MOTION_MAX_ROWS + 1}, (_, index) => index + 10);
    await change(page);

    expect(rows().flatMap(row => row.getAnimations())).toHaveLength(0);
  });

  it('does not animate a row that was added and removed before it was drawn', async () => {
    fixture.componentInstance.ids.set([1, 2, 3, 4]);
    fixture.detectChanges();
    fixture.componentInstance.ids.set([1, 2, 3]);
    fixture.detectChanges();
    await Promise.resolve();

    expect(rows().flatMap(row => row.getAnimations())).toHaveLength(0);
  });

  describe('rows that wrap in a line', () => {
    let chips: ComponentFixture<ChipsHostComponent>;

    const chipRows = (): HTMLElement[] =>
      Array.from<HTMLElement>(chips.nativeElement.querySelectorAll('span.chip'));

    beforeEach(async () => {
      chips = TestBed.createComponent(ChipsHostComponent);
      chips.detectChanges();
      await chips.whenStable();
    });

    it('slides the rows after a removed one sideways, from where they were', async () => {
      chips.componentInstance.ids.set([2, 3]);
      chips.detectChanges();
      await Promise.resolve();

      const [ghost, second, third] = chipRows();
      expect(ghost.hasAttribute('inert')).toBe(true);
      const frames = (chip: HTMLElement): Keyframe[] =>
        (chip.getAnimations()[0]?.effect as KeyframeEffect).getKeyframes();
      expect(frames(second)[0]).toMatchObject({transform: 'translate(30px, 0px)'});
      expect(frames(third)[0]).toMatchObject({transform: 'translate(30px, 0px)'});
      expect(frames(second)[1]).toMatchObject({transform: 'none'});
    });
  });
});
