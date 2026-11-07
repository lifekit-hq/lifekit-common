import {ChangeDetectionStrategy, Component} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {CheckboxComponent} from '../checkbox/checkbox.component';
import {InputComponent} from '../input/input.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
  GoldenShellComponent,
} from './golden-screen';
import {PageComponent} from './page.component';

interface Task {
  readonly id: number;
  readonly title: string;
  readonly note: string;
}

const OPEN: readonly Task[] = [
  {id: 1, title: 'Book the boiler service', note: 'Due Friday'},
  {id: 2, title: 'Renew the car insurance', note: 'Due 14 Nov · Sam'},
  {id: 3, title: 'Return the library books', note: 'Alex'},
  {
    id: 4,
    title: 'Sort the photos from the summer trip into albums before the family visit',
    note: 'Sam',
  },
  {id: 5, title: 'Call the dentist about the crown', note: 'Due tomorrow'},
];

const DONE: readonly Task[] = [
  {id: 6, title: 'Pay the water bill', note: 'Alex'},
  {id: 7, title: 'Send the signed lease back', note: 'Sam'},
];

/**
 * The golden list screen: the list template built only from library parts, with realistic
 * content. An add field and its button share the control height, sections are sentence case, and
 * each row carries one quiet trailing action instead of a bordered text button.
 */
@Component({
  selector: 'cmn-golden-tasks-page',
  imports: [
    ButtonComponent,
    CheckboxComponent,
    InputComponent,
    ListItemRowComponent,
    ListSectionComponent,
    PageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page>
      <form (submit)="$event.preventDefault()" class="flex gap-cmn-group-gap">
        <cmn-input
          class="min-w-0 flex-1"
          aria-label="Add a task"
          enterkeyhint="done"
          placeholder="Add a task"
        />
        <cmn-button icon="Plus" type="submit">Add</cmn-button>
      </form>
      <cmn-list-section [heading]="'To do · ' + open.length">
        @for (task of open; track task.id) {
          <cmn-list-item-row [label]="task.title" [sublabel]="task.note" trailingIcon="Ellipsis">
            <cmn-checkbox [label]="'Done: ' + task.title" avatar />
          </cmn-list-item-row>
        }
      </cmn-list-section>
      <cmn-list-section [heading]="'Done · ' + done.length">
        @for (task of done; track task.id) {
          <cmn-list-item-row
            [label]="task.title"
            [sublabel]="task.note"
            [dimmed]="true"
            trailingIcon="Ellipsis"
          >
            <cmn-checkbox [checked]="true" [label]="'Not done: ' + task.title" avatar />
          </cmn-list-item-row>
        }
      </cmn-list-section>
    </cmn-page>
  `,
})
class TasksPageComponent {
  protected readonly open = OPEN;
  protected readonly done = DONE;
}

/**
 * Golden screens for the list template: the reference other lifekit apps copy and the owner
 * approves once. Each is the real shell and real components; run the screen check
 * (`lifekit-chrome-check screen`, docs/SCREEN-CHECK.md) against them at 390 and 1280.
 */
const meta: Meta<GoldenShellComponent> = {
  title: 'Templates/List',
  component: GoldenShellComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: goldenProviders([
        {path: 'tasks', component: TasksPageComponent, data: {title: 'Tasks'}},
      ]),
    }),
  ],
  args: {start: '/tasks', notice: false, appChrome: false},
};

export default meta;
type Story = StoryObj<GoldenShellComponent>;

export const Phone: Story = {globals: GOLDEN_PHONE};

export const PhoneDark: Story = {globals: {...GOLDEN_PHONE, theme: 'dark'}};

export const Desktop: Story = {globals: GOLDEN_DESKTOP};

export const DesktopDark: Story = {globals: {...GOLDEN_DESKTOP, theme: 'dark'}};

/** A notice in the shell's slot starts on the page's left edge and sits above the title. */
export const PhoneWithNotice: Story = {globals: GOLDEN_PHONE, args: {notice: true}};

export const DesktopWithNotice: Story = {globals: GOLDEN_DESKTOP, args: {notice: true}};

/**
 * The shell as an app wires it: a badge on a nav item and the three notices (offline banner, update
 * prompt, install hint) in the slot with none showing. The page must look exactly as on `Phone`:
 * the idle notices cost it nothing, and the nav the shell hides at this size leaves no finding.
 */
export const PhoneWithAppChrome: Story = {globals: GOLDEN_PHONE, args: {appChrome: true}};

export const DesktopWithAppChrome: Story = {globals: GOLDEN_DESKTOP, args: {appChrome: true}};
