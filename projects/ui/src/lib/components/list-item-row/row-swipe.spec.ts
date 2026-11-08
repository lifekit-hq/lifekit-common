import {beforeEach, describe, expect, it} from 'vitest';

import {ROW_SWIPE_OPEN_RATIO, ROW_SWIPE_SLOP_PX, RowSwipe} from './row-swipe';

const TRAY_PX = 80;

function touch(type: string, clientX: number, clientY = 0, pointerType = 'touch'): PointerEvent {
  return new PointerEvent(type, {clientX, clientY, pointerType, pointerId: 1, bubbles: true});
}

describe('RowSwipe', () => {
  let trays: {leading: number; trailing: number};
  let swipe: RowSwipe;

  beforeEach(() => {
    trays = {leading: TRAY_PX, trailing: TRAY_PX};
    swipe = new RowSwipe({widths: () => trays});
  });

  function drag(...xs: number[]): void {
    swipe.start(touch('pointerdown', 0));
    xs.forEach(x => swipe.move(touch('pointermove', x)));
  }

  it('follows a sideways touch and reports the transform', () => {
    drag(30);
    expect(swipe.dragging()).toBe(true);
    expect(swipe.offset()).toBe(30);
    expect(swipe.transform()).toBe('translateX(30px)');
  });

  it('does not move before the touch clears the slop', () => {
    drag(ROW_SWIPE_SLOP_PX - 1);
    expect(swipe.dragging()).toBe(false);
    expect(swipe.offset()).toBe(0);
    expect(swipe.transform()).toBeNull();
  });

  it('never uncovers more than the tray, or a tray with no action', () => {
    drag(TRAY_PX * 3);
    expect(swipe.offset()).toBe(TRAY_PX);
    swipe.end();
    swipe.close();
    trays = {leading: 0, trailing: TRAY_PX};
    drag(50);
    expect(swipe.offset()).toBe(0);
    drag(-TRAY_PX * 3);
    expect(swipe.offset()).toBe(-TRAY_PX);
  });

  it('leaves a mostly vertical touch to the page scroll', () => {
    swipe.start(touch('pointerdown', 0, 0));
    swipe.move(touch('pointermove', 5, 40));
    swipe.move(touch('pointermove', 60, 41));
    expect(swipe.dragging()).toBe(false);
    expect(swipe.offset()).toBe(0);
    swipe.end();
    expect(swipe.open()).toBeNull();
  });

  it('ignores a mouse, which has the visible control', () => {
    swipe.start(touch('pointerdown', 0, 0, 'mouse'));
    swipe.move(touch('pointermove', 40, 0, 'mouse'));
    expect(swipe.dragging()).toBe(false);
    expect(swipe.offset()).toBe(0);
  });

  it('ignores a row with no tray at all', () => {
    trays = {leading: 0, trailing: 0};
    drag(40);
    expect(swipe.dragging()).toBe(false);
  });

  it('ignores a move or release with no gesture in progress', () => {
    swipe.move(touch('pointermove', 40));
    swipe.end();
    expect(swipe.offset()).toBe(0);
    expect(swipe.open()).toBeNull();
  });

  it('rests open on the leading tray past half of it, and shut below', () => {
    drag(TRAY_PX * ROW_SWIPE_OPEN_RATIO);
    swipe.end();
    expect(swipe.open()).toBe('leading');
    expect(swipe.offset()).toBe(TRAY_PX);
    expect(swipe.dragging()).toBe(false);

    swipe.close();
    drag(TRAY_PX * ROW_SWIPE_OPEN_RATIO - 1);
    swipe.end();
    expect(swipe.open()).toBeNull();
    expect(swipe.offset()).toBe(0);
  });

  it('rests open on the trailing tray past half of it', () => {
    drag(-TRAY_PX);
    swipe.end();
    expect(swipe.open()).toBe('trailing');
    expect(swipe.offset()).toBe(-TRAY_PX);
  });

  it('closes an open row that is dragged back past half, and starts from where it rests', () => {
    drag(TRAY_PX);
    swipe.end();
    swipe.start(touch('pointerdown', 0));
    swipe.move(touch('pointermove', -ROW_SWIPE_SLOP_PX - 1));
    expect(swipe.offset()).toBe(TRAY_PX - ROW_SWIPE_SLOP_PX - 1);
    swipe.move(touch('pointermove', -TRAY_PX));
    swipe.end();
    expect(swipe.open()).toBeNull();
  });

  it('puts an open row back on a tap, but not on a vertical scroll', () => {
    swipe.reveal('trailing', TRAY_PX);
    swipe.start(touch('pointerdown', 0));
    swipe.move(touch('pointermove', 1, 40));
    swipe.end();
    expect(swipe.open()).toBe('trailing');

    swipe.start(touch('pointerdown', 0));
    swipe.end();
    expect(swipe.open()).toBeNull();
    expect(swipe.offset()).toBe(0);
  });

  it('reveals a tray at its width for focus to arrive on', () => {
    swipe.reveal('leading', TRAY_PX);
    expect(swipe.offset()).toBe(TRAY_PX);
    swipe.reveal('trailing', TRAY_PX);
    expect(swipe.offset()).toBe(-TRAY_PX);
  });
});
