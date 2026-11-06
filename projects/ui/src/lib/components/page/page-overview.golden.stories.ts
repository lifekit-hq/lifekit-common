import {ChangeDetectionStrategy, Component} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {CheckboxComponent} from '../checkbox/checkbox.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {StatCardComponent} from '../stat-card/stat-card.component';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
  GoldenShellComponent,
} from './golden-screen';
import {PageComponent} from './page.component';

interface Row {
  readonly id: number;
  readonly label: string;
  readonly note: string;
}

interface Stat {
  readonly label: string;
  readonly value: number;
  readonly delta: number | null;
  readonly deltaLabel: string;
}

const STATS: readonly Stat[] = [
  {label: 'Due this week', value: 7, delta: null, deltaLabel: ''},
  {label: 'Overdue', value: 2, delta: null, deltaLabel: ''},
  {label: 'Done', value: 12, delta: 3, deltaLabel: '3 more than last week'},
  {label: 'Shared with you', value: 4, delta: null, deltaLabel: ''},
];

const TODAY: readonly Row[] = [
  {id: 1, label: 'Call the dentist about the crown', note: 'Overdue since Monday · Alex'},
  {id: 2, label: 'Book the boiler service', note: 'Today · Sam'},
  {id: 3, label: 'Return the library books', note: 'Today · Alex'},
];

const LATER: readonly Row[] = [
  {id: 4, label: 'Renew the car insurance', note: 'Friday · Sam'},
  {id: 5, label: 'Pay the window cleaner', note: 'Friday · Alex'},
  {id: 6, label: 'Order the birthday cake for Maya', note: 'Saturday · Sam'},
];

const COMING_UP: readonly Row[] = [
  {id: 7, label: "Parents' evening", note: 'Thursday, 18:30'},
  {id: 8, label: 'Bin day: recycling', note: 'Friday morning'},
  {id: 9, label: "Maya's birthday", note: 'Sunday'},
];

const PEOPLE: readonly Row[] = [
  {id: 10, label: 'Alex Morgan', note: '4 open · 1 overdue'},
  {id: 11, label: 'Sam Morgan', note: '3 open'},
];

/**
 * The golden overview screen: a household's week on the overview template, built only from
 * library parts. The main column runs the frame's width with the week's numbers as a card grid and
 * the tasks due; the rail beside it (under it on a phone) carries the calendar and who is doing
 * what, each block marked `cmnPageRail`.
 */
@Component({
  selector: 'cmn-golden-week-page',
  imports: [
    CheckboxComponent,
    ListItemRowComponent,
    ListSectionComponent,
    PageComponent,
    StatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="overview">
      <div class="grid grid-cols-2 gap-cmn-group-gap md:grid-cols-4">
        @for (stat of stats; track stat.label) {
          <cmn-stat-card
            [label]="stat.label"
            [value]="stat.value"
            [delta]="stat.delta"
            [deltaLabel]="stat.deltaLabel"
          />
        }
      </div>
      <cmn-list-section [heading]="'Due today · ' + today.length">
        @for (task of today; track task.id) {
          <cmn-list-item-row [label]="task.label" [sublabel]="task.note" trailingIcon="Ellipsis">
            <cmn-checkbox [label]="'Done: ' + task.label" avatar />
          </cmn-list-item-row>
        }
      </cmn-list-section>
      <cmn-list-section [heading]="'Later this week · ' + later.length">
        @for (task of later; track task.id) {
          <cmn-list-item-row [label]="task.label" [sublabel]="task.note" trailingIcon="Ellipsis">
            <cmn-checkbox [label]="'Done: ' + task.label" avatar />
          </cmn-list-item-row>
        }
      </cmn-list-section>
      <cmn-list-section cmnPageRail heading="Coming up">
        @for (event of comingUp; track event.id) {
          <cmn-list-item-row [label]="event.label" [sublabel]="event.note" />
        }
      </cmn-list-section>
      <cmn-list-section cmnPageRail heading="Who is doing what">
        @for (person of people; track person.id) {
          <cmn-list-item-row [label]="person.label" [sublabel]="person.note" />
        }
      </cmn-list-section>
    </cmn-page>
  `,
})
class WeekPageComponent {
  protected readonly stats = STATS;
  protected readonly today = TODAY;
  protected readonly later = LATER;
  protected readonly comingUp = COMING_UP;
  protected readonly people = PEOPLE;
}

/**
 * Golden screens for the overview template: the reference other lifekit apps copy and the owner
 * approves once. Each is the real shell and real components; run the screen check
 * (`lifekit-chrome-check screen`, docs/SCREEN-CHECK.md) against them at 390 and 1280.
 */
const meta: Meta<GoldenShellComponent> = {
  title: 'Templates/Overview',
  component: GoldenShellComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: goldenProviders([
        {path: 'tasks', component: WeekPageComponent, data: {title: 'This week'}},
      ]),
    }),
  ],
  args: {start: '/tasks', notice: false},
};

export default meta;
type Story = StoryObj<GoldenShellComponent>;

export const Phone: Story = {globals: GOLDEN_PHONE};

export const PhoneDark: Story = {globals: {...GOLDEN_PHONE, theme: 'dark'}};

export const Desktop: Story = {globals: GOLDEN_DESKTOP};

export const DesktopDark: Story = {globals: {...GOLDEN_DESKTOP, theme: 'dark'}};
