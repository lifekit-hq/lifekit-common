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
/** The virtual keyboard a phone shows for the field (the HTML `inputmode` attribute). */
export type InputMode =
  'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
/** The label on a phone keyboard's enter key (the HTML `enterkeyhint` attribute). */
export type EnterKeyHint = 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send';

// Carbon's filled field (theme.css --cmn-field-*): a tinted fill, a 1px bottom border only, a 2px
// inset outline on focus, and in error a 2px inset outline in the error colour that focus replaces.
// A disabled field keeps its fill and greys text and border (no dimming); a read-only one drops the
// fill, so it reads as text rather than as an input.
const BASE_CLASSES =
  'block w-full rounded-cmn-md border-0 border-b font-base bg-cmn-field text-text-primary ' +
  'placeholder:text-text-placeholder [&:read-write]:hover:bg-surface-hover ' +
  'focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-border-focus ' +
  'disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-disabled ' +
  'disabled:placeholder:text-text-disabled disabled:bg-cmn-field ' +
  'read-only:cursor-default read-only:border-border-default read-only:bg-transparent ' +
  'transition-colors duration-cmn-short ease-cmn-standard max-md:min-h-cmn-touch';

// Below md every size keeps 16px text (iOS zooms the page into a focused field set smaller) and
// presses as at least --size-touch tall. md is the control height (`--cmn-control-h`) that a button
// beside it shares: Carbon's 48px at every width. sm and lg are Carbon's 32 and 64px, with the
// field's 16px side padding.
const SIZE_CLASSES: Record<InputSize, string> = {
  sm: 'h-cmn-size-sm px-cmn-4 text-cmn-md md:text-cmn-sm',
  md: 'h-cmn-control-h px-cmn-4 text-cmn-md',
  lg: 'h-cmn-16 px-cmn-4 text-cmn-lg',
};

const DEFAULT_BORDER = 'border-border-strong';
const ERROR_BORDER =
  'border-border-strong outline outline-2 -outline-offset-2 outline-status-error';

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
      [attr.inputmode]="inputmode()"
      [attr.enterkeyhint]="enterkeyhint()"
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
  public readonly inputmode = input<InputMode | null>(null);
  public readonly enterkeyhint = input<EnterKeyHint | null>(null);
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
