import {css, html, LitElement, type PropertyDeclarations, type TemplateResult} from 'lit';

/**
 * Presentational "new version available" prompt. Renders nothing until `ready` is true, then
 * stays visible until the user acts on it — it never auto-dismisses.
 *
 * Emits `lk-update-prompt-reload` when the user taps Reload; the host decides what that does
 * (typically `AppUpdateService.reload()` from `@lifekit-hq/core/pwa`).
 *
 * @example
 * <lk-update-prompt ready></lk-update-prompt>
 */
export class LkUpdatePrompt extends LitElement {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: block;
    }

    :host([hidden]) {
      display: none;
    }

    .prompt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3, 0.75rem);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border-default, #d9e0e3);
      background: var(--color-surface-card, #ffffff);
      color: var(--color-text-primary);
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      font-family: var(--font-sans);
      font-size: 0.875rem;
    }

    button {
      border: 0;
      border-radius: var(--radius-md);
      background: var(--color-primary, #175a6d);
      color: var(--color-on-primary, #ffffff);
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    ready: {type: Boolean, reflect: true},
  };

  declare public ready: boolean;

  constructor() {
    super();
    this.ready = false;
  }

  private readonly onReload = (): void => {
    this.dispatchEvent(new CustomEvent('lk-update-prompt-reload', {bubbles: true, composed: true}));
  };

  protected override render(): TemplateResult {
    if (!this.ready) {
      return html``;
    }
    return html`
      <div class="prompt" role="status">
        <span>A new version is available.</span>
        <button type="button" @click=${this.onReload}>Reload</button>
      </div>
    `;
  }
}

customElements.define('lk-update-prompt', LkUpdatePrompt);
