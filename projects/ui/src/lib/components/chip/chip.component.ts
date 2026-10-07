import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

/**
 * The button is the hit area: `--size-touch` square at least below md, invisible. The pill drawn
 * inside keeps its size, so a chip looks the same on a phone as on a desktop.
 */
const BUTTON_CLASSES =
  'group inline-flex cursor-pointer select-none items-center justify-center focus:outline-none ' +
  'max-md:min-h-cmn-touch max-md:min-w-cmn-touch';

const PILL_BASE_CLASSES =
  'inline-flex items-center rounded-cmn-full px-cmn-3 py-cmn-1 text-cmn-sm font-medium ' +
  'transition-colors group-focus:ring-2 group-focus:ring-border-focus group-focus:ring-offset-1';

const SELECTED_CLASSES = 'bg-accent-default text-text-inverse';
const UNSELECTED_CLASSES = 'bg-surface-raised text-text-secondary group-hover:bg-surface-hover';

@Component({
  selector: 'cmn-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="buttonClasses"
      [attr.aria-pressed]="selected()"
      (click)="clicked.emit()"
      type="button"
    >
      <span [class]="classes()"><ng-content /></span>
    </button>
  `,
})
export class ChipComponent {
  public readonly selected = input<boolean>(false);

  public readonly clicked = output<void>();

  /** The drawn pill; the button around it is the touch target. */
  public readonly classes = computed(
    () => `${PILL_BASE_CLASSES} ${this.selected() ? SELECTED_CLASSES : UNSELECTED_CLASSES}`
  );

  protected readonly buttonClasses = BUTTON_CLASSES;
}
