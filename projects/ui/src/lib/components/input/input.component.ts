import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'search';
export type InputSize = 'sm' | 'md' | 'lg';

const BASE_CLASSES =
  'block w-full rounded-cmn-md border font-base bg-surface-card text-text-primary ' +
  'placeholder:text-text-placeholder ' +
  'focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'read-only:bg-surface-raised read-only:cursor-default ' +
  'transition-colors duration-150 max-md:min-h-cmn-touch';

// Below md every size keeps 16px text (iOS zooms the page into a focused field set smaller) and
// presses as at least --size-touch tall.
const SIZE_CLASSES: Record<InputSize, string> = {
  sm: 'px-cmn-2 py-cmn-1 text-cmn-md md:text-cmn-sm',
  md: 'px-cmn-3 py-cmn-2 text-cmn-md',
  lg: 'px-cmn-4 py-cmn-3 text-cmn-lg',
};

const DEFAULT_BORDER = 'border-border-strong';
const ERROR_BORDER = 'border-status-error';

@Component({
  selector: 'cmn-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[attr.aria-label]': 'null'},
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <input
      [id]="inputId()"
      [type]="type()"
      [value]="value()"
      [disabled]="disabled()"
      [readOnly]="readonly()"
      [placeholder]="placeholder()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-invalid]="hasError() ? true : null"
      [attr.autocomplete]="autocomplete()"
      [class]="classes()"
      (input)="onInput($event)"
      (blur)="onBlur()"
    />
  `,
})
export class InputComponent implements ControlValueAccessor {
  // Public signal inputs
  public readonly type = input<InputType>('text');
  public readonly size = input<InputSize>('md');
  public readonly placeholder = input<string>('');
  public readonly readonly = input<boolean>(false);
  public readonly hasError = input<boolean>(false);
  public readonly autocomplete = input<string | null>(null);
  /** Names the field when there is no `cmn-form-field` label; moves to the native element. */
  public readonly ariaLabel = input<string | null>(null, {alias: 'aria-label'});

  // Public computed
  public readonly classes = computed(() => {
    const border = this.hasError() ? ERROR_BORDER : DEFAULT_BORDER;
    return [BASE_CLASSES, SIZE_CLASSES[this.size()], border].join(' ');
  });

  // Protected internal state
  protected readonly value = signal<string>('');
  protected readonly disabled = signal<boolean>(false);
  protected readonly inputId = signal<string>('');

  // Private callbacks (function-type properties treated as methods by member-ordering — must follow all fields)
  private onChange: (value: string) => void = (_: string) => void 0;

  private onTouched: () => void = () => void 0;

  public writeValue(value: string | null | undefined): void {
    this.value.set(value ?? '');
  }

  public registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  public setInputId(id: string): void {
    this.inputId.set(id);
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
