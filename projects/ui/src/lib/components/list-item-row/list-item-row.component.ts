import {NgTemplateOutlet} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {type Nullable} from '../../types';
import {IconComponent, type LucideIconName} from '../icon/icon.component';

/**
 * The hairline divider sits on the host, so `last:` matches the last row among its siblings. On the
 * row element inside, which is always its host's only child, it never drew.
 */
const HOST_CLASSES = 'block border-b border-border-default last:border-b-0';

const ROW_CLASSES =
  'flex items-center gap-cmn-3 px-cmn-4 py-cmn-3 hover:bg-surface-bg transition-colors';

const ACTION_ROW_CLASSES =
  'w-full cursor-pointer text-left active:bg-surface-raised focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus';

/**
 * The quiet trailing action: an icon-only, borderless button at the touch size, in the secondary
 * text colour. Its negative block margin keeps the row as tall as its text; a bordered text button
 * repeated on every row is the noise the screen check reports (C9).
 */
const TRAILING_CLASSES =
  '-my-cmn-2 inline-flex size-cmn-touch shrink-0 items-center justify-center rounded-cmn-md ' +
  'text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus';
/** In a plain row the action's glyph lines up with the row's end padding, not the hit area's. */
const TRAILING_IN_ROW_CLASSES = '-mr-cmn-2';
/** An action row is one button, so the trailing action sits beside it in a wrapper. */
const ACTION_WRAPPER_CLASSES = 'flex items-center pr-cmn-2';

@Component({
  selector: 'cmn-list-item-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, NgTemplateOutlet],
  host: {class: HOST_CLASSES},
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
        (click)="trailingAction.emit()"
        type="button"
      >
        <cmn-icon [name]="trailingIcon()!" size="md" aria-hidden="true" />
      </button>
    </ng-template>
    @if (action()) {
      @if (trailingIcon()) {
        <div [class]="actionWrapperClasses">
          <button [class]="rowClasses()" (click)="activated.emit()" type="button">
            <ng-container [ngTemplateOutlet]="content" />
          </button>
          <ng-container [ngTemplateOutlet]="trailing" [ngTemplateOutletContext]="{$implicit: ''}" />
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
  `,
})
export class ListItemRowComponent {
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

  /** Emits when an action row is pressed (click, Enter or Space). */
  public readonly activated = output<void>();
  /** Emits when the trailing action is pressed. */
  public readonly trailingAction = output<void>();

  protected readonly trailingClasses = `${TRAILING_CLASSES} `;
  protected readonly trailingInRowClasses = TRAILING_IN_ROW_CLASSES;
  protected readonly actionWrapperClasses = ACTION_WRAPPER_CLASSES;

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
