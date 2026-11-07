/** Set on a notice that shows and has another showing notice above it: the stylesheet spaces it. */
export const NOTICE_STACKED_ATTRIBUTE = 'data-cmn-notice-stacked';

/**
 * Keeps the group gap between the notices that are showing, and only those. An app projects each
 * notice (offline banner, update prompt, install hint) as its own child of the column, and one that
 * is not showing is a box with no height: a flex `gap` would still count it, so three idle notices
 * would cost the page two gaps. A notice with a height under a notice with a height is marked, and
 * the column spaces the marked ones. Follows a notice that starts or stops showing (a resize) and
 * one that is added or removed.
 *
 * @returns a function that stops following the column
 */
export function stackNotices(column: HTMLElement): () => void {
  const mark = (): void => {
    let showing = false;
    for (const notice of Array.from(column.children)) {
      const shows = notice.getBoundingClientRect().height > 0;
      notice.toggleAttribute(NOTICE_STACKED_ATTRIBUTE, showing && shows);
      showing ||= shows;
    }
  };
  if (typeof ResizeObserver === 'undefined') {
    mark();
    return () => undefined;
  }
  const resizes = new ResizeObserver(mark);
  const watch = (): void => {
    resizes.disconnect();
    for (const notice of Array.from(column.children)) {
      resizes.observe(notice, {box: 'border-box'});
    }
    mark();
  };
  const changes = new MutationObserver(watch);
  changes.observe(column, {childList: true});
  watch();
  return () => {
    resizes.disconnect();
    changes.disconnect();
  };
}
