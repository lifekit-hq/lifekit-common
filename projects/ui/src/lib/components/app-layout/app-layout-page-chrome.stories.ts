import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {provideRouter, Router, RouterLink, RouterOutlet, withHashLocation} from '@angular/router';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {CmnPageActionsService} from '../../services/page-actions/page-actions.service';
import {PageContainerComponent} from '../page-container/page-container.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {AppLayoutComponent} from './app-layout.component';
import {type PageChromeData} from './page-chrome';

const ROWS = 30;
const PHONE = {viewport: {value: 'mobile2', isRotated: false}};

const NAV_ITEMS: NavItem[] = [
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

@Component({
  selector: 'cmn-chrome-rows',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'flex flex-col gap-cmn-2'},
  template: `
    @for (row of rows; track row) {
      @if (link()) {
        <a
          [routerLink]="link()"
          class="block rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4 text-cmn-sm text-text-primary"
        >
          {{ label() }} {{ row }}
        </a>
      } @else {
        <div
          class="rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4 text-cmn-sm text-text-primary"
        >
          {{ label() }} {{ row }}
        </div>
      }
    }
  `,
})
class ChromeRowsComponent {
  public readonly label = input.required<string>();
  public readonly link = input<string | undefined>(undefined);
  protected readonly rows = Array.from({length: ROWS}, (_, i) => i + 1);
}

/** Tab root: title only. No header markup: the shell renders the large title. */
@Component({
  selector: 'cmn-chrome-accounts-page',
  imports: [ChromeRowsComponent, PageContainerComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page-container>
      <a routerLink="/activity" class="text-cmn-sm text-accent-default">Recent activity</a>
      <cmn-chrome-rows label="Account" link="/accounts/checking" />
    </cmn-page-container>
  `,
})
class AccountsPageComponent {}

/** Child page with a parent: back returns to the accounts list, even on a deep link. */
@Component({
  selector: 'cmn-chrome-account-page',
  imports: [ChromeRowsComponent, PageContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page-container>
      <cmn-chrome-rows label="Transaction" />
    </cmn-page-container>
  `,
})
class AccountPageComponent {}

/** Child page without a parent: back goes through history. */
@Component({
  selector: 'cmn-chrome-activity-page',
  imports: [ChromeRowsComponent, PageContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page-container>
      <cmn-chrome-rows label="Event" />
    </cmn-page-container>
  `,
})
class ActivityPageComponent {}

/** Declares two actions in route data and reacts to them through CmnPageActionsService. */
@Component({
  selector: 'cmn-chrome-budgets-page',
  imports: [ChromeRowsComponent, PageContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page-container>
      <p class="text-cmn-sm text-text-secondary" aria-live="polite">
        Last action: {{ lastAction() }}
      </p>
      <cmn-chrome-rows label="Budget" />
    </cmn-page-container>
  `,
})
class BudgetsPageComponent {
  private readonly actions = inject(CmnPageActionsService);
  protected readonly lastAction = signal('none');

  constructor() {
    for (const id of ['add', 'share']) {
      this.actions
        .on(id)
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.lastAction.set(id));
    }
  }
}

@Component({
  selector: 'cmn-chrome-settings-page',
  imports: [PageContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page-container>
      <p class="text-cmn-sm text-text-secondary">Settings.</p>
    </cmn-page-container>
  `,
})
class SettingsPageComponent {}

/** Shell host: navigates through `path` in order, so a story can start with history behind it. */
@Component({
  selector: 'cmn-chrome-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-app-layout [navItems]="navItems" [phoneOverlay]="true" avatarLabel="DT">
      <router-outlet />
    </cmn-app-layout>
  `,
})
class ChromeShellComponent implements OnInit {
  private readonly router = inject(Router);
  public readonly path = input<string[]>(['/accounts']);
  protected readonly navItems = NAV_ITEMS;

  public async ngOnInit(): Promise<void> {
    for (const url of this.path()) {
      await this.router.navigateByUrl(url);
    }
  }
}

const accounts: PageChromeData = {title: 'Accounts'};
const account: PageChromeData = {title: 'Checking', parent: '..'};
const activity: PageChromeData = {title: 'Activity'};
const budgets: PageChromeData = {
  title: 'Budgets',
  actions: [
    {id: 'add', label: 'Add budget', icon: 'Plus'},
    {id: 'share', label: 'Share', icon: 'Share'},
  ],
};

/**
 * The top bar owns the title, back chevron and trailing actions (docs/PHONE-CONTRACT.md). Pages
 * declare them in route data and render no header of their own; scroll a page and its large title
 * shrinks into the bar.
 */
const meta: Meta<ChromeShellComponent> = {
  title: 'Components/App Layout/Page Chrome',
  component: ChromeShellComponent,
  parameters: {layout: 'fullscreen'},
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(
          [
            {
              path: 'accounts',
              children: [
                {path: '', component: AccountsPageComponent, data: accounts},
                {path: ':id', component: AccountPageComponent, data: account},
              ],
            },
            {path: 'activity', component: ActivityPageComponent, data: activity},
            {path: 'budgets', component: BudgetsPageComponent, data: budgets},
            {path: 'settings', component: SettingsPageComponent, data: {title: 'Settings'}},
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<ChromeShellComponent>;

/** A tab root: large title, no back. Scroll to see the title shrink into the bar. */
export const RootPage: Story = {args: {path: ['/accounts']}, globals: PHONE};

/** `parent: '..'` on a deep link: the chevron still leads up to the accounts list. */
export const ChildWithParent: Story = {args: {path: ['/accounts/checking']}, globals: PHONE};

/** No `parent`, reached from Accounts: the chevron goes back through history. */
export const ChildWithoutParent: Story = {
  args: {path: ['/accounts', '/activity']},
  globals: PHONE,
};

/** `actions` in route data: trailing icon buttons; the page hears presses via the service. */
export const Actions: Story = {args: {path: ['/budgets']}, globals: PHONE};

export const ActionsDark: Story = {
  args: {path: ['/budgets']},
  globals: {...PHONE, theme: 'dark'},
};

/** From md up the same chrome sits in the solid desktop bar beside the sidebar. */
export const Desktop: Story = {args: {path: ['/accounts', '/accounts/checking']}};
