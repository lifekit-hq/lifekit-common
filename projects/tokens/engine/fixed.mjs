/**
 * The colours that carry a meaning, so no seed rewrites them: `derive()` never emits them and
 * `seeds/<app>.css` never sets them. Their values live in `theme.css` (light and dark, one hue
 * each); this is the list of names a host can test a custom property against.
 */
export const FIXED_COLOUR_NAMES = Object.freeze([
  'asset-equity',
  'asset-crypto',
  'asset-cash',
  'gain',
  'loss',
  'flow-in',
  'flow-out',
]);
