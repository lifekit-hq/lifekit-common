/**
 * Angular consumption proof for <lk-install-hint>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects:false on
 * the package) cannot tree-shake away the module's customElements.define() call.
 *
 * The hint only renders on iOS Safari or when a Chromium browser offers `beforeinstallprompt`,
 * so the story fires a synthetic install prompt to make it visible on any desktop browser.
 */
import {LkInstallHint} from '@lifekit-hq/elements';

if (!customElements.get('lk-install-hint')) {
  customElements.define('lk-install-hint', LkInstallHint);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

const DISMISSED_KEY = 'lk-install-hint-dismissed';

const meta: Meta = {
  title: 'Elements/LkInstallHint',
  tags: ['autodocs'],
  decorators: [moduleMetadata({schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  render: () => ({
    props: {
      simulateInstallPrompt(): void {
        const event = Object.assign(new Event('beforeinstallprompt', {cancelable: true}), {
          prompt: () => Promise.resolve(),
          userChoice: Promise.resolve({outcome: 'dismissed'}),
        });
        window.dispatchEvent(event);
      },
      resetDismissal(): void {
        try {
          localStorage.removeItem(DISMISSED_KEY);
        } catch {
          // Storage unavailable — nothing to reset.
        }
        location.reload();
      },
    },
    template: `
      <lk-install-hint></lk-install-hint>
      <p style="font-family: sans-serif; font-size: 0.75rem">
        <button type="button" (click)="simulateInstallPrompt()">Simulate install prompt</button>
        <button type="button" (click)="resetDismissal()">Reset dismissal</button>
      </p>
    `,
  }),
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};
