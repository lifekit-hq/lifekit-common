import {type OverlayRef} from '@angular/cdk/overlay';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDrawerRef} from './drawer-ref';

const CLOSE_ANIMATION_MS = 220;

function makeRef(): {ref: CmnDrawerRef<string>; dispose: ReturnType<typeof vi.fn>} {
  const ref = new CmnDrawerRef<string>();
  const dispose = vi.fn();
  const overlayRef: Partial<OverlayRef> = {dispose};
  ref.overlayRef = overlayRef as OverlayRef;
  return {ref, dispose};
}

describe('CmnDrawerRef', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('signals beforeClose immediately so the container can animate out', () => {
    const {ref} = makeRef();
    let before = 0;
    ref.beforeClose$.subscribe(() => before++);

    ref.close();
    expect(before).toBe(1);
  });

  it('defers disposal until the close animation has run', () => {
    const {ref, dispose} = makeRef();
    ref.close();
    expect(dispose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(CLOSE_ANIMATION_MS);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('emits the result through afterClosed once disposed', () => {
    const {ref} = makeRef();
    const seen: (string | undefined)[] = [];
    ref.afterClosed().subscribe(v => seen.push(v));

    ref.close('saved');
    expect(seen).toEqual([]);

    vi.advanceTimersByTime(CLOSE_ANIMATION_MS);
    expect(seen).toEqual(['saved']);
  });

  it('emits undefined for a result-less close', () => {
    const {ref} = makeRef();
    const seen: (string | undefined)[] = [];
    ref.afterClosed().subscribe(v => seen.push(v));

    ref.close();
    vi.advanceTimersByTime(CLOSE_ANIMATION_MS);
    expect(seen).toEqual([undefined]);
  });

  it('ignores a second close — backdrop and Escape can both fire', () => {
    const {ref, dispose} = makeRef();
    let before = 0;
    ref.beforeClose$.subscribe(() => before++);

    ref.close('first');
    ref.close('second');
    vi.runAllTimers();

    expect(before).toBe(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('completes afterClosed so subscribers can finalize', () => {
    const {ref} = makeRef();
    let completed = false;
    ref.afterClosed().subscribe({complete: () => (completed = true)});

    ref.close();
    vi.runAllTimers();
    expect(completed).toBe(true);
  });
});
