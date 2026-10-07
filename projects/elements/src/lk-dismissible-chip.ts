import {css, html, LitElement, type PropertyDeclarations, svg, type TemplateResult} from 'lit';

/** `detail` of `lk-dismissible-chip-remove`. */
export interface DismissibleChipRemoveDetail {
  /** The chip's `label` at the moment the reader removed it. */
  label: string;
}

const CROSS = svg`
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
    <path
      d="M3.5 3.5l9 9m0-9l-9 9"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
    />
  </svg>
`;

/**
 * Removable chip for an applied filter or a picked value: its label, plus a remove button the
 * reader can reach with Tab and press with Enter or Space. It is the one place a chip carries its
 * own remove affordance, so a host never nests an icon inside a selectable chip to fake one.
 *
 * The remove button is a native `<button>` named "Remove {label}" (override with `remove-label`
 * when the bare label is not enough, e.g. "Remove Category: Groceries" for a chip that reads
 * "Groceries"). Its hit area is `--size-touch` square at least; the pill drawn around the label
 * stays chip-sized, with the hit area reaching past it, so a row of chips looks the same on a
 * phone as on a desktop.
 *
 * The element does not remove itself: it fires `lk-dismissible-chip-remove` and the host drops the
 * chip from its own state. After a remove the host should move focus somewhere sensible (the
 * next chip, or the control that opened the filters), since the focused button is gone.
 *
 * @example
 * <lk-dismissible-chip label="Category: Groceries"></lk-dismissible-chip>
 * <script>
 *   const chip = document.querySelector('lk-dismissible-chip');
 *   chip.addEventListener('lk-dismissible-chip-remove', () => chip.remove());
 * </script>
 */
export class LkDismissibleChip extends LitElement {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: inline-block;
      max-width: 100%;
      font-family: var(--font-sans);
      font-size: 0.875rem;
    }

    :host([hidden]) {
      display: none;
    }

    .chip {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      min-height: 2rem;
      border-radius: var(--radius-full, 9999px);
      background: var(--color-accent-subtle, #e3f1f4);
      color: var(--color-text-primary, #0f1a1f);
      font-weight: 500;
      padding-inline: var(--space-3, 0.75rem) var(--space-1, 0.25rem);
    }

    .label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .remove {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--size-touch, 44px);
      min-height: var(--size-touch, 44px);
      /* The hit area reaches past the pill; the pill keeps its chip height. */
      margin-block: calc((2rem - var(--size-touch, 44px)) / 2);
      margin-inline-end: calc((2rem - var(--size-touch, 44px)) / 2);
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--color-text-secondary, #46565e);
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .remove:disabled {
      color: var(--color-text-disabled, #66757c);
      cursor: not-allowed;
    }

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: var(--radius-full, 9999px);
    }

    .remove:hover:not(:disabled) .icon {
      background: var(--color-surface-hover, #dce3e6);
      color: var(--color-text-primary, #0f1a1f);
    }

    .remove:focus-visible {
      outline: none;
    }

    .remove:focus-visible .icon {
      outline: 2px solid var(--color-border-focus, #1d6f85);
      outline-offset: 1px;
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    label: {type: String},
    removeLabel: {type: String, attribute: 'remove-label'},
    disabled: {type: Boolean, reflect: true},
  };

  declare public label: string;
  declare public removeLabel: string;
  declare public disabled: boolean;

  constructor() {
    super();
    this.label = '';
    this.removeLabel = '';
    this.disabled = false;
  }

  /** The remove button's accessible name: the host's override, else "Remove {label}". */
  private accessibleName(): string {
    return this.removeLabel || `Remove ${this.label}`.trim();
  }

  private emitRemove(): void {
    this.dispatchEvent(
      new CustomEvent<DismissibleChipRemoveDetail>('lk-dismissible-chip-remove', {
        detail: {label: this.label},
        bubbles: true,
        composed: true,
      })
    );
  }

  protected override render(): TemplateResult {
    return html`
      <span class="chip">
        <span class="label">${this.label}</span>
        <button
          type="button"
          class="remove"
          aria-label=${this.accessibleName()}
          ?disabled=${this.disabled}
          @click=${() => this.emitRemove()}
        >
          <span class="icon">${CROSS}</span>
        </button>
      </span>
    `;
  }
}

customElements.define('lk-dismissible-chip', LkDismissibleChip);
