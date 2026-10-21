import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {InputComponent} from '../input/input.component';
import {TextareaComponent} from '../textarea/textarea.component';
import {FormFieldComponent} from './form-field.component';

const MIN_PASSWORD_LENGTH = 8;

const meta: Meta = {
  title: 'Components/FormField',
  component: FormFieldComponent,
};

export default meta;
type Story = StoryObj<typeof meta>;

const FORM_IMPORTS = [FormFieldComponent, InputComponent];

export const Default: Story = {
  render: () => ({
    moduleMetadata: {imports: FORM_IMPORTS},
    template: `
      <cmn-form-field label="Email">
        <cmn-input type="email" placeholder="you@example.com" />
      </cmn-form-field>
    `,
  }),
};

export const WithHint: Story = {
  render: () => ({
    moduleMetadata: {imports: FORM_IMPORTS},
    template: `
      <cmn-form-field label="Email" hint="We will never share your email with anyone.">
        <cmn-input type="email" placeholder="you@example.com" />
      </cmn-form-field>
    `,
  }),
};

export const WithError: Story = {
  render: () => ({
    moduleMetadata: {imports: FORM_IMPORTS},
    template: `
      <cmn-form-field label="Email" errorMessage="Enter an email address in the correct format, like name@example.com.">
        <cmn-input type="email" [hasError]="true" placeholder="you@example.com" />
      </cmn-form-field>
    `,
  }),
};

export const Required: Story = {
  render: () => ({
    moduleMetadata: {imports: FORM_IMPORTS},
    template: `
      <cmn-form-field label="Password" [required]="true" hint="At least 8 characters.">
        <cmn-input type="password" placeholder="••••••••" />
      </cmn-form-field>
    `,
  }),
};

/** A multi-line field takes the label, hint and error exactly as a single-line one does. */
export const WithTextarea: Story = {
  render: () => ({
    moduleMetadata: {imports: [FormFieldComponent, TextareaComponent]},
    template: `
      <cmn-form-field label="What went wrong?" hint="Don't include account numbers, amounts or passwords.">
        <cmn-textarea [maxlength]="1000" placeholder="Tell us what happened" />
      </cmn-form-field>
    `,
  }),
};

export const TextareaWithError: Story = {
  render: () => ({
    moduleMetadata: {imports: [FormFieldComponent, TextareaComponent]},
    template: `
      <cmn-form-field label="What went wrong?" errorMessage="Tell us a little more.">
        <cmn-textarea [hasError]="true" [maxlength]="1000" />
      </cmn-form-field>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    moduleMetadata: {imports: [...FORM_IMPORTS, FormsModule]},
    template: `
      <cmn-form-field label="Username">
        <cmn-input type="text" [disabled]="true" [ngModel]="'john.doe'" />
      </cmn-form-field>
    `,
  }),
};

@Component({
  selector: 'cmn-form-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, InputComponent, ButtonComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-cmn-4 max-w-sm">
      <cmn-form-field
        [required]="true"
        [control]="form.controls.email"
        [errorMessage]="serverError()"
        hint="Use your work email"
        label="Email"
      >
        <cmn-input formControlName="email" type="email" placeholder="you@example.com" />
      </cmn-form-field>
      <cmn-form-field [required]="true" [control]="form.controls.password" label="Password">
        <cmn-input formControlName="password" type="password" placeholder="••••••••" />
      </cmn-form-field>
      <cmn-button type="submit" variant="primary">Sign In</cmn-button>
    </form>
  `,
})
class FormExampleComponent {
  public form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]),
  });

  /** A server rejection, set only after a submit the validators accepted. */
  protected readonly serverError = signal('');

  public onSubmit(): void {
    this.serverError.set(
      this.form.valid
        ? 'This email and password do not match an account. Check both and sign in again.'
        : ''
    );
  }
}

/**
 * Validators plus a server error. Nothing shows on blur or while typing; submit shows the
 * validator errors, fixing a field clears its error as you type, and a submit the validators accept
 * shows the server's message.
 */
export const FullReactiveFormExample: Story = {
  render: () => ({
    props: {},
    moduleMetadata: {imports: [FormExampleComponent]},
    template: '<cmn-form-example />',
  }),
};

@Component({
  selector: 'cmn-control-input-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, InputComponent, ButtonComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="flex flex-col gap-cmn-4 max-w-sm">
      <p class="text-cmn-sm text-text-secondary">
        Errors resolve from the validation-message registry through the
        <code>[control]</code> input. They appear on submit and clear as each field is fixed.
      </p>
      <cmn-form-field [required]="true" [control]="form.controls.email" label="Email">
        <cmn-input formControlName="email" type="email" placeholder="you@example.com" />
      </cmn-form-field>
      <cmn-form-field [required]="true" [control]="form.controls.password" label="Password">
        <cmn-input formControlName="password" type="password" placeholder="••••••••" />
      </cmn-form-field>
      <cmn-button type="submit" variant="primary">Sign In</cmn-button>
    </form>
  `,
})
class ControlInputExampleComponent {
  public form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]),
  });
}

export const WithControlInput: Story = {
  name: 'With [control] input (auto-resolved errors)',
  render: () => ({
    props: {},
    moduleMetadata: {imports: [ControlInputExampleComponent]},
    template: '<cmn-control-input-example />',
  }),
};

/** The same form after an empty submit: every field shows its error (guardrails V1). */
export const SubmittedWithErrors: Story = {
  ...WithControlInput,
  name: 'Submitted with errors',
  play: async ({canvasElement}) => {
    const frames = 60;
    for (let frame = 0; frame < frames; frame++) {
      const form = canvasElement.querySelector('form');
      if (form) {
        form.requestSubmit();
        return;
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  },
};
