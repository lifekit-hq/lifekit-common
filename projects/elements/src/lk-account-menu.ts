import {css, html, LitElement, nothing, type PropertyDeclarations, type TemplateResult} from 'lit';

const SAFE_URL = /^(https?:\/\/|\/(?!\/))/i;

/** Up to two initials from the name (first + last word), falling back to the email, then "?". */
export function accountInitials(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const first = words[0].charAt(0);
    const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }
  return email.trim().charAt(0).toUpperCase() || '?';
}

/** Only absolute http(s) and root-relative URLs are used; anything else is dropped. */
export function safeUrl(url: string): string {
  const trimmed = url.trim();
  return SAFE_URL.test(trimmed) ? trimmed : '';
}

let nextId = 0;

/**
 * Account menu: avatar (or initials) that opens a small panel with the signed-in user's name and
 * email and one Sign out link. The element does not fetch claims or talk to the identity
 * provider; the host supplies the claims and the sign-out URL.
 *
 * Keyboard: Enter/Space/click on the avatar toggles the panel and moves focus to Sign out;
 * Escape closes it and returns focus to the avatar; tabbing out or clicking elsewhere closes it.
 *
 * @example
 * <lk-account-menu name="Ada Lovelace" email="ada@example.com" sign-out-url="/oauth2/sign_out"></lk-account-menu>
 */
export class LkAccountMenu extends LitElement {
  private readonly panelId = `lk-account-menu-panel-${nextId++}`;

  declare private open: boolean;
  declare private pictureFailed: boolean;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: inline-block;
      position: relative;
      font-family: var(--font-sans);
      font-size: 0.875rem;
    }

    :host([hidden]) {
      display: none;
    }

    button.trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
      border: 1px solid var(--color-border-default, #d9e0e3);
      border-radius: 50%;
      background: var(--color-accent-subtle, #e3f1f4);
      color: var(--color-accent-default, #175a6d);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      overflow: hidden;
    }

    button.trigger img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    button:focus-visible,
    a:focus-visible {
      outline: 2px solid var(--color-border-focus, #175a6d);
      outline-offset: 2px;
    }

    .panel {
      position: absolute;
      inset-inline-end: 0;
      top: calc(100% + var(--space-2, 0.5rem));
      z-index: 10;
      min-width: 14rem;
      max-width: 20rem;
      padding: var(--space-3, 0.75rem);
      border: 1px solid var(--color-border-default, #d9e0e3);
      border-radius: var(--radius-lg);
      background: var(--color-surface-card, #ffffff);
      color: var(--color-text-primary, #0f1a1f);
      box-shadow: var(--shadow-md);
    }

    .name {
      margin: 0;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .email {
      margin: 0;
      color: var(--color-text-secondary, #46565e);
      overflow-wrap: anywhere;
    }

    a.sign-out {
      display: block;
      margin-top: var(--space-3, 0.75rem);
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      border: 1px solid var(--color-border-default, #d9e0e3);
      border-radius: var(--radius-md);
      color: inherit;
      text-align: center;
      text-decoration: none;
    }

    a.sign-out:hover {
      background: var(--color-surface-raised, #e8edef);
    }
  `;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override properties: PropertyDeclarations = {
    name: {type: String, reflect: true},
    email: {type: String, reflect: true},
    picture: {type: String, reflect: true},
    signOutUrl: {type: String, attribute: 'sign-out-url', reflect: true},
    open: {state: true},
    pictureFailed: {state: true},
  };

  declare public name: string;
  declare public email: string;
  declare public picture: string;
  declare public signOutUrl: string;

  constructor() {
    super();
    this.name = '';
    this.email = '';
    this.picture = '';
    this.signOutUrl = '';
    this.open = false;
    this.pictureFailed = false;
  }

  private readonly onDocumentPointerDown = (event: Event): void => {
    if (!event.composedPath().includes(this)) {
      this.open = false;
    }
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (this.open && next && !this.shadowRoot?.contains(next)) {
      this.open = false;
    }
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.stopPropagation();
      this.close(true);
    }
  };

  private readonly onToggle = async (): Promise<void> => {
    if (this.open) {
      this.close(true);
      return;
    }
    this.open = true;
    await this.updateComplete;
    this.shadowRoot?.querySelector<HTMLElement>('a.sign-out')?.focus();
  };

  private readonly onPictureError = (): void => {
    this.pictureFailed = true;
  };

  public override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('pointerdown', this.onDocumentPointerDown);
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.onDocumentPointerDown);
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('picture')) {
      this.pictureFailed = false;
    }
  }

  private close(restoreFocus: boolean): void {
    this.open = false;
    if (restoreFocus) {
      this.shadowRoot?.querySelector<HTMLElement>('button.trigger')?.focus();
    }
  }

  protected override render(): TemplateResult {
    const label = this.name || this.email || 'Account';
    const picture = this.pictureFailed ? '' : safeUrl(this.picture);
    const signOut = safeUrl(this.signOutUrl);
    return html`
      <div @keydown=${this.onKeydown} @focusout=${this.onFocusOut}>
        <button
          type="button"
          class="trigger"
          aria-haspopup="true"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-controls=${this.panelId}
          aria-label=${`Account menu for ${label}`}
          @click=${this.onToggle}
        >
          ${
            picture
              ? html`<img
                  src=${picture}
                  alt=""
                  referrerpolicy="no-referrer"
                  @error=${this.onPictureError}
                />`
              : html`<span aria-hidden="true">${accountInitials(this.name, this.email)}</span>`
          }
        </button>
        <div
          class="panel"
          id=${this.panelId}
          role="group"
          aria-label="Account"
          ?hidden=${!this.open}
        >
          ${this.name ? html`<p class="name">${this.name}</p>` : nothing}
          ${this.email ? html`<p class="email">${this.email}</p>` : nothing}
          ${signOut ? html`<a class="sign-out" href=${signOut}>Sign out</a>` : nothing}
        </div>
      </div>
    `;
  }
}

customElements.define('lk-account-menu', LkAccountMenu);
