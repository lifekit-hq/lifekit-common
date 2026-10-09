import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

import type {InputSize} from '../input/input.component';

const BASE_CLASSES =
  'block w-full resize-y rounded-cmn-md border font-base bg-surface-card text-text-primary ' +
  'placeholder:text-text-placeholder ' +
  'focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:resize-none ' +
  'read-only:bg-surface-raised read-only:cursor-default read-only:resize-none ' +
  'transition-colors duration-150';

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: 'px-cmn-2 py-cmn-1 text-cmn-sm',
  md: 'px-cmn-3 py-cmn-2 text-cmn-md',
  lg: 'px-cmn-4 py-cmn-3 text-cmn-lg',
};

const DEFAULT_BORDER = 'border-border-default';
const ERROR_BORDER = 'border-status-error';

const DEFAULT_ROWS = 3;

/** A multi-line text field with the same API as `cmn-input`, plus `rows` and a `maxlength` counter. */
@Component({
  selector: 'cmn-textarea',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
  template: `
    <textarea
      [id]="inputId()"
      [value]="value()"
      [rows]="rows()"
      [disabled]="disabled()"
      [readOnly]="readonly()"
      [placeholder]="placeholder()"
      [attr.maxlength]="maxlength()"
      [attr.aria-invalid]="hasError() ? true : null"
      [attr.aria-describedby]="showCounter() ? counterId() : null"
      [attr.autocomplete]="autocomplete()"
      [class]="classes()"
      (input)="onInput($event)"
      (blur)="onBlur()"
    ></textarea>
    @if (showCounter()) {
      <span
        [id]="counterId()"
        class="mt-cmn-1 block text-right text-cmn-xs text-text-secondary tabular-nums"
      >
        {{ value().length }} / {{ maxlength() }}
      </span>
    }
  `,
})
export class TextareaComponent implements ControlValueAccessor {
  // Public signal inputs
  public readonly size = input<InputSize>('md');
  public readonly placeholder = input<string>('');
  public readonly readonly = input<boolean>(false);
  public readonly hasError = input<boolean>(false);
  public readonly autocomplete = input<string | null>(null);
  /** Visible lines before the user resizes the field. */
  public readonly rows = input<number>(DEFAULT_ROWS);
  /** Caps the text and shows a `length / maxlength` counter under the field; null for no cap. */
  public readonly maxlength = input<number | null>(null);

  // Public computed
  public readonly classes = computed(() => {
    const border = this.hasError() ? ERROR_BORDER : DEFAULT_BORDER;
    return [BASE_CLASSES, SIZE_CLASSES[this.size()], border].join(' ');
  });

  // Protected internal state
  protected readonly value = signal<string>('');
  protected readonly disabled = signal<boolean>(false);
  protected readonly inputId = signal<string>('');

  protected readonly showCounter = computed<boolean>(() => this.maxlength() !== null);
  protected readonly counterId = computed<string>(
    () => `${this.inputId() || 'cmn-textarea'}-count`
  );

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
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
