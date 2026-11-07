import {LkInstallHint, LkOfflineBanner, LkUpdatePrompt} from '@lifekit-hq/elements';

/**
 * Registers the PWA notices an app projects into the shell's notices slot (`cmnAppLayoutNotice`).
 * Stories only: they show the shell as an app wires it, with the three notices there and none of
 * them showing. Imported by name so a bundler cannot tree-shake the customElements.define() call.
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
