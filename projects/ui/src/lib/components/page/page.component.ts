import {NgTemplateOutlet} from '@angular/common';
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
  type TemplateRef,
  viewChild,
} from '@angular/core';

import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {
  CmnPullRefreshService,
  type CmnReloadHook,
} from '../../services/pull-refresh/pull-refresh.service';
import {PageFrameService} from '../app-layout/page-frame';
import {ButtonComponent} from '../button/button.component';
import {CMN_DRAWER_DATA} from '../drawer/drawer-config';
import {CmnDrawerRef} from '../drawer/drawer-ref';

/**
 * The page archetype a routed screen is built on. Each kind owns the composition: its reading
 * width and the columns content may start on. Every kind has an entry in `PAGE_TEMPLATES`.
 */
export type PageKind = 'list' | 'detail' | 'form' | 'settings' | 'overview' | 'chat';

/** What one kind of page decides: how wide its main column runs, and whether a rail sits beside it. */
interface PageTemplate {
  /** Width classes of the main column, which starts on the page's left edge. */
  readonly column: string;
  /**
   * Width classes of the rail, the second column, for a kind that has one. It holds the blocks the
   * page marks `cmnPageRail`, beside the main column from xl (1280px) up and under it below that;
   * a page that marks none has no rail, and its main column runs the frame's width.
   */
  readonly rail?: string;
  /** The kind is a full-height column whose content takes the remaining height, `fill` or not. */
  readonly fill?: true;
  /**
   * The kind keeps a list of sibling threads (a chat's sessions) in a drawer, opened from a
   * button beside the title; the blocks the page marks `cmnPageSessions` fill it.
   */
  readonly sessions?: true;
}

/**
 * The single-column kinds are one column on the page's left edge; they differ in how wide it
 * reads. The overview is the one multi-column kind.
 *
 * - List (640px): the HIG inset-grouped list. A text field at full column width stays inside the
 *   screen check's stretched-input limit.
 * - Detail (720px): one record read top to bottom, its facts, related rows and actions. A
 *   key-value list's value column needs the extra room more than a row does.
 * - Form (640px): fields at full column width, so no field is wider than the stretched-input limit
 *   and the eye runs down one edge from label to label.
 * - Settings (720px): settings sections, whose heading column sits beside the controls from md up
 *   and still leaves a select or a text field its own width.
 * - Chat (the frame's width): one conversation filling the page, from under the title to the
 *   bottom of the screen. The list of earlier sessions is never a second column: it opens as a
 *   drawer (a bottom sheet on a phone, a side panel from md) from a button beside the title.
 * - Overview (1200px): a dashboard. The main column takes the frame's whole width (the shell's
 *   1200px cap less the gutter), for a card grid or a chart, and a 320px rail of secondary blocks
 *   sits beside it from xl up. Below xl the rail stacks under the main column on the same edge.
 */
export const PAGE_TEMPLATES: Readonly<Record<PageKind, PageTemplate>> = {
  list: {column: 'max-w-[640px]'},
  detail: {column: 'max-w-[720px]'},
  form: {column: 'max-w-[640px]'},
  settings: {column: 'max-w-[720px]'},
  overview: {column: 'xl:min-w-0 xl:flex-1', rail: 'xl:w-[320px] xl:shrink-0'},
  chat: {column: 'min-w-0', fill: true, sessions: true},
};

const HOST_CLASSES = 'block';
// Full-height column: a phone page grows with its content unless it
// holds a `cmn-page-scroll`, which needs the host bounded at every width.
const HOST_FILL_CLASSES = 'flex min-h-full flex-col md:h-full has-[cmn-page-scroll]:h-full';
/**
 * A kind whose content is one surface that fills the screen (a chat) bounds the host on a phone
 * too: its own scroller, not the page, takes the overflow, and its input stays at the bottom.
 */
const HOST_BOUNDED_CLASSES = 'flex h-full min-h-full flex-col';
/** The frame: the shell's 1200px cap with the page gutter inside it, on every side. */
const FRAME_CLASSES = 'mx-auto w-full max-w-[1200px] p-cmn-page-gutter';
const FRAME_FILL_CLASSES = 'flex min-h-0 flex-1 flex-col';
const TITLE_TEXT_CLASSES = 'font-headline text-cmn-3xl break-words font-semibold text-text-primary';
const TITLE_CLASSES = `mb-cmn-title-gap ${TITLE_TEXT_CLASSES}`;
/** A page with a sessions drawer: the title and the button that opens it share one row. */
const TITLE_ROW_CLASSES = 'mb-cmn-title-gap flex items-start justify-between gap-cmn-4';
/** The sessions drawer's width from md up; a phone gets the bottom sheet, which spans the screen. */
const SESSIONS_DRAWER_WIDTH = '360px';
/** Top-level blocks stack a section apart; a tighter pair (a field and its chips) is one block. */
const COLUMN_CLASSES = 'flex w-full flex-col gap-cmn-section-gap';
const COLUMN_FILL_CLASSES = 'min-h-0 flex-1';
/**
 * The main column and the rail: stacked a section apart, side by side from xl up. `cmn-page-columns`
 * names the row for the route scan (`PAGE_COLUMNS_CLASS` in `@lifekit-hq/tokens/screen`), which
 * accepts the template's own rail beside a body that runs on below the fold.
 */
const COLUMNS_CLASSES = 'cmn-page-columns flex flex-col gap-cmn-section-gap xl:flex-row';
/**
 * Beside each other, the columns align at the top and each is as tall as its content. A fill page
 * stretches them to the row instead: the row is bounded to the space below the title, and a
 * column that is only as tall as its content would let a `cmn-page-scroll` in it grow past that
 * space, so `main` would scroll rather than the list.
 */
const COLUMNS_ALIGN_START = 'xl:items-start';
const COLUMNS_ALIGN_STRETCH = 'xl:items-stretch';
/** A rail the page puts nothing in takes no room, so the main column runs the frame's width. */
const RAIL_CLASSES = 'empty:hidden';

/** The sessions drawer's body: the page's `cmnPageSessions` blocks, projected into the overlay. */
@Component({
  selector: 'cmn-page-sessions',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-container [ngTemplateOutlet]="sessions" />',
})
export class PageSessionsComponent {
  protected readonly sessions = inject<TemplateRef<unknown>>(CMN_DRAWER_DATA);
}

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
 * `kind` picks the template (`PAGE_TEMPLATES`), `list` by default:
 *
 * - `list`: rows grouped in `cmn-list-section`s under an add field or a filter (640px). Body copy
 *   in any kind (an intro, a disclaimer) goes in `cmn-prose`, which caps its line length.
 * - `detail`: one record: its status, its facts in a `cmn-description-list`, related rows, then its
 *   own actions; Edit and the back chevron (the route's `parent`) live in the top bar (720px).
 * - `form`: a new or edited record. Make the `<form>` `display: contents` (`class="contents"`) so
 *   each field is a top-level block and the template sets the rhythm between them; fields run the
 *   full width, one under another, and the actions close the column (640px).
 * - `settings`: `cmn-settings-section`s in the standard order, then the danger zone and Sign out;
 *   each section draws its divider a section gap below its content (720px).
 * - `overview`: a dashboard: a card grid or a chart in the main column, which runs the frame's width
 *   (1200px less the gutter), and secondary blocks marked `cmnPageRail` (a plain attribute on each
 *   top-level block) in a 320px rail beside it from xl up, under it below xl. Only a kind with a
 *   rail draws `cmnPageRail` blocks.
 * - `chat`: one conversation (`cmn-chat`, `class="min-h-0 flex-1"`) filling the page under the
 *   title; the page is a fill page. The sessions list is the blocks marked `cmnPageSessions`: they
 *   are not drawn in the page but in a drawer, which a "Sessions" button beside the title opens
 *   (`sessionsLabel` names it), so no second panel ever sits on the left. A block that picks a
 *   session calls `closeSessions()` (`<cmn-page #page>`, `exportAs: 'cmnPage'`).
 *
 * `reload` makes a tab root pull to refresh (Apple HIG, Refreshing content): hand it the function
 * that fetches the page's data again, usually a store method (`[reload]="store.load"`), and the
 * shell's pull gesture calls it and keeps its indicator up while it runs. `reloading` is the
 * store's busy flag (`store.isLoading()`): the indicator then stays until it clears, which a
 * method that returns nothing cannot say itself. Only a tab root pulls; the page on a pushed
 * screen has no gesture to wire.
 *
 * Each kind has golden screens in Storybook (Templates/List, Detail, Form, Settings, Overview and
 * Chat).
 *
 * `fill` makes it a full-height column whose content can take the remaining height (a
 * `cmn-page-scroll` list), as a fill page does. On an overview that holds from xl up
 * too, where the main column and the rail stretch to the row's height.
 *
 * The host carries `data-cmn-page="<kind>"`, the main column `data-cmn-page-column` and the rail
 * `data-cmn-page-column="rail"`, which the screen check (`@lifekit-hq/tokens/screen`) reads to know
 * the columns content may start on.
 */
@Component({
  selector: 'cmn-page',
  exportAs: 'cmnPage',
  imports: [ButtonComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-cmn-page]': 'kind()',
    // The shell bounds its page frame to the space below the title when a fill page is showing
    '[attr.data-cmn-fill]': 'filled() ? "" : null',
  },
  template: `
    <div [class]="frameClasses()">
      @if (hasSessions()) {
        <div [class]="titleRowClasses" data-cmn-page-title-row>
          @if (titleText(); as text) {
            <h1 #title [class]="titleTextClasses" data-cmn-page-title>{{ text }}</h1>
          }
          <cmn-button
            (clicked)="openSessions()"
            class="ml-auto shrink-0"
            icon="History"
            size="sm"
            variant="secondary"
            >{{ sessionsLabel() }}</cmn-button
          >
        </div>
      } @else if (titleText(); as text) {
        <h1 #title [class]="titleClasses" data-cmn-page-title>{{ text }}</h1>
      }
      @if (hasRail()) {
        <div [class]="columnsClasses()">
          <div [class]="columnClasses()" data-cmn-page-column>
            <ng-container [ngTemplateOutlet]="main" />
          </div>
          <div [class]="railClasses()" data-cmn-page-column="rail">
            <ng-content select="[cmnPageRail]" />
          </div>
        </div>
      } @else {
        <div [class]="columnClasses()" data-cmn-page-column>
          <ng-container [ngTemplateOutlet]="main" />
        </div>
      }
    </div>
    <ng-template #main><ng-content /></ng-template>
    <ng-template #sessions><ng-content select="[cmnPageSessions]" /></ng-template>
  `,
})
export class PageComponent {
  private readonly frame = inject(PageFrameService, {optional: true});
  private readonly drawer = inject(CmnDrawerService);
  private sessionsRef: CmnDrawerRef | null = null;
  private readonly sessionsTemplate = viewChild<TemplateRef<unknown>>('sessions');
  private readonly titleRef = viewChild<ElementRef<HTMLElement>>('title');
  private readonly template = computed(() => PAGE_TEMPLATES[this.kind()]);

  public readonly kind = input<PageKind>('list');
  /** The large title when the route declares none in its data (or outside `cmn-app-layout`). */
  public readonly title = input<string>('');
  public readonly fill = input(false, {transform: booleanAttribute});
  /** Names the button that opens the sessions drawer, and the drawer, on a kind that has one. */
  public readonly sessionsLabel = input<string>('Sessions');
  /** Reloads the page's data when a tab root is pulled down (see above). */
  public readonly reload = input<CmnReloadHook | undefined>(undefined);
  /** The reload is still running; the pull's indicator stays up while it is. */
  public readonly reloading = input(false, {transform: booleanAttribute});

  protected readonly titleClasses = TITLE_CLASSES;
  protected readonly titleTextClasses = TITLE_TEXT_CLASSES;
  protected readonly titleRowClasses = TITLE_ROW_CLASSES;

  /** The route's title wins, so the top bar and the page always show the same one. */
  protected readonly titleText = computed(() => this.frame?.routeTitle() || this.title());

  protected readonly filled = computed(() => this.fill() || !!this.template().fill);

  protected readonly hasSessions = computed(() => !!this.template().sessions);

  protected readonly hostClasses = computed(() => {
    if (this.template().fill) {
      return HOST_BOUNDED_CLASSES;
    }
    return this.fill() ? HOST_FILL_CLASSES : HOST_CLASSES;
  });

  protected readonly frameClasses = computed(() =>
    this.filled() ? `${FRAME_CLASSES} ${FRAME_FILL_CLASSES}` : FRAME_CLASSES
  );

  protected readonly hasRail = computed(() => !!this.template().rail);

  protected readonly columnClasses = computed(() =>
    [COLUMN_CLASSES, this.template().column, this.filled() ? COLUMN_FILL_CLASSES : '']
      .filter(Boolean)
      .join(' ')
  );

  protected readonly columnsClasses = computed(() =>
    this.filled()
      ? `${COLUMNS_CLASSES} ${COLUMNS_ALIGN_STRETCH} ${COLUMN_FILL_CLASSES}`
      : `${COLUMNS_CLASSES} ${COLUMNS_ALIGN_START}`
  );

  protected readonly railClasses = computed(
    () => `${COLUMN_CLASSES} ${RAIL_CLASSES} ${this.template().rail}`
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.closeSessions());
    const pullRefresh = inject(CmnPullRefreshService);
    effect(onCleanup => {
      const reload = this.reload();
      if (reload) {
        onCleanup(pullRefresh.register(reload, {busy: this.reloading}));
      }
    });
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

  /** Opens the sessions list in a drawer: a bottom sheet on a phone, a side panel from md. */
  public openSessions(): void {
    const template = this.sessionsTemplate();
    if (!template || this.sessionsRef) {
      return;
    }
    const ref = this.drawer.open(PageSessionsComponent, {
      title: this.sessionsLabel(),
      data: template,
      width: SESSIONS_DRAWER_WIDTH,
    });
    this.sessionsRef = ref;
    ref.afterClosed().subscribe(() => {
      this.sessionsRef = null;
    });
  }

  /** Closes the sessions drawer, as a block does once it has switched to the session picked. */
  public closeSessions(): void {
    this.sessionsRef?.close();
  }
}
