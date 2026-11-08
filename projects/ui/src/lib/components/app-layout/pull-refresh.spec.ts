import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  PULL_HOLD_PX,
  PULL_MAX_PX,
  PULL_RESISTANCE,
  PULL_SLOP_PX,
  PULL_THRESHOLD_PX,
  PullRefresh,
  type PullRefreshHooks,
} from './pull-refresh';

const THRESHOLD_TRAVEL_PX = PULL_THRESHOLD_PX / PULL_RESISTANCE;
const SCROLLED_PX = 20;

function touchOf(target: Element, x: number, y: number): Touch {
  return new Touch({identifier: 1, target, clientX: x, clientY: y});
}

/** Dispatches one touch event and reports whether the browser's own handling was cancelled. */
function fire(target: Element, type: string, x = 0, y = 0, extra: Touch[] = []): boolean {
  const touches =
    type === 'touchend' || type === 'touchcancel' ? [] : [touchOf(target, x, y), ...extra];
  const event = new TouchEvent(type, {
    touches,
    changedTouches: [touchOf(target, x, y)],
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

/** A scroller with a list inside it that itself scrolls, as a `cmn-page-scroll` page does. */
function scene(): {scroller: HTMLElement; list: HTMLElement; row: HTMLElement} {
  const scroller = document.createElement('div');
  scroller.style.cssText = 'height:200px;overflow-y:auto';
  const list = document.createElement('div');
  list.style.cssText = 'height:100px;overflow-y:auto';
  const row = document.createElement('div');
  row.style.height = '400px';
  list.append(row);
  const tail = document.createElement('div');
  tail.style.height = '600px';
  scroller.append(list, tail);
  document.body.append(scroller);
  return {scroller, list, row};
}

describe('PullRefresh', () => {
  let scroller: HTMLElement;
  let list: HTMLElement;
  let row: HTMLElement;
  let hooks: PullRefreshHooks;
  let pull: PullRefresh;
  let detach: () => void;
  let finish: () => void;
  let enabled: boolean;
  let reduced: boolean;

  beforeEach(() => {
    ({scroller, list, row} = scene());
    enabled = true;
    reduced = false;
    hooks = {
      enabled: () => enabled,
      reduceMotion: () => reduced,
      refresh: vi.fn(() => new Promise<void>(resolve => (finish = resolve))),
      engaged: vi.fn(),
    };
    pull = new PullRefresh(hooks);
    detach = pull.attach(scroller);
  });

  afterEach(() => {
    detach();
    scroller.remove();
  });

  /** Touches down and drags down by `travel` px beyond the slop. */
  function drag(travel: number): boolean {
    fire(row, 'touchstart', 100, 100);
    fire(row, 'touchmove', 100, 100 + PULL_SLOP_PX + 1);
    return fire(row, 'touchmove', 100, 100 + PULL_SLOP_PX + 1 + travel);
  }

  it('should follow the finger with resistance and cancel the browser scroll once engaged', () => {
    const prevented = drag(40);
    expect(prevented).toBe(true);
    expect(hooks.engaged).toHaveBeenCalledOnce();
    expect(pull.phase()).toBe('pulling');
    expect(pull.dragging()).toBe(true);
    expect(pull.offset()).toBe(40 * PULL_RESISTANCE);
    expect(pull.transform()).toBe(`translateY(${40 * PULL_RESISTANCE}px)`);
    expect(pull.progress()).toBeCloseTo((40 * PULL_RESISTANCE) / PULL_THRESHOLD_PX);
  });

  it('should be ready past the threshold and stop following at the maximum', () => {
    drag(THRESHOLD_TRAVEL_PX);
    expect(pull.phase()).toBe('ready');
    fire(row, 'touchmove', 100, 1000);
    expect(pull.offset()).toBe(PULL_MAX_PX);
    expect(pull.progress()).toBe(1);
  });

  it('should refresh on release past the threshold, hold while it runs, then settle', async () => {
    drag(THRESHOLD_TRAVEL_PX);
    fire(row, 'touchend');
    expect(hooks.refresh).toHaveBeenCalledOnce();
    expect(pull.phase()).toBe('refreshing');
    expect(pull.dragging()).toBe(false);
    expect(pull.offset()).toBe(PULL_HOLD_PX);
    expect(pull.progress()).toBe(1);

    finish();
    await vi.waitFor(() => expect(pull.phase()).toBe('idle'));
    expect(pull.offset()).toBe(0);
    expect(pull.transform()).toBeNull();
  });

  it('should settle back without refreshing when released short of the threshold', () => {
    drag(THRESHOLD_TRAVEL_PX / 2);
    fire(row, 'touchend');
    expect(hooks.refresh).not.toHaveBeenCalled();
    expect(pull.phase()).toBe('idle');
    expect(pull.offset()).toBe(0);
    expect(pull.dragging()).toBe(false);
  });

  it('should ignore a touch while a refresh is running', () => {
    drag(THRESHOLD_TRAVEL_PX);
    fire(row, 'touchend');
    const prevented = drag(40);
    expect(prevented).toBe(false);
    expect(hooks.refresh).toHaveBeenCalledOnce();
    expect(pull.phase()).toBe('refreshing');
  });

  it('should leave the touch alone when pulling is not enabled', () => {
    enabled = false;
    expect(drag(THRESHOLD_TRAVEL_PX)).toBe(false);
    expect(pull.phase()).toBe('idle');
    expect(hooks.engaged).not.toHaveBeenCalled();
  });

  it('should leave the touch alone when the scroller is scrolled down', () => {
    scroller.scrollTop = SCROLLED_PX;
    expect(drag(THRESHOLD_TRAVEL_PX)).toBe(false);
    expect(pull.phase()).toBe('idle');
  });

  it('should leave the touch alone when a list inside it is scrolled down', () => {
    list.scrollTop = SCROLLED_PX;
    expect(drag(THRESHOLD_TRAVEL_PX)).toBe(false);
    expect(pull.phase()).toBe('idle');
  });

  it('should pull again from a list that has scrolled back to its top', () => {
    list.scrollTop = SCROLLED_PX;
    list.scrollTop = 0;
    expect(drag(40)).toBe(true);
  });

  it('should leave an upward drag to the scroll', () => {
    fire(row, 'touchstart', 100, 100);
    fire(row, 'touchmove', 100, 60);
    expect(fire(row, 'touchmove', 100, 140)).toBe(false);
    expect(pull.phase()).toBe('idle');
  });

  it('should leave a sideways swipe to the row', () => {
    fire(row, 'touchstart', 100, 100);
    fire(row, 'touchmove', 160, 112);
    expect(fire(row, 'touchmove', 160, 200)).toBe(false);
    expect(pull.phase()).toBe('idle');
  });

  it('should wait out the slop before choosing', () => {
    fire(row, 'touchstart', 100, 100);
    expect(fire(row, 'touchmove', 100, 100 + PULL_SLOP_PX - 1)).toBe(false);
    expect(pull.phase()).toBe('idle');
  });

  it('should drop the pull when a second finger lands', () => {
    drag(THRESHOLD_TRAVEL_PX);
    fire(row, 'touchmove', 100, 400, [touchOf(row, 200, 400)]);
    fire(row, 'touchend');
    expect(hooks.refresh).not.toHaveBeenCalled();
    expect(pull.phase()).toBe('idle');
  });

  it('should drop the pull when a second finger touches down mid-pull', () => {
    drag(THRESHOLD_TRAVEL_PX);
    fire(row, 'touchstart', 100, 400, [touchOf(row, 200, 400)]);
    expect(pull.phase()).toBe('idle');
    expect(pull.dragging()).toBe(false);
    expect(pull.offset()).toBe(0);
    fire(row, 'touchend');
    expect(hooks.refresh).not.toHaveBeenCalled();
    expect(pull.phase()).toBe('idle');
    expect(pull.offset()).toBe(0);
  });

  it('should drop the pull when the browser cancels the touch', () => {
    drag(THRESHOLD_TRAVEL_PX);
    fire(row, 'touchcancel');
    expect(hooks.refresh).not.toHaveBeenCalled();
    expect(pull.phase()).toBe('idle');
  });

  describe('under Reduce Motion', () => {
    beforeEach(() => {
      reduced = true;
    });

    it('should show progress without ever moving the content', () => {
      drag(THRESHOLD_TRAVEL_PX / 2);
      expect(pull.phase()).toBe('pulling');
      expect(pull.offset()).toBe(0);
      expect(pull.transform()).toBeNull();
      expect(pull.progress()).toBeCloseTo(0.5);
    });

    it('should still refresh past the same distance, and hold the content still', () => {
      drag(THRESHOLD_TRAVEL_PX);
      expect(pull.phase()).toBe('ready');
      fire(row, 'touchend');
      expect(hooks.refresh).toHaveBeenCalledOnce();
      expect(pull.phase()).toBe('refreshing');
      expect(pull.offset()).toBe(0);
      expect(pull.progress()).toBe(1);
    });
  });

  it('should stop listening once detached', () => {
    detach();
    expect(drag(40)).toBe(false);
    expect(pull.phase()).toBe('idle');
  });
});
