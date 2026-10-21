import {FormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import type {SelectMode, SelectOption, SelectSize} from './select.component';
import {SelectComponent} from './select.component';

interface SelectStoryArgs {
  options: SelectOption[];
  placeholder: string;
  size: SelectSize;
  mode: SelectMode;
  allowClear: boolean;
  showSearch: boolean;
  hasError: boolean;
}

const accountOptions: SelectOption[] = [
  {label: 'Main current account', value: 'main-current'},
  {label: 'Savings vault', value: 'savings-vault'},
  {label: 'Brokerage cash', value: 'brokerage-cash'},
];

const categoryOptions: SelectOption[] = [
  {label: 'Groceries', value: 'groceries'},
  {label: 'Rent', value: 'rent'},
  {label: 'Restaurants', value: 'restaurants'},
  {label: 'Transport', value: 'transport'},
  {label: 'Travel', value: 'travel', disabled: true},
  {label: 'Utilities', value: 'utilities'},
  {label: 'Subscriptions', value: 'subscriptions'},
  {label: 'Health', value: 'health'},
  {label: 'Gifts', value: 'gifts'},
];

const meta: Meta<SelectStoryArgs> = {
  title: 'Components/Select',
  component: SelectComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [FormsModule]})],
  argTypes: {
    size: {control: 'select', options: ['sm', 'md', 'lg']},
    mode: {control: 'select', options: ['default', 'multiple']},
    allowClear: {control: 'boolean'},
    showSearch: {control: 'boolean'},
    hasError: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<SelectStoryArgs>;

export const Default: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="w-80">
        <cmn-select
          [options]="options"
          [placeholder]="placeholder"
          [size]="size"
          [mode]="mode"
          [allowClear]="allowClear"
          [showSearch]="showSearch"
          [hasError]="hasError"
        />
      </div>
    `,
  }),
  args: {
    options: accountOptions,
    placeholder: 'Choose account',
    size: 'md',
    mode: 'default',
    allowClear: true,
    showSearch: false,
    hasError: false,
  },
};

// Story props are named `picked` and `inert`, never `value`, `selected` or `disabled`: Storybook
// copies props onto the component instance, where those names are its internal signals.
export const Filled: Story = {
  render: () => ({
    props: {options: accountOptions, picked: 'savings-vault'},
    template: `
      <div class="w-80">
        <cmn-select [options]="options" [(ngModel)]="picked" placeholder="Choose account" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: {options: accountOptions, picked: 'main-current', inert: true},
    template: `
      <div class="w-80">
        <cmn-select
          [options]="options"
          [ngModel]="picked"
          [disabled]="inert"
          placeholder="Choose account"
        />
      </div>
    `,
  }),
};

/**
 * `showSearch`: an APG editable combobox. Typing filters the options by label; the arrows move
 * through the matches and Enter picks one. `allowClear` adds an × once something is picked.
 */
export const Search: Story = {
  render: () => ({
    props: {options: categoryOptions, picked: 'rent'},
    template: `
      <div class="w-80">
        <cmn-select
          [options]="options"
          [(ngModel)]="picked"
          [showSearch]="true"
          [allowClear]="true"
          placeholder="Category"
        />
      </div>
    `,
  }),
};

export const SearchDisabled: Story = {
  render: () => ({
    props: {options: categoryOptions, picked: 'rent', inert: true},
    template: `
      <div class="w-80">
        <cmn-select
          [options]="options"
          [ngModel]="picked"
          [disabled]="inert"
          [showSearch]="true"
          placeholder="Category"
        />
      </div>
    `,
  }),
};

/**
 * `mode="multiple"`: a select-only combobox bound to an array. Each pick shows as a removable
 * chip; the popup stays open while Enter or Space toggles options, and the × clears them all.
 */
export const Multiple: Story = {
  render: () => ({
    props: {options: accountOptions, picked: []},
    template: `
      <div class="w-80">
        <cmn-select
          [options]="options"
          [(ngModel)]="picked"
          mode="multiple"
          placeholder="All accounts"
          aria-label="Accounts"
        />
      </div>
    `,
  }),
};

export const MultiplePreselected: Story = {
  render: () => ({
    props: {options: accountOptions, picked: ['main-current', 'savings-vault']},
    template: `
      <div class="w-80">
        <cmn-select
          [options]="options"
          [(ngModel)]="picked"
          mode="multiple"
          placeholder="All accounts"
          aria-label="Accounts"
        />
      </div>
    `,
  }),
};

export const MultipleDisabled: Story = {
  render: () => ({
    props: {options: accountOptions, picked: ['main-current'], inert: true},
    template: `
      <div class="w-80">
        <cmn-select
          [options]="options"
          [ngModel]="picked"
          [disabled]="inert"
          mode="multiple"
          placeholder="All accounts"
          aria-label="Accounts"
        />
      </div>
    `,
  }),
};

export const Error: Story = {
  render: () => ({
    props: {options: accountOptions},
    template: `
      <div class="w-80">
        <cmn-select [options]="options" [hasError]="true" placeholder="Required field" />
      </div>
    `,
  }),
};

/**
 * `mode="multiple"` with `showSearch`: type to narrow the list, Enter toggles the active match and
 * clears the search; Backspace in the empty field removes the last chip.
 */
export const MultipleSearch: Story = {
  render: () => ({
    props: {options: categoryOptions, picked: ['groceries', 'rent']},
    template: `
      <div class="w-80">
        <cmn-select
          [options]="options"
          [(ngModel)]="picked"
          [showSearch]="true"
          mode="multiple"
          placeholder="All categories"
          aria-label="Categories"
        />
      </div>
    `,
  }),
};
