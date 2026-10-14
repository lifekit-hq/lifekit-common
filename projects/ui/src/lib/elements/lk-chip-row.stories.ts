/**
 * Angular consumption proof for <lk-chip-row>.
 *
 * Imports the element class by name so production bundlers (which honour sideEffects on the
 * package) cannot tree-shake away the module's customElements.define() call.
 */
import {type ChipRowChangeDetail, type ChipRowOption, LkChipRow} from '@lifekit-hq/elements';

if (!customElements.get('lk-chip-row')) {
  customElements.define('lk-chip-row', LkChipRow);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

interface StoryArgs {
  options: ChipRowOption[];
  selected: string[];
  mode: 'single' | 'multi';
  label: string;
}

const PERIODS: ChipRowOption[] = [
  {value: 'week', label: 'This week'},
  {value: 'month', label: 'This month'},
  {value: 'last-month', label: 'Last month'},
  {value: 'quarter', label: 'Last three months'},
  {value: 'year', label: 'This year'},
  {value: 'all', label: 'All time'},
];

const STATUSES: ChipRowOption[] = [
  {value: 'unread', label: 'Unread', count: 4},
  {value: 'flagged', label: 'Flagged', count: 2},
  {value: 'pending', label: 'Pending review', count: 11},
  {value: 'archived', label: 'Archived', count: 0},
  {value: 'muted', label: 'Muted', disabled: true},
];

const meta: Meta<StoryArgs> = {
  title: 'Elements/LkChipRow',
  tags: ['autodocs'],
  decorators: [moduleMetadata({schemas: [CUSTOM_ELEMENTS_SCHEMA]})],
  args: {options: PERIODS, selected: ['month'], mode: 'single', label: 'Period'},
  argTypes: {mode: {control: 'inline-radio', options: ['single', 'multi']}},
  render: args => ({
    props: {
      ...args,
      onChange: function (this: StoryArgs, event: Event): void {
        this.selected = (event as CustomEvent<ChipRowChangeDetail>).detail.selected;
      },
    },
    template: `
      <div class="max-w-sm">
        <lk-chip-row
          [options]="options"
          [selected]="selected"
          [mode]="mode"
          [label]="label"
          (lk-chip-row-change)="onChange($event)"
        ></lk-chip-row>
        <p class="mt-cmn-2 text-cmn-sm text-text-secondary">Selected: {{ selected.join(', ') || 'none' }}</p>
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Period quick filters: one chip is always on. The row scrolls instead of wrapping, fades at the
 * edge with more to show, and snaps chip by chip.
 */
export const Single: Story = {};

/** The selected chip starts past the visible edge; the row scrolls it into view on its own. */
export const SelectedOffscreen: Story = {
  args: {selected: ['all']},
};

/** Independent toggles with count badges; a disabled chip stays visible but cannot be pressed. */
export const MultiWithCounts: Story = {
  args: {options: STATUSES, selected: ['unread', 'pending'], mode: 'multi', label: 'Status'},
};

/**
 * Phone widths the conformance suite measures: 375, 390 and 402. Every label shows whole on one
 * line at each, and every chip presses as a 44px target.
 */
export const PhoneWidths: Story = {
  render: () => ({
    props: {options: PERIODS, widths: [375, 390, 402]},
    template: `
      <div class="flex flex-col gap-cmn-4">
        @for (width of widths; track width) {
          <div [style.width.px]="width" class="border border-border-default px-cmn-4" data-phone-width>
            <p class="text-cmn-xs text-text-secondary">{{ width }}px</p>
            <lk-chip-row [options]="options" [selected]="['quarter']" label="Period"></lk-chip-row>
          </div>
        }
      </div>
    `,
  }),
};
