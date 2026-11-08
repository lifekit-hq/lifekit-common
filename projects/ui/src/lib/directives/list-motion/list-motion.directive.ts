import {afterNextRender, DestroyRef, Directive, ElementRef, inject, input} from '@angular/core';

import {
  motionDistance,
  motionDurationMs,
  motionEasing,
  prefersReducedMotion,
} from '../../tokens/motion';

/** A page of rows arriving or leaving at once is a screen change, not a row; it is not animated. */
export const LIST_MOTION_MAX_ROWS = 12;

/** Where a row sat at the last layout, relative to its offset parent. */
interface RowBox {
  readonly top: number;
  readonly left: number;
  readonly width: number;
}

/** Where a removed row sat: its parent, and the sibling it preceded. */
interface Exit {
  readonly parent: Node;
  readonly next: Node | null;
}

const GHOST_ATTRIBUTE = 'data-cmn-list-leaving';

/**
 * Moves the rows of a list when they are added, removed or reordered, so a row appearing, going
 * or changing place reads as a change to the list and not as a jump.
 *
 * - **Added** (Carbon's "entrance"): the row fades in while rising `--cmn-motion-distance-sm`,
 *   over `--cmn-duration-medium` on the decelerate curve.
 * - **Removed**: the row stays drawn where it was, inert, and fades out over
 *   `--cmn-duration-short` on the accelerate curve, faster than it arrived; the rows below close up
 *   at once.
 * - **Moved** (a reorder, or the rows below an add or a remove): the row slides from its old place
 *   to its new one over `--cmn-duration-medium` on the standard curve, by transform only.
 *
 * Opacity and transform only, never layout. The first rows are not animated (the list is drawn
 * as it is), nor is a page of more than {@link LIST_MOTION_MAX_ROWS} rows changing at once, nor
 * anything under Reduce Motion. Every length comes from the motion tokens by name.
 *
 * `cmnListMotion` takes the selector of the rows (a row is a child at any depth of the host);
 * `cmn-list-item-row` by default. The host needs no styling of its own.
 */
@Directive({selector: '[cmnListMotion]'})
export class CmnListMotionDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private boxes = new Map<HTMLElement, RowBox>();
  private readonly ghosts = new Set<HTMLElement>();

  /** The rows' selector. */
  public readonly cmnListMotion = input<string>('');

  constructor() {
    afterNextRender(() => this.start());
  }

  private get selector(): string {
    return this.cmnListMotion() || 'cmn-list-item-row';
  }

  private start(): void {
    this.measure();
    const changes = new MutationObserver(records => this.onChanges(records));
    changes.observe(this.host, {childList: true, subtree: true});
    // A row that changes height, or a resize, moves the rows below it without touching the DOM;
    // the next add or remove must start from where they are now.
    const sizes =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());
    sizes?.observe(this.host);
    this.destroyRef.onDestroy(() => {
      changes.disconnect();
      sizes?.disconnect();
      this.ghosts.forEach(ghost => ghost.remove());
      this.ghosts.clear();
    });
  }

  private rows(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(this.selector)).filter(
      row => !row.hasAttribute(GHOST_ATTRIBUTE)
    );
  }

  private box(row: HTMLElement): RowBox {
    return {top: row.offsetTop, left: row.offsetLeft, width: row.offsetWidth};
  }

  private measure(): void {
    this.boxes = new Map(this.rows().map(row => [row, this.box(row)]));
  }

  private onChanges(records: MutationRecord[]): void {
    const before = this.boxes;
    const addedNodes = new Set<HTMLElement>();
    const removedNodes = new Map<HTMLElement, Exit>();
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (this.isRow(node) && !node.hasAttribute(GHOST_ATTRIBUTE)) {
          addedNodes.add(node);
        }
      });
      record.removedNodes.forEach(node => {
        if (this.isRow(node) && !node.hasAttribute(GHOST_ATTRIBUTE)) {
          removedNodes.set(node, {parent: record.target, next: record.nextSibling});
        }
      });
    }
    // A row that is connected again was moved, however often; one that is new and gone again
    // never reached the screen.
    const added = new Set([...addedNodes].filter(row => row.isConnected && !before.has(row)));
    const gone = [...removedNodes].filter(([row]) => !row.isConnected && before.has(row));
    this.measure();
    if (added.size === 0 && gone.length === 0 && this.boxes.size === 0) {
      return;
    }
    if (
      prefersReducedMotion(this.host.ownerDocument.defaultView) ||
      added.size > LIST_MOTION_MAX_ROWS ||
      gone.length > LIST_MOTION_MAX_ROWS
    ) {
      return;
    }
    gone.forEach(([row, exit]) => this.leave(row, exit, before.get(row)));
    this.boxes.forEach((box, row) => {
      if (added.has(row)) {
        this.enter(row);
      } else {
        this.move(row, before.get(row), box);
      }
    });
  }

  private isRow(node: Node): node is HTMLElement {
    return node instanceof HTMLElement && node.matches(this.selector);
  }

  private enter(row: HTMLElement): void {
    row.animate(
      [
        {opacity: 0, transform: `translateY(${motionDistance('sm')})`},
        {opacity: 1, transform: 'none'},
      ],
      {duration: motionDurationMs('medium'), easing: motionEasing('decelerate')}
    );
  }

  private move(row: HTMLElement, from: RowBox | undefined, to: RowBox): void {
    if (!from || (from.left === to.left && from.top === to.top)) {
      return;
    }
    const shift = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    row.animate([{transform: shift}, {transform: 'none'}], {
      duration: motionDurationMs('medium'),
      easing: motionEasing('standard'),
    });
  }

  /** Puts the removed row back where it was, inert, for the length of its exit. */
  private leave(row: HTMLElement, {parent, next}: Exit, box: RowBox | undefined): void {
    if (!box || !parent.isConnected || !(parent instanceof HTMLElement)) {
      return;
    }
    row.setAttribute(GHOST_ATTRIBUTE, '');
    row.setAttribute('inert', '');
    row.setAttribute('aria-hidden', 'true');
    Object.assign(row.style, {
      position: 'absolute',
      top: `${box.top}px`,
      left: `${box.left}px`,
      width: `${box.width}px`,
      pointerEvents: 'none',
    });
    parent.insertBefore(row, next?.parentNode === parent ? next : null);
    this.ghosts.add(row);
    const exit = row.animate([{opacity: 1}, {opacity: 0}], {
      duration: motionDurationMs('short'),
      easing: motionEasing('accelerate'),
      fill: 'forwards',
    });
    const remove = (): void => {
      this.ghosts.delete(row);
      row.remove();
    };
    exit.addEventListener('finish', remove);
    exit.addEventListener('cancel', remove);
  }
}
