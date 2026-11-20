import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {type Nullable} from '../../types';
import {IconComponent, type LucideIconName} from '../icon/icon.component';
import {type CmnRowSwipeAction, RowSwipeFrameComponent} from './row-swipe-frame.component';

export type {CmnRowSwipeAction, CmnRowSwipeTone} from './row-swipe-frame.component';

/**
 * The hairline divider sits on the host, so the last-row rule matches the last row among its
 * siblings. On the row element inside, which is always its host's only child, it never drew. A row
 * leaving (`CmnListMotionDirective`) is not a sibling for this: it is still drawn, but is not the
 * list's last row.
 */
const HOST_CLASSES =
  'block border-b border-border-default ' +
  '[&:nth-last-child(1_of_:not([data-cmn-list-leaving]))]:border-b-0';

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
  '-my-cmn-2 inline-flex size-cmn-touch shrink-0 items-center justify-center rounded-cmn-role-control ' +
  'text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';
/** In a plain row the action's glyph lines up with the row's end padding, not the hit area's. */
const TRAILING_IN_ROW_CLASSES = '-mr-cmn-2';
/** An action row is one button, so the trailing action sits beside it in a wrapper. */
const ACTION_WRAPPER_CLASSES = 'flex items-center pr-cmn-2';

/**
 * One row of a contained list. The text is `label` and one truncated `sublabel`; a row whose text
 * needs more (a link, a wrapped multi-line note, tags) projects it as a `[body]` element, which
 * replaces both and is drawn between the avatar and the meta/amount/actions slots. A body that
 * holds a link or a control needs a plain row: an `action` row is one button, and a button cannot
 * hold another control.
 */
@Component({
  selector: 'cmn-list-item-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet, RowSwipeFrameComponent],
  host: {class: HOST_CLASSES},
  template: `
    <!-- The content is written once and stamped into whichever row element the mode needs, so
         both modes share one layout. -->
    <ng-template #content>
      <ng-content select="[avatar]" />
      <div class="flex-1 min-w-0">
        <ng-content select="[body]">
          <div [class]="labelClasses()">
            {{ label() }}
          </div>
          @if (sublabel()) {
            <div class="text-cmn-xs truncate text-text-secondary">
              {{ sublabel() }}
            </div>
          }
        </ng-content>
      </div>
      <ng-content select="[meta]" />
      <ng-content select="[amount]" />
      <ng-content select="[actions]" />
    </ng-template>
    <ng-template #trailing let-extra>
      <button
        [class]="trailingClasses + extra"
        [attr.aria-label]="trailingName()"
        (click)="trailingAction.emit()"
        type="button"
      >
        <cmn-icon [name]="trailingIcon()!" size="md" aria-hidden="true" />
      </button>
    </ng-template>
    <ng-template #row>
      @if (action()) {
        @if (trailingIcon()) {
          <div [class]="actionWrapperClasses">
            <button [class]="rowClasses()" (click)="activated.emit()" type="button">
              <ng-container [ngTemplateOutlet]="content" />
            </button>
            <ng-container
              [ngTemplateOutlet]="trailing"
              [ngTemplateOutletContext]="{$implicit: ''}"
            />
          </div>
        } @else {
          <button [class]="rowClasses()" (click)="activated.emit()" type="button">
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
      <cmn-row-swipe-frame
        [leading]="swipeLeading()"
        [trailing]="swipeTrailing()"
        [name]="label()"
        [visibleAction]="action() || !!trailingIcon()"
        (leadingAction)="swipeLeadingAction.emit()"
        (trailingAction)="swipeTrailingAction.emit()"
      >
        <ng-container [ngTemplateOutlet]="row" />
      </cmn-row-swipe-frame>
    } @else {
      <ng-container [ngTemplateOutlet]="row" />
    }
  `,
})
export class ListItemRowComponent {
  /**
   * The row's text, and its name for assistive tech ("Remove <label>", "More for <label>"). A row
   * that projects a `[body]` still sets it: the body replaces what is drawn, not the name.
   */
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

  protected readonly swipeable = computed(() => !!this.swipeLeading() || !!this.swipeTrailing());

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
}
