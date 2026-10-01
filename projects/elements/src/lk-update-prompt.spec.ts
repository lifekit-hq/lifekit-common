import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {LkUpdatePrompt} from './lk-update-prompt';

describe('LkUpdatePrompt', () => {
  let el: LkUpdatePrompt;

  beforeEach(async () => {
    el = document.createElement('lk-update-prompt') as LkUpdatePrompt;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('registers as a custom element', () => {
    expect(customElements.get('lk-update-prompt')).toBe(LkUpdatePrompt);
  });

  it('renders nothing while not ready', () => {
    expect(el.shadowRoot?.querySelector('.prompt')).toBeNull();
  });

  it('renders the prompt once ready', async () => {
    el.ready = true;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.prompt')).toBeTruthy();
  });

  it('emits lk-update-prompt-reload when Reload is clicked', async () => {
    el.ready = true;
    await el.updateComplete;
    const handler = vi.fn();
    document.body.addEventListener('lk-update-prompt-reload', handler);
    el.shadowRoot?.querySelector('button')?.click();
    document.body.removeEventListener('lk-update-prompt-reload', handler);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('stays visible after the user acts on it', async () => {
    el.ready = true;
    await el.updateComplete;
    el.shadowRoot?.querySelector('button')?.click();
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.prompt')).toBeTruthy();
  });
});
