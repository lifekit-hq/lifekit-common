import {ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, signal} from '@angular/core';
import {LkInfiniteList} from '@lifekit-hq/elements';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {AlertItemComponent, type AlertItemSeverity} from '../alert-item/alert-item.component';
import {ButtonComponent} from '../button/button.component';
import {CheckboxComponent} from '../checkbox/checkbox.component';
import {FilterBarComponent} from '../filter-bar/filter-bar.component';
import {InputComponent} from '../input/input.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {PageScrollComponent} from '../page-scroll/page-scroll.component';
import {ProseComponent} from '../prose/prose.component';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
  GoldenShellComponent,
} from './golden-screen';
import {PageComponent} from './page.component';

// Imported by name so a bundler cannot tree-shake the customElements.define() call.
if (!customElements.get('lk-infinite-list')) {
  customElements.define('lk-infinite-list', LkInfiniteList);
}

/** How long the fake reload takes, long enough to see the indicator. */
const SIMULATED_RELOAD_MS = 1200;

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
    <cmn-page [reload]="reload">
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
  /**
   * A tab root reloads its data on a pull (Apple HIG, Refreshing content): the page hands its
   * store's load to `reload` and the shell draws the gesture. Fake here, as the data is.
   */
  protected readonly reload = (): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, SIMULATED_RELOAD_MS));
}

interface Proposal {
  readonly id: number;
  readonly title: string;
  readonly note: string;
}

const PENDING: readonly Proposal[] = [
  {id: 1, title: 'Trim the global equity fund by 2%', note: 'Proposed today'},
  {id: 2, title: 'Add to the emergency reserve', note: 'Proposed yesterday'},
];

const DECIDED: readonly Proposal[] = [
  {id: 3, title: 'Rebalance into short-term bonds', note: 'Confirmed 3 Nov'},
  {id: 4, title: 'Hold the technology position', note: 'Declined 28 Oct'},
];

/**
 * The golden list screen with body copy: a page whose first block is a long paragraph (a lede or
 * a disclaimer that has to stay whole) above its rows. `cmn-prose` owns the measure, so the copy
 * wraps inside the line-length aim at 1280 without a width class on the page.
 */
@Component({
  selector: 'cmn-golden-decisions-page',
  imports: [
    ButtonComponent,
    ListItemRowComponent,
    ListSectionComponent,
    PageComponent,
    ProseComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page>
      <cmn-prose>
        Ledger proposes, you decide. Finance Sentry never trades: confirming records your decision
        and shows the order for you to place at your broker yourself. Nothing here is financial
        advice, and every proposal is a reading of your own data.
      </cmn-prose>
      <cmn-list-section [heading]="'Pending · ' + pending.length">
        @for (proposal of pending; track proposal.id) {
          <cmn-list-item-row [label]="proposal.title" [sublabel]="proposal.note" />
        }
      </cmn-list-section>
      <cmn-list-section [heading]="'Decided · ' + decided.length">
        @for (proposal of decided; track proposal.id) {
          <cmn-list-item-row [label]="proposal.title" [sublabel]="proposal.note" [dimmed]="true" />
        }
      </cmn-list-section>
    </cmn-page>
  `,
})
class DecisionsPageComponent {
  protected readonly pending = PENDING;
  protected readonly decided = DECIDED;
}

interface FeedAlert {
  readonly id: number;
  readonly title: string;
  readonly message: string;
  readonly severity: AlertItemSeverity;
  readonly read: boolean;
}

interface FeedDay {
  readonly label: string;
  readonly alerts: readonly FeedAlert[];
}

const FEED_DAYS: readonly FeedDay[] = [
  {
    label: 'Today',
    alerts: [
      {
        id: 1,
        title: 'Boiler service is overdue',
        message: 'The yearly service was due on 1 Nov.',
        severity: 'warning',
        read: false,
      },
      {
        id: 2,
        title: 'Car insurance renews in 5 days',
        message: 'The premium is €412, up from €388.',
        severity: 'info',
        read: false,
      },
      {
        id: 3,
        title: 'Water bill is unpaid',
        message: 'It was due yesterday and is now 1 day late.',
        severity: 'error',
        read: true,
      },
    ],
  },
  {
    label: 'Yesterday',
    alerts: [
      {
        id: 4,
        title: 'Library books are due back',
        message: 'Three books are due on Friday.',
        severity: 'info',
        read: true,
      },
      {
        id: 5,
        title: 'Dentist appointment moved',
        message: 'The crown fitting is now on Tuesday at 09:30.',
        severity: 'warning',
        read: true,
      },
    ],
  },
  {
    label: 'Mon 2 Nov',
    alerts: [
      {
        id: 6,
        title: 'Lease copy was returned',
        message: 'The signed lease reached the agent.',
        severity: 'info',
        read: true,
      },
      {
        id: 7,
        title: 'Photo albums are ready to share',
        message: 'Summer trip, 214 photos in 6 albums.',
        severity: 'info',
        read: true,
      },
    ],
  },
];

/**
 * The golden feed screen: a filter bar above an endless, day-grouped feed of flat alert rows on
 * `cmn-page kind="list" fill`, as finance-sentry's alerts lay it out. The feed is the one scroller
 * (`cmn-page-scroll`), and each row is a flat, openable alert item: the item opens itself, so the
 * page lays no positioned button over its rows.
 */
@Component({
  selector: 'cmn-golden-alerts-page',
  imports: [
    AlertItemComponent,
    FilterBarComponent,
    ListSectionComponent,
    PageComponent,
    PageScrollComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <cmn-page fill>
      <cmn-filter-bar [(query)]="query" placeholder="Search alerts" searchLabel="Search alerts" />
      <cmn-page-scroll label="Alerts">
        <lk-infinite-list class="block space-y-cmn-4" end-label="No more alerts">
          @for (day of days; track day.label) {
            <cmn-list-section [heading]="day.label">
              @for (alert of day.alerts; track alert.id) {
                <cmn-alert-item
                  [title]="alert.title"
                  [message]="alert.message"
                  [severity]="alert.severity"
                  [isRead]="alert.read"
                  density="flat"
                  openable
                />
              }
            </cmn-list-section>
          }
        </lk-infinite-list>
      </cmn-page-scroll>
    </cmn-page>
  `,
})
class AlertsPageComponent {
  protected readonly days = FEED_DAYS;
  protected readonly query = signal('');
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
        {path: 'decisions', component: DecisionsPageComponent, data: {title: 'Decisions'}},
        {path: 'alerts', component: AlertsPageComponent, data: {title: 'Alerts'}},
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

/**
 * A feed page: `cmn-page kind="list" fill` holding a filter bar and a `cmn-page-scroll` of
 * day-grouped flat, openable alert items. Rows below the fold must leave the scan nothing to find:
 * no part of the feed is a positioned element the judge could read as clipped by the shell.
 */
export const PhoneWithFeed: Story = {globals: GOLDEN_PHONE, args: {start: '/alerts'}};

export const DesktopWithFeed: Story = {globals: GOLDEN_DESKTOP, args: {start: '/alerts'}};

/**
 * A list page led by body copy: a long paragraph above the rows reads inside the line-length
 * limit because `cmn-prose` caps its measure, at 390 and at 1280. Its own screen for the route
 * scan (the `line-length` rule) and the baselines.
 */
const LEDE_START = {start: '/decisions'};

export const PhoneWithLede: Story = {args: LEDE_START, globals: GOLDEN_PHONE};

export const PhoneWithLedeDark: Story = {
  args: LEDE_START,
  globals: {...GOLDEN_PHONE, theme: 'dark'},
};

export const DesktopWithLede: Story = {args: LEDE_START, globals: GOLDEN_DESKTOP};

export const DesktopWithLedeDark: Story = {
  args: LEDE_START,
  globals: {...GOLDEN_DESKTOP, theme: 'dark'},
};
