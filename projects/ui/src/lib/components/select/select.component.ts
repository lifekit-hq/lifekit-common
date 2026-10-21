import {_IdGenerator} from '@angular/cdk/a11y';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
  Overlay,
} from '@angular/cdk/overlay';
import {DOCUMENT} from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {ChipComponent} from '../chip/chip.component';
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

type ActivePosition = 'selected' | 'first' | 'last';

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

// The combobox field is a wrapper around the focusable element, so it takes the focus styles from
// whatever inside it holds focus, and the ring from the combobox's keyboard focus alone.
const COMBOBOX_FIELD_BASE =
  'flex w-full items-center gap-cmn-2 rounded border bg-surface-bg px-cmn-2 text-text-primary ' +
  'transition-colors max-md:min-h-cmn-touch focus-within:border-accent-default ' +
  'has-[[role=combobox]:focus-visible]:ring-2 has-[[role=combobox]:focus-visible]:ring-border-focus';

const CLEAR_BUTTON_CLASSES =
  'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-cmn-full p-0.5 ' +
  'text-text-secondary hover:bg-surface-raised hover:text-text-primary focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-border-focus ' +
  PHONE_HIT_AREA_CLASSES;

const OPTION_BASE =
  'flex cursor-pointer items-center gap-cmn-2 px-cmn-3 py-cmn-1 text-cmn-sm text-text-primary ' +
  'max-md:min-h-cmn-touch';

const CHECK_BOX_BASE =
  'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-cmn-sm border transition-colors';

const DEFAULT_MIN_PANEL_WIDTH_PX = 192;

/** APG type-ahead: keys typed within this window build one search string. */
const TYPEAHEAD_RESET_MS = 500;

const POSITIONS: ConnectedPosition[] = [
  {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4},
  {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4},
];

/**
 * Select. The plain single mode is deliberately a native <select> + design tokens rather than a
 * third-party widget: it needs no external stylesheet or icon registration, stays consistent
 * with the app's Tailwind theme, and gets accessibility + keyboard type-ahead for free.
 *
 * `showSearch` and `mode="multiple"` render the WAI-ARIA APG combobox instead, with a listbox
 * popup in a CDK overlay. Focus stays on the combobox and `aria-activedescendant` names the active
 * option: arrows, Home and End move it, Enter picks it, Escape and Tab close the popup.
 * - `showSearch` makes the combobox a text field that filters the options by label as you type.
 * - Without it, the combobox is a select-only field with type-ahead; Space picks too.
 * - `mode="multiple"` binds an array of option values (it replaced `cmn-multi-select`). Picking
 *   toggles an option and keeps the popup open; each pick shows in the field as a removable
 *   `cmn-chip`, and Backspace in an empty search field removes the last one.
 */
@Component({
  selector: 'cmn-select',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, ChipComponent, IconComponent],
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
    @if (isCombobox()) {
      <!-- Pointer convenience only: the combobox inside owns focus and the keyboard. -->
      <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
      <div
        #origin="cdkOverlayOrigin"
        #field
        [class]="fieldClasses()"
        (click)="onFieldClick($event)"
        (focusout)="onFocusOut($event)"
        cdkOverlayOrigin
      >
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-cmn-1">
          @if (mode() === 'multiple') {
            @for (option of selectedOptions(); track option.value) {
              <cmn-chip
                [disabled]="disabled()"
                [removeLabel]="removeLabelPrefix() + ' ' + option.label"
                (removed)="removeValue(option.value)"
                removable
                >{{ option.label }}</cmn-chip
              >
            }
          }
          @if (showSearch()) {
            <input
              #combobox
              [value]="inputText()"
              [placeholder]="inputPlaceholder()"
              [disabled]="disabled()"
              [attr.aria-label]="accessibleName()"
              [attr.aria-invalid]="hasError() ? 'true' : null"
              [attr.aria-expanded]="isOpen()"
              [attr.aria-controls]="isOpen() ? listboxId : null"
              [attr.aria-activedescendant]="activeDescendant()"
              [class]="searchInputClasses()"
              (input)="onSearchInput($event)"
              (keydown)="onKeydown($event)"
              (focus)="selectSearchText()"
              role="combobox"
              aria-autocomplete="list"
              autocomplete="off"
              type="text"
            />
          } @else {
            <div
              #combobox
              [attr.tabindex]="disabled() ? null : 0"
              [attr.aria-label]="accessibleName()"
              [attr.aria-disabled]="disabled() ? 'true' : null"
              [attr.aria-invalid]="hasError() ? 'true' : null"
              [attr.aria-expanded]="isOpen()"
              [attr.aria-controls]="isOpen() ? listboxId : null"
              [attr.aria-activedescendant]="activeDescendant()"
              (keydown)="onKeydown($event)"
              class="min-w-0 flex-1 truncate outline-none"
              role="combobox"
              aria-haspopup="listbox"
            >
              @if (hasSelection()) {
                <span class="sr-only">{{ summary() }}</span>
              } @else {
                <span class="text-text-placeholder">{{ placeholderText() }}</span>
              }
            </div>
          }
        </div>
        @if (showClear()) {
          <button
            [class]="clearButtonClasses"
            [attr.aria-label]="clearLabel()"
            (click)="clear()"
            type="button"
          >
            <cmn-icon name="X" size="sm" />
          </button>
        }
        <cmn-icon [size]="iconSize()" class="shrink-0 text-text-secondary" name="ChevronDown" />
      </div>

      <ng-template
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="isOpen()"
        [cdkConnectedOverlayPositions]="positions"
        [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
        [cdkConnectedOverlayMinWidth]="panelMinWidth()"
        (detach)="close()"
        (overlayKeydown)="onOverlayKeydown($event)"
        (overlayOutsideClick)="onOutsideClick($event)"
        cdkConnectedOverlay
      >
        <!-- Pointer presses keep focus on the combobox, which owns the keyboard. -->
        <div
          (mousedown)="$event.preventDefault()"
          class="max-h-64 w-full overflow-y-auto rounded-cmn-lg bg-surface-card py-cmn-2 shadow-cmn-lg"
        >
          <div
            [id]="listboxId"
            [attr.aria-label]="accessibleName()"
            [attr.aria-multiselectable]="mode() === 'multiple' ? 'true' : null"
            role="listbox"
          >
            @for (option of visibleOptions(); track option.value; let i = $index) {
              <!-- Options stay unfocusable: the combobox's keydown picks the active one. -->
              <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
              <div
                [id]="optionId(i)"
                [attr.aria-selected]="isSelected(option.value)"
                [attr.aria-disabled]="option.disabled ? 'true' : null"
                [class]="optionClasses(i, option)"
                (click)="pick(option)"
                role="option"
              >
                @if (mode() === 'multiple') {
                  <span [class]="checkClasses(option.value)" aria-hidden="true">
                    @if (isSelected(option.value)) {
                      <cmn-icon name="Check" size="sm" />
                    }
                  </span>
                }
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
                @if (mode() !== 'multiple' && isSelected(option.value)) {
                  <cmn-icon class="shrink-0 text-accent-default" name="Check" size="sm" />
                }
              </div>
            }
          </div>
          @if (visibleOptions().length === 0) {
            <p class="px-cmn-3 py-cmn-2 text-cmn-sm text-text-secondary">
              {{ hasOptions() ? noMatchesLabel() : emptyLabel() }}
            </p>
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
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly field = viewChild<ElementRef<HTMLElement>>('field');
  private readonly combobox = viewChild<ElementRef<HTMLElement>>('combobox');
  private readonly activeIndex = signal(-1);
  private typeahead = '';
  private typeaheadAt = 0;
  /** Keeps the active option in view as the arrows move through a scrolling popup. */
  private readonly revealActive = afterRenderEffect(() => {
    const id = this.activeDescendant();
    if (id) {
      this.document.getElementById(id)?.scrollIntoView({block: 'nearest'});
    }
  });

  public readonly options = input<readonly SelectOption[]>([]);
  public readonly placeholder = input<string>('');
  public readonly size = input<SelectSize>('md');
  public readonly mode = input<SelectMode>('default');
  /** The native single select offers its placeholder as an option; the search field shows an ×. */
  public readonly allowClear = input<boolean>(false);
  /** Renders a search field that filters the options by label (an APG editable combobox). */
  public readonly showSearch = input<boolean>(false);
  public readonly hasError = input<boolean>(false);
  /** Names the select when there is no `cmn-form-field` label; defaults to the placeholder. */
  public readonly ariaLabel = input<string | null>(null, {alias: 'aria-label'});
  /** Names the × that empties the selection. */
  public readonly clearLabel = input<string>('Clear selection');
  /** Shown in the popup when there are no options. */
  public readonly emptyLabel = input<string>('No options');
  /** `showSearch`: shown in the popup when no option matches the search. */
  public readonly noMatchesLabel = input<string>('No matches');
  /** `mode="multiple"`: prefixes an option's label to name its chip's ×, e.g. "Remove Rent". */
  public readonly removeLabelPrefix = input<string>('Remove');
  /** The popup's minimum width in px; it never gets narrower than the field. */
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
  public readonly fieldClasses = computed(() =>
    [
      COMBOBOX_FIELD_BASE,
      this.hasError() ? 'border-status-error' : 'border-border-strong',
      this.disabled() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
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
      return this.placeholderText();
    }
    if (selected.length === 1) {
      return this.options().find(o => o.value === selected[0])?.label ?? '1 selected';
    }
    return `${selected.length} selected`;
  });
  /** The options left after the search, in their original order. */
  public readonly visibleOptions = computed<readonly SelectOption[]>(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const options = this.options();
    return query ? options.filter(o => o.label.toLocaleLowerCase().includes(query)) : options;
  });

  protected readonly defaultPlaceholder = 'Select…';
  protected readonly clearButtonClasses = CLEAR_BUTTON_CLASSES;
  protected readonly listboxId = inject(_IdGenerator).getId('cmn-select-listbox-');

  protected readonly value = signal<SelectValue>(null);
  protected readonly disabled = signal<boolean>(false);
  protected readonly query = signal('');
  protected readonly panelMinWidth = signal(DEFAULT_MIN_PANEL_WIDTH_PX);
  protected readonly isEmpty = computed(() => {
    const v = this.value();
    return v === null || v === undefined || v === '';
  });
  protected readonly isCombobox = computed(() => this.mode() === 'multiple' || this.showSearch());
  protected readonly hasOptions = computed(() => this.options().length > 0);
  protected readonly placeholderText = computed(
    () => this.placeholder() || this.defaultPlaceholder
  );
  protected readonly accessibleName = computed(
    () => this.ariaLabel() || this.placeholder() || null
  );
  /** The selected options in the order they were picked; values with no option are skipped. */
  protected readonly selectedOptions = computed(() =>
    this.selected().flatMap(v => this.options().find(o => o.value === v) ?? [])
  );
  protected readonly selectedLabel = computed(() =>
    this.mode() === 'multiple' ? '' : (this.selectedOptions()[0]?.label ?? '')
  );
  /** The search field shows the query while the popup is open, else the picked label. */
  protected readonly inputText = computed(() =>
    this.isOpen() ? this.query() : this.selectedLabel()
  );
  protected readonly inputPlaceholder = computed(() =>
    this.mode() === 'multiple' && this.hasSelection()
      ? ''
      : this.selectedLabel() || this.placeholderText()
  );
  protected readonly showClear = computed(
    () =>
      !this.disabled() && this.hasSelection() && (this.mode() === 'multiple' || this.allowClear())
  );
  protected readonly searchInputClasses = computed(
    () =>
      'min-w-16 flex-1 bg-transparent outline-none disabled:cursor-not-allowed ' +
      // An open field shows the picked label as its placeholder; keep it readable until typing.
      (this.selectedLabel()
        ? 'placeholder:text-text-secondary'
        : 'placeholder:text-text-placeholder')
  );

  protected readonly activeDescendant = computed(() => {
    const index = this.activeIndex();
    return this.isOpen() && index >= 0 && index < this.visibleOptions().length
      ? this.optionId(index)
      : null;
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
    if (isDisabled) {
      this.isOpen.set(false);
    }
  }

  public toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(position: ActivePosition = 'selected'): void {
    if (this.disabled() || this.isOpen()) {
      return;
    }
    const width = this.field()?.nativeElement.getBoundingClientRect().width ?? 0;
    this.panelMinWidth.set(Math.max(this.minWidth(), Math.round(width)));
    this.isOpen.set(true);
    this.activeIndex.set(this.initialIndex(position));
  }

  public close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.query.set('');
    this.activeIndex.set(-1);
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

  public removeValue(optionValue: SelectOptionValue): void {
    this.commit(this.selected().filter(v => v !== optionValue));
    this.focusCombobox();
  }

  public clear(): void {
    this.commit(this.mode() === 'multiple' ? [] : null);
    this.query.set('');
    this.focusCombobox();
  }

  /** Picks an option: single mode selects it and closes; multiple toggles it and stays open. */
  public pick(option: SelectOption): void {
    if (option.disabled) {
      return;
    }
    if (this.mode() === 'multiple') {
      this.toggleOption(option.value);
      this.query.set('');
      this.activeIndex.set(this.visibleOptions().findIndex(o => o.value === option.value));
    } else {
      this.commit(option.value);
      this.close();
      this.selectSearchText();
    }
  }

  public onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }
    const editable = this.showSearch();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
        } else if (!event.altKey) {
          this.moveActive(1);
        }
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (event.altKey) {
          this.close();
        } else if (!this.isOpen()) {
          this.open(this.hasSelection() ? 'selected' : 'last');
        } else {
          this.moveActive(-1);
        }
        return;
      case 'Home':
      case 'End':
        // In a search field Home and End move the caret.
        if (!editable) {
          event.preventDefault();
          this.open();
          this.activeIndex.set(this.initialIndex(event.key === 'Home' ? 'first' : 'last'));
        }
        return;
      case 'Enter':
        if (this.isOpen()) {
          event.preventDefault();
          this.pickActive();
        } else if (!editable) {
          event.preventDefault();
          this.open();
        }
        return;
      case ' ':
        if (!editable) {
          event.preventDefault();
          if (this.isOpen()) {
            this.pickActive();
          } else {
            this.open();
          }
        }
        return;
      case 'Escape':
        if (this.isOpen()) {
          event.preventDefault();
          this.close();
        }
        return;
      case 'Tab':
        if (this.isOpen()) {
          this.close();
        }
        return;
      case 'Backspace':
        if (editable && this.query() === '' && this.mode() === 'multiple') {
          if (this.hasSelection()) {
            this.commit(this.selected().slice(0, -1));
          }
        }
        return;
      default:
        if (!editable && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          this.typeAhead(event.key);
        }
    }
  }

  public onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  protected onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    if (this.isOpen()) {
      this.activeIndex.set(this.initialIndex('first'));
    } else {
      this.open('first');
    }
  }

  protected onFieldClick(event: MouseEvent): void {
    if (this.disabled() || (event.target as HTMLElement).closest('button')) {
      return;
    }
    this.focusCombobox();
    if (this.showSearch()) {
      this.open();
    } else {
      this.toggle();
    }
  }

  /** Focus leaving the field (the popup never takes it) ends the interaction. */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) {
      return;
    }
    if (this.isOpen()) {
      this.close();
    } else {
      this.onTouched();
    }
  }

  /**
   * Selects the search field's text once it shows the picked label, so typing replaces the label
   * with a fresh search instead of appending to it.
   */
  protected selectSearchText(): void {
    afterNextRender(
      () => {
        const el = this.combobox()?.nativeElement;
        if (el instanceof HTMLInputElement && this.document.activeElement === el) {
          el.select();
        }
      },
      {injector: this.injector}
    );
  }

  protected onOutsideClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected optionId(index: number): string {
    return `${this.listboxId}-${index}`;
  }

  protected optionClasses(index: number, option: SelectOption): string {
    const state = option.disabled
      ? 'cursor-not-allowed opacity-60'
      : index === this.activeIndex()
        ? 'bg-surface-hover'
        : 'hover:bg-surface-raised';
    return `${OPTION_BASE} ${state}`;
  }

  protected checkClasses(optionValue: SelectOptionValue): string {
    return `${CHECK_BOX_BASE} ${
      this.isSelected(optionValue)
        ? 'border-accent-default bg-accent-default text-text-inverse'
        : 'border-border-strong bg-surface-bg'
    }`;
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

  private pickActive(): void {
    const option = this.visibleOptions()[this.activeIndex()];
    if (option) {
      this.pick(option);
    }
  }

  /** Moves the active option by `step`, skipping disabled options and stopping at either end. */
  private moveActive(step: 1 | -1): void {
    const options = this.visibleOptions();
    for (let i = this.activeIndex() + step; i >= 0 && i < options.length; i += step) {
      if (!options[i].disabled) {
        this.activeIndex.set(i);
        return;
      }
    }
  }

  private initialIndex(position: ActivePosition): number {
    const options = this.visibleOptions();
    const enabled = (o: SelectOption): boolean => !o.disabled;
    if (position === 'last') {
      for (let i = options.length - 1; i >= 0; i--) {
        if (enabled(options[i])) {
          return i;
        }
      }
      return -1;
    }
    if (position === 'selected') {
      const selected = options.findIndex(o => enabled(o) && this.isSelected(o.value));
      if (selected >= 0) {
        return selected;
      }
    }
    return options.findIndex(enabled);
  }

  /** APG type-ahead: activates the next enabled option whose label starts with the typed keys. */
  private typeAhead(key: string): void {
    const now = Date.now();
    this.typeahead = now - this.typeaheadAt > TYPEAHEAD_RESET_MS ? key : this.typeahead + key;
    this.typeaheadAt = now;
    this.open();

    const search = this.typeahead.toLocaleLowerCase();
    const options = this.visibleOptions();
    // A fresh key searches from the option after the active one, so repeating it cycles.
    const start = this.typeahead.length === 1 ? this.activeIndex() + 1 : this.activeIndex();
    for (let n = 0; n < options.length; n++) {
      const i = (Math.max(start, 0) + n) % options.length;
      if (!options[i].disabled && options[i].label.toLocaleLowerCase().startsWith(search)) {
        this.activeIndex.set(i);
        return;
      }
    }
  }

  private focusCombobox(): void {
    this.combobox()?.nativeElement.focus();
  }

  private commit(next: SelectValue): void {
    this.value.set(next);
    this.onChange(next);
  }
}
