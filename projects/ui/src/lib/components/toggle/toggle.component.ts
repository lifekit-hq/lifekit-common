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

/**
 * An on/off switch.
 *
 * Works as a form control (`formControlName`, `[formControl]`, `ngModel`): once a forms directive
 * binds, the form model owns the value and disabled state, and a click writes it back. Without one,
 * `checked` is the value and a click only emits `toggled`.
 *
 * `loading` is for an instant-apply setting (APP-SHELL-STANDARD.md §4) while its save is in
 * flight: the thumb spins, `aria-busy` is set and clicks are ignored. The switch stays focusable
 * and undimmed, so focus is not lost mid-save.
 */
@Component({
  selector: 'cmn-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true,
    },
  ],
  template: `
    <button
      [attr.aria-checked]="isChecked()"
      [attr.aria-label]="label()"
      [attr.aria-disabled]="isDisabled() ? true : null"
      [attr.aria-busy]="loading() ? true : null"
      [disabled]="isDisabled()"
      [class]="trackClass()"
      (click)="toggle()"
      (blur)="onTouched()"
      role="switch"
      type="button"
    >
      <span [class]="thumbClass()">
        @if (loading()) {
          <span
            class="h-3 w-3 animate-spin rounded-full border-2 border-accent-default border-t-transparent"
          ></span>
        }
      </span>
    </button>
  `,
})
export class ToggleComponent implements ControlValueAccessor {
  /** The value a forms directive wrote; `undefined` until one binds, while `checked` rules. */
  private readonly formValue = signal<boolean | undefined>(undefined);
  private readonly formDisabled = signal<boolean>(false);

  public readonly checked = input<boolean>(false);
  public readonly label = input<string>('');
  public readonly disabled = input<boolean>(false);
  public readonly loading = input<boolean>(false);

  public readonly toggled = output<boolean>();

  public readonly isChecked = computed(() => this.formValue() ?? this.checked());
  public readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  public readonly trackClass = computed(() => {
    const base =
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full ' +
      'border-2 border-transparent transition-colors duration-cmn-short ease-cmn-standard ' +
      'focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1';
    const color = this.isChecked() ? 'bg-accent-default' : 'bg-border-strong';
    const state = this.isDisabled()
      ? 'opacity-50 pointer-events-none'
      : this.loading()
        ? 'cursor-progress'
        : '';
    return [base, color, state].filter(Boolean).join(' ');
  });

  public readonly thumbClass = computed(() => {
    const base =
      'pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded-full ' +
      'bg-white shadow-sm transition-transform duration-cmn-short ease-cmn-standard';
    const translate = this.isChecked() ? 'translate-x-5' : 'translate-x-0';
    return `${base} ${translate}`;
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
    if (this.loading()) {
      return;
    }
    const next = !this.isChecked();
    if (this.formValue() !== undefined) {
      this.formValue.set(next);
      this.onChange(next);
    }
    this.toggled.emit(next);
  }
}
