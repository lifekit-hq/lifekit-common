/** How many category colours there are (`category-1` … `category-14`), besides `category-other`. */
const CATEGORY_COUNT = 14;

/**
 * The categorical palette: one fixed colour per category, so a category wears the same colour in
 * every theme, range and screen. A host maps its own category keys onto these indices and never
 * reorders them. `category-other` is the neutral for a folded "other" or an uncategorised slice.
 */
export const CATEGORY_COLOUR_NAMES = Object.freeze([
  ...Array.from({length: CATEGORY_COUNT}, (_, i) => `category-${i + 1}`),
  'category-other',
]);

/**
 * The colours that carry a meaning, so no seed rewrites them: `derive()` never emits them and
 * `seeds/<app>.css` never sets them. Their values live in `theme.css` (light and dark, one hue
 * each); this is the list of names a host can test a custom property against.
 *
 * `flow-in` and `flow-out` are the text grade (aliases of `gain` and `loss`); `flow-in-fill` and
 * `flow-out-fill` are the same two meanings as a mark, with a lightness gap between them.
 */
export const FIXED_COLOUR_NAMES = Object.freeze([
  'asset-equity',
  'asset-crypto',
  'asset-cash',
  'gain',
  'loss',
  'flow-in',
  'flow-out',
  'flow-in-fill',
  'flow-out-fill',
  ...CATEGORY_COLOUR_NAMES,
]);
