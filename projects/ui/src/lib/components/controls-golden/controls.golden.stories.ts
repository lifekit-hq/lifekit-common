import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';

import {AlertComponent} from '../alert/alert.component';
import {ButtonComponent, type ButtonVariant} from '../button/button.component';
import {CardComponent} from '../card/card.component';
import {CheckboxComponent} from '../checkbox/checkbox.component';
import {FormFieldComponent} from '../form-field/form-field.component';
import {InputComponent} from '../input/input.component';
import {TagComponent} from '../tag/tag.component';
import {TextareaComponent} from '../textarea/textarea.component';
import {ToggleComponent} from '../toggle/toggle.component';

const KINDS: readonly ButtonVariant[] = [
  'primary',
  'secondary',
  'tertiary',
  'ghost',
  'destructive',
  'danger-tertiary',
  'danger-ghost',
];

/**
 * The golden controls screen: every control of Carbon step 2 (epic #279) in the states the spec
 * names, drawn once so a change to a token or a control moves a pixel here. It is not an app
 * screen, so it is not on the page template; it lists the controls the way Carbon's own pages do.
 *
 * Hover and focus cannot be reached by a still page, so a wrapper marked `data-force` names the
 * state it holds (`hover` or `focus`); `e2e/screens/controls.spec.ts` forces that pseudo-class on
 * the control inside it before the screenshot. Only fake data: a payee, an amount, a note.
 */
@Component({
  selector: 'cmn-controls-golden',
  imports: [
    AlertComponent,
    ButtonComponent,
    CardComponent,
    CheckboxComponent,
    FormFieldComponent,
    InputComponent,
    ReactiveFormsModule,
    TagComponent,
    TextareaComponent,
    ToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block bg-surface-bg p-cmn-4 md:p-cmn-8'},
  template: `
    <div class="mx-auto flex max-w-[75rem] flex-col gap-cmn-8" data-controls-golden>
      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-buttons">
        <h2 id="g-buttons" class="text-cmn-lg font-semibold text-text-primary">Buttons</h2>
        @for (kind of kinds; track kind) {
          <div class="flex flex-col gap-cmn-1">
            <span class="text-cmn-xs text-text-secondary">{{ kind }}</span>
            <div class="flex flex-wrap items-center gap-cmn-2">
              <cmn-button [variant]="kind">Save</cmn-button>
              <span data-force="hover"><cmn-button [variant]="kind">Hover</cmn-button></span>
              <span data-force="focus"><cmn-button [variant]="kind">Focus</cmn-button></span>
              <cmn-button [variant]="kind" [disabled]="true">Off</cmn-button>
            </div>
          </div>
        }
        <div class="flex flex-col gap-cmn-1">
          <span class="text-cmn-xs text-text-secondary">sizes: 32, 48, 64 px</span>
          <div class="flex flex-wrap items-center gap-cmn-2">
            <cmn-button size="sm">Small</cmn-button>
            <cmn-button size="md">Default</cmn-button>
            <cmn-button size="lg">Large</cmn-button>
            <cmn-button icon="Plus">Add</cmn-button>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-fields">
        <h2 id="g-fields" class="text-cmn-lg font-semibold text-text-primary">Fields</h2>
        <div class="grid gap-cmn-4 md:grid-cols-2">
          <cmn-form-field label="Payee" hint="As it appears on the statement.">
            <cmn-input placeholder="Northwind Bank" />
          </cmn-form-field>
          <span data-force="hover">
            <cmn-form-field label="Payee (hover)">
              <cmn-input placeholder="Harbor Credit Union" />
            </cmn-form-field>
          </span>
          <span data-force="focus">
            <cmn-form-field label="Payee (focus)">
              <cmn-input placeholder="Cedar Brokerage" />
            </cmn-form-field>
          </span>
          <cmn-form-field [formControl]="disabledPayee" label="Payee (disabled)">
            <cmn-input />
          </cmn-form-field>
          <cmn-form-field [formControl]="readonlyAmount" label="Amount (read-only)">
            <cmn-input [readonly]="true" />
          </cmn-form-field>
          <cmn-form-field
            label="Amount (error)"
            errorMessage="Enter an amount in euros, like 1240.00."
          >
            <cmn-input [hasError]="true" placeholder="0.00" />
          </cmn-form-field>
          <cmn-form-field label="Note">
            <cmn-textarea [rows]="3" placeholder="Rent for November" />
          </cmn-form-field>
        </div>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-tags">
        <h2 id="g-tags" class="text-cmn-lg font-semibold text-text-primary">Tags</h2>
        <div class="flex flex-wrap items-center gap-cmn-2">
          <cmn-tag variant="success">Synced</cmn-tag>
          <cmn-tag variant="error">Failed</cmn-tag>
          <cmn-tag variant="warning">Stale</cmn-tag>
          <cmn-tag variant="info">New</cmn-tag>
          <cmn-tag variant="neutral">Pending</cmn-tag>
        </div>
        <div class="flex flex-wrap items-center gap-cmn-2">
          <cmn-tag size="lg" variant="success">Synced</cmn-tag>
          <cmn-tag size="lg" variant="error">Failed</cmn-tag>
          <cmn-tag size="lg" variant="warning">Stale</cmn-tag>
          <cmn-tag size="lg" variant="info">New</cmn-tag>
          <cmn-tag size="lg" variant="neutral">Pending</cmn-tag>
        </div>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-choice">
        <h2 id="g-choice" class="text-cmn-lg font-semibold text-text-primary">
          Checkbox and toggle
        </h2>
        <div class="flex flex-wrap items-center gap-x-cmn-6 gap-y-cmn-3">
          <cmn-checkbox>Off</cmn-checkbox>
          <cmn-checkbox [checked]="true">On</cmn-checkbox>
          <cmn-checkbox [indeterminate]="true">Some</cmn-checkbox>
          <span data-force="focus"><cmn-checkbox>Focus</cmn-checkbox></span>
          <cmn-checkbox [disabled]="true">Off</cmn-checkbox>
          <cmn-checkbox [disabled]="true" [checked]="true">On</cmn-checkbox>
        </div>
        <div class="flex flex-wrap items-center gap-x-cmn-6 gap-y-cmn-3">
          <cmn-toggle label="Off" />
          <cmn-toggle [checked]="true" label="On" />
          <span data-force="focus"><cmn-toggle label="Focus" /></span>
          <cmn-toggle [disabled]="true" label="Disabled off" />
          <cmn-toggle [disabled]="true" [checked]="true" label="Disabled on" />
        </div>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-alerts">
        <h2 id="g-alerts" class="text-cmn-lg font-semibold text-text-primary">Alerts</h2>
        <div class="grid gap-cmn-2 md:grid-cols-2">
          <cmn-alert variant="info" title="Statement ready">November is ready to review.</cmn-alert>
          <cmn-alert variant="success" title="Synced">Northwind Bank is up to date.</cmn-alert>
          <cmn-alert variant="warning" title="Reconnect soon">
            Harbor Credit Union needs you to sign in again.
          </cmn-alert>
          <cmn-alert [dismissible]="true" variant="error" title="Sync failed">
            Cedar Brokerage did not answer. Try again in a few minutes.
          </cmn-alert>
          <cmn-alert variant="accent">Orchard Pension was added this week.</cmn-alert>
        </div>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-card">
        <h2 id="g-card" class="text-cmn-lg font-semibold text-text-primary">Card</h2>
        <cmn-card>
          <p class="text-cmn-sm text-text-primary">Northwind Bank, checking</p>
          <p class="text-cmn-2xl font-semibold tabular-nums text-text-primary">€ 1,240.00</p>
        </cmn-card>
      </section>
    </div>
  `,
})
class ControlsGoldenComponent {
  protected readonly kinds = KINDS;
  protected readonly disabledPayee = new FormControl({value: 'Orchard Pension', disabled: true});
  protected readonly readonlyAmount = new FormControl('1,240.00');
}

const meta: Meta<ControlsGoldenComponent> = {
  title: 'Controls/Golden',
  component: ControlsGoldenComponent,
  parameters: {layout: 'fullscreen'},
};

export default meta;
type Story = StoryObj<ControlsGoldenComponent>;

/** Every Carbon-step-2 control in its default, hover, focus, disabled and error states. */
export const Matrix: Story = {};
