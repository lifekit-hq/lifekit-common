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

/** The tallest `innerHeight` a window has had at its current width. */
interface HighWaterMark {
  width: number;
  tallest: number;
}

/**
 * One mark per window, started when this module first loads rather than when a shell mounts: text
 * entry that happens before the shell does (a sign-in page) may already have left the window short,
 * and a mark taken at mount would take that short height as the full one.
 */
const marks = new WeakMap<Window, HighWaterMark>();

function markOf(view: Window): HighWaterMark {
  let mark = marks.get(view);
  if (!mark) {
    mark = {width: view.innerWidth, tallest: view.innerHeight};
    marks.set(view, mark);
  }
  return mark;
}

if (typeof window !== 'undefined') {
  markOf(window);
}

/** Folds the window's current size into its mark (per width, so a rotation starts over). */
function track(view: Window): HighWaterMark {
  const mark = markOf(view);
  if (view.innerWidth !== mark.width) {
    mark.width = view.innerWidth;
    mark.tallest = view.innerHeight;
  }
  mark.tallest = Math.max(mark.tallest, view.innerHeight);
  return mark;
}

/**
 * Keeps the frame as tall as the window can be. Re-measures it when the window is shorter than the
 * tallest it has been since load (per window width, so a rotation starts over): once on install,
 * when a text input blurs, and when the window or visual viewport resizes with no text input
 * focused (once per height, and once more when it grows back). Returns the teardown.
 */
export function healViewport(
  view: Window,
  frame: () => HTMLElement,
  scroller: () => HTMLElement
): () => void {
  /** The window height the frame was last re-measured at, while the window is short. */
  let healedAt: number | undefined;
  const remeasure = (): void => remeasureFrame(frame(), scroller());
  const heal = (event: FocusEvent): void => {
    const mark = track(view);
    // Focus moving to another field keeps the keyboard up.
    if (!isTextEntry(event.target) || isTextEntry(event.relatedTarget)) {
      return;
    }
    if (viewportShrunk(view.innerHeight, mark.tallest)) {
      healedAt = view.innerHeight;
      remeasure();
    }
  };
  const settle = (): void => {
    const mark = track(view);
    // The keyboard is up, so the short window is expected: the blur heals it.
    if (isTextEntry(view.document.activeElement)) {
      return;
    }
    if (viewportShrunk(view.innerHeight, mark.tallest)) {
      if (healedAt !== view.innerHeight) {
        healedAt = view.innerHeight;
        remeasure();
      }
    } else if (healedAt !== undefined) {
      healedAt = undefined;
      remeasure();
    }
  };
  settle();
  const visual = view.visualViewport;
  view.addEventListener('resize', settle, {passive: true});
  visual?.addEventListener('resize', settle, {passive: true});
  view.document.addEventListener('focusout', heal, true);
  return () => {
    view.removeEventListener('resize', settle);
    visual?.removeEventListener('resize', settle);
    view.document.removeEventListener('focusout', heal, true);
  };
}
