import {beforeEach, describe, expect, it, type Mock, vi} from 'vitest';

import {CmnSheetDrag, SHEET_DISMISS_DISTANCE_PX} from './sheet-drag';

function pointer(clientY: number, target?: Element): PointerEvent {
  const event = new PointerEvent('pointerdown', {clientY, pointerId: 1, bubbles: true});
  if (target) {
    Object.defineProperty(event, 'currentTarget', {value: target});
  }
  return event;
}

describe('CmnSheetDrag', () => {
  let enabled: boolean;
  let dismissible: boolean;
  let dismiss: Mock<() => void>;
  let tap: Mock<() => void>;
  let drag: CmnSheetDrag;

  beforeEach(() => {
    enabled = true;
    dismissible = true;
    dismiss = vi.fn<() => void>();
    tap = vi.fn<() => void>();
    drag = new CmnSheetDrag({enabled: () => enabled, dismissible: () => dismissible, dismiss, tap});
  });

  it('follows the pointer downward and reports the transform', () => {
    drag.start(pointer(10), true);
    drag.move(pointer(50));
    expect(drag.dragging()).toBe(true);
    expect(drag.offset()).toBe(40);
    expect(drag.transform()).toBe('translateY(40px)');
  });

  it('never moves above its resting place', () => {
    drag.start(pointer(100), true);
    drag.move(pointer(40));
    expect(drag.offset()).toBe(0);
    expect(drag.transform()).toBeNull();
  });

  it('dismisses at the threshold and snaps back below it', () => {
    drag.start(pointer(0), true);
    drag.move(pointer(SHEET_DISMISS_DISTANCE_PX - 1));
    drag.end();
    expect(dismiss).not.toHaveBeenCalled();
    expect(drag.offset()).toBe(0);

    drag.start(pointer(0), true);
    drag.move(pointer(SHEET_DISMISS_DISTANCE_PX));
    drag.end();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('snaps back instead of dismissing when the sheet is not dismissible', () => {
    dismissible = false;
    drag.start(pointer(0), true);
    drag.move(pointer(SHEET_DISMISS_DISTANCE_PX * 2));
    drag.end();
    expect(dismiss).not.toHaveBeenCalled();
    expect(drag.offset()).toBe(0);
  });

  it('treats a cancelled pointer as a release, but never as a tap', () => {
    drag.start(pointer(0), true);
    drag.cancel();
    expect(tap).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    expect(drag.dragging()).toBe(false);

    drag.start(pointer(0), true);
    drag.move(pointer(SHEET_DISMISS_DISTANCE_PX * 2));
    drag.cancel();
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(drag.offset()).toBe(0);
  });

  it('reports a tap on the grabber, but not a tap elsewhere or a drag', () => {
    drag.start(pointer(0), true);
    drag.end();
    expect(tap).toHaveBeenCalledTimes(1);

    drag.start(pointer(0), false);
    drag.end();
    drag.start(pointer(0), true);
    drag.move(pointer(30));
    drag.end();
    expect(tap).toHaveBeenCalledTimes(1);
  });

  it('ignores gestures while disabled', () => {
    enabled = false;
    drag.start(pointer(0), true);
    drag.move(pointer(SHEET_DISMISS_DISTANCE_PX * 2));
    drag.end();
    expect(drag.dragging()).toBe(false);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('ignores a move or release with no gesture in progress', () => {
    drag.move(pointer(80));
    drag.end();
    expect(drag.offset()).toBe(0);
    expect(dismiss).not.toHaveBeenCalled();
  });
});
