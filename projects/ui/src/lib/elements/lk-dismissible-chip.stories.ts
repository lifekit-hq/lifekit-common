/**
 * Angular consumption proof for <lk-dismissible-chip>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects on the
 * package) cannot tree-shake away the module's customElements.define() call.
 */
import {LkDismissibleChip} from '@lifekit-hq/elements';

if (!customElements.get('lk-dismissible-chip')) {
  customElements.define('lk-dismissible-chip', LkDismissibleChip);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {
  componentWrapperDecorator,
  type Meta,
  moduleMetadata,
  type StoryObj,
} from '@storybook/angular';

interface StoryArgs {
  label: string;
  removeLabel: string;
  disabled: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'Elements/LkDismissibleChip',
  tags: ['autodocs'],
  decorators: [moduleMetadata({schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  args: {label: 'Category: Groceries', removeLabel: '', disabled: false},
  render: args => ({
    props: args,
    template: `
      <lk-dismissible-chip
        [label]="label"
        [removeLabel]="removeLabel"
        [disabled]="disabled"
      ></lk-dismissible-chip>
    `,
  }),
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** One applied filter. The cross is a real button named "Remove Category: Groceries". */
export const Default: Story = {};

/** The host names the remove action itself when the bare label is not enough. */
export const CustomRemoveLabel: Story = {
  args: {label: 'Groceries', removeLabel: 'Remove Category: Groceries'},
};

/**
 * The ledger's applied-filter row. The host owns the list: each remove event drops its chip, and
 * Tab, then Enter or Space, removes from the keyboard. Every cross keeps a 44px hit area while
 * the pills stay chip-sized.
 */
export const FilterRow: Story = {
  render: () => ({
    props: {
      filters: ['Category: Groceries', 'Category: Transport', 'Dates: Sep 1 - Sep 30', 'Type: Out'],
      drop: function (this: {filters: string[]}, label: string): void {
        this.filters = this.filters.filter(f => f !== label);
      },
    },
    template: `
      <div class="flex flex-wrap gap-cmn-2">
        @for (filter of filters; track filter) {
          <lk-dismissible-chip
            [label]="filter"
            (lk-dismissible-chip-remove)="drop(filter)"
          ></lk-dismissible-chip>
        }
      </div>
    `,
  }),
};

/** A long label truncates inside its container instead of pushing the cross off the row. */
export const LongLabel: Story = {
  args: {label: 'Category: Restaurants, cafes and other places to eat out'},
  decorators: [componentWrapperDecorator(story => `<div class="w-[220px]">${story}</div>`)],
};

/** In the 326px a card leaves on a 390px phone. */
export const Phone: Story = {
  decorators: [
    componentWrapperDecorator(
      story =>
        `<div class="mx-auto w-[326px] rounded-cmn-lg bg-surface-card p-cmn-4">${story}</div>`
    ),
  ],
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

export const Disabled: Story = {args: {disabled: true}};

export const Dark: Story = {
  decorators: [
    componentWrapperDecorator(story => `<div class="bg-surface-bg p-cmn-4">${story}</div>`),
  ],
  globals: {theme: 'dark'},
};
