import {applicationConfig, type Decorator, type Preview} from '@storybook/angular';

import {provideDesignPresets} from '../src/lib/services/preset/preset.service';

// theme.css is injected via angular.json styles array — do not import here,
// as Webpack does not have a PostCSS/Tailwind loader for raw CSS imports.

/**
 * The design presets the toolbar previews. Carbon is the default and has no stylesheet; every other
 * entry needs its `@lifekit-hq/tokens/presets/<id>.css` imported in `storybook.css`. Adding a preset
 * is one entry here and that import.
 */
const PRESETS = [
  {value: 'carbon', title: 'Carbon'},
  {value: 'lifekit', title: 'Lifekit'},
];
const DEFAULT_PRESET = 'carbon';

function activePreset(context: {globals: Record<string, unknown>}): string {
  return (context.globals['preset'] as string) ?? DEFAULT_PRESET;
}

/**
 * `PresetService` keeps a `data-preset` it is offered, so a story drawn in another preset is offered
 * the toolbar's choices (the appearance control then shows its Design entry). A Carbon story is drawn
 * as an app that stays on Carbon draws it, offered nothing else, so it has no Design control and the
 * Carbon screens do not move when a preset is added.
 */
const withOfferedPresets: Decorator = (storyFn, context) => {
  const offered =
    activePreset(context) === DEFAULT_PRESET
      ? []
      : PRESETS.map(({value, title}) => ({id: value, label: title}));
  return applicationConfig({providers: [provideDesignPresets(...offered)]})(storyFn, context);
};

const withThemeAndPreset: Decorator = (storyFn, context) => {
  const theme = (context.globals['theme'] as string) ?? 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const preset = activePreset(context);
  if (preset === DEFAULT_PRESET) {
    document.documentElement.removeAttribute('data-preset');
  } else {
    document.documentElement.setAttribute('data-preset', preset);
  }
  return storyFn();
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          {value: 'light', title: 'Light'},
          {value: 'dark', title: 'Dark'},
        ],
        dynamicTitle: true,
      },
    },
    preset: {
      description: 'Design preset',
      defaultValue: DEFAULT_PRESET,
      toolbar: {
        title: 'Design',
        icon: 'paintbrush',
        items: PRESETS,
        dynamicTitle: true,
      },
    },
  },
  decorators: [withOfferedPresets, withThemeAndPreset],
};

export default preview;
