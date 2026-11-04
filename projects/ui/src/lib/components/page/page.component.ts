import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

import {PageFrameService} from '../app-layout/page-frame';

/**
 * The page archetype a routed screen is built on. Each kind owns the composition: its reading
 * width and the columns content may start on. `list` is the first; `detail`, `form`, `settings`
 * and `overview` join this union, each with its own entry in `PAGE_TEMPLATES`, as they are designed
 * and approved.
 */
export type PageKind = 'list';

/** What one kind of page decides: how wide its single reading column runs. */
interface PageTemplate {
  /** Width classes of the content column, which starts on the page's left edge. */
  readonly column: string;
}

/**
 * List: one column at a reading width (640px), the HIG inset-grouped list. A text field at full
 * column width stays inside the screen check's stretched-input limit.
 */
export const PAGE_TEMPLATES: Readonly<Record<PageKind, PageTemplate>> = {
  list: {column: 'max-w-[640px]'},
};

const HOST_CLASSES = 'block';
// Full-height column, as `cmn-page-container fill`: a phone page grows with its content unless it
// holds a `cmn-page-scroll`, which needs the host bounded at every width.
const HOST_FILL_CLASSES = 'flex min-h-full flex-col md:h-full has-[cmn-page-scroll]:h-full';
/** The frame: the shell's 1200px cap with the page gutter inside it, on every side. */
const FRAME_CLASSES = 'mx-auto w-full max-w-[1200px] p-cmn-page-gutter';
const FRAME_FILL_CLASSES = 'flex min-h-0 flex-1 flex-col';
const TITLE_CLASSES =
  'mb-cmn-title-gap font-headline text-cmn-3xl break-words font-semibold text-text-primary';
/** Top-level blocks stack a section apart; a tighter pair (a field and its chips) is one block. */
const COLUMN_CLASSES = 'flex w-full flex-col gap-cmn-section-gap';
const COLUMN_FILL_CLASSES = 'min-h-0 flex-1';

/**
 * The page template: the root of every routed page. It owns what no part can: the gutter (16px on a
 * phone, 32px from md), the reading width, the large title on the page's one left edge with the
 * title gap under it, and the section rhythm between top-level blocks (`--cmn-*` page rhythm
 * tokens). The page sets no padding, margin or width of its own; it projects its blocks.
 *
 * Inside `cmn-app-layout` the title is the one the route declares (`data.title`): the page draws it
 * and the shell, which would otherwise draw it above the page, steps aside but still collapses it
 * into the top bar on scroll. `title` names a page whose route declares none.
 *
 * `fill` makes it a full-height column whose content can take the remaining height (a
 * `cmn-page-scroll` list), as `cmn-page-container fill` does.
 *
 * The host carries `data-cmn-page="<kind>"` and the content column `data-cmn-page-column`, which
 * the screen check (`@lifekit-hq/tokens/screen`) reads to know the columns content may start on.
 */
@Component({
  selector: 'cmn-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-cmn-page]': 'kind()',
    // The shell bounds its page frame to the space below the title when a fill page is showing
    '[attr.data-cmn-fill]': 'fill() ? "" : null',
  },
  template: `
    <div [class]="frameClasses()">
      @if (titleText(); as text) {
        <h1 #title [class]="titleClasses" data-cmn-page-title>{{ text }}</h1>
      }
      <div [class]="columnClasses()" data-cmn-page-column><ng-content /></div>
    </div>
  `,
})
export class PageComponent {
  private readonly frame = inject(PageFrameService, {optional: true});
  private readonly titleRef = viewChild<ElementRef<HTMLElement>>('title');

  public readonly kind = input<PageKind>('list');
  /** The large title when the route declares none in its data (or outside `cmn-app-layout`). */
  public readonly title = input<string>('');
  public readonly fill = input(false, {transform: booleanAttribute});

  protected readonly titleClasses = TITLE_CLASSES;

  /** The route's title wins, so the top bar and the page always show the same one. */
  protected readonly titleText = computed(() => this.frame?.routeTitle() || this.title());

  protected readonly hostClasses = computed(() => (this.fill() ? HOST_FILL_CLASSES : HOST_CLASSES));

  protected readonly frameClasses = computed(() =>
    this.fill() ? `${FRAME_CLASSES} ${FRAME_FILL_CLASSES}` : FRAME_CLASSES
  );

  protected readonly columnClasses = computed(() =>
    [COLUMN_CLASSES, PAGE_TEMPLATES[this.kind()].column, this.fill() ? COLUMN_FILL_CLASSES : '']
      .filter(Boolean)
      .join(' ')
  );

  constructor() {
    const frame = this.frame;
    if (!frame) {
      return;
    }
    // Claimed at creation, before the shell renders the route, so its own title never flashes.
    frame.claim();
    effect(onCleanup => {
      const element = this.titleRef()?.nativeElement ?? null;
      if (!element) {
        return;
      }
      frame.setTitle(element, this.title());
      onCleanup(() => frame.clearTitle(element));
    });
    inject(DestroyRef).onDestroy(() => frame.release());
  }
}
