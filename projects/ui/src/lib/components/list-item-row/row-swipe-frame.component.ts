import {DOCUMENT} from '@angular/common';
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
 * The swipe frame clips the trays; the surface is the row itself, opaque so a closed tray never
 * shows through, and `touch-pan-y` leaves vertical panning to the page. It slides on the medium
 * step and snaps for a reader who asked for reduced motion.
 */
const FRAME_CLASSES = 'relative overflow-hidden';
/** A card-shaped row clips its trays to the card's own corners. */
const FRAME_ROUNDED_CLASSES = ' rounded-cmn-role-surface';
const SURFACE_CLASSES = 'relative touch-pan-y bg-surface-card';
const SLIDE_CLASSES =
  ' transition-transform duration-cmn-medium ease-cmn-standard motion-reduce:transition-none';
/**
 * A tray paints only while the surface uncovers it: a closed tray under the opaque surface would
 * otherwise draw its label beneath the row's text. It goes transparent, never `hidden`, `invisible`
 * or `inert`, so its button stays focusable and in the accessibility tree; focus then slides the
 * row open. It fades with the slide and snaps with it.
 */
const TRAY_CLASSES = 'absolute inset-y-0 flex';
const TRAY_FADE_CLASSES =
  ' transition-opacity duration-cmn-medium ease-cmn-standard motion-reduce:transition-none';
const ACTION_CLASSES =
  'flex min-w-cmn-size-lg flex-col items-center justify-center gap-cmn-1 px-cmn-4 ' +
  'text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ' +
  'focus-visible:ring-text-inverse';
const TONE_CLASSES: Record<CmnRowSwipeTone, string> = {
  neutral: 'bg-accent-default',
  positive: 'bg-status-success',
  danger: 'bg-status-error',
};

/** The visible controls a row keeps: where focus goes once a tray the surface now covers is left. */
const VISIBLE_CONTROL = 'button, a[href], input, select, textarea, [tabindex]';

/**
 * The swipe contract of a row (docs/PHONE-CONTRACT.md, "Swipe actions on a row") written once: the
 * trays, the opaque surface that slides over them, the keyboard and screen-reader path (each action
 * a real button, focus slides the row open, Escape or leaving focus puts it back) and the tap that
 * only shuts an open row. A row (`cmn-list-item-row`, `cmn-alert-item`) stamps its own content into
 * it, so the gesture is never rebuilt per row and the row keeps a free body.
 *
 * Internal: the rows own the public inputs and outputs; an app swipes a row, it does not use this.
 */
@Component({
  selector: 'cmn-row-swipe-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {class: 'block', '(keydown.escape)': 'shut()'},
  template: `
    <div [class]="frameClasses()">
      @if (leading(); as action) {
        <div
          #leadingTray
          [class]="leadingTrayClasses()"
          (focusin)="revealFrom('leading', leadingTray)"
          (focusout)="closeOnFocusLeave($event, leadingTray)"
        >
          <button
            [class]="actionClasses(action)"
            [attr.aria-label]="actionName(action)"
            (click)="activate('leading')"
            type="button"
          >
            <cmn-icon [name]="action.icon" size="md" aria-hidden="true" />
            <span class="text-cmn-xs font-medium">{{ action.label }}</span>
          </button>
        </div>
      }
      @if (trailing(); as action) {
        <div
          #trailingTray
          [class]="trailingTrayClasses()"
          (focusin)="revealFrom('trailing', trailingTray)"
          (focusout)="closeOnFocusLeave($event, trailingTray)"
        >
          <button
            [class]="actionClasses(action)"
            [attr.aria-label]="actionName(action)"
            (click)="activate('trailing')"
            type="button"
          >
            <cmn-icon [name]="action.icon" size="md" aria-hidden="true" />
            <span class="text-cmn-xs font-medium">{{ action.label }}</span>
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
        <ng-content />
      </div>
    </div>
  `,
})
export class RowSwipeFrameComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly leadingTray = viewChild<ElementRef<HTMLElement>>('leadingTray');
  private readonly trailingTray = viewChild<ElementRef<HTMLElement>>('trailingTray');
  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');

  /** The action a swipe toward the end reveals on the start edge. */
  public readonly leading = input<Nullable<CmnRowSwipeAction>>(null);
  /** The action a swipe toward the start reveals on the end edge. */
  public readonly trailing = input<Nullable<CmnRowSwipeAction>>(null);
  /** The row's own name: each action is announced as `<action> <name>`. */
  public readonly name = input.required<string>();
  /** A card-shaped row: the trays are clipped to its rounded corners. */
  public readonly rounded = input<boolean>(false);

  /** Emits when the leading action is pressed. The row closes first. */
  public readonly leadingAction = output<void>();
  /** Emits when the trailing action is pressed. The row closes first. */
  public readonly trailingAction = output<void>();

  protected readonly swipe = new RowSwipe({
    widths: () => ({
      leading: this.leadingTray()?.nativeElement.offsetWidth ?? 0,
      trailing: this.trailingTray()?.nativeElement.offsetWidth ?? 0,
    }),
  });

  protected readonly frameClasses = computed(
    () => FRAME_CLASSES + (this.rounded() ? FRAME_ROUNDED_CLASSES : '')
  );
  protected readonly surfaceClasses = computed(
    () => SURFACE_CLASSES + (this.swipe.dragging() ? '' : SLIDE_CLASSES)
  );
  protected readonly leadingTrayClasses = computed(() =>
    this.trayClasses('left-0', this.swipe.offset() > 0)
  );
  protected readonly trailingTrayClasses = computed(() =>
    this.trayClasses('right-0', this.swipe.offset() < 0)
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

    // The click that follows a tap which shut an open row only shuts it. It is caught before it
    // reaches whatever the row holds (its button, a link in its body), so that control does not run.
    effect(onCleanup => {
      const surface = this.surface()?.nativeElement;
      if (!surface) {
        return;
      }
      const swallowShutTap = (event: MouseEvent): void => {
        if (this.swipe.takeShutTap(event)) {
          event.preventDefault();
          event.stopPropagation();
        }
      };
      surface.addEventListener('click', swallowShutTap, true);
      onCleanup(() => surface.removeEventListener('click', swallowShutTap, true));
    });
  }

  private trayClasses(edge: string, uncovered: boolean): string {
    const fade = this.swipe.dragging() ? '' : TRAY_FADE_CLASSES;
    return `${TRAY_CLASSES} ${edge} ${uncovered ? 'opacity-100' : 'opacity-0'}${fade}`;
  }

  protected actionClasses(action: CmnRowSwipeAction): string {
    return `${ACTION_CLASSES} ${TONE_CLASSES[action.tone ?? 'neutral']}`;
  }

  /** The visible word leads, so the name contains what the button shows. */
  protected actionName(action: CmnRowSwipeAction): string {
    return `${action.label} ${this.name()}`;
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

  /** Shuts the row without leaving focus on a tray button the surface now covers. */
  protected shut(): void {
    const active = this.document.activeElement as HTMLElement | null;
    const inTray = [this.leadingTray(), this.trailingTray()].some(tray =>
      tray?.nativeElement.contains(active)
    );
    this.swipe.close();
    if (inTray) {
      const visible = this.surface()?.nativeElement.querySelector<HTMLElement>(VISIBLE_CONTROL);
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
      this.leadingAction.emit();
    } else {
      this.trailingAction.emit();
    }
  }
}
