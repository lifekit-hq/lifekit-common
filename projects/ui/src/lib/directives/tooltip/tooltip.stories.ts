import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../../components/button/button.component';
import {TooltipDirective} from './tooltip.directive';

/**
 * `cmnTooltip` shows a short text when a mouse rests on its trigger or keyboard focus reaches
 * it (WCAG 1.4.13). The pointer can move onto the bubble, Escape dismisses it without moving
 * focus, and it stays until hover and focus have left. On touch a tap acts on the trigger; a
 * long press shows the tooltip and the next touch dismisses it, so keep anything a person needs
 * to act out of a tooltip. Screen readers read the text as the trigger's description.
 */
const meta: Meta<TooltipDirective> = {
  title: 'Directives/Tooltip',
  component: TooltipDirective,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [ButtonComponent, TooltipDirective]})],
};

export default meta;
type Story = StoryObj<TooltipDirective>;

/** Each side, with the opposite side as the fallback when the viewport has no room. */
export const Placements: Story = {
  render: () => ({
    template: `
      <div class="flex flex-wrap items-center justify-center gap-cmn-4 bg-surface-bg p-cmn-16">
        <cmn-button variant="secondary" cmnTooltip="Shown above" cmnTooltipPlacement="top">
          Top
        </cmn-button>
        <cmn-button variant="secondary" cmnTooltip="Shown below" cmnTooltipPlacement="bottom">
          Bottom
        </cmn-button>
        <cmn-button variant="secondary" cmnTooltip="Shown before" cmnTooltipPlacement="start">
          Start
        </cmn-button>
        <cmn-button variant="secondary" cmnTooltip="Shown after" cmnTooltipPlacement="end">
          End
        </cmn-button>
      </div>
    `,
  }),
};

/** An icon-only button names itself with `aria-label`; the tooltip adds what it does. */
export const IconButton: Story = {
  render: () => ({
    template: `
      <div class="flex justify-center bg-surface-bg p-cmn-16">
        <cmn-button
          variant="secondary"
          icon="Download"
          aria-label="Export"
          cmnTooltip="Download the ledger as CSV"
        />
      </div>
    `,
  }),
};

/** Long text wraps within the bubble's maximum width rather than running off screen. */
export const LongContent: Story = {
  render: () => ({
    template: `
      <div class="flex justify-center bg-surface-bg p-cmn-16">
        <cmn-button
          variant="secondary"
          cmnTooltip="Balances refresh every fifteen minutes while the app is open. A bank that asks for consent again shows a reconnect prompt on its account row instead of a stale balance."
          cmnTooltipPlacement="bottom"
        >
          How balances refresh
        </cmn-button>
      </div>
    `,
  }),
};

/**
 * Guardrail T5: overflowing text truncates, with the full value on hover and focus.
 * `cmnTooltipTruncatedOnly` shows the tooltip only while the text is cut off, so the second
 * row, which fits, shows none. `tabindex="0"` lets keyboard focus reach the text.
 */
export const Truncated: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-cmn-2 bg-surface-bg p-cmn-8">
        <span
          class="block w-40 truncate text-cmn-sm text-text-primary"
          cmnTooltip="Allied Irish Banks current account ending 4417"
          cmnTooltipTruncatedOnly
          tabindex="0"
        >
          Allied Irish Banks current account ending 4417
        </span>
        <span
          class="block w-40 truncate text-cmn-sm text-text-primary"
          cmnTooltip="Revolut"
          cmnTooltipTruncatedOnly
          tabindex="0"
        >
          Revolut
        </span>
      </div>
    `,
  }),
};

/** `cmnTooltipDisabled` turns the tooltip and its description off. */
export const Disabled: Story = {
  render: () => ({
    template: `
      <div class="flex justify-center bg-surface-bg p-cmn-16">
        <cmn-button variant="secondary" cmnTooltip="Never shown" cmnTooltipDisabled>
          No tooltip
        </cmn-button>
      </div>
    `,
  }),
};
