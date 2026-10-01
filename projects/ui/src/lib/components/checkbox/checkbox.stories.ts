import {componentWrapperDecorator, type Meta, type StoryObj} from '@storybook/angular';

import {CheckboxComponent} from './checkbox.component';

const darkSurface = componentWrapperDecorator(
  story => `<div class="bg-surface-bg p-cmn-4">${story}</div>`
);

const meta: Meta<CheckboxComponent> = {
  title: 'Components/Checkbox',
  component: CheckboxComponent,
  tags: ['autodocs'],
  args: {label: 'Remember me'},
};

export default meta;
type Story = StoryObj<CheckboxComponent>;

export const Unchecked: Story = {};

export const Checked: Story = {args: {checked: true}};

export const Indeterminate: Story = {args: {indeterminate: true}};

export const Disabled: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-4">
        <cmn-checkbox [disabled]="true" label="Disabled, off" />
        <cmn-checkbox [checked]="true" [disabled]="true" label="Disabled, on" />
      </div>
    `,
  }),
};

/** The projected content sits beside the box as its visible label. */
export const WithLabel: Story = {
  render: () => ({
    template: `
      <cmn-checkbox label="Keep me signed in">
        <span class="font-label text-cmn-sm text-text-primary">Keep me signed in</span>
      </cmn-checkbox>
    `,
  }),
};

export const Dark: Story = {
  decorators: [darkSurface],
  globals: {theme: 'dark'},
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-4">
        <cmn-checkbox label="Off" />
        <cmn-checkbox [checked]="true" label="On" />
        <cmn-checkbox [indeterminate]="true" label="Mixed" />
        <cmn-checkbox [checked]="true" [disabled]="true" label="Disabled" />
      </div>
    `,
  }),
};
