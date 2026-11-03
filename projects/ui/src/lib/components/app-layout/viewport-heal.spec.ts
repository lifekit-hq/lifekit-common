import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {
  healViewport,
  isTextEntry,
  remeasureFrame,
  VIEWPORT_SHRINK_TOLERANCE_PX,
  viewportShrunk,
} from './viewport-heal';

const FULL_HEIGHT = 874;
const STATUS_BAR = 62;
const PORTRAIT_WIDTH = 402;
const LANDSCAPE_WIDTH = 874;
const LANDSCAPE_HEIGHT = 402;
const SCROLLED = 120;

/** A window whose size the test sets; events and the document are real. */
class FakeView extends EventTarget {
  public innerWidth = PORTRAIT_WIDTH;
  public innerHeight = FULL_HEIGHT;
  public readonly document = document;
  public readonly visualViewport = new EventTarget();

  public resizeTo(width: number, height: number): void {
    this.innerWidth = width;
    this.innerHeight = height;
    this.dispatchEvent(new Event('resize'));
  }

  public resizeVisualTo(height: number): void {
    this.innerHeight = height;
    this.visualViewport.dispatchEvent(new Event('resize'));
  }
}

describe('viewportShrunk', () => {
  it('should call a window shorter by the status bar shrunk', () => {
    expect(viewportShrunk(FULL_HEIGHT - STATUS_BAR, FULL_HEIGHT)).toBe(true);
  });

  it('should not call a window at its tallest shrunk', () => {
    expect(viewportShrunk(FULL_HEIGHT, FULL_HEIGHT)).toBe(false);
  });

  it('should ignore a few px of jitter', () => {
    expect(viewportShrunk(FULL_HEIGHT - VIEWPORT_SHRINK_TOLERANCE_PX, FULL_HEIGHT)).toBe(false);
    expect(viewportShrunk(FULL_HEIGHT - VIEWPORT_SHRINK_TOLERANCE_PX - 1, FULL_HEIGHT)).toBe(true);
  });
});

describe('isTextEntry', () => {
  it('should count text fields, text areas and editable content', () => {
    const search = document.createElement('input');
    search.type = 'search';
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    document.body.append(editable);
    expect(isTextEntry(search)).toBe(true);
    expect(isTextEntry(document.createElement('textarea'))).toBe(true);
    expect(isTextEntry(editable)).toBe(true);
    editable.remove();
  });

  it('should not count controls that bring up no keyboard', () => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    expect(isTextEntry(checkbox)).toBe(false);
    expect(isTextEntry(document.createElement('button'))).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });
});

describe('healViewport', () => {
  let view: FakeView;
  let frame: HTMLElement;
  let scroller: HTMLElement;
  let field: HTMLInputElement;
  let teardown: () => void;

  beforeEach(() => {
    view = new FakeView();
    frame = document.createElement('div');
    scroller = document.createElement('div');
    scroller.style.cssText = 'width: 100px; height: 100px; overflow-y: auto';
    scroller.innerHTML = '<div style="height: 1000px"></div>';
    field = document.createElement('input');
    frame.append(scroller, field);
    document.body.append(frame);
    teardown = healViewport(view as unknown as Window, () => frame);
  });

  afterEach(() => {
    teardown();
    frame.remove();
  });

  /** Counts the frame's hide-and-show flips during a blur of the field. */
  function blurAndCountFlips(): number {
    const watcher = new MutationObserver(() => undefined);
    watcher.observe(frame, {attributes: true, attributeFilter: ['style']});
    field.focus();
    field.blur();
    const pending = watcher.takeRecords().length;
    watcher.disconnect();
    return pending;
  }

  it('should re-measure the frame when the keyboard leaves the window short', () => {
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    expect(blurAndCountFlips()).toBeGreaterThan(0);
    expect(frame.style.display).toBe('');
  });

  it('should leave the frame alone when the window is back to full height', () => {
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT);
    expect(blurAndCountFlips()).toBe(0);
  });

  it('should leave the frame alone while focus moves to another field', () => {
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    const next = document.createElement('textarea');
    frame.append(next);
    const watcher = new MutationObserver(() => undefined);
    watcher.observe(frame, {attributes: true, attributeFilter: ['style']});
    field.focus();
    next.focus();
    expect(watcher.takeRecords()).toHaveLength(0);
    watcher.disconnect();
  });

  it('should start over after a rotation instead of comparing against the other orientation', () => {
    view.resizeTo(LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT);
    expect(blurAndCountFlips()).toBe(0);
  });

  it('should keep the scroller where it was', () => {
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    scroller.scrollTop = SCROLLED;
    blurAndCountFlips();
    expect(scroller.scrollTop).toBe(SCROLLED);
  });

  it('should stop listening on teardown', () => {
    teardown();
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    expect(blurAndCountFlips()).toBe(0);
  });
});

describe('healViewport without a text input', () => {
  let view: FakeView;
  let frame: HTMLElement;
  let scroller: HTMLElement;
  let teardown: () => void;
  let watcher: MutationObserver;

  function flips(): number {
    return watcher.takeRecords().length;
  }

  /** Installs the heal on the view and returns how many frame flips that took. */
  function install(): number {
    watcher.takeRecords();
    teardown = healViewport(view as unknown as Window, () => frame);
    return flips();
  }

  beforeEach(() => {
    view = new FakeView();
    frame = document.createElement('div');
    scroller = document.createElement('div');
    frame.append(scroller);
    document.body.append(frame);
    watcher = new MutationObserver(() => undefined);
    watcher.observe(frame, {attributes: true, attributeFilter: ['style']});
  });

  afterEach(() => {
    teardown();
    watcher.disconnect();
    frame.remove();
  });

  it('should leave a window at its full height alone', () => {
    expect(install()).toBe(0);
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT);
    expect(flips()).toBe(0);
  });

  it('should re-measure on install when the window was shrunk before the shell mounted', () => {
    install();
    teardown();
    // The first shell is gone and the window shrank (a keyboard on a page outside the shell)
    view.innerHeight = FULL_HEIGHT - STATUS_BAR;
    expect(install()).toBeGreaterThan(0);
    expect(frame.style.display).toBe('');
  });

  it('should re-measure once per height when the window resizes short, and again when it grows back', () => {
    install();
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    expect(flips()).toBeGreaterThan(0);
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    expect(flips()).toBe(0);
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT);
    expect(flips()).toBeGreaterThan(0);
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT);
    expect(flips()).toBe(0);
  });

  it('should re-measure when only the visual viewport resizes', () => {
    install();
    view.resizeVisualTo(FULL_HEIGHT - STATUS_BAR);
    expect(flips()).toBeGreaterThan(0);
  });

  it('should wait for the blur while a text input holds the keyboard up', () => {
    install();
    const field = document.createElement('input');
    frame.append(field);
    field.focus();
    watcher.takeRecords();
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    expect(flips()).toBe(0);
    field.blur();
    expect(flips()).toBeGreaterThan(0);
    field.remove();
  });

  it('should start over after a rotation', () => {
    install();
    view.resizeTo(LANDSCAPE_WIDTH, LANDSCAPE_HEIGHT);
    expect(flips()).toBe(0);
  });

  it('should stop listening on teardown', () => {
    install();
    teardown();
    view.resizeTo(PORTRAIT_WIDTH, FULL_HEIGHT - STATUS_BAR);
    view.resizeVisualTo(FULL_HEIGHT - STATUS_BAR - STATUS_BAR);
    expect(flips()).toBe(0);
  });
});

describe('remeasureFrame', () => {
  it('should keep a scroller nested deeper in the frame where it was', () => {
    const frame = document.createElement('div');
    const page = document.createElement('div');
    page.style.cssText = 'width: 100px; height: 100px; overflow: hidden';
    const list = document.createElement('div');
    list.style.cssText = 'width: 100px; height: 100px; overflow-y: auto';
    list.innerHTML = '<div style="height: 1000px"></div>';
    page.append(list);
    frame.append(page);
    document.body.append(frame);
    list.scrollTop = SCROLLED;
    remeasureFrame(frame);
    expect(list.scrollTop).toBe(SCROLLED);
    frame.remove();
  });

  it('should restore the scroll position and the frame display it found', () => {
    const frame = document.createElement('div');
    frame.style.display = 'flex';
    const scroller = document.createElement('div');
    scroller.style.cssText = 'width: 100px; height: 100px; overflow-y: auto';
    scroller.innerHTML = '<div style="height: 1000px"></div>';
    frame.append(scroller);
    document.body.append(frame);
    scroller.scrollTop = SCROLLED;
    remeasureFrame(frame);
    expect(scroller.scrollTop).toBe(SCROLLED);
    expect(frame.style.display).toBe('flex');
    frame.remove();
  });
});
