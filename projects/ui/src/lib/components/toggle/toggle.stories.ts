import {JsonPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';

import {ToggleComponent} from './toggle.component';

/** How long the simulated save in `InstantApply` stays in flight. */
const SAVE_MS = 1200;

const meta: Meta<ToggleComponent> = {
  title: 'Components/Toggle',
  component: ToggleComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<ToggleComponent>;

export const Off: Story = {
  args: {checked: false, label: 'Dark mode'},
};

export const On: Story = {
  args: {checked: true, label: 'Dark mode'},
};

/** An instant-apply setting while its save is in flight: the thumb spins and clicks wait. */
export const Loading: Story = {
  args: {checked: true, loading: true, label: 'Email alerts'},
};

export const Disabled: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-4">
        <cmn-toggle [checked]="false" [disabled]="true" label="Disabled, off" />
        <cmn-toggle [checked]="true" [disabled]="true" label="Disabled, on" />
      </div>
    `,
  }),
};

export const InARow: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-sm flex-col gap-cmn-3">
        @for (row of rows; track row.label) {
          <label class="flex items-center justify-between gap-cmn-4">
            <span class="font-label text-cmn-sm text-text-primary">{{ row.label }}</span>
            <cmn-toggle [checked]="row.checked" [label]="row.label" />
          </label>
        }
      </div>
    `,
    props: {
      rows: [
        {label: 'Email alerts', checked: true},
        {label: 'Push notifications', checked: false},
        {label: 'Weekly digest', checked: true},
      ],
    },
  }),
};

@Component({
  selector: 'cmn-toggle-instant-apply-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToggleComponent],
  template: `
    <div class="flex max-w-sm items-center justify-between gap-cmn-4">
      <span class="font-label text-cmn-sm text-text-primary">Email alerts</span>
      <cmn-toggle
        [checked]="enabled()"
        [loading]="saving()"
        (toggled)="apply($event)"
        label="Email alerts"
      />
    </div>
  `,
})
class InstantApplyExampleComponent {
  protected readonly enabled = signal(false);
  protected readonly saving = signal(false);

  protected apply(next: boolean): void {
    this.enabled.set(next);
    this.saving.set(true);
    setTimeout(() => this.saving.set(false), SAVE_MS);
  }
}

/**
 * The instant-apply settings model (APP-SHELL-STANDARD.md §4): a click flips the switch at once,
 * which spins while the save is in flight. Focus stays on the switch throughout.
 */
export const InstantApply: Story = {
  render: () => ({
    moduleMetadata: {imports: [InstantApplyExampleComponent]},
    template: '<cmn-toggle-instant-apply-example />',
  }),
};

@Component({
  selector: 'cmn-toggle-form-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe, ToggleComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" class="flex max-w-sm flex-col gap-cmn-3">
      <div class="flex items-center justify-between gap-cmn-4">
        <span class="font-label text-cmn-sm text-text-primary">Email alerts</span>
        <cmn-toggle formControlName="email" label="Email alerts" />
      </div>
      <div class="flex items-center justify-between gap-cmn-4">
        <span class="font-label text-cmn-sm text-text-primary">Push notifications</span>
        <cmn-toggle formControlName="push" label="Push notifications" />
      </div>
      <p class="text-cmn-xs text-text-secondary">Form value: {{ form.value | json }}</p>
    </form>
  `,
})
class FormExampleComponent {
  protected readonly form = new FormGroup({
    email: new FormControl(true, {nonNullable: true}),
    push: new FormControl(false, {nonNullable: true}),
  });
}

/** Bound with `formControlName`: the form owns the value (guardrails V8). */
export const InAReactiveForm: Story = {
  render: () => ({
    moduleMetadata: {imports: [FormExampleComponent]},
    template: '<cmn-toggle-form-example />',
  }),
};
