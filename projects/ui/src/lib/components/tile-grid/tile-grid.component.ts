import {BreakpointObserver} from '@angular/cdk/layout';
import {NgTemplateOutlet} from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {map} from 'rxjs';

import {CMN_MEDIA_MD} from '../../tokens/breakpoints';
import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {canAnimate, motionDistance, motionDurationMs, motionEasing} from '../../tokens/motion';
import {IconComponent} from '../icon/icon.component';
import {TilePanelDirective} from './tile-panel.directive';

/** One fact: a small muted label over one bold headline value. */
export interface CmnTile {
  /** Stable key; also what the URL fragment carries, so it must be URL-safe. */
  readonly id: string;
  readonly label: string;
  readonly headline: string;
}

const COLUMNS_PHONE = 2;
const COLUMNS_WIDE = 3;

let gridCounter = 0;

const TILE_CLASSES =
  'flex min-h-cmn-size-lg w-full cursor-pointer flex-col items-start gap-cmn-1 rounded-cmn-role-surface ' +
  'border border-cmn-card-border shadow-cmn-card p-cmn-4 text-left transition-colors duration-cmn-short ' +
  'ease-cmn-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ' +
  'focus-visible:ring-border-focus';
const TILE_CLOSED_CLASSES = 'bg-surface-card hover:bg-surface-hover';
const TILE_OPEN_CLASSES = 'bg-accent-subtle';
const LABEL_CLASSES = 'font-label text-cmn-xs font-semibold';
const CLOSE_CLASSES =
  '-mr-cmn-2 -mt-cmn-1 inline-flex h-cmn-size-sm w-cmn-size-sm shrink-0 cursor-pointer ' +
  'items-center justify-center rounded-cmn-role-control text-text-secondary transition-colors ' +
  'duration-cmn-short ease-cmn-standard hover:bg-surface-hover focus:outline-none ' +
  `focus-visible:ring-2 focus-visible:ring-border-focus ${PHONE_HIT_AREA_CLASSES}`;

/**
 * A grid of one-line fact tiles that share one panel. Each tile is a button; pressing one opens
 * the panel full width directly under the row that tile sits in, and pressing another moves it
 * (exclusive, so at most one is open). The open tile takes the accent fill and an accent label;
 * the panel repeats the tile's label and headline in its header, beside a close button. The panel
 * is a filled region (`surface-raised`) with no border, so the charts and cards it holds are not
 * a surface inside a surface.
 *
 * This is the one disclosure pattern for a detail view (docs: DESIGN.md, Tile grid). The panel is
 * capped on purpose: the summary first, then the evidence, at most three charts, and a link out
 * for anything more. Three columns from `md`, two on a phone, panel full width on both.
 *
 * Keyboard and screen readers: every tile carries `aria-expanded` (and `aria-controls` while
 * open); opening moves focus into the panel, which is a labelled region; Escape or the close
 * button closes it and returns focus to the tile that opened it.
 *
 * The panel arrives like the expandable row's content: it fades in while rising
 * `--cmn-motion-distance-sm` and fades out faster before it leaves the layout; at once under
 * Reduce Motion.
 */
@Component({
  selector: 'cmn-tile-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet],
  host: {class: 'block', '(keydown.escape)': 'onEscape($event)'},
  template: `
    <div
      [attr.aria-label]="ariaLabel()"
      [attr.role]="ariaLabel() ? 'group' : null"
      class="grid grid-cols-2 gap-cmn-group-gap md:grid-cols-3"
    >
      @for (tile of tiles(); track tile.id; let index = $index) {
        <button
          [id]="tileDomId(tile.id)"
          [attr.aria-expanded]="open() === tile.id"
          [attr.aria-controls]="open() === tile.id ? panelId : null"
          [class]="tileClasses(open() === tile.id)"
          (click)="toggle(tile.id)"
          type="button"
        >
          <span [class]="labelClasses(open() === tile.id)">{{ tile.label }}</span>
          <span class="break-words text-cmn-lg font-semibold tabular-nums text-text-primary">
            {{ tile.headline }}
          </span>
        </button>
        @if (panelAfter() === index) {
          <section
            #panel
            [id]="panelId"
            [attr.aria-labelledby]="headingId"
            [attr.inert]="open() ? null : ''"
            class="col-span-full flex flex-col gap-cmn-3 bg-surface-raised p-cmn-4 focus:outline-none"
            role="region"
            tabindex="-1"
          >
            <header class="flex items-start justify-between gap-cmn-3">
              <!-- One heading holds both lines, so its name reads "Premium £524.20" and the screen
                   check sees the 16px above it, not the 4px between its own lines. -->
              <h2 [id]="headingId" class="flex min-w-0 flex-col gap-cmn-1">
                <span [class]="labelClasses(false)">{{ shown()!.label }}</span>
                <span class="break-words text-cmn-lg font-semibold tabular-nums text-text-primary">
                  {{ shown()!.headline }}
                </span>
              </h2>
              <button
                [class]="closeClasses"
                [attr.aria-label]="'Close ' + shown()!.label"
                (click)="close()"
                type="button"
              >
                <cmn-icon name="X" size="sm" aria-hidden="true" />
              </button>
            </header>
            @if (shownPanel(); as panelDirective) {
              <ng-container
                *ngTemplateOutlet="panelDirective.template; context: {$implicit: shown()!}"
              />
            }
          </section>
        }
      }
    </div>
  `,
})
export class TileGridComponent {
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router, {optional: true});
  private readonly route = inject(ActivatedRoute, {optional: true});
  private readonly panelEl = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly panels = contentChildren(TilePanelDirective);
  private readonly wide = toSignal(
    this.breakpoints.observe(CMN_MEDIA_MD).pipe(map(state => state.matches)),
    {initialValue: this.breakpoints.isMatched(CMN_MEDIA_MD)}
  );
  private readonly fragment = this.route
    ? toSignal(this.route.fragment, {initialValue: this.route.snapshot.fragment})
    : signal<string | null>(null);
  private readonly uid = ++gridCounter;
  /** The tile the panel is drawn for: the open one, or the one that just closed while it fades out. */
  private readonly shownId = signal<string | null>(null);
  private running: Animation | null = null;
  private interacted = false;
  private focusPanelOnOpen = false;

  /** The open id, if a tile has it. */
  private readonly active = computed(() => {
    const id = this.open();
    return this.tiles().some(tile => tile.id === id) ? id : null;
  });
  /** The fragment, if a tile has it. */
  private readonly fragmentTile = computed(() => {
    const id = this.fragment();
    return this.tiles().some(tile => tile.id === id) ? id : null;
  });

  public readonly tiles = input.required<readonly CmnTile[]>();
  /** The `id` of the open tile, or null when none is. Two-way: `[(open)]`. */
  public readonly open = model<string | null>(null);
  /**
   * Carries the open tile in the URL fragment (`#premium`), so a detail view is linkable. The
   * fragment is then the truth: it wins over `open` on load and on every navigation, and closing
   * clears it. Needs the router; without one the grid works as if this were off.
   */
  public readonly linkable = input<boolean>(false);
  /** Names the tiles as a group for assistive technology. */
  public readonly ariaLabel = input<string | null>(null);

  protected readonly panelId = `cmn-tile-grid-${this.uid}-panel`;
  protected readonly headingId = `cmn-tile-grid-${this.uid}-heading`;
  protected readonly closeClasses = CLOSE_CLASSES;
  protected readonly shown = computed(
    () => this.tiles().find(tile => tile.id === this.shownId()) ?? null
  );
  protected readonly shownPanel = computed(
    () => this.panels().find(panel => panel.tileId() === this.shownId()) ?? null
  );
  /** The index of the last tile in the shown tile's row: the panel is drawn right after it. */
  protected readonly panelAfter = computed(() => {
    const tiles = this.tiles();
    const index = tiles.findIndex(tile => tile.id === this.shownId());
    if (index < 0) {
      return -1;
    }
    const columns = this.wide() ? COLUMNS_WIDE : COLUMNS_PHONE;
    return Math.min((Math.floor(index / columns) + 1) * columns, tiles.length) - 1;
  });

  constructor() {
    effect(() => {
      const id = this.active();
      untracked(() => this.present(id));
    });
    effect(() => {
      const id = this.fragmentTile();
      if (this.linkable() && this.hasRouter()) {
        untracked(() => {
          if (id !== this.open()) {
            this.open.set(id);
          }
        });
      }
    });
  }

  protected tileDomId(id: string): string {
    return `cmn-tile-grid-${this.uid}-tile-${id}`;
  }

  protected tileClasses(open: boolean): string {
    return `${TILE_CLASSES} ${open ? TILE_OPEN_CLASSES : TILE_CLOSED_CLASSES}`;
  }

  protected labelClasses(open: boolean): string {
    return `${LABEL_CLASSES} ${open ? 'text-accent-default' : 'text-text-secondary'}`;
  }

  protected toggle(id: string): void {
    this.interacted = true;
    const next = this.open() === id ? null : id;
    this.focusPanelOnOpen = next !== null;
    this.commit(next);
  }

  /** Closes the panel and puts focus back on the tile that opened it. */
  protected close(): void {
    const id = this.open();
    if (id === null) {
      return;
    }
    this.interacted = true;
    this.focusPanelOnOpen = false;
    this.commit(null);
    this.host.nativeElement
      .querySelector<HTMLElement>(`#${CSS.escape(this.tileDomId(id))}`)
      ?.focus();
  }

  protected onEscape(event: Event): void {
    if (this.open() !== null) {
      event.stopPropagation();
      this.close();
    }
  }

  private hasRouter(): boolean {
    return this.router !== null && this.route !== null;
  }

  private commit(next: string | null): void {
    this.open.set(next);
    if (this.linkable() && this.router && this.route && this.fragmentTile() !== next) {
      void this.router.navigate([], {
        relativeTo: this.route,
        fragment: next ?? undefined,
        queryParamsHandling: 'preserve',
        replaceUrl: true,
      });
    }
  }

  /** Brings the panel to `id` (or takes it away when null), with the motion of an expanding row. */
  private present(id: string | null): void {
    this.running?.cancel();
    this.running = null;
    if (id !== null) {
      this.shownId.set(id);
      if (this.interacted || this.focusPanelOnOpen) {
        afterNextRender(() => this.arrive(), {injector: this.injector});
      }
      return;
    }
    const panel = this.panelEl()?.nativeElement;
    if (!panel || !this.interacted || !canAnimate(panel)) {
      this.shownId.set(null);
      return;
    }
    const exit = panel.animate([{opacity: 1}, {opacity: 0}], {
      duration: motionDurationMs('short'),
      easing: motionEasing('accelerate'),
    });
    this.running = exit;
    // A cancel (a newer open taking over) rejects, and that open has set `shownId` itself.
    exit.finished.then(
      () => this.shownId.set(null),
      () => undefined
    );
  }

  private arrive(): void {
    const panel = this.panelEl()?.nativeElement;
    if (!panel) {
      return;
    }
    if (this.focusPanelOnOpen) {
      this.focusPanelOnOpen = false;
      panel.focus();
    }
    if (canAnimate(panel)) {
      this.running = panel.animate(
        [
          {opacity: 0, transform: `translateY(${motionDistance('sm')})`},
          {opacity: 1, transform: 'none'},
        ],
        {duration: motionDurationMs('medium'), easing: motionEasing('decelerate')}
      );
    }
  }
}
