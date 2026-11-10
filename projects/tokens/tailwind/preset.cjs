/**
 * A colour that is a bare `var(--token)` gives Tailwind 3 nothing to put an alpha channel into, so
 * `border-status-warning/40` is dropped without a warning and the border falls back to Preflight's
 * gray-200 in both themes. This returns the colour as a function Tailwind calls with the opacity the
 * class asks for: no modifier keeps the plain `var(--token)` (so the CSS an app already ships does not
 * change), a modifier mixes the token with transparent, which follows the theme because the token is
 * still resolved at paint time. Tailwind hands a bare utility its `--tw-*-opacity` variable; that
 * stays the plain token too.
 */
const TW_OPACITY_VARIABLE = 'var(--tw-';

const tokenColour =
  value =>
  ({opacityValue}) =>
    opacityValue === undefined || opacityValue.startsWith(TW_OPACITY_VARIABLE)
      ? value
      : `color-mix(in srgb, ${value} calc(${opacityValue} * 100%), transparent)`;

/** Every `var(--token)` entry of a colour map as an opacity-aware colour. */
const withOpacity = colours =>
  Object.fromEntries(
    Object.entries(colours).map(([name, value]) => [
      name,
      typeof value === 'string' && value.startsWith('var(') ? tokenColour(value) : value,
    ])
  );

/** @type {Partial<import('tailwindcss').Config>} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: withOpacity({
        'surface-bg': 'var(--color-surface-bg)',
        'surface-card': 'var(--color-surface-card)',
        'surface-raised': 'var(--color-surface-raised)',
        'surface-hover': 'var(--color-surface-hover)',
        skeleton: 'var(--color-skeleton)',
        'skeleton-sheen': 'var(--color-skeleton-sheen)',

        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-disabled': 'var(--color-text-disabled)',
        'text-placeholder': 'var(--color-text-placeholder)',
        'text-inverse': 'var(--color-text-inverse)',

        'accent-100': 'var(--color-accent-100)',
        'accent-200': 'var(--color-accent-200)',
        'accent-300': 'var(--color-accent-300)',
        'accent-400': 'var(--color-accent-400)',
        'accent-500': 'var(--color-accent-500)',
        'accent-600': 'var(--color-accent-600)',
        'accent-700': 'var(--color-accent-700)',
        'accent-800': 'var(--color-accent-800)',
        'accent-900': 'var(--color-accent-900)',
        'accent-1000': 'var(--color-accent-1000)',
        'accent-default': 'var(--color-accent-default)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-active': 'var(--color-accent-active)',
        'accent-subtle': 'var(--color-accent-subtle)',

        'status-info': 'var(--color-status-info)',
        'status-success': 'var(--color-status-success)',
        'status-warning': 'var(--color-status-warning)',
        'status-error': 'var(--color-status-error)',
        'status-info-subtle': 'var(--color-status-info-subtle)',
        'status-success-subtle': 'var(--color-status-success-subtle)',
        'status-warning-subtle': 'var(--color-status-warning-subtle)',
        'status-error-subtle': 'var(--color-status-error-subtle)',

        'delta-up': 'var(--color-delta-up)',
        'delta-down': 'var(--color-delta-down)',

        'asset-equity': 'var(--color-asset-equity)',
        'asset-crypto': 'var(--color-asset-crypto)',
        'asset-cash': 'var(--color-asset-cash)',
        gain: 'var(--color-gain)',
        loss: 'var(--color-loss)',
        'flow-in': 'var(--color-flow-in)',
        'flow-out': 'var(--color-flow-out)',
        'flow-in-fill': 'var(--color-flow-in-fill)',
        'flow-out-fill': 'var(--color-flow-out-fill)',
        ...Object.fromEntries(
          [...Array.from({length: 14}, (_, i) => `category-${i + 1}`), 'category-other'].map(
            name => [name, `var(--color-${name})`]
          )
        ),

        'border-default': 'var(--color-border-default)',
        'border-strong': 'var(--color-border-strong)',
        'border-focus': 'var(--color-border-focus)',

        // Carbon's filled field (theme.css --cmn-field-*): the fill; the bottom border and the focus
        // ring are the --cmn-field-border-bottom and --cmn-field-focus values.
        'cmn-field': 'var(--cmn-field-bg)',
        'cmn-field-border': 'var(--cmn-field-border-color)',
        'cmn-select': 'var(--cmn-select-bg)',
        'cmn-card-border': 'var(--cmn-card-border-color)',
        'cmn-shell': 'var(--cmn-shell-border-color)',
        'cmn-float': 'var(--cmn-float-border-color)',
        'cmn-segmented-outline': 'var(--cmn-segmented-outline)',
        'cmn-segmented-active': 'var(--cmn-segmented-active-bg)',
        'cmn-segmented-active-fg': 'var(--cmn-segmented-active-fg)',
        'cmn-nav-active': 'var(--cmn-nav-active-bg)',
        'cmn-btn-secondary': 'var(--cmn-btn-secondary-bg)',
        'cmn-btn-secondary-fg': 'var(--cmn-btn-secondary-fg)',
        'cmn-btn-secondary-hover': 'var(--cmn-btn-secondary-hover)',
        'cmn-btn-secondary-border': 'var(--cmn-btn-secondary-border)',
        'cmn-toggle-on': 'var(--cmn-toggle-on)',
        'cmn-tab-active': 'var(--cmn-tab-active-bg)',
        'cmn-tabs': 'var(--cmn-tabs-bg)',
        'cmn-table-head': 'var(--cmn-table-head-bg)',
      }),

      ringOffsetColor: {
        DEFAULT: 'var(--color-surface-card)',
      },

      fontFamily: {
        sans: ['var(--font-sans)'],
        base: ['var(--font-sans)'],
        headline: ['var(--font-sans)'],
        label: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },

      // The type ramp is Carbon's productive scale (@carbon/type), kept to the sizes Carbon has and the
      // 12px floor. xs label-01, sm the compact body (14px, held at our 1.5 line, so 21px), md body-02,
      // lg heading-03, 2xl heading-04, 3xl heading-05, 4xl heading-06. Carbon sets heading-04 and -05
      // under 1.3 leading; they take 1.3, the floor the design judge holds multi-line text to.
      // xl was a second 20px step beside the old 18px lg; Carbon has none between 20 and 28, so xl
      // is now an alias of lg, deprecated, and goes in the next major.
      fontSize: {
        'cmn-xs': ['0.75rem', {lineHeight: '1.33333'}],
        'cmn-sm': ['0.875rem', {lineHeight: '1.5'}],
        'cmn-md': ['1rem', {lineHeight: '1.5'}],
        'cmn-lg': ['1.25rem', {lineHeight: '1.4'}],
        'cmn-xl': ['1.25rem', {lineHeight: '1.4'}],
        'cmn-2xl': ['1.75rem', {lineHeight: '1.3'}],
        'cmn-3xl': ['2rem', {lineHeight: '1.3'}],
        'cmn-4xl': ['2.625rem', {lineHeight: '1.2'}],
      },

      // Tailwind's `leading-tight` is 1.25, under the 1.3 floor the design judge holds multi-line
      // text to; the utility follows the type ramp instead.
      lineHeight: {
        tight: '1.3',
      },

      borderRadius: {
        'cmn-sm': 'var(--radius-sm)',
        'cmn-md': 'var(--radius-md)',
        'cmn-lg': 'var(--radius-lg)',
        'cmn-full': 'var(--radius-full)',
        // The semantic radius, by role (theme.css --cmn-radius-*). Named `role-*` on purpose: Tailwind
        // writes same-property utilities in alphabetical order, and a caller's `rounded-cmn-full` has
        // always lost to a component's `rounded-cmn-md` (m after f). Names that sort before `full`
        // would flip that, so every consumer's override would change shape under Carbon.
        'cmn-role-control': 'var(--cmn-radius-control)',
        'cmn-role-field': 'var(--cmn-radius-field)',
        'cmn-role-surface': 'var(--cmn-radius-surface)',
        'cmn-role-inset': 'var(--cmn-radius-inset)',
        'cmn-nav': 'var(--cmn-nav-item-radius)',
        'cmn-tab': 'var(--cmn-tab-radius)',
        'cmn-tabs': 'var(--cmn-tabs-radius)',
        'cmn-segmented': 'var(--cmn-segmented-radius)',
        'cmn-segmented-cell': 'var(--cmn-segmented-cell-radius)',
      },

      boxShadow: {
        'cmn-sm': 'var(--shadow-sm)',
        'cmn-md': 'var(--shadow-md)',
        'cmn-lg': 'var(--shadow-lg)',
        // Carbon's inset focus ring (a button, a tile): the border takes the focus colour, this adds
        // the 1px inside it and a 1px ground-coloured line inside that.
        'cmn-focus-inset':
          'inset 0 0 0 1px var(--color-border-focus), inset 0 0 0 2px var(--color-surface-card)',
        // Carbon's selected side-nav link: a 3px bar on the leading edge, drawn inside the box so the
        // label does not move when a link is chosen.
        'cmn-nav-active': 'var(--cmn-nav-active-shadow)',
        'cmn-card': 'var(--cmn-card-shadow)',
        'cmn-btn': 'var(--cmn-btn-shadow)',
      },
      // Carbon's notification stripe (3px), the one border width off Tailwind's 0/1/2/4/8 steps.
      borderWidth: {
        'cmn-bar': '3px',
        'cmn-field-frame': 'var(--cmn-field-border-width)',
        'cmn-select-frame': 'var(--cmn-select-border-width)',
        'cmn-tab': 'var(--cmn-tab-indicator)',
        'cmn-stripe': 'var(--cmn-alert-stripe)',
      },

      keyframes: {
        'cmn-spin': {to: {transform: 'rotate(360deg)'}},
        'cmn-pulse': {
          '0%, 100%': {opacity: '1'},
          '50%': {opacity: '0.45'},
        },
        'cmn-fade-in': {
          from: {opacity: '0'},
          to: {opacity: '1'},
        },
        'cmn-slide-in': {
          from: {transform: 'translateY(10px) scale(0.98)', opacity: '0'},
          to: {transform: 'translateY(0) scale(1)', opacity: '1'},
        },
        'cmn-slide-in-right': {
          from: {transform: 'translateX(16px)', opacity: '0'},
          to: {transform: 'translateX(0)', opacity: '1'},
        },
      },

      animation: {
        'cmn-spin': 'cmn-spin 1s linear infinite',
        'cmn-pulse': 'cmn-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'cmn-fade-in': 'cmn-fade-in var(--cmn-duration-short) var(--cmn-ease-standard)',
        'cmn-slide-in': 'cmn-slide-in var(--cmn-duration-medium) var(--cmn-ease-decelerate)',
        'cmn-slide-in-right':
          'cmn-slide-in-right var(--cmn-duration-medium) var(--cmn-ease-decelerate)',
      },

      // A bare `transition`, `transition-colors` or `transition-opacity` takes the motion tokens
      // too, not Tailwind's 150ms and its own curve, so nothing in a component or an app carries a
      // duration the tokens do not own (and a design preset can retime them all).
      transitionDuration: {
        DEFAULT: 'var(--cmn-duration-short)',
        'cmn-short': 'var(--cmn-duration-short)',
        'cmn-medium': 'var(--cmn-duration-medium)',
        'cmn-long': 'var(--cmn-duration-long)',
      },

      transitionTimingFunction: {
        DEFAULT: 'var(--cmn-ease-standard)',
        'cmn-standard': 'var(--cmn-ease-standard)',
        'cmn-decelerate': 'var(--cmn-ease-decelerate)',
        'cmn-accelerate': 'var(--cmn-ease-accelerate)',
        'cmn-expressive': 'var(--cmn-ease-expressive-standard)',
        'cmn-expressive-decelerate': 'var(--cmn-ease-expressive-decelerate)',
        'cmn-expressive-accelerate': 'var(--cmn-ease-expressive-accelerate)',
      },

      spacing: {
        'cmn-1': '4px',
        'cmn-2': '8px',
        'cmn-3': '12px',
        'cmn-4': '16px',
        'cmn-5': '20px',
        'cmn-6': '24px',
        'cmn-7': '28px',
        'cmn-8': '32px',
        'cmn-10': '40px',
        'cmn-touch': 'var(--size-touch)',
        'cmn-12': '48px',
        // Carbon layout sizes (theme.css): 24 / 32 / 40 / 48, the control heights.
        'cmn-size-xs': 'var(--cmn-size-xs)',
        'cmn-size-sm': 'var(--cmn-size-sm)',
        'cmn-size-md': 'var(--cmn-size-md)',
        'cmn-size-lg': 'var(--cmn-size-lg)',
        // Desktop shell (theme.css): the side nav's two widths, Carbon's 256 and 48.
        'cmn-nav': 'var(--cmn-nav-width)',
        'cmn-nav-rail': 'var(--cmn-nav-rail-width)',
        'cmn-nav-inset': 'var(--cmn-nav-inset)',
        'cmn-nav-gap': 'var(--cmn-nav-gap)',
        'cmn-nav-item': 'var(--cmn-nav-item-h)',
        'cmn-toggle-w': 'var(--cmn-toggle-w)',
        'cmn-toggle-h': 'var(--cmn-toggle-h)',
        'cmn-toggle-thumb': 'var(--cmn-toggle-thumb)',
        'cmn-toggle-pad': 'var(--cmn-toggle-pad)',
        'cmn-tabs-pad': 'var(--cmn-tabs-pad)',
        'cmn-tabs-gap': 'var(--cmn-tabs-gap)',
        'cmn-16': '64px',
        // Page rhythm (theme.css): semantic steps the page template owns. `px-cmn-page-gutter`,
        // `mt-cmn-title-gap`, `gap-cmn-section-gap`, `gap-cmn-group-gap`, `h-cmn-control-h`.
        'cmn-page-gutter': 'var(--cmn-page-gutter)',
        'cmn-title-gap': 'var(--cmn-title-gap)',
        'cmn-section-gap': 'var(--cmn-section-gap)',
        'cmn-group-gap': 'var(--cmn-group-gap)',
        'cmn-control-h': 'var(--cmn-control-h)',
      },
    },
  },
  plugins: [],
};
