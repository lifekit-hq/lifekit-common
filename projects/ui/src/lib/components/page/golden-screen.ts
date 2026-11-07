import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  type EnvironmentProviders,
  inject,
  input,
  type OnInit,
  type Provider,
} from '@angular/core';
import {provideRouter, Router, RouterOutlet, type Routes, withHashLocation} from '@angular/router';
import {LkInstallHint, LkOfflineBanner, LkUpdatePrompt} from '@lifekit-hq/elements';

import {PREFERS_DARK} from '../../services/theme/theme.service';
import {
  accountMenu,
  type AppLayoutAccount,
  AppLayoutComponent,
} from '../app-layout/app-layout.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {PageComponent} from './page.component';

/*
 * The harness every golden screen (Templates/*) shares: one household app, its shell and its tabs,
 * so the templates are approved side by side in the same chrome. Only the golden stories import it.
 */

// Imported by name so a bundler cannot tree-shake the customElements.define() call.
for (const [tag, element] of [
  ['lk-update-prompt', LkUpdatePrompt],
  ['lk-offline-banner', LkOfflineBanner],
  ['lk-install-hint', LkInstallHint],
] as const) {
  if (!customElements.get(tag)) {
    customElements.define(tag, element);
  }
}

/** A destination a golden screen does not show: it only needs to exist for the tabs. */
@Component({
  selector: 'cmn-golden-placeholder-page',
  imports: [PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page><p class="text-cmn-sm text-text-secondary">Not part of this screen.</p></cmn-page>
  `,
})
class PlaceholderPageComponent {}

const PEOPLE_BADGE = 3;

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
  selector: 'cmn-golden-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <cmn-app-layout [navItems]="navItems()" [account]="account" [phoneOverlay]="true" brand="Tasks">
      @if (notice()) {
        <lk-update-prompt cmnAppLayoutNotice ready />
      }
      <!-- As an app wires them: each notice its own child, none of them showing. One element per
           block, so each is projected into the notices slot by its attribute. -->
      @if (appChrome()) {
        <lk-offline-banner cmnAppLayoutNotice />
      }
      @if (appChrome()) {
        <lk-update-prompt cmnAppLayoutNotice />
      }
      @if (appChrome()) {
        <lk-install-hint cmnAppLayoutNotice />
      }
      <router-outlet />
    </cmn-app-layout>
  `,
})
export class GoldenShellComponent implements OnInit {
  private readonly router = inject(Router);
  /** The route the golden screen shows. */
  public readonly start = input('/tasks');
  /** Shows the update prompt in the notices slot, inset to the page gutter above the title. */
  public readonly notice = input(false);
  /**
   * The shell as an app wires it: a nav item that carries a badge, and the offline banner, update
   * prompt and install hint in the notices slot with none of them showing.
   */
  public readonly appChrome = input(false);
  protected readonly navItems = computed(() =>
    this.appChrome()
      ? NAV_ITEMS.map(item =>
          item.route === '/people' ? {...item, badge: () => PEOPLE_BADGE} : item
        )
      : NAV_ITEMS
  );
  protected readonly account = ACCOUNT;

  public ngOnInit(): void {
    void this.router.navigateByUrl(this.start());
  }
}

/** The sizes the golden screens are approved at: an iPhone's 390 and a 1280 laptop. */
export const GOLDEN_VIEWPORTS = {
  phone390: {name: 'Phone 390', styles: {width: '390px', height: '844px'}, type: 'mobile'},
  desktop1280: {name: 'Desktop 1280', styles: {width: '1280px', height: '800px'}, type: 'desktop'},
};
export const GOLDEN_PHONE = {viewport: {value: 'phone390', isRotated: false}};
export const GOLDEN_DESKTOP = {viewport: {value: 'desktop1280', isRotated: false}};

/**
 * The app's providers for a golden screen: the theme the catalog sets, and a router holding the
 * screen's own `routes` with a placeholder for every tab they leave out.
 */
export function goldenProviders(routes: Routes): (Provider | EnvironmentProviders)[] {
  const taken = new Set(routes.map(route => route.path));
  const placeholders: Routes = NAV_ITEMS.map(item => item.route.slice(1))
    .filter(path => !taken.has(path))
    .map(path => ({
      path,
      component: PlaceholderPageComponent,
      data: {title: NAV_ITEMS.find(item => item.route === `/${path}`)?.label},
    }));
  return [
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
      [...routes, ...placeholders, {path: '**', redirectTo: 'tasks'}],
      withHashLocation()
    ),
  ];
}
