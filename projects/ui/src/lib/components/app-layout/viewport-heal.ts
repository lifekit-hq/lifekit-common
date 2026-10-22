/**
 * iOS home-screen apps: the first keyboard shrinks the layout viewport by the status-bar height and
 * never gives it back, so the `fixed inset-0` phone frame stops short of the screen's bottom edge.
 * Hiding the frame for one reflow makes WebKit measure the viewport again.
 */

/** Below this the window is taken as its full height: rounding and toolbar jitter, not the bug. */
export const VIEWPORT_SHRINK_TOLERANCE_PX = 4;

const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

/** The window is shorter than the tallest it has been, by more than jitter. */
export function viewportShrunk(current: number, tallest: number): boolean {
  return tallest - current > VIEWPORT_SHRINK_TOLERANCE_PX;
}

/** The element brings up the software keyboard when focused. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(target.type);
  }
  return target instanceof HTMLElement && target.isContentEditable;
}

/** Hides the frame for one synchronous reflow and shows it again, keeping the scroller where it was. */
export function remeasureFrame(frame: HTMLElement, scroller: HTMLElement): void {
  const scrollTop = scroller.scrollTop;
  const display = frame.style.getPropertyValue('display');
  const priority = frame.style.getPropertyPriority('display');
  frame.style.setProperty('display', 'none');
  void frame.offsetHeight;
  if (display) {
    frame.style.setProperty('display', display, priority);
  } else {
    frame.style.removeProperty('display');
  }
  void frame.offsetHeight;
  scroller.scrollTo({top: scrollTop, behavior: 'instant'});
}

/**
 * Tracks the tallest `innerHeight` since load (per window width, so a rotation starts over) and, when
 * a text input blurs while the window is shorter than that, re-measures the frame. Returns the
 * teardown.
 */
export function healViewportOnBlur(
  view: Window,
  frame: () => HTMLElement,
  scroller: () => HTMLElement
): () => void {
  let width = view.innerWidth;
  let tallest = view.innerHeight;
  const track = (): void => {
    if (view.innerWidth !== width) {
      width = view.innerWidth;
      tallest = view.innerHeight;
    }
    tallest = Math.max(tallest, view.innerHeight);
  };
  const heal = (event: FocusEvent): void => {
    track();
    // Focus moving to another field keeps the keyboard up.
    if (!isTextEntry(event.target) || isTextEntry(event.relatedTarget)) {
      return;
    }
    if (viewportShrunk(view.innerHeight, tallest)) {
      remeasureFrame(frame(), scroller());
    }
  };
  view.addEventListener('resize', track, {passive: true});
  view.document.addEventListener('focusout', heal, true);
  return () => {
    view.removeEventListener('resize', track);
    view.document.removeEventListener('focusout', heal, true);
  };
}
