import type {Meta, StoryObj} from '@storybook/angular';

import {AlertComponent} from './alert.component';

const meta: Meta<AlertComponent> = {
  title: 'Components/Alert',
  component: AlertComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
    },
    dismissible: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  render: () => ({
    template: '<cmn-alert variant="info">Your session will expire in 10 minutes.</cmn-alert>',
  }),
};

export const Success: Story = {
  render: () => ({
    template: '<cmn-alert variant="success">Account linked successfully.</cmn-alert>',
  }),
};

export const Warning: Story = {
  render: () => ({
    template: '<cmn-alert variant="warning">Your API key will expire in 3 days.</cmn-alert>',
  }),
};

export const Error: Story = {
  render: () => ({
    template: '<cmn-alert variant="error">Transactions did not sync. Try again.</cmn-alert>',
  }),
};

export const WithTitle: Story = {
  render: () => ({
    template:
      '<cmn-alert variant="error" title="Sync Failed">We couldn\'t connect to your bank. Check your credentials and try again.</cmn-alert>',
  }),
};

export const Dismissible: Story = {
  render: () => ({
    template:
      '<cmn-alert variant="info" [dismissible]="true">Click the × to dismiss this alert.</cmn-alert>',
  }),
};

export const WithLongContent: Story = {
  render: () => ({
    template: `
      <div class="max-w-md">
        <cmn-alert variant="warning" title="Security Notice" [dismissible]="true">
          We noticed a sign-in attempt from a new device in Chicago, IL. If this was you, no action is needed.
          If this wasn't you, please review your account security settings immediately and consider changing your password.
        </cmn-alert>
      </div>
    `,
  }),
};

const FRAME_VARIANTS = [
  {variant: 'info', token: '--color-status-info'},
  {variant: 'success', token: '--color-status-success'},
  {variant: 'warning', token: '--color-status-warning'},
  {variant: 'error', token: '--color-status-error'},
  {variant: 'accent', token: '--color-accent-default'},
] as const;

const FRAME_HAIRLINE_PERCENT = 40;
const FULL_PERCENT = 100;

/** The border colour a token resolves to inside `scope`, read through a probe element. */
function resolveBorder(scope: Element, token: string, percent: number, side: 'top' | 'left') {
  const probe = document.createElement('div');
  const colour =
    percent === FULL_PERCENT
      ? `var(${token})`
      : `color-mix(in srgb, var(${token}) ${percent}%, transparent)`;
  probe.style.cssText = `position:absolute;visibility:hidden;border:1px solid ${colour}`;
  scope.appendChild(probe);
  const resolved = getComputedStyle(probe).getPropertyValue(`border-${side}-color`);
  probe.remove();
  return resolved;
}

/**
 * Every notification kind in the active theme (the toolbar switches it; the a11y and screen runs
 * render both). The play function reads each frame's computed border and compares it with the
 * status token it should resolve to, so a frame that falls back to the Preflight gray-200 (a
 * hairline class the stylesheet dropped) fails here, in light and in dark, instead of in an app.
 */
export const FrameFollowsTheme: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-cmn-3" data-frame-scope>
        ${FRAME_VARIANTS.map(
          ({variant}) =>
            `<cmn-alert variant="${variant}" title="${variant}">The frame is a ${variant} token colour.</cmn-alert>`
        ).join('')}
      </div>
    `,
  }),
  play: ({canvasElement}) => {
    const scope = canvasElement.querySelector('[data-frame-scope]');
    if (!scope) {
      throw new globalThis.Error('Missing frame scope');
    }
    const frames = scope.querySelectorAll('[role]');
    FRAME_VARIANTS.forEach(({variant, token}, index) => {
      const style = getComputedStyle(frames[index]);
      const checks = [
        [
          'hairline',
          style.borderTopColor,
          resolveBorder(scope, token, FRAME_HAIRLINE_PERCENT, 'top'),
        ],
        ['stripe', style.borderLeftColor, resolveBorder(scope, token, FULL_PERCENT, 'left')],
      ] as const;
      for (const [part, actual, expected] of checks) {
        if (actual !== expected) {
          throw new globalThis.Error(`${variant} ${part}: ${actual}, expected ${expected}`);
        }
      }
    });
  },
};
