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

export type SearchInputSize = 'sm' | 'md' | 'lg';

// Carbon's search is the filled field (the same --cmn-field-* tokens as `cmn-input`): a tinted
// fill, a 1px bottom border only, a 2px inset outline on focus, a hover fill, greyed when disabled.
// The text starts 48px in, after the 16px glyph and its padding, and stops short of the clear
// button.
const BASE_CLASSES =
  'block w-full rounded-cmn-md border-0 border-b border-border-strong bg-cmn-field font-base ' +
  'text-text-primary placeholder:text-text-placeholder pl-cmn-12 pr-cmn-12 ' +
  'hover:bg-surface-hover focus:outline focus:outline-2 focus:-outline-offset-2 ' +
  'focus:outline-border-focus disabled:cursor-not-allowed disabled:border-border-default ' +
  'disabled:bg-cmn-field disabled:text-text-disabled disabled:placeholder:text-text-disabled ' +
  'transition-colors duration-cmn-short ease-cmn-standard ' +
  '[&::-webkit-search-cancel-button]:appearance-none max-md:min-h-cmn-touch';

// Below md every size keeps 16px text (iOS zooms the page into a focused field set smaller) and
// presses as at least --size-touch tall. md is the control height (`--cmn-control-h`) that a button
// beside it shares: Carbon's 48px at every width; sm and lg are Carbon's 32 and 64px.
const SIZE_CLASSES: Record<SearchInputSize, string> = {
  sm: 'h-cmn-size-sm text-cmn-md md:text-cmn-sm',
  md: 'h-cmn-control-h text-cmn-md',
  lg: 'h-cmn-16 text-cmn-lg',
};

/** Free-text search field with a leading icon and a clear button; value is a plain string. */
@Component({
  selector: 'cmn-search-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchInputComponent),
      multi: true,
    },
  ],
  host: {class: 'relative block'},
  template: `
    <cmn-icon
      class="pointer-events-none absolute left-cmn-4 top-1/2 -translate-y-1/2 text-text-secondary"
      name="Search"
      size="sm"
    />
    <input
      [value]="value()"
      [disabled]="disabled()"
      [placeholder]="placeholder()"
      [attr.aria-label]="ariaLabel()"
      [class]="classes()"
      (input)="onInput($event)"
      (keydown.escape)="clear()"
      (blur)="onBlur()"
      type="search"
      autocomplete="off"
    />
    @if (value() && !disabled()) {
      <button
        [attr.aria-label]="clearLabel()"
        (click)="clear()"
        class="absolute right-cmn-2 top-1/2 flex size-cmn-size-sm -translate-y-1/2 items-center justify-center text-text-secondary max-md:size-cmn-touch hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-focus"
        type="button"
      >
        <cmn-icon name="X" size="sm" />
      </button>
    }
  `,
})
export class SearchInputComponent implements ControlValueAccessor {
  public readonly size = input<SearchInputSize>('md');
  public readonly placeholder = input<string>('Search');
  public readonly ariaLabel = input<string>('Search');
  public readonly clearLabel = input<string>('Clear search');

  public readonly cleared = output<void>();

  public readonly classes = computed(() => `${BASE_CLASSES} ${SIZE_CLASSES[this.size()]}`);

  protected readonly value = signal<string>('');
  protected readonly disabled = signal<boolean>(false);

  private onChange: (value: string) => void = (_: string) => void 0;

  private onTouched: () => void = () => void 0;

  public writeValue(value: string | null | undefined): void {
    this.value.set(value ?? '');
  }

  public registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  public clear(): void {
    if (!this.value()) {
      return;
    }
    this.value.set('');
    this.onChange('');
    this.cleared.emit();
  }

  protected onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
