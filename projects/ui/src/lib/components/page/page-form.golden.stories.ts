import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import type {PageChromeData} from '../app-layout/page-chrome';
import {ButtonComponent} from '../button/button.component';
import {ErrorSummaryComponent} from '../error-summary/error-summary.component';
import {FormFieldComponent} from '../form-field/form-field.component';
import {InputComponent} from '../input/input.component';
import {SelectComponent, type SelectOption} from '../select/select.component';
import {SettingRowComponent} from '../setting-row/setting-row.component';
import {TextareaComponent} from '../textarea/textarea.component';
import {ToggleComponent} from '../toggle/toggle.component';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
  GoldenShellComponent,
} from './golden-screen';
import {PageComponent} from './page.component';

const NOTES_ROWS = 3;

const DUE: readonly SelectOption[] = [
  {label: 'No due date', value: 'none'},
  {label: 'Today', value: 'today'},
  {label: 'Tomorrow', value: 'tomorrow'},
  {label: 'This weekend', value: 'weekend'},
  {label: 'Next week', value: 'next-week'},
];

const PEOPLE: readonly SelectOption[] = [
  {label: 'Anyone', value: 'anyone'},
  {label: 'Alex', value: 'alex'},
  {label: 'Sam', value: 'sam'},
];

/**
 * The golden form screen: a new record on the form template, built only from library parts. The
 * form is `display: contents`, so each field is a top-level block and the template sets the rhythm
 * between them; every field runs the full reading width, one under the other, and the actions
 * close the column. Its error summary appears above the fields only after a failed submit.
 */
@Component({
  selector: 'cmn-golden-new-task-page',
  imports: [
    ButtonComponent,
    ErrorSummaryComponent,
    FormFieldComponent,
    InputComponent,
    PageComponent,
    ReactiveFormsModule,
    SelectComponent,
    SettingRowComponent,
    TextareaComponent,
    ToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="form">
      <form [formGroup]="form" class="contents" novalidate>
        <cmn-error-summary />
        <cmn-form-field [required]="true" [control]="form.controls.title" label="Title">
          <cmn-input
            formControlName="title"
            autocomplete="off"
            enterkeyhint="next"
            placeholder="What needs doing?"
          />
        </cmn-form-field>
        <cmn-form-field label="Notes" hint="Optional. Everyone on the task can read them.">
          <cmn-textarea [rows]="notesRows" formControlName="notes" />
        </cmn-form-field>
        <div class="flex flex-col gap-cmn-5">
          <cmn-setting-row label="Due" description="The task moves to the top on the day.">
            <cmn-select [options]="due" formControlName="due" aria-label="Due" class="block w-44" />
          </cmn-setting-row>
          <cmn-setting-row label="Assign to">
            <cmn-select
              [options]="people"
              formControlName="assignee"
              aria-label="Assign to"
              class="block w-44"
            />
          </cmn-setting-row>
          <cmn-setting-row
            label="Remind me the day before"
            description="A notification at 9:00 the day before it is due."
          >
            <cmn-toggle [checked]="true" label="Remind me the day before" />
          </cmn-setting-row>
        </div>
        <div class="flex flex-wrap gap-cmn-group-gap">
          <cmn-button type="submit">Save task</cmn-button>
          <cmn-button variant="secondary">Cancel</cmn-button>
        </div>
      </form>
    </cmn-page>
  `,
})
class NewTaskPageComponent {
  protected readonly notesRows = NOTES_ROWS;
  protected readonly due = DUE;
  protected readonly people = PEOPLE;
  protected readonly form = new FormGroup({
    title: new FormControl('Book the boiler service', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl('Ask for the annual check, not a repair. The last one was in March.', {
      nonNullable: true,
    }),
    due: new FormControl('weekend', {nonNullable: true}),
    assignee: new FormControl('sam', {nonNullable: true}),
  });
}

const FORM_DATA: PageChromeData = {title: 'New task', parent: '/tasks'};

/**
 * Golden screens for the form template: the reference other lifekit apps copy and the owner
 * approves once. Each is the real shell and real components; run the screen check
 * (`lifekit-chrome-check screen`, docs/SCREEN-CHECK.md) against them at 390 and 1280.
 */
const meta: Meta<GoldenShellComponent> = {
  title: 'Templates/Form',
  component: GoldenShellComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: goldenProviders([
        {path: 'tasks/new', component: NewTaskPageComponent, data: FORM_DATA},
      ]),
    }),
  ],
  args: {start: '/tasks/new', notice: false},
};

export default meta;
type Story = StoryObj<GoldenShellComponent>;

export const Phone: Story = {globals: GOLDEN_PHONE};

export const PhoneDark: Story = {globals: {...GOLDEN_PHONE, theme: 'dark'}};

export const Desktop: Story = {globals: GOLDEN_DESKTOP};

export const DesktopDark: Story = {globals: {...GOLDEN_DESKTOP, theme: 'dark'}};
