import {FormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import type {SearchInputSize} from './search-input.component';
import {SearchInputComponent} from './search-input.component';

interface SearchInputStoryArgs {
  size: SearchInputSize;
  placeholder: string;
}

const meta: Meta<SearchInputStoryArgs> = {
  title: 'Components/SearchInput',
  component: SearchInputComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [FormsModule]})],
  argTypes: {size: {control: 'select', options: ['sm', 'md', 'lg']}},
};

export default meta;
type Story = StoryObj<SearchInputStoryArgs>;

export const Default: Story = {
  render: args => ({
    props: {...args, query: ''},
    template: `
      <div class="w-80">
        <cmn-search-input [(ngModel)]="query" [size]="size" [placeholder]="placeholder" />
        <p class="mt-2 text-cmn-sm text-text-secondary">Query: "{{ query }}"</p>
      </div>
    `,
  }),
  args: {size: 'md', placeholder: 'Search transactions'},
};

export const WithValue: Story = {
  render: () => ({
    props: {query: 'coffee'},
    template: '<div class="w-80"><cmn-search-input [(ngModel)]="query" /></div>',
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: {query: 'locked'},
    template: '<div class="w-80"><cmn-search-input [(ngModel)]="query" [disabled]="true" /></div>',
  }),
};
