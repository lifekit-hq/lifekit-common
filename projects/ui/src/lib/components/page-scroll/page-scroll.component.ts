import {ChangeDetectionStrategy, Component, input} from '@angular/core';

/**
 * Takes the height `cmn-page-container fill` has left and scrolls its content inside it, so a
 * list page scrolls the list and nothing else: not `main`, not the page. The shell bounds the
 * page to the space below the title, the container passes that on, and this region is the one
 * scroller. Sticky section headings inside it stick to its top edge, which is already clear of the
 * top bar and notices (`--cmn-sticky-top` is reset to 0px).
 *
 * Keyboard users reach it with Tab and scroll it with the arrow keys; pass `label` to name it as
 * a region for screen readers.
 */
@Component({
  selector: 'cmn-page-scroll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [--cmn-sticky-top:0px] ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus',
    tabindex: '0',
    '[attr.role]': 'label() ? "region" : null',
    '[attr.aria-label]': 'label() || null',
  },
  template: '<ng-content />',
})
export class PageScrollComponent {
  /** Accessible name of the scrolling region. */
  public readonly label = input<string>('');
}
