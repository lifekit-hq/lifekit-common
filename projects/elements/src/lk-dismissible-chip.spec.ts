import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';

// Value import - forces module evaluation so customElements.define('lk-dismissible-chip', ...)
// runs (package.json has sideEffects pointing at the built bundle only).
import {type DismissibleChipRemoveDetail, LkDismissibleChip} from './lk-dismissible-chip';

async function mount(
  props: Partial<Pick<LkDismissibleChip, 'label' | 'removeLabel' | 'disabled'>> = {}
): Promise<LkDismissibleChip> {
  const el = document.createElement('lk-dismissible-chip') as LkDismissibleChip;
  Object.assign(el, {label: 'Groceries', ...props});
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function removeButton(el: LkDismissibleChip): HTMLButtonElement {
  const button = el.shadowRoot?.querySelector<HTMLButtonElement>('button.remove');
  if (!button) {
    throw new Error('no remove button');
  }
  return button;
}

function removals(el: LkDismissibleChip): DismissibleChipRemoveDetail[] {
  const seen: DismissibleChipRemoveDetail[] = [];
  el.addEventListener('lk-dismissible-chip-remove', e =>
    seen.push((e as CustomEvent<DismissibleChipRemoveDetail>).detail)
  );
  return seen;
}

describe('LkDismissibleChip', () => {
  afterEach(() => document.body.replaceChildren());

  it('registers as lk-dismissible-chip', () => {
    expect(customElements.get('lk-dismissible-chip')).toBe(LkDismissibleChip);
  });

  it('shows the label and a native remove button', async () => {
    const el = await mount();
    expect(el.shadowRoot?.querySelector('.label')?.textContent).toBe('Groceries');
    expect(removeButton(el).tagName).toBe('BUTTON');
    expect(removeButton(el).type).toBe('button');
  });

  it('names the remove button after the chip label', async () => {
    const el = await mount({label: 'Category: Groceries'});
    expect(removeButton(el).getAttribute('aria-label')).toBe('Remove Category: Groceries');
  });

  it('follows a label the host changes', async () => {
    const el = await mount();
    el.label = 'Food';
    await el.updateComplete;
    expect(removeButton(el).getAttribute('aria-label')).toBe('Remove Food');
  });

  it('lets the host override the remove name', async () => {
    const el = await mount({removeLabel: 'Remove Category: Groceries'});
    expect(removeButton(el).getAttribute('aria-label')).toBe('Remove Category: Groceries');
  });

  it('maps remove-label from the attribute', async () => {
    const el = document.createElement('lk-dismissible-chip') as LkDismissibleChip;
    el.setAttribute('label', 'Groceries');
    el.setAttribute('remove-label', 'Clear category');
    document.body.appendChild(el);
    await el.updateComplete;
    expect(removeButton(el).getAttribute('aria-label')).toBe('Clear category');
  });

  it('falls back to a bare "Remove" when there is no label at all', async () => {
    const el = await mount({label: ''});
    expect(removeButton(el).getAttribute('aria-label')).toBe('Remove');
  });

  it('hides the cross glyph from assistive tech', async () => {
    const el = await mount();
    expect(removeButton(el).querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('emits one remove event with the label when the button is clicked', async () => {
    const el = await mount();
    const seen = removals(el);
    removeButton(el).click();
    expect(seen).toEqual([{label: 'Groceries'}]);
  });

  it('lets the event reach the host across the shadow boundary', async () => {
    const el = await mount();
    let reached = 0;
    document.body.addEventListener('lk-dismissible-chip-remove', () => reached++);
    removeButton(el).click();
    expect(reached).toBe(1);
  });

  it('does not remove itself', async () => {
    const el = await mount();
    removeButton(el).click();
    expect(el.isConnected).toBe(true);
  });

  it('is reachable with Tab and removes on Enter', async () => {
    const el = await mount();
    const seen = removals(el);
    await userEvent.tab();
    expect(el.shadowRoot?.activeElement).toBe(removeButton(el));
    await userEvent.keyboard('{Enter}');
    expect(seen).toHaveLength(1);
  });

  it('removes on Space', async () => {
    const el = await mount();
    const seen = removals(el);
    removeButton(el).focus();
    await userEvent.keyboard(' ');
    expect(seen).toHaveLength(1);
  });

  it('keeps the remove button a 44px hit target inside a chip-sized pill', async () => {
    const el = await mount();
    const button = removeButton(el).getBoundingClientRect();
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
    const pill = el.shadowRoot?.querySelector('.chip')?.getBoundingClientRect();
    expect(pill?.height).toBeLessThan(44);
  });

  it('draws a focus ring on the cross from the focus token, only for keyboard focus', async () => {
    const el = await mount();
    const icon = el.shadowRoot?.querySelector<HTMLElement>('.icon');
    expect(getComputedStyle(icon as HTMLElement).outlineStyle).toBe('none');
    await userEvent.tab();
    const style = getComputedStyle(icon as HTMLElement);
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
  });

  it('truncates a long label instead of growing past its container', async () => {
    const el = await mount({label: 'A category name long enough to overflow a narrow filter row'});
    el.style.width = '160px';
    expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(160);
    const label = el.shadowRoot?.querySelector<HTMLElement>('.label');
    expect(label?.scrollWidth).toBeGreaterThan(label?.clientWidth ?? 0);
  });

  it('takes the remove button out of play when disabled', async () => {
    const el = await mount({disabled: true});
    const seen = removals(el);
    expect(removeButton(el).disabled).toBe(true);
    removeButton(el).click();
    await userEvent.tab();
    expect(el.shadowRoot?.activeElement).toBeNull();
    expect(seen).toHaveLength(0);
  });
});
