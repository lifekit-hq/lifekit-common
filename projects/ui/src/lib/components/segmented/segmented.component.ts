import {
  type AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  viewChildren,
} from '@angular/core';

/** One cell of a segmented control. */
export interface SegmentedOption {
  /** What `value` becomes when this cell is chosen. */
  value: string;
  /** The cell's text; keep it short, the row never wraps. */
  label: string;
  /** Takes the cell out of the tab order and the arrow-key cycle. */
  disabled?: boolean;
}

/**
 * The host is the clip: a row that needs more than its container scrolls inside it (scrollbar
 * hidden, the chosen cell kept in view) and never widens the page.
 */
const CENTRE_DIVISOR = 2;

const HOST_CLASSES =
  'block max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/**
 * Equal columns as wide as the widest label (at least `--size-touch`): the row fills its container
 * when that is wider, and scrolls inside it rather than squeeze a label.
 */
const GROUP_CLASSES =
  'grid w-max min-w-full grid-flow-col auto-cols-[minmax(var(--size-touch),1fr)] gap-0.5 ' +
  'rounded-cmn-lg bg-surface-raised p-0.5 aria-disabled:opacity-60';

/** Cells at least `--size-touch` tall, never narrower than their label, never wrapping. */
const CELL_BASE_CLASSES =
  'min-h-cmn-touch min-w-max cursor-pointer select-none whitespace-nowrap ' +
  'rounded-cmn-md px-cmn-1 text-cmn-sm font-medium transition-colors touch-manipulation ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ' +
  'focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-text-disabled';
const CELL_CHECKED_CLASSES =
  'bg-accent-subtle font-semibold text-accent-default ring-1 ring-inset ring-border-strong';
/** Disabled text on the accent tint is gray on colour; a disabled choice sits on a neutral surface. */
const CELL_CHECKED_DISABLED_CLASSES =
  'bg-surface-card font-semibold ring-1 ring-inset ring-border-strong';
const CELL_UNCHECKED_CLASSES =
  'text-text-secondary enabled:hover:bg-surface-hover enabled:hover:text-text-primary';

interface SegmentedCell {
  option: SegmentedOption;
  checked: boolean;
  enabled: boolean;
  /** The one cell Tab can land on (roving tabindex). */
  tabStop: boolean;
  classes: string;
}

/** Where a key sends the choice: a step forward or back, or an end. `undefined` for other keys. */
function keyStep(key: string): 1 | -1 | 'first' | 'last' | undefined {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return 1;
    case 'ArrowLeft':
    case 'ArrowUp':
      return -1;
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return undefined;
  }
}

/**
 * One-row control for picking one value out of a short list: a theme mode, a chart period, a view
 * mode. It is a parameter control (a `radiogroup`), not a tablist: choosing a cell changes a value
 * the host reads, it does not swap a panel. The Angular counterpart of `lk-segmented`, with the same
 * behaviour.
 *
 * Semantics: `role="radiogroup"` of `role="radio"` cells with a roving tabindex. Tab lands on the
 * chosen cell (or the first enabled one), the arrow keys move and choose, Home and End jump to the
 * ends, and disabled cells are skipped. Cells share the row equally, never wrap, are at least
 * 44px square so a thumb can hit them, and are never narrower than their label; a row that needs
 * more than its container scrolls inside it. Use it for five segments or fewer with short labels;
 * more belong in a menu or a chip row.
 *
 * `value` is a two-way model: `[(value)]="mode"`, or `[value]` with `(valueChange)`. Name the
 * group with `label`; a control that has a visible label of its own can point `aria-labelledby`
 * at it instead.
 */
@Component({
  selector: 'cmn-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: HOST_CLASSES},
  template: `
    <div
      [attr.aria-label]="label() || null"
      [attr.aria-disabled]="disabled() ? 'true' : null"
      [class]="groupClasses"
      role="radiogroup"
    >
      @for (cell of cells(); track cell.option.value) {
        <button
          #cell
          [attr.aria-checked]="cell.checked"
          [attr.tabindex]="cell.tabStop ? 0 : -1"
          [class]="cell.classes"
          [disabled]="!cell.enabled"
          (click)="choose(cell.option)"
          (keydown)="onKeydown($event)"
          role="radio"
          type="button"
        >
          {{ cell.option.label }}
        </button>
      }
    </div>
  `,
})
export class SegmentedComponent implements AfterViewChecked {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private revealed: readonly SegmentedCell[] | undefined;

  private readonly cellElements = viewChildren<ElementRef<HTMLButtonElement>>('cell');

  public readonly options = input<readonly SegmentedOption[]>([]);
  /** The chosen option's `value`; `''` (or any value no option has) means none is chosen. */
  public readonly value = model<string>('');
  /** Accessible name of the group. */
  public readonly label = input<string>('');
  public readonly disabled = input<boolean>(false);

  protected readonly groupClasses = GROUP_CLASSES;

  protected readonly cells = computed<SegmentedCell[]>(() => {
    const options = this.options();
    const stop = this.tabStop(options);
    return options.map(option => {
      const checked = option.value === this.value();
      const enabled = this.isEnabled(option);
      return {
        option,
        checked,
        enabled,
        tabStop: option === stop,
        classes: `${CELL_BASE_CLASSES} ${this.stateClasses(checked, enabled)}`,
      };
    });
  });

  public ngAfterViewChecked(): void {
    const cells = this.cells();
    if (cells === this.revealed) {
      return;
    }
    this.revealed = cells;
    const host = this.host.nativeElement;
    const chosen = this.cellElements()
      .map(({nativeElement}) => nativeElement)
      .find(cell => cell.getAttribute('aria-checked') === 'true');
    if (chosen && host.scrollWidth > host.clientWidth) {
      const left = chosen.getBoundingClientRect().left - host.getBoundingClientRect().left;
      host.scrollLeft += left - (host.clientWidth - chosen.offsetWidth) / CENTRE_DIVISOR;
    }
  }

  protected choose(option: SegmentedOption): void {
    if (this.isEnabled(option) && option.value !== this.value()) {
      this.value.set(option.value);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const cells = this.cellElements().map(({nativeElement}) => nativeElement);
    const from = cells.indexOf(event.target as HTMLButtonElement);
    const target = from === -1 ? undefined : this.keyTarget(event.key, from);
    if (!target) {
      return;
    }
    event.preventDefault();
    cells[this.options().indexOf(target)]?.focus();
    this.choose(target);
  }

  private isEnabled(option: SegmentedOption): boolean {
    return !this.disabled() && !option.disabled;
  }

  private stateClasses(checked: boolean, enabled: boolean): string {
    if (!checked) {
      return CELL_UNCHECKED_CLASSES;
    }
    return enabled ? CELL_CHECKED_CLASSES : CELL_CHECKED_DISABLED_CLASSES;
  }

  /** The one cell Tab can land on: the chosen one, else the first enabled one. */
  private tabStop(options: readonly SegmentedOption[]): SegmentedOption | undefined {
    const chosen = options.find(o => o.value === this.value() && this.isEnabled(o));
    return chosen ?? options.find(o => this.isEnabled(o));
  }

  /** The enabled option the key travels to from cell `from`, wrapping at the ends. */
  private keyTarget(key: string, from: number): SegmentedOption | undefined {
    const step = keyStep(key);
    const options = this.options();
    const enabled = options.filter(o => this.isEnabled(o));
    if (step === undefined || enabled.length === 0) {
      return undefined;
    }
    if (step === 'first') {
      return enabled[0];
    }
    if (step === 'last') {
      return enabled[enabled.length - 1];
    }
    const count = options.length;
    for (let offset = 1; offset <= count; offset++) {
      const candidate = options[(((from + step * offset) % count) + count) % count];
      if (this.isEnabled(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }
}
