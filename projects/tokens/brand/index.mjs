/**
 * @lifekit-hq/tokens/brand — the lifekit mark and browser-chrome standard for Node
 * tooling (build configs, CI checks). Browser code never imports this module; apps serve
 * the generated files under @lifekit-hq/tokens/brand/<app>/.
 */
export {checkBrowserChrome, checkHead, checkIcons, checkManifest} from './check.mjs';
export {BRAND_APPS, fullBleedSvg, markSvg, TILE_RADIUS} from './mark.mjs';
export {
  BRAND_FILES,
  brandAssetsDir,
  brandManifest,
  DEFAULT_BASE_PATH,
  headMarkup,
  MANIFEST_ICONS,
  manifestFragment,
  normalizeBasePath,
  SHORT_NAME_MAX,
  themeColors,
  TITLE_SEPARATOR,
  VIEWPORT,
} from './standard.mjs';
export {brandColors} from './tokens.mjs';
export {
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
  themeScriptCspHash,
  themeScriptTag,
} from './theme-script.mjs';
