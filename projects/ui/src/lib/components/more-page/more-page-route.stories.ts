import {ChangeDetectionStrategy, Component} from '@angular/core';
import {provideRouter, RouterOutlet, withHashLocation} from '@angular/router';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {
  accountMenu,
  type AppLayoutAccount,
  AppLayoutComponent,
} from '../app-layout/app-layout.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {MorePageComponent} from './more-page.component';

const UNREAD_ALERTS = 7;

const ITEMS: NavItem[] = [
  {label: 'Home', icon: 'House', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Budgets', icon: 'Zap', route: '/budgets'},
  {label: 'Subscriptions', icon: 'Repeat', route: '/subscriptions'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts', badge: () => UNREAD_ALERTS},
];

const TAB_ROUTES = ['/dashboard', '/accounts', '/transactions', '/budgets'];

const ACCOUNT: AppLayoutAccount = {
  label: 'Ada Lovelace',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  menuItems: accountMenu({settingsRoute: '/settings'}),
};

/** The app's More route: a wrapper component whose template is just `<cmn-more-page>`. */
@Component({
  selector: 'cmn-story-more-route',
  imports: [MorePageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-more-page
      [items]="items"
      [tabRoutes]="tabRoutes"
      [account]="account"
      versionLabel="v3.2.0"
    />
  `,
})
class StoryMoreRouteComponent {
  protected readonly items = ITEMS;
  protected readonly tabRoutes = TAB_ROUTES;
  protected readonly account = ACCOUNT;
}

@Component({
  selector: 'cmn-story-more-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-app-layout
      [navItems]="items"
      [tabRoutes]="tabRoutes"
      [account]="account"
      [phoneOverlay]="true"
      moreRoute="/more"
      brand="Household"
    >
      <router-outlet />
    </cmn-app-layout>
  `,
})
class StoryMoreShellComponent {
  protected readonly items = ITEMS;
  protected readonly tabRoutes = TAB_ROUTES;
  protected readonly account = ACCOUNT;
}

/** The shell glue lifted into the layout: no per-app wrapper, no palette list, no PWA notices by hand. */
@Component({
  selector: 'cmn-story-glue-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-app-layout
      [navItems]="items"
      [tabRoutes]="tabRoutes"
      [account]="account"
      [phoneOverlay]="true"
      [pwaNotices]="true"
      (signOut)="signedOut = true"
      versionLabel="v3.2.0"
      moreRoute="/more"
      brand="Household"
    >
      <router-outlet />
    </cmn-app-layout>
    @if (signedOut) {
      <p class="fixed bottom-0 left-0 p-2 text-xs">Signed out</p>
    }
  `,
})
class StoryGlueShellComponent {
  protected readonly items = ITEMS;
  protected readonly tabRoutes = TAB_ROUTES;
  protected readonly account = ACCOUNT;
  protected signedOut = false;
}

const meta: Meta = {
  title: 'Components/MorePageRoute',
  tags: ['!autodocs'],
  parameters: {layout: 'fullscreen'},
};

export default meta;

/**
 * The More tab on its route, in the shell, the way an app declares it: the route's `data.title` is
 * the large title the page template draws, and the page carries `data-cmn-page="list"` for the
 * screen check, like every other routed page.
 */
export const OnTheRoute: StoryObj = {
  render: () => ({
    template: '<cmn-story-more-shell />',
    moduleMetadata: {imports: [StoryMoreShellComponent]},
  }),
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(
          [
            {path: '', redirectTo: 'more', pathMatch: 'full'},
            {path: 'more', component: StoryMoreRouteComponent, data: {title: 'More'}},
            {path: '**', component: StoryMoreRouteComponent, data: {title: 'More'}},
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
  parameters: {layout: 'fullscreen'},
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

/**
 * The same More tab with the route pointing at `cmn-more-page` itself: items, tab routes, account
 * and version come from `cmn-app-layout`, Sign out reaches the layout's `(signOut)`, and
 * `[pwaNotices]` renders the update prompt, offline banner and install hint (none showing here).
 */
export const FromTheLayout: StoryObj = {
  render: () => ({
    template: '<cmn-story-glue-shell />',
    moduleMetadata: {imports: [StoryGlueShellComponent]},
  }),
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(
          [
            {path: '', redirectTo: 'more', pathMatch: 'full'},
            {path: 'more', component: MorePageComponent, data: {title: 'More'}},
            {path: '**', component: MorePageComponent, data: {title: 'More'}},
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
  parameters: {layout: 'fullscreen'},
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};
