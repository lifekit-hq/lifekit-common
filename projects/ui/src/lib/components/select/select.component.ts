import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
  Overlay,
} from '@angular/cdk/overlay';
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

import {CheckboxComponent} from '../checkbox/checkbox.component';
import {IconComponent} from '../icon/icon.component';

export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectMode = 'default' | 'multiple';
export type SelectOptionValue = string | number;
export type SelectValue = SelectOptionValue | SelectOptionValue[] | null;

export interface SelectOption {
  label: string;
  value: SelectOptionValue;
  disabled?: boolean;
}

// Below md every size keeps 16px text (iOS zooms the page into a focused field set smaller) and
// presses as at least --size-touch tall.
const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: 'py-1 text-cmn-md md:text-cmn-xs',
  md: 'py-1.5 text-cmn-md md:text-cmn-sm',
  lg: 'py-2 text-cmn-md',
};

const ICON_SIZE: Record<SelectSize, 'sm' | 'md' | 'lg'> = {
  sm: 'sm',
  md: 'sm',
  lg: 'md',
};

const FIELD_BASE =
  'w-full rounded border bg-surface-bg text-text-primary outline-none transition-colors ' +
  'max-md:min-h-cmn-touch focus:border-accent-default focus-visible:ring-2 ' +
  'focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60';

const DEFAULT_MIN_PANEL_WIDTH_PX = 192;

const POSITIONS: ConnectedPosition[] = [
  {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4},
  {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4},
];

/**
 * Select. The single mode is deliberately a plain <select> + design tokens rather than a
 * third-party widget: it needs no external stylesheet or icon registration, stays consistent
 * with the app's Tailwind theme, and gets accessibility + keyboard type-ahead for free.
 *
 * `mode="multiple"` is a dropdown checklist bound to an array of option values (it replaced
 * `cmn-multi-select`). The trigger summarises the selection: the label when one option is picked,
 * a count otherwise, the placeholder when none.
 */
@Component({
  selector: 'cmn-select',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, CheckboxComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'[attr.aria-label]': 'null'},
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
  template: `
    @if (mode() === 'multiple') {
      <button
        #origin="cdkOverlayOrigin"
        [disabled]="disabled()"
        [class]="triggerClasses()"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-invalid]="hasError() ? 'true' : null"
        [attr.aria-expanded]="isOpen()"
        (click)="toggle()"
        cdkOverlayOrigin
        aria-haspopup="listbox"
        type="button"
      >
        <span [class.text-text-placeholder]="!hasSelection()" class="truncate">{{
          summary()
        }}</span>
        <cmn-icon [size]="iconSize()" class="shrink-0 text-text-secondary" name="ChevronDown" />
      </button>

      <ng-template
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="isOpen()"
        [cdkConnectedOverlayHasBackdrop]="true"
        [cdkConnectedOverlayPositions]="positions"
        [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
        [cdkConnectedOverlayMinWidth]="minWidth()"
        (backdropClick)="close()"
        (overlayKeydown)="onOverlayKeydown($event)"
        cdkConnectedOverlay
        cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      >
        <div
          class="max-h-64 overflow-y-auto rounded-cmn-lg bg-surface-card py-cmn-2 shadow-cmn-lg"
          role="listbox"
          aria-multiselectable="true"
        >
          @for (option of options(); track option.value) {
            <div
              [attr.aria-selected]="isSelected(option.value)"
              class="px-cmn-3 py-cmn-1 hover:bg-surface-raised"
              role="option"
            >
              <cmn-checkbox
                [checked]="isSelected(option.value)"
                [disabled]="option.disabled ?? false"
                [label]="option.label"
                (changed)="toggleOption(option.value)"
              >
                <span class="text-cmn-sm text-text-primary">{{ option.label }}</span>
              </cmn-checkbox>
            </div>
          } @empty {
            <p class="px-cmn-3 py-cmn-2 text-cmn-sm text-text-secondary">{{ emptyLabel() }}</p>
          }
          @if (hasSelection()) {
            <button
              (click)="clear()"
              class="mt-cmn-1 w-full border-t border-border-default px-cmn-3 pt-cmn-2 text-left text-cmn-sm text-accent-default hover:underline focus:outline-none focus-visible:underline"
              type="button"
            >
              {{ clearLabel() }}
            </button>
          }
        </div>
      </ng-template>
    } @else {
      <div class="cmn-select relative w-full">
        <select
          #native
          [class]="selectClasses()"
          [disabled]="disabled()"
          [attr.aria-label]="ariaLabel() || placeholder() || null"
          [attr.aria-invalid]="hasError() ? 'true' : null"
          (change)="onNativeChange($event)"
          (blur)="onBlur()"
        >
          <option [selected]="isEmpty()" [disabled]="!allowClear()" value="">
            {{ placeholder() || defaultPlaceholder }}
          </option>
          @for (option of options(); track option.value) {
            <option
              [value]="option.value"
              [selected]="isSelected(option.value)"
              [disabled]="option.disabled ?? false"
            >
              {{ option.label }}
            </option>
          }
        </select>
        <cmn-icon
          [size]="iconSize()"
          name="ChevronDown"
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary"
        />
      </div>
    }
  `,
})
export class SelectComponent implements ControlValueAccessor {
  private readonly overlay = inject(Overlay);

  public readonly options = input<readonly SelectOption[]>([]);
  public readonly placeholder = input<string>('');
  public readonly size = input<SelectSize>('md');
  public readonly mode = input<SelectMode>('default');
  public readonly allowClear = input<boolean>(false);
  // Kept for API compatibility; native selects have built-in keyboard type-ahead.
  public readonly showSearch = input<boolean>(false);
  public readonly hasError = input<boolean>(false);
  /** Names the select when there is no `cmn-form-field` label; defaults to the placeholder. */
  public readonly ariaLabel = input<string | null>(null, {alias: 'aria-label'});
  /** `mode="multiple"`: the panel action that empties the selection. */
  public readonly clearLabel = input<string>('Clear selection');
  /** `mode="multiple"`: shown in the panel when there are no options. */
  public readonly emptyLabel = input<string>('No options');
  /** `mode="multiple"`: the panel's minimum width in px; keep at least the trigger width. */
  public readonly minWidth = input<number>(DEFAULT_MIN_PANEL_WIDTH_PX);

  public readonly positions = POSITIONS;
  public readonly scrollStrategy = this.overlay.scrollStrategies.reposition();
  public readonly isOpen = signal(false);

  public readonly iconSize = computed(() => ICON_SIZE[this.size()]);
  public readonly selectClasses = computed(() =>
    [
      'block appearance-none pl-cmn-2 pr-8',
      FIELD_BASE,
      this.hasError() ? 'border-status-error' : 'border-border-strong',
      SIZE_CLASSES[this.size()],
    ].join(' ')
  );
  public readonly triggerClasses = computed(() =>
    [
      'flex items-center justify-between gap-cmn-2 px-cmn-2 text-left',
      FIELD_BASE,
      this.hasError() ? 'border-status-error' : 'border-border-strong',
      SIZE_CLASSES[this.size()],
    ].join(' ')
  );

  /** The selected values in `mode="multiple"`; a single value reads as a one-item list. */
  public readonly selected = computed<readonly SelectOptionValue[]>(() => {
    const v = this.value();
    if (Array.isArray(v)) {
      return v;
    }
    return v === null || v === '' ? [] : [v];
  });
  public readonly hasSelection = computed(() => this.selected().length > 0);
  public readonly summary = computed(() => {
    const selected = this.selected();
    if (selected.length === 0) {
      return this.placeholder() || this.defaultPlaceholder;
    }
    if (selected.length === 1) {
      return this.options().find(o => o.value === selected[0])?.label ?? '1 selected';
    }
    return `${selected.length} selected`;
  });

  protected readonly defaultPlaceholder = 'Select…';

  protected readonly value = signal<SelectValue>(null);
  protected readonly disabled = signal<boolean>(false);
  protected readonly isEmpty = computed(() => {
    const v = this.value();
    return v === null || v === undefined || v === '';
  });

  private onChange: (value: SelectValue) => void = (_: SelectValue) => void 0;
  private onTouched: () => void = () => void 0;

  public writeValue(value: SelectValue | undefined): void {
    this.value.set(value ?? null);
  }

  public registerOnChange(fn: (value: SelectValue) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  public toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.isOpen.set(true);
    }
  }

  public close(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  public toggleOption(optionValue: SelectOptionValue): void {
    const selected = this.selected();
    this.commit(
      selected.includes(optionValue)
        ? selected.filter(v => v !== optionValue)
        : [...selected, optionValue]
    );
  }

  public clear(): void {
    this.commit([]);
  }

  public onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  protected isSelected(optionValue: SelectOptionValue): boolean {
    const v = this.value();
    return Array.isArray(v) ? v.includes(optionValue) : v === optionValue;
  }

  protected onNativeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.commit(target.value === '' ? null : target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  private commit(next: SelectValue): void {
    this.value.set(next);
    this.onChange(next);
  }
}
