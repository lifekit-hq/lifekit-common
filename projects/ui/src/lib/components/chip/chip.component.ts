import {NgTemplateOutlet} from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {IconComponent} from '../icon/icon.component';

/**
 * The button is the hit area: `--size-touch` square at least below md, invisible. The pill drawn
 * inside keeps its size, so a chip looks the same on a phone as on a desktop.
 */
const BUTTON_CLASSES =
  'group inline-flex cursor-pointer select-none items-center justify-center focus:outline-none ' +
  'max-md:min-h-cmn-touch max-md:min-w-cmn-touch disabled:cursor-not-allowed disabled:opacity-60';

const PILL_BASE_CLASSES =
  'inline-flex items-center rounded-cmn-full px-cmn-3 py-cmn-1 text-cmn-sm font-medium ' +
  'transition-colors group-focus-visible:ring-2 group-focus-visible:ring-border-focus group-focus-visible:ring-offset-1';

const SELECTED_CLASSES = 'bg-accent-default text-text-inverse';
const UNSELECTED_CLASSES = 'bg-surface-raised text-text-secondary group-hover:bg-surface-hover';

const REMOVABLE_PILL_CLASSES =
  'inline-flex min-w-0 max-w-full items-center gap-cmn-1 rounded-cmn-full bg-surface-raised ' +
  'py-cmn-1 pl-cmn-3 pr-cmn-1 text-cmn-sm font-medium text-text-primary';

const REMOVE_BUTTON_CLASSES =
  'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-cmn-full p-0.5 ' +
  'text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  PHONE_HIT_AREA_CLASSES;

/**
 * A filter chip by default: a toggle button whose `selected` state reads as `aria-pressed`.
 *
 * `removable` makes it an input chip instead: a plain pill holding the label and an × button that
 * emits `removed`. The × button is the only control, named by `removeLabel`.
 */
@Component({
  selector: 'cmn-chip',
  imports: [IconComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #label><ng-content /></ng-template>
    @if (removable()) {
      <span [class]="removablePillClasses">
        <span class="truncate"><ng-container [ngTemplateOutlet]="label" /></span>
        <button
          [class]="removeButtonClasses"
          [disabled]="disabled()"
          [attr.aria-label]="removeLabel()"
          (click)="removed.emit()"
          type="button"
        >
          <cmn-icon name="X" size="sm" />
        </button>
      </span>
    } @else {
      <button
        [class]="buttonClasses"
        [disabled]="disabled()"
        [attr.aria-pressed]="selected()"
        (click)="clicked.emit()"
        type="button"
      >
        <span [class]="classes()"><ng-container [ngTemplateOutlet]="label" /></span>
      </button>
    }
  `,
})
export class ChipComponent {
  public readonly selected = input<boolean>(false);
  public readonly disabled = input<boolean>(false);
  /** Renders an input chip with an × button instead of a toggle. */
  public readonly removable = input(false, {transform: booleanAttribute});
  /** `removable`: names the × button; say what goes, e.g. "Remove Rent". */
  public readonly removeLabel = input<string>('Remove');

  public readonly clicked = output<void>();
  /** `removable`: the × button was pressed. */
  public readonly removed = output<void>();

  /** The drawn pill; the button around it is the touch target. */
  public readonly classes = computed(
    () => `${PILL_BASE_CLASSES} ${this.selected() ? SELECTED_CLASSES : UNSELECTED_CLASSES}`
  );

  protected readonly buttonClasses = BUTTON_CLASSES;
  protected readonly removablePillClasses = REMOVABLE_PILL_CLASSES;
  protected readonly removeButtonClasses = REMOVE_BUTTON_CLASSES;
}
