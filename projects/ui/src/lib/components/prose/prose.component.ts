import {ChangeDetectionStrategy, Component} from '@angular/core';

/**
 * The longest a line of body copy runs, in `ch` (the width of a "0" in the copy's own font and
 * size, so the cap follows the text size instead of a fixed width).
 *
 * Plex Sans sets about 1.5 characters per `ch`, so 56ch wraps body copy at 70 to 78 characters,
 * inside the screen check's `line-length` aim of under 80. The browser default of 65ch
 * (`max-w-prose`) wraps the same copy at 82 to 86 and fails it, and a page column
 * (640px at `text-cmn-sm`) leaves it at about 95.
 */
const PROSE_MEASURE = 'max-w-[56ch]';

const PROSE_CLASSES = `block ${PROSE_MEASURE} text-cmn-sm text-text-secondary text-pretty break-words`;
/** Paragraphs of one passage sit a line apart; a page's section gap is for separate blocks. */
const PARAGRAPH_GAP = '[&>p+p]:mt-cmn-3';

/**
 * Body copy inside a page: an intro under the title, a disclaimer, a paragraph that explains a list.
 * It owns the text measure so a long paragraph reads inside the line-length limit in any page kind
 * and any column width, without a width class in the app. Copy that is part of a component (an
 * empty state's message, a field's hint) already sits in that component's own cap.
 *
 * Put the text straight in, or one `<p>` per paragraph. It is a top-level block of the page like
 * any other, so `cmn-page` sets the gap around it.
 *
 * ```html
 * <cmn-page>
 *   <cmn-prose>Ledger proposes, you decide. Finance Sentry never trades.</cmn-prose>
 *   <cmn-list-section heading="Pending">…</cmn-list-section>
 * </cmn-page>
 * ```
 */
@Component({
  selector: 'cmn-prose',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses',
  },
  template: '<ng-content />',
})
export class ProseComponent {
  protected readonly hostClasses = `${PROSE_CLASSES} ${PARAGRAPH_GAP}`;
}
