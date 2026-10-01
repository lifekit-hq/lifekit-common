import {afterEach, describe, expect, it, vi} from 'vitest';

import {LkOfflineBanner} from './lk-offline-banner';

async function mount(online: boolean): Promise<LkOfflineBanner> {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  const el = document.createElement('lk-offline-banner') as LkOfflineBanner;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('LkOfflineBanner', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('registers as a custom element', () => {
    expect(customElements.get('lk-offline-banner')).toBe(LkOfflineBanner);
  });

  it('renders nothing while online', async () => {
    const el = await mount(true);
    expect(el.shadowRoot?.querySelector('.banner')).toBeNull();
  });

  it('renders the banner when mounted offline', async () => {
    const el = await mount(false);
    expect(el.shadowRoot?.querySelector('.banner')).toBeTruthy();
  });

  it('reacts to offline and online events', async () => {
    const el = await mount(true);
    window.dispatchEvent(new Event('offline'));
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.banner')).toBeTruthy();
    window.dispatchEvent(new Event('online'));
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.banner')).toBeNull();
  });

  it('shows a custom message and falls back to the default when empty', async () => {
    const el = await mount(false);
    el.message = 'No connection';
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.banner')?.textContent?.trim()).toBe('No connection');
    el.message = '';
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.banner')?.textContent).toContain("You're offline");
  });

  it('stops listening once disconnected', async () => {
    const el = await mount(true);
    el.remove();
    window.dispatchEvent(new Event('offline'));
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.banner')).toBeNull();
  });
});
