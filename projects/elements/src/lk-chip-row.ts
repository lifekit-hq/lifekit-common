import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from 'lit';

/** One chip of a chip row. */
export interface ChipRowOption {
  /** What `selected` holds (and the change event reports) while this chip is on. */
  value: string;
  /** The chip's text, shown whole on one line: the row scrolls, a label never truncates. */
  label: string;
  /** A count shown as a badge after the label, e.g. how many rows the filter matches. */
  count?: number;
  /** Takes the chip out of the tab order; it cannot be pressed. */
  disabled?: boolean;
}

/** How many chips can be on at once: exactly one, or any number. */
export type ChipRowMode = 'single' | 'multi';

/** `detail` of `lk-chip-row-change`. */
export interface ChipRowChangeDetail {
  /** The values that are on after the press, in option order. */
  selected: string[];
  /** The value of the chip that was pressed. */
  value: string;
}

/** Sub-pixel slack before an edge counts as scrollable. */
const SCROLL_TOLERANCE_PX = 1;

/**
 * A single-line row of filter chips that scrolls sideways instead of wrapping or truncating: the
 * quick filters above a list (a period, a status, an account). Every label shows whole; the row
 * fades at an edge while there is more to scroll that way, snaps chip by chip, and keeps the first
 * chip that is on in view when the selection changes.
 *
 * `mode="single"` (default) keeps exactly one chip on: pressing another moves the selection, and
 * pressing the one that is on does nothing. `mode="multi"` toggles each chip independently. Each
 * chip is a toggle button (`aria-pressed`) in a group named by `label`, and presses as a 44px
 * (`--size-touch`) target around a 32px pill. An option's `count` shows as a badge after its label.
 *
 * `selected` follows the native `change` model: the element updates it when the reader presses a
 * chip and fires `lk-chip-row-change`; a host that sets `selected` itself fires nothing.
 *
 * @example
 * <lk-chip-row label="Period"></lk-chip-row>
 * <script>
 *   const row = document.querySelector('lk-chip-row');
 *   row.options = [{value: 'week', label: 'This week'}, {value: 'month', label: 'This month'}];
 *   row.selected = ['month'];
 *   row.addEventListener('lk-chip-row-change', e => console.log(e.detail.selected));
 * </script>
 */
export class LkChipRow extends LitElement {
  private resizeObserver: ResizeObserver | undefined;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: block;
      min-width: 0;
      font-family: var(--font-sans);
      font-size: 0.875rem;
    }

    :host([hidden]) {
      display: none;
    }

    .row {
      --fade-start: 0px;
      --fade-end: 0px;
      display: flex;
      gap: var(--space-1, 0.25rem);
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x proximity;
      scrollbar-width: none;
      -webkit-mask-image: linear-gradient(
        to right,
        transparent,
        black var(--fade-start),
        black calc(100% - var(--fade-end)),
        transparent
      );
      mask-image: linear-gradient(
        to right,
        transparent,
        black var(--fade-start),
        black calc(100% - var(--fade-end)),
        transparent
      );
    }

    .row::-webkit-scrollbar {
      display: none;
    }

    /* The fade covers an edge only while the row can still scroll towards it. */
    .row[data-fade-start] {
      --fade-start: 1.5rem;
    }

    .row[data-fade-end] {
      --fade-end: 1.5rem;
    }

    /* The button is the 44px hit area, invisible; the pill drawn inside keeps chip size. */
    .chip {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--size-touch, 44px);
      min-height: var(--size-touch, 44px);
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      scroll-snap-align: start;
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      box-sizing: border-box;
      min-height: 2rem;
      padding-inline: var(--space-3, 0.75rem);
      border-radius: var(--radius-full, 9999px);
      background: var(--color-surface-raised, #e8edef);
      color: var(--color-text-secondary, #46565e);
      font-weight: 500;
      white-space: nowrap;
    }

    .chip:hover:not(:disabled) .pill {
      background: var(--color-surface-hover, #dce3e6);
      color: var(--color-text-primary, #0f1a1f);
    }

    .chip[aria-pressed='true'] .pill {
      background: var(--color-accent-default, #175a6d);
      color: var(--color-text-inverse, #ffffff);
    }

    .chip:disabled {
      cursor: not-allowed;
    }

    .chip:disabled .pill {
      color: var(--color-text-disabled, #66757c);
    }

    .chip:focus-visible {
      outline: none;
    }

    .chip:focus-visible .pill {
      outline: 2px solid var(--color-border-focus, #1d6f85);
      outline-offset: 2px;
    }

    .count {
      min-width: 1.25rem;
      padding-inline: var(--space-1, 0.25rem);
      border-radius: var(--radius-full, 9999px);
      background: var(--color-surface-card, #ffffff);
      color: var(--color-text-primary, #0f1a1f);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.25rem;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    options: {attribute: false},
    selected: {attribute: false},
    mode: {type: String, reflect: true},
    label: {type: String},
  };

  declare public options: ChipRowOption[];
  declare public selected: string[];
  declare public mode: ChipRowMode;
  declare public label: string;

  constructor() {
    super();
    this.options = [];
    this.selected = [];
    this.mode = 'single';
    this.label = '';
  }

  private get row(): HTMLElement | null {
    return this.shadowRoot?.querySelector('.row') ?? null;
  }

  private isOn(option: ChipRowOption): boolean {
    return this.selected.includes(option.value);
  }

  private press(option: ChipRowOption): void {
    if (option.disabled) {
      return;
    }
    let next: string[];
    if (this.mode === 'multi') {
      next = this.isOn(option)
        ? this.selected.filter(value => value !== option.value)
        : [...this.selected, option.value];
    } else if (this.isOn(option) && this.selected.length === 1) {
      return;
    } else {
      next = [option.value];
    }
    // Option order, whatever order the chips were pressed in.
    this.selected = this.options.map(o => o.value).filter(value => next.includes(value));
    this.dispatchEvent(
      new CustomEvent<ChipRowChangeDetail>('lk-chip-row-change', {
        detail: {selected: this.selected, value: option.value},
        bubbles: true,
        composed: true,
      })
    );
  }

  /** Fades an edge only while the row can still scroll towards it. */
  private updateFades(): void {
    const row = this.row;
    if (!row) {
      return;
    }
    const end = row.scrollWidth - row.clientWidth;
    row.toggleAttribute('data-fade-start', row.scrollLeft > SCROLL_TOLERANCE_PX);
    row.toggleAttribute('data-fade-end', end - row.scrollLeft > SCROLL_TOLERANCE_PX);
  }

  /** Scrolls the row, never the page, so the first chip that is on sits wholly in view. */
  private revealSelected(): void {
    const row = this.row;
    const index = this.options.findIndex(option => this.isOn(option));
    const chip = index === -1 ? null : row?.querySelectorAll<HTMLElement>('.chip')[index];
    if (!row || !chip) {
      return;
    }
    const start = chip.offsetLeft - row.offsetLeft;
    const end = start + chip.offsetWidth;
    if (start < row.scrollLeft) {
      row.scrollLeft = start;
    } else if (end > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = end - row.clientWidth;
    }
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this.observeRow();
    }
  }

  public override disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.observeRow();
  }

  private observeRow(): void {
    const row = this.row;
    if (row && !this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateFades());
      this.resizeObserver.observe(row);
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('selected') || changed.has('options')) {
      this.revealSelected();
    }
    this.updateFades();
  }

  protected override render(): TemplateResult {
    return html`
      <div
        class="row"
        role="group"
        aria-label=${this.label || nothing}
        @scroll=${() => this.updateFades()}
      >
        ${this.options.map(
          option => html`
            <button
              type="button"
              class="chip"
              aria-pressed=${this.isOn(option) ? 'true' : 'false'}
              ?disabled=${option.disabled}
              @click=${() => this.press(option)}
            >
              <span class="pill">
                ${option.label}
                ${
                  option.count === undefined
                    ? nothing
                    : html`<span class="count">${option.count}</span>`
                }
              </span>
            </button>
          `
        )}
      </div>
    `;
  }
}

customElements.define('lk-chip-row', LkChipRow);
