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

const BASE_CLASSES =
  'block w-full rounded-cmn-md border border-border-default bg-surface-card font-base ' +
  'text-text-primary placeholder:text-text-placeholder pl-cmn-8 pr-cmn-8 ' +
  'focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus ' +
  'disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ' +
  '[&::-webkit-search-cancel-button]:appearance-none';

const SIZE_CLASSES: Record<SearchInputSize, string> = {
  sm: 'py-cmn-1 text-cmn-sm',
  md: 'py-cmn-2 text-cmn-md',
  lg: 'py-cmn-3 text-cmn-lg',
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
      class="pointer-events-none absolute left-cmn-2 top-1/2 -translate-y-1/2 text-text-secondary"
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
        class="absolute right-cmn-2 top-1/2 -translate-y-1/2 rounded-cmn-sm text-text-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
