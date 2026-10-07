import {ChangeDetectionStrategy, Component} from '@angular/core';
import {provideRouter, RouterLink, RouterOutlet, withHashLocation} from '@angular/router';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {AppLayoutComponent} from './app-layout.component';

const LIST_ROWS = 40;

const NAV_ITEMS: NavItem[] = [
  {label: 'List', icon: 'ArrowLeftRight', route: '/list'},
  {label: 'Detail', icon: 'Building2', route: '/detail'},
];

@Component({
  selector: 'cmn-routed-list-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-cmn-3 p-cmn-4">
      <a routerLink="/detail" class="text-cmn-sm text-accent-default">Open detail</a>
      @for (row of rows; track row) {
        <div class="rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4">
          <p class="text-cmn-sm text-text-primary">Item {{ row }}</p>
        </div>
      }
    </div>
  `,
})
class RoutedListPageComponent {
  protected readonly rows = Array.from({length: LIST_ROWS}, (_, i) => i + 1);
}

@Component({
  selector: 'cmn-routed-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-cmn-4">
      <p class="text-cmn-sm text-text-secondary">A short page: go back to the list.</p>
    </div>
  `,
})
class RoutedDetailPageComponent {}

@Component({
  selector: 'cmn-routed-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-app-layout [navItems]="navItems" [phoneOverlay]="true">
      <router-outlet />
    </cmn-app-layout>
  `,
})
class RoutedShellComponent {
  protected readonly navItems = NAV_ITEMS;
}

/**
 * Fixture for the phone conformance suite: the app layout with a real router and two routes, so
 * browser back between pages can be exercised against the shell's scrolling main region. Each
 * route declares its title (and the detail its parent) in route data; the shell renders them.
 */
const meta: Meta<RoutedShellComponent> = {
  title: 'Conformance/Routed App Layout',
  component: RoutedShellComponent,
  parameters: {layout: 'fullscreen'},
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(
          [
            {path: '', redirectTo: 'list', pathMatch: 'full'},
            {path: 'list', component: RoutedListPageComponent, data: {title: 'List'}},
            {
              path: 'detail',
              component: RoutedDetailPageComponent,
              data: {title: 'Detail', parent: '/list'},
            },
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
};

export default meta;

export const Routed: StoryObj<RoutedShellComponent> = {};
