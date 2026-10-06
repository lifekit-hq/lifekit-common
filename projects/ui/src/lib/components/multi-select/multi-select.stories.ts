import {FormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import type {SelectOption} from '../select/select.component';
import type {MultiSelectSize} from './multi-select.component';
import {MultiSelectComponent} from './multi-select.component';

interface MultiSelectStoryArgs {
  options: SelectOption[];
  placeholder: string;
  size: MultiSelectSize;
  hasError: boolean;
}

const categories: SelectOption[] = [
  {label: 'Groceries', value: 'groceries'},
  {label: 'Rent', value: 'rent'},
  {label: 'Transport', value: 'transport'},
  {label: 'Dining out', value: 'dining'},
  {label: 'Travel', value: 'travel', disabled: true},
];

const meta: Meta<MultiSelectStoryArgs> = {
  title: 'Components/MultiSelect',
  component: MultiSelectComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [FormsModule]})],
  argTypes: {
    size: {control: 'select', options: ['sm', 'md', 'lg']},
    hasError: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<MultiSelectStoryArgs>;

export const Default: Story = {
  render: args => ({
    props: {...args, selected: []},
    template: `
      <div class="w-72">
        <cmn-multi-select
          [(ngModel)]="selected"
          [options]="options"
          [placeholder]="placeholder"
          [size]="size"
          [hasError]="hasError"
          ariaLabel="Category"
        />
        <p class="mt-2 text-cmn-sm text-text-secondary">{{ selected | json }}</p>
      </div>
    `,
  }),
  args: {options: categories, placeholder: 'All categories', size: 'md', hasError: false},
};

export const Preselected: Story = {
  render: () => ({
    props: {options: categories, selected: ['groceries', 'rent']},
    template:
      '<div class="w-72"><cmn-multi-select [(ngModel)]="selected" [options]="options" /></div>',
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: {options: categories, selected: ['rent']},
    template:
      '<div class="w-72"><cmn-multi-select [(ngModel)]="selected" [options]="options" [disabled]="true" /></div>',
  }),
};
