import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

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

const PROSE_CLASSES = `block ${PROSE_MEASURE} text-text-secondary text-pretty break-words`;
/** The type size sets the line, and the measure above follows it because `ch` is the copy's own. */
const PROSE_SIZE_CLASSES = {sm: 'text-cmn-sm', xs: 'text-cmn-xs leading-relaxed'} as const;

/** `sm` is body copy; `xs` is the small print of a card or a tile (assumptions, a caveat). */
export type ProseSize = keyof typeof PROSE_SIZE_CLASSES;
/** Paragraphs of one passage sit a line apart; a page's section gap is for separate blocks. */
const PARAGRAPH_GAP = '[&>p+p]:mt-cmn-3';

/**
 * Body copy inside a page: an intro under the title, a disclaimer, a paragraph that explains a list.
 * It owns the text measure so a long paragraph reads inside the line-length limit in any page kind
 * and any column width, without a width class in the app. Copy that is part of a component (an
 * empty state's message, a field's hint) already sits in that component's own cap.
 *
 * It also reads inside a card or a tile of a wide page (an overview's assumptions note): there the
 * column is the frame's full width, so a bare paragraph runs past the line-length limit. Set `size`
 * to `xs` for small print; the measure follows the type size, so no width class is needed.
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
    '[class]': 'hostClasses()',
  },
  template: '<ng-content />',
})
export class ProseComponent {
  public readonly size = input<ProseSize>('sm');

  protected readonly hostClasses = computed(
    () => `${PROSE_CLASSES} ${PROSE_SIZE_CLASSES[this.size()]} ${PARAGRAPH_GAP}`
  );
}
