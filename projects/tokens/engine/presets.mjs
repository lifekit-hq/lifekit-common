/**
 * The app seeds and the picker's presets. A theme is just `{seed, intensity}`; everything else is
 * derived from it.
 */

/** Direction 1 "quiet": the seed shows only where you act, on grouped near-neutral surfaces. */
export const DEFAULT_INTENSITY = 0.12;

/** Named stops on the intensity slider. Immersive is the Discord-strength tint. */
export const INTENSITY_STOPS = Object.freeze({
  quiet: DEFAULT_INTENSITY,
  tinted: 0.45,
  immersive: 0.85,
});

/** Each app's shipped seed: what the app looks like until a user picks another. */
export const APP_SEEDS = Object.freeze({
  fs: Object.freeze({name: 'Finance Sentry', seed: '#175a6d', intensity: DEFAULT_INTENSITY}),
  lk: Object.freeze({name: 'Lifekit', seed: '#4f46e5', intensity: DEFAULT_INTENSITY}),
  dc: Object.freeze({name: 'devclaw', seed: '#8e3b8a', intensity: DEFAULT_INTENSITY}),
});

/** The colours the picker offers next to the app default and a custom colour. */
export const PRESETS = Object.freeze(
  [
    {id: 'petrol', name: 'Petrol', seed: '#175a6d'},
    {id: 'indigo', name: 'Indigo', seed: '#4f46e5'},
    {id: 'plum', name: 'Plum', seed: '#8e3b8a'},
    {id: 'ocean', name: 'Ocean', seed: '#1f5fbf'},
    {id: 'violet', name: 'Violet', seed: '#7c3aed'},
    {id: 'rose', name: 'Rose', seed: '#be185d'},
    {id: 'graphite', name: 'Graphite', seed: '#4b5563'},
  ].map(preset => Object.freeze(preset))
);
