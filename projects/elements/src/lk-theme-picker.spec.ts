import {
  APP_SEEDS,
  DEFAULT_INTENSITY,
  derive,
  INTENSITY_STOPS,
  PRESETS,
  SEED_STORAGE_KEY,
  seedTokenNames,
} from '@lifekit-hq/tokens/engine';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {type LkThemeChoice, LkThemePicker, nearestIntensityStop} from './lk-theme-picker';

const APP = APP_SEEDS.fs.seed;
const NEAR_ERROR = '#be2533';
const CUSTOM = '#123456';

function radios(el: LkThemePicker): HTMLInputElement[] {
  return [...(el.shadowRoot?.querySelectorAll<HTMLInputElement>('input[type=radio]') ?? [])];
}

function checkedLabel(el: LkThemePicker): string {
  return (
    radios(el)
      .find(r => r.checked)
      ?.parentElement?.textContent?.trim() ?? ''
  );
}

function changes(el: LkThemePicker): LkThemeChoice[] {
  const seen: LkThemeChoice[] = [];
  el.addEventListener('lk-theme-picker-change', e =>
    seen.push((e as CustomEvent<LkThemeChoice>).detail)
  );
  return seen;
}

function pick(input: HTMLInputElement): void {
  input.checked = true;
  input.dispatchEvent(new Event('change'));
}

function clearDocument(): void {
  for (const name of seedTokenNames()) {
    document.documentElement.style.removeProperty(name);
  }
  document.documentElement.removeAttribute('data-theme');
  localStorage.removeItem(SEED_STORAGE_KEY);
  localStorage.removeItem('cmn-theme');
}

async function mount(attrs: Record<string, string> = {}): Promise<LkThemePicker> {
  const el = document.createElement('lk-theme-picker') as LkThemePicker;
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('nearestIntensityStop', () => {
  it('names the stop closest to an intensity', () => {
    expect(nearestIntensityStop(0)).toBe('quiet');
    expect(nearestIntensityStop(INTENSITY_STOPS.tinted)).toBe('tinted');
    expect(nearestIntensityStop(1)).toBe('immersive');
  });
});

describe('LkThemePicker', () => {
  let el: LkThemePicker;

  beforeEach(clearDocument);

  afterEach(() => {
    el.remove();
    clearDocument();
  });

  it('registers as a custom element', async () => {
    el = await mount();
    expect(customElements.get('lk-theme-picker')).toBe(LkThemePicker);
  });

  it('offers the app default, every preset and a custom colour', async () => {
    el = await mount({'app-seed': APP});
    expect(radios(el)).toHaveLength(PRESETS.length + 2);
    expect(checkedLabel(el)).toBe('App default');
  });

  it('leaves out the app default when the app names no colour', async () => {
    el = await mount();
    expect(radios(el)).toHaveLength(PRESETS.length + 1);
    expect(el.shadowRoot?.querySelector<HTMLInputElement>('input[type=range]')?.disabled).toBe(
      true
    );
  });

  it('checks the preset or custom option that matches the seed', async () => {
    el = await mount({'app-seed': APP, seed: PRESETS[1].seed});
    expect(checkedLabel(el)).toBe(PRESETS[1].name);
    el.seed = CUSTOM;
    await el.updateComplete;
    expect(checkedLabel(el)).toBe('Custom');
    expect(el.shadowRoot?.querySelector<HTMLInputElement>('input[type=color]')?.value).toBe(CUSTOM);
  });

  it('emits the preset picked, at the current intensity', async () => {
    el = await mount({'app-seed': APP});
    const seen = changes(el);
    const plum = radios(el).find(r => r.value === PRESETS[2].seed);
    pick(plum as HTMLInputElement);
    expect(seen).toEqual([{seed: PRESETS[2].seed, intensity: DEFAULT_INTENSITY}]);
    expect(el.seed).toBe(PRESETS[2].seed);
  });

  it('emits a null seed when the app default is picked back', async () => {
    el = await mount({'app-seed': APP, seed: PRESETS[1].seed});
    const seen = changes(el);
    pick(radios(el)[0]);
    expect(seen).toEqual([{seed: null, intensity: DEFAULT_INTENSITY}]);
  });

  it('emits a custom colour as it is dialled in', async () => {
    el = await mount({'app-seed': APP});
    const seen = changes(el);
    const colour = el.shadowRoot?.querySelector<HTMLInputElement>('input[type=color]');
    (colour as HTMLInputElement).value = CUSTOM;
    colour?.dispatchEvent(new Event('input'));
    await el.updateComplete;
    expect(seen).toEqual([{seed: CUSTOM, intensity: DEFAULT_INTENSITY}]);
    expect(checkedLabel(el)).toBe('Custom');
  });

  it('pins the app colour when the intensity moves on the app default', async () => {
    el = await mount({'app-seed': APP});
    const seen = changes(el);
    el.shadowRoot?.querySelector<HTMLButtonElement>('[data-stop=immersive]')?.click();
    await el.updateComplete;
    expect(seen).toEqual([{seed: APP, intensity: INTENSITY_STOPS.immersive}]);
    expect(
      el.shadowRoot?.querySelector('[data-stop=immersive]')?.getAttribute('aria-pressed')
    ).toBe('true');
  });

  it('clamps a slider value into 0-1', async () => {
    el = await mount({'app-seed': APP, seed: PRESETS[1].seed});
    const seen = changes(el);
    const range = el.shadowRoot?.querySelector<HTMLInputElement>('input[type=range]');
    Object.defineProperty(range, 'value', {value: '7', writable: true, configurable: true});
    range?.dispatchEvent(new Event('change'));
    expect(seen).toEqual([{seed: PRESETS[1].seed, intensity: 1}]);
  });

  it('notes a colour that sits next to a status colour', async () => {
    el = await mount({seed: NEAR_ERROR});
    const note = el.shadowRoot?.querySelector('.note');
    expect(note?.textContent).toBe(derive({seed: NEAR_ERROR}).warnings[0].message);
    el.seed = PRESETS[1].seed;
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('.note')).toBeNull();
  });

  it('resets to the app colour at the quiet intensity', async () => {
    el = await mount({'app-seed': APP, seed: PRESETS[1].seed, intensity: '0.85'});
    const seen = changes(el);
    el.shadowRoot?.querySelector<HTMLButtonElement>('button.reset')?.click();
    await el.updateComplete;
    expect(seen).toEqual([{seed: null, intensity: DEFAULT_INTENSITY}]);
    expect(el.shadowRoot?.querySelector<HTMLButtonElement>('button.reset')?.disabled).toBe(true);
  });

  it('bubbles the change out of the shadow root', async () => {
    el = await mount({'app-seed': APP});
    const handler = vi.fn();
    document.body.addEventListener('lk-theme-picker-change', handler);
    pick(radios(el)[1]);
    document.body.removeEventListener('lk-theme-picker-change', handler);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('touches neither storage nor <html>', async () => {
    el = await mount({'app-seed': APP});
    pick(radios(el)[1]);
    expect(localStorage.getItem(SEED_STORAGE_KEY)).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--color-accent-default')).toBe('');
  });
});
