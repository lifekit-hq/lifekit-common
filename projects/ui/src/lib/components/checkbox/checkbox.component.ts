import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

import {IconComponent} from '../icon/icon.component';

const BOX_BASE =
  'inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-cmn-sm border ' +
  'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ' +
  'focus-visible:ring-offset-1';

/**
 * Boxed on/off control with an optional inline label; `indeterminate` shows a dash.
 *
 * Works as a form control (`formControlName`, `[formControl]`, `ngModel`): once a forms directive
 * binds, the form model owns the value and disabled state, and a click writes it back. Without one,
 * `checked` is the value and a click only emits `changed`.
 */
@Component({
  selector: 'cmn-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {class: 'inline-flex'},
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true,
    },
  ],
  template: `
    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label [class.cursor-pointer]="!isDisabled()" class="inline-flex items-center gap-cmn-2">
      <button
        [attr.aria-checked]="indeterminate() ? 'mixed' : isChecked()"
        [attr.aria-label]="label() || null"
        [attr.aria-disabled]="isDisabled() ? true : null"
        [disabled]="isDisabled()"
        [class]="boxClass()"
        (click)="toggle()"
        (blur)="onTouched()"
        role="checkbox"
        type="button"
      >
        @if (indeterminate()) {
          <cmn-icon name="Minus" size="sm" />
        } @else if (isChecked()) {
          <cmn-icon name="Check" size="sm" />
        }
      </button>
      <ng-content />
    </label>
  `,
})
export class CheckboxComponent implements ControlValueAccessor {
  /** The value a forms directive wrote; `undefined` until one binds, while `checked` rules. */
  private readonly formValue = signal<boolean | undefined>(undefined);
  private readonly formDisabled = signal<boolean>(false);

  public readonly checked = input<boolean>(false);
  public readonly indeterminate = input<boolean>(false);
  public readonly label = input<string>('');
  public readonly disabled = input<boolean>(false);

  public readonly changed = output<boolean>();

  public readonly isChecked = computed(() => this.formValue() ?? this.checked());
  public readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  public readonly boxClass = computed(() => {
    const filled = this.isChecked() || this.indeterminate();
    const color = filled
      ? 'bg-accent-default border-accent-default text-text-inverse'
      : 'bg-surface-card border-border-strong';
    const disabled = this.isDisabled() ? 'opacity-50 pointer-events-none' : '';
    return [BOX_BASE, color, disabled].filter(Boolean).join(' ');
  });

  // Function-type properties are methods to member-ordering, so they follow every field.
  private onChange: (value: boolean) => void = () => void 0;

  protected onTouched: () => void = () => void 0;

  public writeValue(value: boolean | null | undefined): void {
    this.formValue.set(!!value);
  }

  public registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  protected toggle(): void {
    const next = !this.isChecked();
    if (this.formValue() !== undefined) {
      this.formValue.set(next);
      this.onChange(next);
    }
    this.changed.emit(next);
  }
}
