import {afterEach, describe, expect, it} from 'vitest';

import {accountInitials, LkAccountMenu, safeUrl} from './lk-account-menu';

function query<T extends Element>(el: LkAccountMenu, selector: string): T {
  const found = el.shadowRoot?.querySelector<T>(selector);
  if (!found) {
    throw new Error(`missing ${selector}`);
  }
  return found;
}

async function mount(attrs: Record<string, string> = {}): Promise<LkAccountMenu> {
  const el = document.createElement('lk-account-menu') as LkAccountMenu;
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const trigger = (el: LkAccountMenu): HTMLButtonElement =>
  query<HTMLButtonElement>(el, 'button.trigger');
const panel = (el: LkAccountMenu): HTMLElement => query<HTMLElement>(el, '.panel');
const signOut = (el: LkAccountMenu): HTMLAnchorElement | null =>
  el.shadowRoot?.querySelector<HTMLAnchorElement>('a.sign-out') ?? null;
const requireSignOut = (el: LkAccountMenu): HTMLAnchorElement =>
  query<HTMLAnchorElement>(el, 'a.sign-out');

const FULL = {name: 'Ada Lovelace', email: 'ada@example.com', 'sign-out-url': '/oauth2/sign_out'};

describe('accountInitials', () => {
  it('uses first and last word of the name', () => {
    expect(accountInitials('ada king lovelace', '')).toBe('AL');
  });

  it('uses one letter for a single-word name', () => {
    expect(accountInitials('Ada', 'x@y.z')).toBe('A');
  });

  it('falls back to the email, then to a question mark', () => {
    expect(accountInitials('  ', 'bob@example.com')).toBe('B');
    expect(accountInitials('', '')).toBe('?');
  });
});

describe('safeUrl', () => {
  it('allows http(s) and root-relative URLs', () => {
    expect(safeUrl('https://a.example/x')).toBe('https://a.example/x');
    expect(safeUrl(' /oauth2/sign_out ')).toBe('/oauth2/sign_out');
  });

  it('drops script, data and protocol-relative URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('data:text/html,x')).toBe('');
    expect(safeUrl('//evil.example')).toBe('');
    expect(safeUrl('data:image/png;base64,AAAA')).toBe('');
  });

  it('allows image data URLs only when asked', () => {
    expect(safeUrl('data:image/png;base64,AAAA', true)).toBe('data:image/png;base64,AAAA');
    expect(safeUrl('data:text/html,x', true)).toBe('');
  });
});

describe('LkAccountMenu', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('registers as a custom element', () => {
    expect(customElements.get('lk-account-menu')).toBe(LkAccountMenu);
  });

  it('shows initials and a labelled collapsed trigger by default', async () => {
    const el = await mount(FULL);
    expect(trigger(el).textContent?.trim()).toBe('AL');
    expect(trigger(el).getAttribute('aria-label')).toBe('Account menu for Ada Lovelace');
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    expect(panel(el).hidden).toBe(true);
  });

  it('shows the picture when given and falls back to initials when it fails to load', async () => {
    const el = await mount({...FULL, picture: 'https://img.example/a.png'});
    const img = query<HTMLImageElement>(el, 'img');
    expect(img.getAttribute('src')).toBe('https://img.example/a.png');
    img.dispatchEvent(new Event('error'));
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('img')).toBeNull();
    expect(trigger(el).textContent?.trim()).toBe('AL');
  });

  it('ignores an unsafe picture URL', async () => {
    const el = await mount({...FULL, picture: 'javascript:alert(1)'});
    expect(el.shadowRoot?.querySelector('img')).toBeNull();
  });

  it('opens on click, shows name, email and Sign out, and focuses Sign out', async () => {
    const el = await mount(FULL);
    trigger(el).click();
    await el.updateComplete;
    await el.updateComplete;
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
    expect(panel(el).hidden).toBe(false);
    expect(panel(el).textContent).toContain('Ada Lovelace');
    expect(panel(el).textContent).toContain('ada@example.com');
    expect(signOut(el)?.getAttribute('href')).toBe('/oauth2/sign_out');
    expect(el.shadowRoot?.activeElement).toBe(signOut(el));
  });

  it('toggles closed on a second click', async () => {
    const el = await mount(FULL);
    trigger(el).click();
    await el.updateComplete;
    trigger(el).click();
    await el.updateComplete;
    expect(panel(el).hidden).toBe(true);
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const el = await mount(FULL);
    trigger(el).click();
    await el.updateComplete;
    await el.updateComplete;
    requireSignOut(el).dispatchEvent(
      new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, composed: true})
    );
    await el.updateComplete;
    expect(panel(el).hidden).toBe(true);
    expect(el.shadowRoot?.activeElement).toBe(trigger(el));
  });

  it('closes on an outside pointer down but not an inside one', async () => {
    const el = await mount(FULL);
    trigger(el).click();
    await el.updateComplete;
    panel(el).dispatchEvent(new Event('pointerdown', {bubbles: true, composed: true}));
    await el.updateComplete;
    expect(panel(el).hidden).toBe(false);
    document.body.dispatchEvent(new Event('pointerdown', {bubbles: true}));
    await el.updateComplete;
    expect(panel(el).hidden).toBe(true);
  });

  it('closes when focus leaves the element', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const el = await mount(FULL);
    trigger(el).click();
    await el.updateComplete;
    requireSignOut(el).dispatchEvent(
      new FocusEvent('focusout', {bubbles: true, composed: true, relatedTarget: outside})
    );
    await el.updateComplete;
    expect(panel(el).hidden).toBe(true);
  });

  it('omits Sign out when the URL is missing or unsafe', async () => {
    const el = await mount({name: 'Ada', 'sign-out-url': 'javascript:alert(1)'});
    expect(signOut(el)).toBeNull();
  });

  it('labels itself from the email when there is no name', async () => {
    const el = await mount({email: 'ada@example.com'});
    expect(trigger(el).getAttribute('aria-label')).toBe('Account menu for ada@example.com');
    expect(trigger(el).textContent?.trim()).toBe('A');
  });

  it('gives each instance its own panel id wired to aria-controls', async () => {
    const a = await mount(FULL);
    const b = await mount(FULL);
    expect(trigger(a).getAttribute('aria-controls')).toBe(panel(a).id);
    expect(panel(a).id).not.toBe(panel(b).id);
  });
});
