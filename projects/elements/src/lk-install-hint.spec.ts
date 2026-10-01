import {afterEach, describe, expect, it, vi} from 'vitest';

import {LkInstallHint} from './lk-install-hint';

const DISMISSED_KEY = 'lk-install-hint-dismissed';
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';

interface FakeInstallEvent extends Event {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{outcome: string}>;
}

function fireInstallPrompt(): FakeInstallEvent {
  const event = Object.assign(new Event('beforeinstallprompt', {cancelable: true}), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({outcome: 'accepted'}),
  });
  window.dispatchEvent(event);
  return event;
}

function stubUserAgent(ua: string): void {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
}

function stubStandalone(standalone: boolean): void {
  vi.spyOn(window, 'matchMedia').mockReturnValue({matches: standalone} as MediaQueryList);
}

async function mount(): Promise<LkInstallHint> {
  const el = document.createElement('lk-install-hint') as LkInstallHint;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('LkInstallHint', () => {
  afterEach(async () => {
    // Consume any captured install prompt so tests stay independent.
    const el = await mount();
    el.shadowRoot?.querySelector<HTMLButtonElement>('button.install')?.click();
    await Promise.resolve();
    document.body.replaceChildren();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('registers as a custom element', () => {
    expect(customElements.get('lk-install-hint')).toBe(LkInstallHint);
  });

  it('renders nothing when no install path is available', async () => {
    stubUserAgent('Mozilla/5.0 (X11; Linux x86_64) Firefox/120.0');
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
  });

  it('shows Share then Add to Home Screen instructions on iOS Safari', async () => {
    stubUserAgent(IOS_SAFARI_UA);
    stubStandalone(false);
    const el = await mount();
    expect(el.shadowRoot?.textContent).toContain('Add to Home Screen');
  });

  it('shows nothing on iOS browsers other than Safari', async () => {
    stubUserAgent(IOS_CHROME_UA);
    stubStandalone(false);
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
  });

  it('hides when running in display-mode standalone', async () => {
    stubUserAgent(IOS_SAFARI_UA);
    stubStandalone(true);
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
  });

  it('hides when navigator.standalone is true', async () => {
    stubUserAgent(IOS_SAFARI_UA);
    stubStandalone(false);
    Object.defineProperty(navigator, 'standalone', {value: true, configurable: true});
    const el = await mount();
    Reflect.deleteProperty(navigator, 'standalone');
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
  });

  it('captures beforeinstallprompt and shows an Install button that calls prompt()', async () => {
    stubStandalone(false);
    const event = fireInstallPrompt();
    expect(event.defaultPrevented).toBe(true);
    const el = await mount();
    const install = el.shadowRoot?.querySelector<HTMLButtonElement>('button.install');
    expect(install).toBeTruthy();
    install?.click();
    await Promise.resolve();
    expect(event.prompt).toHaveBeenCalledOnce();
  });

  it('shows the Install button on an already-mounted hint when the event arrives later', async () => {
    stubStandalone(false);
    stubUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0');
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
    fireInstallPrompt();
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('button.install')).toBeTruthy();
  });

  it('hides after appinstalled', async () => {
    stubStandalone(false);
    stubUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0');
    fireInstallPrompt();
    const el = await mount();
    window.dispatchEvent(new Event('appinstalled'));
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
  });

  it('remembers dismissal and emits lk-install-hint-dismiss', async () => {
    stubUserAgent(IOS_SAFARI_UA);
    stubStandalone(false);
    const el = await mount();
    const handler = vi.fn();
    el.addEventListener('lk-install-hint-dismiss', handler);
    el.shadowRoot?.querySelector('button')?.click();
    await el.updateComplete;
    expect(handler).toHaveBeenCalledOnce();
    expect(localStorage.getItem(DISMISSED_KEY)).toBe('1');
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
  });

  it('stays hidden on later mounts once dismissed', async () => {
    stubUserAgent(IOS_SAFARI_UA);
    stubStandalone(false);
    localStorage.setItem(DISMISSED_KEY, '1');
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
  });

  it('tolerates blocked localStorage', async () => {
    stubUserAgent(IOS_SAFARI_UA);
    stubStandalone(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.hint')).toBeTruthy();
    expect(() => el.shadowRoot?.querySelector('button')?.click()).not.toThrow();
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.hint')).toBeNull();
  });
});
