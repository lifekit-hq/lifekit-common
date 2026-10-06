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
import type {SelectOption, SelectOptionValue} from '../select/select.component';

export type MultiSelectSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<MultiSelectSize, string> = {
  sm: 'py-cmn-1 text-cmn-sm',
  md: 'py-cmn-2 text-cmn-md',
  lg: 'py-cmn-3 text-cmn-lg',
};

const TRIGGER_BASE =
  'flex w-full items-center justify-between gap-cmn-2 rounded-cmn-md border bg-surface-card ' +
  'px-cmn-3 text-left focus:outline-none focus:ring-2 focus:ring-border-focus ' +
  'focus:border-border-focus disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const DEFAULT_MIN_PANEL_WIDTH_PX = 192;

const POSITIONS: ConnectedPosition[] = [
  {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4},
  {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4},
];

/**
 * Dropdown checklist bound to an array of option values. The trigger summarises the selection
 * (the label when one option is picked, a count otherwise, the placeholder when none).
 */
@Component({
  selector: 'cmn-multi-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, CheckboxComponent, IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiSelectComponent),
      multi: true,
    },
  ],
  host: {class: 'block w-full'},
  template: `
    <button
      #origin="cdkOverlayOrigin"
      [disabled]="disabled()"
      [class]="triggerClasses()"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-expanded]="isOpen()"
      (click)="toggle()"
      cdkOverlayOrigin
      aria-haspopup="listbox"
      type="button"
    >
      <span [class.text-text-disabled]="!hasSelection()" class="truncate">{{ summary() }}</span>
      <cmn-icon class="shrink-0 text-text-secondary" name="ChevronDown" size="sm" />
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
        class="max-h-64 overflow-y-auto rounded-cmn-lg border border-border-default bg-surface-card py-cmn-2 shadow-cmn-lg"
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
  `,
})
export class MultiSelectComponent implements ControlValueAccessor {
  private readonly overlay = inject(Overlay);

  public readonly options = input<readonly SelectOption[]>([]);
  public readonly placeholder = input<string>('Select…');
  public readonly size = input<MultiSelectSize>('md');
  public readonly ariaLabel = input<string>('');
  public readonly clearLabel = input<string>('Clear selection');
  public readonly emptyLabel = input<string>('No options');
  public readonly hasError = input<boolean>(false);
  /** Min panel width in px; keep at least the trigger width. */
  public readonly minWidth = input<number>(DEFAULT_MIN_PANEL_WIDTH_PX);

  public readonly positions = POSITIONS;
  public readonly scrollStrategy = this.overlay.scrollStrategies.reposition();
  public readonly isOpen = signal(false);

  public readonly hasSelection = computed(() => this.value().length > 0);
  public readonly summary = computed(() => {
    const selected = this.options().filter(o => this.value().includes(o.value));
    if (selected.length === 0) {
      return this.placeholder();
    }
    return selected.length === 1 ? selected[0].label : `${selected.length} selected`;
  });
  public readonly triggerClasses = computed(() =>
    [
      TRIGGER_BASE,
      SIZE_CLASSES[this.size()],
      this.hasError() ? 'border-status-error' : 'border-border-default',
    ].join(' ')
  );

  protected readonly value = signal<readonly SelectOptionValue[]>([]);
  protected readonly disabled = signal<boolean>(false);

  private onChange: (value: SelectOptionValue[]) => void = (_: SelectOptionValue[]) => void 0;

  private onTouched: () => void = () => void 0;

  public writeValue(value: readonly SelectOptionValue[] | null | undefined): void {
    this.value.set(value ?? []);
  }

  public registerOnChange(fn: (value: SelectOptionValue[]) => void): void {
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

  public isSelected(optionValue: SelectOptionValue): boolean {
    return this.value().includes(optionValue);
  }

  public toggleOption(optionValue: SelectOptionValue): void {
    this.commit(
      this.isSelected(optionValue)
        ? this.value().filter(v => v !== optionValue)
        : [...this.value(), optionValue]
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

  private commit(next: SelectOptionValue[]): void {
    this.value.set(next);
    this.onChange(next);
  }
}
