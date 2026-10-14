import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyDeclarations,
  type PropertyValues,
  type TemplateResult,
} from 'lit';

/** One cell of a segmented control. */
export interface SegmentedOption {
  /** What `value` becomes (and the change event reports) when this cell is chosen. */
  value: string;
  /** The cell's text; keep it short, the row never wraps. */
  label: string;
  /** Takes the cell out of the tab order and the arrow-key cycle. */
  disabled?: boolean;
}

/** `detail` of `lk-segmented-change`. */
export interface SegmentedChangeDetail {
  value: string;
}

/**
 * Development builds only: production Angular builds set `ngDevMode` to false, and other bundlers
 * replace `process.env.NODE_ENV` with "production".
 */
function isDevMode(): boolean {
  const scope = globalThis as {ngDevMode?: unknown; process?: {env?: Record<string, unknown>}};
  return scope.ngDevMode !== false && scope.process?.env?.['NODE_ENV'] !== 'production';
}

/** Sub-pixel slack before a row counts as wider than its container. */
const OVERFLOW_TOLERANCE_PX = 0.5;
const CENTRE_DIVISOR = 2;

/** Where a key sends the choice: a step forward or back, or an end. Undefined for other keys. */
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
 * One-row segmented control for picking one value out of a short list - a chart period, a view
 * mode. It is a parameter control (a radiogroup), not a tablist: choosing a cell changes a value
 * the host reads, it does not swap a panel.
 *
 * Semantics: `role="radiogroup"` of `role="radio"` cells with a roving tabindex - Tab lands on the
 * chosen cell (or the first enabled one), the arrow keys move and choose, Home/End jump to the
 * ends, and disabled cells are skipped. Cells share the row equally, never wrap, are at least
 * 44px square so a phone thumb can hit them, and are never narrower than their label: the row fills
 * its container, and scrolls sideways inside it rather than cut a label or widen the page.
 *
 * Use it for five segments or fewer, with short labels. More choices, or longer labels, belong in a
 * menu or an `lk-chip-row`. In development a row that has to scroll logs a console warning.
 *
 * `value` follows the native `change` model: the element updates it when the reader chooses a
 * cell and fires `lk-segmented-change`; a host that sets `value` itself fires nothing.
 *
 * @example
 * <lk-segmented label="History range" value="1M"></lk-segmented>
 * <script>
 *   const el = document.querySelector('lk-segmented');
 *   el.options = [{value: '1W', label: '1W'}, {value: '1M', label: '1M'}, {value: '1Y', label: '1Y'}];
 *   el.addEventListener('lk-segmented-change', e => console.log(e.detail.value));
 * </script>
 */
export class LkSegmented extends LitElement {
  private overflowObserver: ResizeObserver | undefined;
  private overflowWarned = false;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    /* The host is the clip: a row that needs more than the container scrolls inside it (scrollbar
       hidden, the chosen cell kept in view) and never widens the page. */
    :host {
      display: block;
      max-width: 100%;
      overflow-x: auto;
      scrollbar-width: none;
      font-family: var(--font-sans);
      font-size: 0.875rem;
    }

    :host::-webkit-scrollbar {
      display: none;
    }

    :host([hidden]) {
      display: none;
    }

    /* Equal columns as wide as the widest label (at least 44px); fills the container when that is
       wider, and scrolls inside it rather than squeeze a label. */
    .group {
      box-sizing: border-box;
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(2.75rem, 1fr);
      width: max-content;
      min-width: 100%;
      gap: 2px;
      padding: 2px;
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised, #e8edef);
    }

    .cell {
      min-width: max-content;
      min-height: 2.75rem;
      padding: 0 var(--space-1, 0.25rem);
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-secondary, #46565e);
      font: inherit;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      touch-action: manipulation;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .cell:hover:not(:disabled):not([aria-checked='true']) {
      background: var(--color-surface-hover, #dce3e6);
      color: var(--color-text-primary, #0f1a1f);
    }

    .cell[aria-checked='true'] {
      background: var(--color-accent-subtle, #e3f1f4);
      color: var(--color-accent-default, #175a6d);
      font-weight: 600;
      box-shadow: inset 0 0 0 1px var(--color-border-strong, #7d8c93);
    }

    .cell:disabled {
      color: var(--color-text-disabled, #66757c);
      cursor: not-allowed;
    }

    .cell:focus-visible {
      outline: 2px solid var(--color-border-focus, #1d6f85);
      outline-offset: -2px;
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    options: {attribute: false},
    value: {type: String, reflect: true},
    label: {type: String},
    disabled: {type: Boolean, reflect: true},
  };

  declare public options: SegmentedOption[];
  declare public value: string;
  declare public label: string;
  declare public disabled: boolean;

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.label = '';
    this.disabled = false;
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    if (isDevMode() && typeof ResizeObserver !== 'undefined') {
      this.overflowObserver = new ResizeObserver(() => this.warnOnOverflow());
      this.overflowObserver.observe(this);
    }
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.overflowObserver?.disconnect();
    this.overflowObserver = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    if (changed.has('value') || changed.has('options')) {
      this.revealChosen();
    }
  }

  /** Scrolls a row that overflows its container so the chosen cell sits in the middle of it. */
  private revealChosen(): void {
    const chosen = this.shadowRoot?.querySelector<HTMLElement>('.cell[aria-checked="true"]');
    if (!chosen || this.scrollWidth <= this.clientWidth) {
      return;
    }
    const left = chosen.getBoundingClientRect().left - this.getBoundingClientRect().left;
    this.scrollLeft += left - (this.clientWidth - chosen.offsetWidth) / CENTRE_DIVISOR;
  }

  /** Once per element: the cells need more room than the container gives the row. */
  private warnOnOverflow(): void {
    const group = this.shadowRoot?.querySelector('.group');
    if (this.overflowWarned || !group || this.clientWidth === 0) {
      return;
    }
    if (group.getBoundingClientRect().width > this.clientWidth + OVERFLOW_TOLERANCE_PX) {
      this.overflowWarned = true;
      console.warn(
        `lk-segmented: ${this.options.length} segments need more width than the ${this.clientWidth}px ` +
          'container gives them; use five or fewer short labels, or a menu or lk-chip-row.',
        this
      );
    }
  }

  private isEnabled(option: SegmentedOption): boolean {
    return !this.disabled && !option.disabled;
  }

  /** The one cell Tab can land on: the chosen one, else the first enabled one. */
  private tabStop(): SegmentedOption | undefined {
    const chosen = this.options.find(o => o.value === this.value && this.isEnabled(o));
    return chosen ?? this.options.find(o => this.isEnabled(o));
  }

  private choose(option: SegmentedOption): void {
    if (!this.isEnabled(option) || option.value === this.value) {
      return;
    }
    this.value = option.value;
    this.dispatchEvent(
      new CustomEvent<SegmentedChangeDetail>('lk-segmented-change', {
        detail: {value: option.value},
        bubbles: true,
        composed: true,
      })
    );
  }

  /** The enabled option the key travels to from `from`, wrapping at the ends. */
  private keyTarget(key: string, from: number): SegmentedOption | undefined {
    const step = keyStep(key);
    const enabled = this.options.filter(o => this.isEnabled(o));
    if (step === undefined || enabled.length === 0) {
      return undefined;
    }
    if (step === 'first') {
      return enabled[0];
    }
    if (step === 'last') {
      return enabled[enabled.length - 1];
    }
    const count = this.options.length;
    for (let offset = 1; offset <= count; offset++) {
      const candidate = this.options[(((from + step * offset) % count) + count) % count];
      if (this.isEnabled(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }

  private onKeydown(event: KeyboardEvent): void {
    const cells = Array.from(this.shadowRoot?.querySelectorAll<HTMLButtonElement>('.cell') ?? []);
    const from = cells.indexOf(event.target as HTMLButtonElement);
    const target = from === -1 ? undefined : this.keyTarget(event.key, from);
    if (!target) {
      return;
    }
    event.preventDefault();
    cells[this.options.indexOf(target)].focus();
    this.choose(target);
  }

  protected override render(): TemplateResult {
    const stop = this.tabStop();
    return html`
      <div
        class="group"
        role="radiogroup"
        aria-label=${this.label || nothing}
        aria-disabled=${this.disabled ? 'true' : nothing}
        @keydown=${(event: KeyboardEvent) => this.onKeydown(event)}
      >
        ${this.options.map(
          option => html`
            <button
              type="button"
              class="cell"
              role="radio"
              aria-checked=${option.value === this.value ? 'true' : 'false'}
              tabindex=${option === stop ? 0 : -1}
              ?disabled=${!this.isEnabled(option)}
              @click=${() => this.choose(option)}
            >
              ${option.label}
            </button>
          `
        )}
      </div>
    `;
  }
}

customElements.define('lk-segmented', LkSegmented);
