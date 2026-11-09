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

import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';

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
    // Carbon's 48 x 24 track, 24px drawn, at least --size-touch pressed on a phone. Off is the
    // strong-border grey and on is the success hue (Carbon's support-success); a disabled switch
    // greys out instead of dimming.
    const base =
      'relative inline-flex h-cmn-toggle-h w-cmn-toggle-w shrink-0 items-center rounded-full ' +
      'transition-colors duration-cmn-short ease-cmn-standard focus:outline-none ' +
      `focus:ring-2 focus:ring-border-focus focus:ring-offset-1 ${PHONE_HIT_AREA_CLASSES}`;
    let color = this.isChecked() ? 'bg-cmn-toggle-on' : 'bg-border-strong';
    if (this.isDisabled()) {
      color = 'bg-surface-hover';
    }
    const state = this.isDisabled()
      ? 'pointer-events-none cursor-not-allowed'
      : this.loading()
        ? 'cursor-progress'
        : 'cursor-pointer';
    return [base, color, state].filter(Boolean).join(' ');
  });

  public readonly thumbClass = computed(() => {
    const base =
      'pointer-events-none ml-cmn-toggle-pad inline-flex h-cmn-toggle-thumb w-cmn-toggle-thumb items-center justify-center rounded-full ' +
      'transition-transform duration-cmn-short ease-cmn-standard';
    const color = this.isDisabled() ? 'bg-surface-card' : 'bg-white';
    const translate = this.isChecked()
      ? 'translate-x-[calc(var(--cmn-toggle-w)-var(--cmn-toggle-thumb)-2*var(--cmn-toggle-pad))]'
      : 'translate-x-0';
    return `${base} ${color} ${translate}`;
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
