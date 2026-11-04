import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
  type OnInit,
} from '@angular/core';
import {provideRouter, Router, RouterOutlet, withHashLocation} from '@angular/router';
import {LkUpdatePrompt} from '@lifekit-hq/elements';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {PREFERS_DARK} from '../../services/theme/theme.service';
import {
  accountMenu,
  type AppLayoutAccount,
  AppLayoutComponent,
} from '../app-layout/app-layout.component';
import {ButtonComponent} from '../button/button.component';
import {CheckboxComponent} from '../checkbox/checkbox.component';
import {InputComponent} from '../input/input.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {PageComponent} from './page.component';

// Imported by name so a bundler cannot tree-shake the customElements.define() call.
if (!customElements.get('lk-update-prompt')) {
  customElements.define('lk-update-prompt', LkUpdatePrompt);
}

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

/** The other destinations: the golden screen is the Tasks tab, so these only need to exist. */
@Component({
  selector: 'cmn-golden-placeholder-page',
  imports: [PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page><p class="text-cmn-sm text-text-secondary">Not part of this screen.</p></cmn-page>
  `,
})
class PlaceholderPageComponent {}

const NAV_ITEMS: NavItem[] = [
  {label: 'Tasks', icon: 'ListChecks', route: '/tasks'},
  {label: 'Calendar', icon: 'Calendar', route: '/calendar'},
  {label: 'People', icon: 'Users', route: '/people'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

const ACCOUNT: AppLayoutAccount = {
  label: 'Alex Morgan',
  name: 'Alex Morgan',
  email: 'alex@example.com',
  menuItems: accountMenu({settingsRoute: '/settings'}),
};

/** The app as a consumer writes it: the shell, its notices, and a router outlet. */
@Component({
  selector: 'cmn-golden-list-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <cmn-app-layout [navItems]="navItems" [account]="account" [phoneOverlay]="true" brand="Tasks">
      @if (notice()) {
        <lk-update-prompt cmnAppLayoutNotice ready />
      }
      <router-outlet />
    </cmn-app-layout>
  `,
})
class GoldenListShellComponent implements OnInit {
  private readonly router = inject(Router);
  /** Shows the update prompt in the notices slot, inset to the page gutter above the title. */
  public readonly notice = input(false);
  protected readonly navItems = NAV_ITEMS;
  protected readonly account = ACCOUNT;

  public async ngOnInit(): Promise<void> {
    await this.router.navigateByUrl('/tasks');
  }
}

/** The sizes the golden screens are approved at: an iPhone's 390 and a 1280 laptop. */
const GOLDEN_VIEWPORTS = {
  phone390: {name: 'Phone 390', styles: {width: '390px', height: '844px'}, type: 'mobile'},
  desktop1280: {name: 'Desktop 1280', styles: {width: '1280px', height: '800px'}, type: 'desktop'},
};
const PHONE = {viewport: {value: 'phone390', isRotated: false}};
const DESKTOP = {viewport: {value: 'desktop1280', isRotated: false}};

/**
 * Golden screens for the list template: the reference other lifekit apps copy and the owner
 * approves once. Each is the real shell and real components; run the screen check
 * (`lifekit-chrome-check screen`, docs/SCREEN-CHECK.md) against them at 390 and 1280.
 */
const meta: Meta<GoldenListShellComponent> = {
  title: 'Templates/List',
  component: GoldenListShellComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: [
        // The shell's ThemeService follows the OS scheme; in the catalog the theme global (set on
        // <html> before the story boots) stands in for it, so the dark screens render dark.
        {
          provide: PREFERS_DARK,
          useFactory: () =>
            matchMedia(
              document.documentElement.getAttribute('data-theme') === 'dark' ? 'all' : 'not all'
            ),
        },
        provideRouter(
          [
            {path: 'tasks', component: TasksPageComponent, data: {title: 'Tasks'}},
            {path: 'calendar', component: PlaceholderPageComponent, data: {title: 'Calendar'}},
            {path: 'people', component: PlaceholderPageComponent, data: {title: 'People'}},
            {path: 'settings', component: PlaceholderPageComponent, data: {title: 'Settings'}},
            {path: '**', redirectTo: 'tasks'},
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
  args: {notice: false},
};

export default meta;
type Story = StoryObj<GoldenListShellComponent>;

export const Phone: Story = {globals: PHONE};

export const PhoneDark: Story = {globals: {...PHONE, theme: 'dark'}};

export const Desktop: Story = {globals: DESKTOP};

export const DesktopDark: Story = {globals: {...DESKTOP, theme: 'dark'}};

/** A notice in the shell's slot starts on the page's left edge and sits above the title. */
export const PhoneWithNotice: Story = {globals: PHONE, args: {notice: true}};

export const DesktopWithNotice: Story = {globals: DESKTOP, args: {notice: true}};
