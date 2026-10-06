import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {StepperDialogComponent} from './stepper-dialog.component';
import {CmnStepDirective} from './stepper-step.directive';

const meta: Meta<StepperDialogComponent> = {
  title: 'Components/StepperDialog',
  component: StepperDialogComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [CmnStepDirective]})],
  argTypes: {
    step: {control: {type: 'number', min: 0, max: 2}},
    busy: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<StepperDialogComponent>;

const shell = (inner: string): string => `
  <div class="w-[32rem] bg-surface-card border border-border-default rounded-cmn-lg p-cmn-6">
    ${inner}
  </div>`;

const STEPS = `
  <ng-template cmnStep label="Provider">
    <p class="text-cmn-sm text-text-secondary">Choose your institution.</p>
  </ng-template>
  <ng-template cmnStep label="Credentials">
    <p class="text-cmn-sm text-text-secondary">Enter your credentials.</p>
  </ng-template>
  <ng-template cmnStep label="Done">
    <p class="text-cmn-sm text-text-secondary">All set.</p>
  </ng-template>`;

export const Default: Story = {
  args: {step: 0},
  render: args => ({
    props: args,
    template: shell(`<cmn-stepper-dialog [step]="step">${STEPS}</cmn-stepper-dialog>`),
  }),
};

export const MiddleStep: Story = {
  args: {step: 1},
  render: Default.render,
};

export const LastStep: Story = {
  args: {step: 2, finishLabel: 'Done'},
  render: args => ({
    props: args,
    template: shell(
      `<cmn-stepper-dialog [step]="step" [finishLabel]="finishLabel">${STEPS}</cmn-stepper-dialog>`
    ),
  }),
};

export const Busy: Story = {
  args: {step: 1, busy: true},
  render: args => ({
    props: args,
    template: shell(
      `<cmn-stepper-dialog [step]="step" [busy]="busy">${STEPS}</cmn-stepper-dialog>`
    ),
  }),
};

export const InvalidStep: Story = {
  args: {step: 1},
  render: args => ({
    props: args,
    template: shell(`
      <cmn-stepper-dialog [step]="step">
        <ng-template cmnStep label="Provider"><p>Pick one.</p></ng-template>
        <ng-template cmnStep label="Credentials" [valid]="false">
          <p class="text-cmn-sm text-text-secondary">Next stays disabled until this step is valid.</p>
        </ng-template>
      </cmn-stepper-dialog>`),
  }),
};
