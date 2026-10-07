import {css, html, LitElement, type TemplateResult} from 'lit';

const DISMISSED_KEY = 'lk-install-hint-dismissed';

/** Chromium's non-standard install-prompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>;
}

// Chromium fires `beforeinstallprompt` once, early — often before any element is connected.
// Capture it at module load so a late-mounting hint can still offer the install button.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

function notifyPromptListeners(): void {
  for (const listener of promptListeners) {
    listener();
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notifyPromptListeners();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  notifyPromptListeners();
});

function isInstalled(): boolean {
  const iosStandalone = (navigator as Navigator & {standalone?: boolean}).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports a desktop Mac UA; touch support tells them apart.
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && !otherBrowser && /Safari/.test(ua);
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // Storage blocked (private mode, policy) — the hint simply returns next visit.
  }
}

/**
 * "Install this app" hint. Hidden when already installed or previously dismissed.
 *
 * - iOS Safari: shows "Share, then Add to Home Screen" instructions.
 * - Chromium: shows an Install button once the browser offers `beforeinstallprompt`.
 * - Anywhere else: renders nothing.
 *
 * Emits `lk-install-hint-dismiss` when the user dismisses the hint; the dismissal is remembered
 * in localStorage.
 *
 * @example
 * <lk-install-hint></lk-install-hint>
 */
export class LkInstallHint extends LitElement {
  private dismissed = readDismissed();

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static override styles = css`
    :host {
      display: block;
    }

    .hint {
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

    .actions {
      display: flex;
      gap: var(--space-2, 0.5rem);
    }

    button {
      border: 1px solid var(--color-border-default, #d9e0e3);
      border-radius: var(--radius-md);
      background: transparent;
      color: inherit;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      font: inherit;
      cursor: pointer;
    }

    button.install {
      border-color: transparent;
      background: var(--color-accent-default, #175a6d);
      color: var(--color-text-inverse, #ffffff);
      font-weight: 600;
    }
  `;

  private readonly onPromptChange = (): void => {
    this.requestUpdate();
  };

  private readonly onInstall = async (): Promise<void> => {
    const prompt = deferredPrompt;
    if (!prompt) {
      return;
    }
    // The event is single-use; drop it whatever the user chooses.
    deferredPrompt = null;
    await prompt.prompt();
    await prompt.userChoice;
    notifyPromptListeners();
  };

  private readonly onDismiss = (): void => {
    writeDismissed();
    this.dismissed = true;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('lk-install-hint-dismiss', {bubbles: true, composed: true}));
  };

  public override connectedCallback(): void {
    super.connectedCallback();
    promptListeners.add(this.onPromptChange);
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    promptListeners.delete(this.onPromptChange);
  }

  protected override render(): TemplateResult {
    if (this.dismissed || isInstalled()) {
      return html``;
    }
    if (deferredPrompt) {
      return html`
        <div class="hint" role="region" aria-label="Install app">
          <span>Install this app for quick access.</span>
          <div class="actions">
            <button type="button" class="install" @click=${this.onInstall}>Install</button>
            <button type="button" @click=${this.onDismiss}>Not now</button>
          </div>
        </div>
      `;
    }
    if (isIosSafari()) {
      return html`
        <div class="hint" role="region" aria-label="Install app">
          <span>Install this app: tap Share, then Add to Home Screen.</span>
          <div class="actions">
            <button type="button" @click=${this.onDismiss}>Got it</button>
          </div>
        </div>
      `;
    }
    return html``;
  }
}

customElements.define('lk-install-hint', LkInstallHint);
