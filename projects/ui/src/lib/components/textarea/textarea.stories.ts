import type {Meta, StoryObj} from '@storybook/angular';

import type {InputSize} from '../input/input.component';
import {TextareaComponent} from './textarea.component';

interface TextareaStoryArgs {
  size: InputSize;
  rows: number;
  maxlength: number | null;
  hasError: boolean;
  readonly: boolean;
}

const REPORT_LIMIT = 1000;

const meta: Meta<TextareaStoryArgs> = {
  title: 'Components/Textarea',
  component: TextareaComponent,
  tags: ['autodocs'],
  argTypes: {
    size: {control: 'select', options: ['sm', 'md', 'lg']},
    rows: {control: 'number'},
    maxlength: {control: 'number'},
    hasError: {control: 'boolean'},
    readonly: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<TextareaStoryArgs>;

export const Default: Story = {
  render: args => ({
    props: args,
    template:
      '<cmn-textarea [size]="size" [rows]="rows" [maxlength]="maxlength" placeholder="What happened?" />',
  }),
  args: {size: 'md', rows: 3, maxlength: null},
};

/** `maxlength` caps the text and counts it under the field. */
export const WithCounter: Story = {
  render: () => ({
    template: `<cmn-textarea [maxlength]="${REPORT_LIMIT}" [ngModel]="'The balance never refreshes.'" />`,
  }),
};

export const WithValue: Story = {
  render: () => ({
    template: '<cmn-textarea [ngModel]="\'First line\\nSecond line\\nThird line\'" />',
  }),
};

export const Disabled: Story = {
  render: () => ({
    template: '<cmn-textarea placeholder="Disabled textarea" [disabled]="true" />',
  }),
};

export const Readonly: Story = {
  render: () => ({
    template: '<cmn-textarea [readonly]="true" [ngModel]="\'Read-only\\nvalue\'" />',
  }),
};

export const Error: Story = {
  render: () => ({
    template: '<cmn-textarea [hasError]="true" placeholder="Invalid text" />',
  }),
};

export const AllSizes: Story = {
  render: () => ({
    template: `
      <div class="flex flex-col gap-cmn-3">
        <cmn-textarea size="sm" [rows]="2" placeholder="Small textarea" />
        <cmn-textarea size="md" [rows]="2" placeholder="Medium textarea (default)" />
        <cmn-textarea size="lg" [rows]="2" placeholder="Large textarea" />
      </div>
    `,
  }),
};
