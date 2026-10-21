import {JsonPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
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

@Component({
  selector: 'cmn-checkbox-form-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CheckboxComponent, JsonPipe, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="flex flex-col gap-cmn-3">
      <cmn-checkbox formControlName="remember" label="Keep me signed in">
        <span class="font-label text-cmn-sm text-text-primary">Keep me signed in</span>
      </cmn-checkbox>
      <cmn-checkbox formControlName="news" label="Send me product news">
        <span class="font-label text-cmn-sm text-text-primary">Send me product news</span>
      </cmn-checkbox>
      <p class="text-cmn-xs leading-relaxed text-text-secondary">
        Form value: {{ form.value | json }}
      </p>
    </form>
  `,
})
class FormExampleComponent {
  protected readonly form = new FormGroup({
    remember: new FormControl(true, {nonNullable: true}),
    news: new FormControl(false, {nonNullable: true}),
  });
}

/** Bound with `formControlName`: the form owns the value (guardrails V8). */
export const InAReactiveForm: Story = {
  render: () => ({
    moduleMetadata: {imports: [FormExampleComponent]},
    template: '<cmn-checkbox-form-example />',
  }),
};
