import {css, html, LitElement, type PropertyDeclarations, type TemplateResult} from 'lit';

const DEFAULT_MESSAGE =
  "You're offline. Changes and fresh data are unavailable until you reconnect.";

/**
 * Self-contained offline banner. Tracks `navigator.onLine` through the window `online` /
 * `offline` events and renders only while the device is offline.
 *
 * @example
 * <lk-offline-banner message="You're offline."></lk-offline-banner>
 */
export class LkOfflineBanner extends LitElement {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: block;
    }

    .banner {
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border-default, #d9e0e3);
      background: var(--color-surface-card, #ffffff);
      color: var(--color-text-primary);
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      font-family: var(--font-sans);
      font-size: 0.875rem;
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    message: {type: String},
    offline: {state: true},
  };

  declare public message: string;
  declare protected offline: boolean;

  constructor() {
    super();
    this.message = DEFAULT_MESSAGE;
    this.offline = !navigator.onLine;
  }

  private readonly onOnline = (): void => {
    this.offline = false;
  };

  private readonly onOffline = (): void => {
    this.offline = true;
  };

  public override connectedCallback(): void {
    super.connectedCallback();
    this.offline = !navigator.onLine;
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }

  protected override render(): TemplateResult {
    if (!this.offline) {
      return html``;
    }
    return html`<div class="banner" role="status">${this.message || DEFAULT_MESSAGE}</div>`;
  }
}

customElements.define('lk-offline-banner', LkOfflineBanner);
