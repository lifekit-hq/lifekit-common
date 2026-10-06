import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

/** Inclusive range of ISO `yyyy-MM-dd` dates; either bound may be open (`null`). */
export interface DateRange {
  from: string | null;
  to: string | null;
}

const EMPTY_RANGE: DateRange = {from: null, to: null};

const FIELD_CLASSES =
  'block w-full rounded-cmn-md border bg-surface-card px-cmn-2 py-cmn-1 text-cmn-sm ' +
  'text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus ' +
  'focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

/** Two native date inputs bound as one `{from, to}` value; flags an inverted range as invalid. */
@Component({
  selector: 'cmn-date-range',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateRangeComponent),
      multi: true,
    },
  ],
  host: {class: 'block'},
  template: `
    <div [attr.aria-label]="groupLabel()" class="flex items-center gap-cmn-2" role="group">
      <label class="flex-1">
        <span class="sr-only">{{ fromLabel() }}</span>
        <input
          [value]="value().from ?? ''"
          [max]="value().to ?? ''"
          [disabled]="disabled()"
          [class]="fieldClasses()"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          (input)="onField('from', $event)"
          (blur)="onBlur()"
          type="date"
        />
      </label>
      <span class="text-cmn-sm text-text-secondary" aria-hidden="true">–</span>
      <label class="flex-1">
        <span class="sr-only">{{ toLabel() }}</span>
        <input
          [value]="value().to ?? ''"
          [min]="value().from ?? ''"
          [disabled]="disabled()"
          [class]="fieldClasses()"
          [attr.aria-invalid]="invalid() ? 'true' : null"
          (input)="onField('to', $event)"
          (blur)="onBlur()"
          type="date"
        />
      </label>
    </div>
  `,
})
export class DateRangeComponent implements ControlValueAccessor {
  public readonly groupLabel = input<string>('Date range');
  public readonly fromLabel = input<string>('From date');
  public readonly toLabel = input<string>('To date');

  public readonly invalid = computed(() => {
    const {from, to} = this.value();
    return from !== null && to !== null && from > to;
  });
  public readonly fieldClasses = computed(
    () => `${FIELD_CLASSES} ${this.invalid() ? 'border-status-error' : 'border-border-default'}`
  );

  protected readonly value = signal<DateRange>(EMPTY_RANGE);
  protected readonly disabled = signal<boolean>(false);

  private onChange: (value: DateRange) => void = (_: DateRange) => void 0;

  private onTouched: () => void = () => void 0;

  public writeValue(value: DateRange | null | undefined): void {
    this.value.set({from: value?.from || null, to: value?.to || null});
  }

  public registerOnChange(fn: (value: DateRange) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onField(bound: keyof DateRange, event: Event): void {
    const next: DateRange = {
      ...this.value(),
      [bound]: (event.target as HTMLInputElement).value || null,
    };
    this.value.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
