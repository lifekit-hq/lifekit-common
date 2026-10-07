/**
 * Browser side of the seed engine: the per-device store of a user's colour and applying derived
 * tokens to an element. `ThemeService` (Angular) uses it, and so can any framework-free host of
 * `<lk-theme-picker>`. No globals are touched here: the caller passes `localStorage` and the root.
 *
 * The store holds the choice and its four derived variants, so the pre-paint script
 * (`@lifekit-hq/tokens/brand/theme-script`) applies them before first paint without shipping the
 * engine inline:
 *
 *   cmn-theme-seed = {"v": 1, "seed": "#4f46e5", "intensity": 0.12,
 *                     "css": {"light": {"--color-…": "#…"}, "dark": …, "light-more": …, "dark-more": …}}
 */
import {normalizeHex} from './colour.mjs';
import {derive, toDeclarations} from './derive.mjs';
import {DEFAULT_INTENSITY} from './presets.mjs';

/** localStorage key of a user's colour, next to `cmn-theme`. Per device, never synced. */
export const SEED_STORAGE_KEY = 'cmn-theme-seed';

/** Bumped when the cached shape changes; the pre-paint script ignores any other version. */
export const SEED_CACHE_VERSION = 1;

/** The cached variants: theme, plus `-more` for `prefers-contrast: more`. */
export const SEED_VARIANTS = Object.freeze(['light', 'dark', 'light-more', 'dark-more']);

/** The variant key for a theme and contrast level. */
export function seedVariant(mode, contrast = 'standard') {
  return contrast === 'more' ? `${mode}-more` : mode;
}

/** `{seed, intensity}` with the seed normalised and the intensity clamped, or `null`. */
export function normalizeSeedChoice(choice) {
  const seed = normalizeHex(choice?.seed);
  if (!seed) return null;
  const raw = Number(choice.intensity ?? DEFAULT_INTENSITY);
  const intensity = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : DEFAULT_INTENSITY;
  return {seed, intensity};
}

/** The declarations for every cached variant of a choice. */
export function seedVariants(choice) {
  const normalized = normalizeSeedChoice(choice);
  if (!normalized) throw new TypeError(`seed engine: not a hex colour: ${choice?.seed}`);
  return Object.fromEntries(
    SEED_VARIANTS.map(variant => {
      const [mode, more] = variant.split('-');
      const {tokens} = derive({...normalized, mode, contrast: more ? 'more' : 'standard'});
      return [variant, toDeclarations(tokens)];
    })
  );
}

/** The stored choice, or `null` when there is none, it is unreadable, or storage is blocked. */
export function readStoredSeed(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(SEED_STORAGE_KEY) ?? 'null');
    return parsed?.v === SEED_CACHE_VERSION ? normalizeSeedChoice(parsed) : null;
  } catch {
    return null;
  }
}

/**
 * Stores a choice with its derived variants (for the pre-paint script) and returns the
 * variants. Throws on an invalid seed; a blocked storage only loses persistence.
 */
export function storeSeed(storage, choice) {
  const normalized = normalizeSeedChoice(choice);
  if (!normalized) throw new TypeError(`seed engine: not a hex colour: ${choice?.seed}`);
  const css = seedVariants(normalized);
  try {
    storage.setItem(SEED_STORAGE_KEY, JSON.stringify({v: SEED_CACHE_VERSION, ...normalized, css}));
  } catch {
    // storage blocked or full: the colour applies for this session only
  }
  return css;
}

/** Forgets the stored choice. */
export function clearStoredSeed(storage) {
  try {
    storage.removeItem(SEED_STORAGE_KEY);
  } catch {
    // storage blocked: nothing was persisted
  }
}

let tokenNames;

/** Every custom property the engine derives, e.g. `--color-surface-bg`. */
export function seedTokenNames() {
  tokenNames ??= Object.freeze(Object.keys(toDeclarations(derive({seed: '#175a6d'}).tokens)));
  return tokenNames;
}

/** Sets derived declarations as inline custom properties on `element` (usually `<html>`). */
export function applySeedDeclarations(element, declarations) {
  for (const [name, value] of Object.entries(declarations)) {
    element.style.setProperty(name, value);
  }
}

/** Removes every engine-derived inline custom property from `element`. */
export function clearSeedDeclarations(element) {
  for (const name of seedTokenNames()) element.style.removeProperty(name);
}
