import {LkInstallHint, LkOfflineBanner, LkUpdatePrompt} from '@lifekit-hq/elements';

/**
 * Registers the three PWA notices (`pwaNotices` on `cmn-app-layout` renders them; an app can also
 * project its own into `cmnAppLayoutNotice`). Imported by name so a bundler cannot tree-shake the
 * customElements.define() call.
 */
export function defineAppChromeElements(): void {
  for (const [tag, element] of [
    ['lk-update-prompt', LkUpdatePrompt],
    ['lk-offline-banner', LkOfflineBanner],
    ['lk-install-hint', LkInstallHint],
  ] as const) {
    if (!customElements.get(tag)) {
      customElements.define(tag, element);
    }
  }
}
