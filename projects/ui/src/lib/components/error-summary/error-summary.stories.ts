import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {FormFieldComponent} from '../form-field/form-field.component';
import {InputComponent} from '../input/input.component';
import {ErrorSummaryComponent} from './error-summary.component';

const meta: Meta = {
  title: 'Components/ErrorSummary',
  component: ErrorSummaryComponent,
};

export default meta;
type Story = StoryObj<typeof meta>;

@Component({
  selector: 'cmn-error-summary-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    ErrorSummaryComponent,
    FormFieldComponent,
    InputComponent,
    ReactiveFormsModule,
  ],
  template: `
    <form [formGroup]="form" class="flex max-w-sm flex-col gap-cmn-4" novalidate>
      <cmn-error-summary />
      <cmn-form-field [required]="true" [control]="form.controls.name" label="Full name">
        <cmn-input formControlName="name" autocomplete="name" />
      </cmn-form-field>
      <cmn-form-field [required]="true" [control]="form.controls.email" label="Email">
        <cmn-input formControlName="email" type="email" autocomplete="email" />
      </cmn-form-field>
      <cmn-form-field [control]="form.controls.phone" hint="Optional" label="Phone">
        <cmn-input formControlName="phone" type="tel" autocomplete="tel" />
      </cmn-form-field>
      <cmn-form-field [required]="true" [control]="form.controls.postcode" label="Postcode">
        <cmn-input formControlName="postcode" autocomplete="postal-code" enterkeyhint="done" />
      </cmn-form-field>
      <cmn-button type="submit" variant="primary">Save details</cmn-button>
    </form>
  `,
})
class ErrorSummaryExampleComponent {
  public readonly form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl(''),
    postcode: new FormControl('', [Validators.required]),
  });
}

@Component({
  selector: 'cmn-error-summary-sheet-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    ErrorSummaryComponent,
    FormFieldComponent,
    InputComponent,
    ReactiveFormsModule,
  ],
  template: `
    <form [formGroup]="form" class="flex max-w-sm flex-col gap-cmn-4" novalidate>
      <cmn-error-summary [sheet]="sheet()" />
      <cmn-form-field [required]="true" [control]="form.controls.name" label="Account name">
        <cmn-input formControlName="name" />
      </cmn-form-field>
      <cmn-form-field [required]="true" [control]="form.controls.balance" label="Opening balance">
        <cmn-input formControlName="balance" inputmode="decimal" enterkeyhint="done" />
      </cmn-form-field>
      <cmn-button type="submit" variant="primary">Add account</cmn-button>
    </form>
  `,
})
class ErrorSummarySheetExampleComponent {
  public readonly sheet = input(true);
  public readonly form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    balance: new FormControl('', [Validators.required]),
  });
}

/** Submits the story's form once it renders, as a tap on its submit button would. */
async function submitOnRender({canvasElement}: {canvasElement: HTMLElement}): Promise<void> {
  const frames = 60;
  for (let frame = 0; frame < frames; frame++) {
    const form = canvasElement.querySelector('form');
    if (form) {
      form.requestSubmit();
      return;
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}

/** Before a submit the summary draws nothing. Save with empty fields to see it. */
export const Default: Story = {
  render: () => ({
    moduleMetadata: {imports: [ErrorSummaryExampleComponent]},
    template: '<cmn-error-summary-example />',
  }),
};

/**
 * After a submit with errors (guardrails V2): every error at the top, in the inline message's
 * words and in form order. Each entry links to its field, and focus moves to the summary. An
 * entry leaves as its field is fixed.
 */
export const SubmittedWithErrors: Story = {
  ...Default,
  name: 'Submitted with errors',
  play: submitOnRender,
};

/**
 * The deviation: a sheet form of three or fewer fields fits one screen, so a submit with errors
 * focuses the first invalid field and draws no summary. Save with empty fields to see it. Inside a
 * `cmn-dialog` the summary tells the phone sheet apart by itself; `[sheet]` sets it elsewhere.
 */
export const ShortSheet: Story = {
  render: () => ({
    moduleMetadata: {imports: [ErrorSummarySheetExampleComponent]},
    template: '<cmn-error-summary-sheet-example />',
  }),
};
