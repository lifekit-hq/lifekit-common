import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

import {ChipComponent} from '../chip/chip.component';
import {DATE_RANGE_TODAY, type DateRangePreset, resolveDateRangePreset} from './date-range-presets';

/** Inclusive range of ISO `yyyy-MM-dd` dates; either bound may be open (`null`). */
export interface DateRange {
  from: string | null;
  to: string | null;
}

const EMPTY_RANGE: DateRange = {from: null, to: null};

// Below md the text stays 16px (iOS zooms the page into a focused field set smaller) and each
// field presses as at least --size-touch tall.
const FIELD_CLASSES =
  'block w-full rounded-cmn-md border bg-surface-card px-cmn-2 py-cmn-1 text-cmn-md md:text-cmn-sm ' +
  'text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus ' +
  'focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed transition-colors max-md:min-h-cmn-touch';

interface PresetChip {
  label: string;
  preset: DateRangePreset;
  selected: boolean;
}

/**
 * Two native date inputs bound as one `{from, to}` value. An inverted range (`from > to`) is only
 * flagged visually (`aria-invalid` and an error border); it is still emitted and the control has no
 * validator, so consumers must validate `from <= to` themselves.
 *
 * `presets` adds a row of chips above the fields (none by default; `DATE_RANGE_PRESETS` holds the
 * built-ins). Choosing one sets both bounds and emits the change like typing would. The chip whose
 * range matches the current value reads as selected (`aria-pressed`), so editing a field by hand
 * clears it. Resolvers are evaluated against `DATE_RANGE_TODAY`.
 */
@Component({
  selector: 'cmn-date-range',
  imports: [ChipComponent],
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
    @if (presetChips().length > 0) {
      <div
        [attr.aria-label]="presetsLabel()"
        class="mb-cmn-2 flex flex-wrap gap-cmn-1"
        role="group"
      >
        @for (chip of presetChips(); track $index) {
          <cmn-chip
            [selected]="chip.selected"
            [disabled]="disabled()"
            (clicked)="choosePreset(chip.preset)"
          >
            {{ chip.label }}
          </cmn-chip>
        }
      </div>
    }
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
  private readonly today = inject(DATE_RANGE_TODAY);

  public readonly groupLabel = input<string>('Date range');
  public readonly fromLabel = input<string>('From date');
  public readonly toLabel = input<string>('To date');
  /** Quick picks shown as chips above the fields; none render unless passed. */
  public readonly presets = input<readonly DateRangePreset[]>([]);
  /** Accessible name of the preset chip row. */
  public readonly presetsLabel = input<string>('Date range presets');

  public readonly invalid = computed(() => {
    const {from, to} = this.value();
    return from !== null && to !== null && from > to;
  });
  public readonly fieldClasses = computed(
    () => `${FIELD_CLASSES} ${this.invalid() ? 'border-status-error' : 'border-border-strong'}`
  );

  protected readonly value = signal<DateRange>(EMPTY_RANGE);
  protected readonly disabled = signal<boolean>(false);

  /** Each preset resolved against today, flagged when its range is the current value. */
  protected readonly presetChips = computed<PresetChip[]>(() => {
    const presets = this.presets();
    if (presets.length === 0) {
      return [];
    }
    const today = this.today();
    const {from, to} = this.value();
    return presets.map(preset => {
      const range = resolveDateRangePreset(preset, today);
      return {
        label: preset.label,
        preset,
        selected: range.from === from && range.to === to,
      };
    });
  });

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

  protected choosePreset(preset: DateRangePreset): void {
    const {from, to} = resolveDateRangePreset(preset, this.today());
    const next: DateRange = {from, to};
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
