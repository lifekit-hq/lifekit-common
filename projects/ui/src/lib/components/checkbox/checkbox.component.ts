import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {IconComponent} from '../icon/icon.component';

const BOX_BASE =
  'inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-cmn-sm border ' +
  'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ' +
  'focus-visible:ring-offset-1';

/** Boxed on/off control with an optional inline label; `indeterminate` shows a dash. */
@Component({
  selector: 'cmn-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {class: 'inline-flex'},
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label [class.cursor-pointer]="!disabled()" class="inline-flex items-center gap-cmn-2">
      <button
        [attr.aria-checked]="indeterminate() ? 'mixed' : checked()"
        [attr.aria-label]="label() || null"
        [attr.aria-disabled]="disabled() ? true : null"
        [disabled]="disabled()"
        [class]="boxClass()"
        (click)="changed.emit(!checked())"
        role="checkbox"
        type="button"
      >
        @if (indeterminate()) {
          <cmn-icon name="Minus" size="sm" />
        } @else if (checked()) {
          <cmn-icon name="Check" size="sm" />
        }
      </button>
      <ng-content />
    </label>
  `,
})
export class CheckboxComponent {
  public readonly checked = input<boolean>(false);
  public readonly indeterminate = input<boolean>(false);
  public readonly label = input<string>('');
  public readonly disabled = input<boolean>(false);

  public readonly changed = output<boolean>();

  public readonly boxClass = computed(() => {
    const filled = this.checked() || this.indeterminate();
    const color = filled
      ? 'bg-accent-default border-accent-default text-text-inverse'
      : 'bg-surface-card border-border-default';
    const disabled = this.disabled() ? 'opacity-50 pointer-events-none' : '';
    return [BOX_BASE, color, disabled].filter(Boolean).join(' ');
  });
}
