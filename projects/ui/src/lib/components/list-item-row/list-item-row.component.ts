import {DOCUMENT, NgTemplateOutlet} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import {type Nullable} from '../../types';
import {IconComponent, type LucideIconName} from '../icon/icon.component';
import {RowSwipe, type RowSwipeSide} from './row-swipe';

/** What a revealed action looks like: a fill that names its weight, never a new palette. */
export type CmnRowSwipeTone = 'neutral' | 'positive' | 'danger';

/**
 * One action a row reveals under a swipe: Apple HIG puts the affirmative one on the leading edge
 * (tick, mark read) and the destructive one on the trailing edge (delete, dismiss).
 */
export interface CmnRowSwipeAction {
  /** The word under the icon; it also names the action for assistive tech, with the row's label. */
  label: string;
  icon: LucideIconName;
  tone?: CmnRowSwipeTone;
}

/**
 * The hairline divider sits on the host, so `last:` matches the last row among its siblings. On the
 * row element inside, which is always its host's only child, it never drew.
 */
const HOST_CLASSES = 'block border-b border-border-default last:border-b-0';

/**
 * Carbon's contained-list item: at least the 48px layout step tall, hairline dividers, and a
 * hover or press fill only when the row is pressable (`ACTION_ROW_CLASSES`): a row that only
 * shows data does not answer the pointer.
 */
const ROW_CLASSES =
  'flex min-h-cmn-size-lg items-center gap-cmn-3 px-cmn-4 py-cmn-3 transition-colors ' +
  'duration-cmn-short ease-cmn-standard';

const ACTION_ROW_CLASSES =
  'w-full cursor-pointer text-left hover:bg-surface-hover active:bg-surface-raised ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ' +
  'focus-visible:ring-border-focus';

/**
 * The quiet trailing action: an icon-only, borderless button at the touch size, in the secondary
 * text colour. Its negative block margin keeps the row as tall as its text; a bordered text button
 * repeated on every row is the noise the screen check reports (C9).
 */
const TRAILING_CLASSES =
  '-my-cmn-2 inline-flex size-cmn-touch shrink-0 items-center justify-center rounded-cmn-md ' +
  'text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';
/** In a plain row the action's glyph lines up with the row's end padding, not the hit area's. */
const TRAILING_IN_ROW_CLASSES = '-mr-cmn-2';
/** An action row is one button, so the trailing action sits beside it in a wrapper. */
const ACTION_WRAPPER_CLASSES = 'flex items-center pr-cmn-2';

/**
 * The swipe frame clips the trays; the surface is the row itself, opaque so a closed tray never
 * shows through, and `touch-pan-y` leaves vertical panning to the page. It slides on the medium
 * step and snaps for a reader who asked for reduced motion.
 */
const SWIPE_FRAME_CLASSES = 'relative overflow-hidden';
const SWIPE_SURFACE_CLASSES = 'relative touch-pan-y bg-surface-card';
const SWIPE_SLIDE_CLASSES =
  ' transition-transform duration-cmn-medium ease-cmn-standard motion-reduce:transition-none';
const SWIPE_TRAY_CLASSES = 'absolute inset-y-0 flex';
const SWIPE_ACTION_CLASSES =
  'flex min-w-cmn-size-lg flex-col items-center justify-center gap-cmn-1 px-cmn-4 ' +
  'text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ' +
  'focus-visible:ring-text-inverse';
const SWIPE_TONE_CLASSES: Record<CmnRowSwipeTone, string> = {
  neutral: 'bg-accent-default',
  positive: 'bg-status-success',
  danger: 'bg-status-error',
};

@Component({
  selector: 'cmn-list-item-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet],
  host: {class: HOST_CLASSES, '(keydown.escape)': 'shut()'},
  template: `
    <!-- The content is written once and stamped into whichever row element the mode needs, so
         both modes share one layout. -->
    <ng-template #content>
      <ng-content select="[avatar]" />
      <div class="flex-1 min-w-0">
        <div [class]="labelClasses()">
          {{ label() }}
        </div>
        @if (sublabel()) {
          <div class="text-cmn-xs truncate text-text-secondary">
            {{ sublabel() }}
          </div>
        }
      </div>
      <ng-content select="[meta]" />
      <ng-content select="[amount]" />
      <ng-content select="[actions]" />
    </ng-template>
    <ng-template #trailing let-extra>
      <button
        [class]="trailingClasses + extra"
        [attr.aria-label]="trailingName()"
        (click)="pressTrailing($event)"
        type="button"
      >
        <cmn-icon [name]="trailingIcon()!" size="md" aria-hidden="true" />
      </button>
    </ng-template>
    <ng-template #row>
      @if (action()) {
        @if (trailingIcon()) {
          <div [class]="actionWrapperClasses">
            <button [class]="rowClasses()" (click)="press($event)" type="button">
              <ng-container [ngTemplateOutlet]="content" />
            </button>
            <ng-container
              [ngTemplateOutlet]="trailing"
              [ngTemplateOutletContext]="{$implicit: ''}"
            />
          </div>
        } @else {
          <button [class]="rowClasses()" (click)="press($event)" type="button">
            <ng-container [ngTemplateOutlet]="content" />
          </button>
        }
      } @else {
        <div [class]="rowClasses()">
          <ng-container [ngTemplateOutlet]="content" />
          @if (trailingIcon()) {
            <ng-container
              [ngTemplateOutlet]="trailing"
              [ngTemplateOutletContext]="{$implicit: trailingInRowClasses}"
            />
          }
        </div>
      }
    </ng-template>
    @if (swipeable()) {
      <div [class]="frameClasses">
        @if (swipeLeading(); as leading) {
          <div
            #leadingTray
            [class]="trayClasses + ' left-0'"
            (focusin)="revealFrom('leading', leadingTray)"
            (focusout)="closeOnFocusLeave($event, leadingTray)"
          >
            <button
              [class]="actionClasses(leading)"
              [attr.aria-label]="actionName(leading)"
              (click)="activate('leading')"
              type="button"
            >
              <cmn-icon [name]="leading.icon" size="md" aria-hidden="true" />
              <span class="text-cmn-xs font-medium">{{ leading.label }}</span>
            </button>
          </div>
        }
        @if (swipeTrailing(); as trailingSwipe) {
          <div
            #trailingTray
            [class]="trayClasses + ' right-0'"
            (focusin)="revealFrom('trailing', trailingTray)"
            (focusout)="closeOnFocusLeave($event, trailingTray)"
          >
            <button
              [class]="actionClasses(trailingSwipe)"
              [attr.aria-label]="actionName(trailingSwipe)"
              (click)="activate('trailing')"
              type="button"
            >
              <cmn-icon [name]="trailingSwipe.icon" size="md" aria-hidden="true" />
              <span class="text-cmn-xs font-medium">{{ trailingSwipe.label }}</span>
            </button>
          </div>
        }
        <div
          #surface
          [class]="surfaceClasses()"
          [style.transform]="swipe.transform()"
          (pointerdown)="swipe.start($event)"
          (pointermove)="swipe.move($event)"
          (pointerup)="swipe.end()"
          (pointercancel)="swipe.end(true)"
        >
          <ng-container [ngTemplateOutlet]="row" />
        </div>
      </div>
    } @else {
      <ng-container [ngTemplateOutlet]="row" />
    }
  `,
})
export class ListItemRowComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly leadingTray = viewChild<ElementRef<HTMLElement>>('leadingTray');
  private readonly trailingTray = viewChild<ElementRef<HTMLElement>>('trailingTray');
  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');

  public readonly label = input.required<string>();
  public readonly sublabel = input<string | null>(null);
  public readonly dimmed = input<boolean>(false);
  /**
   * Makes the whole row one native button (for a row that opens a dialog or a detail view).
   * A button cannot hold other controls, so an action row takes no interactive `[actions]`; a
   * trailing action still works, as a sibling of the row button.
   */
  public readonly action = input<boolean>(false);
  /**
   * The quiet trailing action: an icon (e.g. `Ellipsis` for a row's menu) drawn as a borderless,
   * touch-sized icon button at the row's end. Prefer it to a bordered text button per row.
   */
  public readonly trailingIcon = input<Nullable<LucideIconName>>(null);
  /** Names the trailing action for assistive tech; defaults to "More for <label>". */
  public readonly trailingLabel = input<string>('');

  /**
   * The action a swipe toward the end reveals on the start edge (tick, mark read). A swipe is a
   * shortcut, never the only way: keep the row's visible control, and the same action is also a
   * button here that keyboard and screen-reader users reach, which slides the row open on focus.
   */
  public readonly swipeLeading = input<Nullable<CmnRowSwipeAction>>(null);
  /** The action a swipe toward the start reveals on the end edge (delete, dismiss). */
  public readonly swipeTrailing = input<Nullable<CmnRowSwipeAction>>(null);

  /** Emits when an action row is pressed (click, Enter or Space). */
  public readonly activated = output<void>();
  /** Emits when the trailing action is pressed. */
  public readonly trailingAction = output<void>();
  /** Emits when the leading swipe action is pressed. The row closes first. */
  public readonly swipeLeadingAction = output<void>();
  /** Emits when the trailing swipe action is pressed. The row closes first. */
  public readonly swipeTrailingAction = output<void>();

  protected readonly trailingClasses = `${TRAILING_CLASSES} `;
  protected readonly trailingInRowClasses = TRAILING_IN_ROW_CLASSES;
  protected readonly actionWrapperClasses = ACTION_WRAPPER_CLASSES;

  protected readonly frameClasses = SWIPE_FRAME_CLASSES;
  protected readonly trayClasses = SWIPE_TRAY_CLASSES;

  protected readonly swipeable = computed(() => !!this.swipeLeading() || !!this.swipeTrailing());
  protected readonly swipe = new RowSwipe({
    widths: () => ({
      leading: this.leadingTray()?.nativeElement.offsetWidth ?? 0,
      trailing: this.trailingTray()?.nativeElement.offsetWidth ?? 0,
    }),
  });
  protected readonly surfaceClasses = computed(
    () => SWIPE_SURFACE_CLASSES + (this.swipe.dragging() ? '' : SWIPE_SLIDE_CLASSES)
  );

  protected readonly trailingName = computed(
    () => this.trailingLabel() || `More for ${this.label()}`
  );

  // Dimmed recolours the text rather than fading the row: opacity would drag text and tags under
  // 4.5:1. The label steps down to the sublabel's grade, which stays readable, and the leading
  // avatar/icon slot is desaturated, not faded, so initials in an avatar keep their contrast.
  protected readonly rowClasses = computed(() => {
    const mode = this.action()
      ? `${ROW_CLASSES} ${ACTION_ROW_CLASSES}${this.trailingIcon() ? ' min-w-0 flex-1' : ''}`
      : ROW_CLASSES;
    return this.dimmed() ? `${mode} [&>[avatar]]:grayscale` : mode;
  });

  protected readonly labelClasses = computed(
    () =>
      `font-label text-cmn-sm font-medium truncate ${this.dimmed() ? 'text-text-secondary' : 'text-text-primary'}`
  );

  constructor() {
    // An open row shuts when the reader touches anywhere else.
    effect(onCleanup => {
      if (!this.swipe.open()) {
        return;
      }
      const shut = (event: Event): void => {
        if (!this.host.nativeElement.contains(event.target as Node)) {
          this.swipe.close();
        }
      };
      this.document.addEventListener('pointerdown', shut, true);
      onCleanup(() => this.document.removeEventListener('pointerdown', shut, true));
    });
  }

  protected actionClasses(action: CmnRowSwipeAction): string {
    return `${SWIPE_ACTION_CLASSES} ${SWIPE_TONE_CLASSES[action.tone ?? 'neutral']}`;
  }

  /** The visible word leads, so the name contains what the button shows. */
  protected actionName(action: CmnRowSwipeAction): string {
    return `${action.label} ${this.label()}`;
  }

  /** Focus reaching a tray (Tab, or a screen reader's cursor) slides the row open to show it. */
  protected revealFrom(side: RowSwipeSide, tray: HTMLElement): void {
    this.swipe.reveal(side, tray.offsetWidth);
  }

  protected closeOnFocusLeave(event: FocusEvent, tray: HTMLElement): void {
    if (!tray.contains(event.relatedTarget as Node | null)) {
      this.swipe.close();
    }
  }

  protected press(event: MouseEvent): void {
    if (!this.swipe.takeShutTap(event)) {
      this.activated.emit();
    }
  }

  protected pressTrailing(event: MouseEvent): void {
    if (!this.swipe.takeShutTap(event)) {
      this.trailingAction.emit();
    }
  }

  /** Shuts the row without leaving focus on a tray button the surface now covers. */
  protected shut(): void {
    const active = this.document.activeElement as HTMLElement | null;
    const inTray = [this.leadingTray(), this.trailingTray()].some(tray =>
      tray?.nativeElement.contains(active)
    );
    this.swipe.close();
    if (inTray) {
      const visible = this.surface()?.nativeElement.querySelector<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]'
      );
      if (visible) {
        visible.focus();
      } else {
        active?.blur();
      }
    }
  }

  protected activate(side: RowSwipeSide): void {
    this.shut();
    if (side === 'leading') {
      this.swipeLeadingAction.emit();
    } else {
      this.swipeTrailingAction.emit();
    }
  }
}
