import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {provideRouter, RouterOutlet, withHashLocation} from '@angular/router';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {PageComponent} from '../page/page.component';
import {PageScrollComponent} from '../page-scroll/page-scroll.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {AppLayoutComponent} from './app-layout.component';

const NAV_ITEMS: NavItem[] = [
  {label: 'Shopping', icon: 'ShoppingBasket', route: '/shopping'},
  {label: 'Pantry', icon: 'Archive', route: '/pantry'},
];

/** What the fake server returns on each reload; the last-synced line reads the matching time. */
const SYNCS = ['09:41', '09:42', '09:43', '09:44', '09:45'];
const SIMULATED_RELOAD_MS = 1200;

const ITEMS = [
  {name: 'Oat milk', note: '2 cartons · Alex'},
  {name: 'Sourdough loaf', note: 'Bakery · Sam'},
  {name: 'Cherry tomatoes', note: '1 punnet'},
  {name: 'Free-range eggs', note: '12 · Alex'},
  {name: 'Dishwasher tablets', note: 'Sam'},
  {name: 'Parmesan', note: '200 g'},
  {name: 'Basil', note: 'Fresh · Alex'},
  {name: 'Olive oil', note: '500 ml · Sam'},
];

/** A store that reloads over the network, as a basket-style app writes it. */
class FakeShoppingStore {
  private syncs = 0;
  public readonly syncedAt = signal(SYNCS[0]);
  public readonly isLoading = signal(false);

  public readonly load = (): Promise<void> => {
    this.isLoading.set(true);
    return new Promise(resolve =>
      setTimeout(() => {
        this.syncs = Math.min(this.syncs + 1, SYNCS.length - 1);
        this.syncedAt.set(SYNCS[this.syncs]);
        this.isLoading.set(false);
        resolve();
      }, SIMULATED_RELOAD_MS)
    );
  };
}

@Component({
  selector: 'cmn-pull-refresh-shopping-page',
  imports: [ListItemRowComponent, ListSectionComponent, PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page [reload]="store.load" [reloading]="store.isLoading()">
      <p class="text-cmn-sm text-text-secondary">Last synced {{ store.syncedAt() }}</p>
      <cmn-list-section heading="This week">
        @for (item of items; track $index) {
          <cmn-list-item-row [label]="item.name" [sublabel]="item.note" />
        }
      </cmn-list-section>
    </cmn-page>
  `,
})
class ShoppingPageComponent {
  protected readonly store = new FakeShoppingStore();
  /** Long enough that the page scrolls in `main`. */
  protected readonly items = [...ITEMS, ...ITEMS];
}

@Component({
  selector: 'cmn-pull-refresh-shopping-fill-page',
  imports: [ListItemRowComponent, ListSectionComponent, PageComponent, PageScrollComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page [reload]="store.load" [reloading]="store.isLoading()" fill>
      <p class="text-cmn-sm text-text-secondary">Last synced {{ store.syncedAt() }}</p>
      <cmn-page-scroll label="Shopping list">
        <cmn-list-section heading="This week">
          @for (item of items; track $index) {
            <cmn-list-item-row [label]="item.name" [sublabel]="item.note" />
          }
        </cmn-list-section>
      </cmn-page-scroll>
    </cmn-page>
  `,
})
class ShoppingFillPageComponent {
  protected readonly store = new FakeShoppingStore();
  protected readonly items = [...ITEMS, ...ITEMS];
}

/** A tab root that registers no reload: nothing pulls, as before. */
@Component({
  selector: 'cmn-pull-refresh-pantry-page',
  imports: [ListItemRowComponent, ListSectionComponent, PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page>
      <cmn-list-section heading="Pantry">
        @for (item of items; track $index) {
          <cmn-list-item-row [label]="item.name" [sublabel]="item.note" />
        }
      </cmn-list-section>
    </cmn-page>
  `,
})
class PantryPageComponent {
  protected readonly items = ITEMS;
}

@Component({
  selector: 'cmn-pull-refresh-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-app-layout [navItems]="navItems" [phoneOverlay]="true">
      <router-outlet />
    </cmn-app-layout>
  `,
})
class PullRefreshShellComponent {
  protected readonly navItems = NAV_ITEMS;
}

/**
 * Pull to refresh on a tab root (Apple HIG, Refreshing content). The gesture is the shell's; the
 * page hands `cmn-page` the function that reloads its data (`[reload]`) and its busy flag
 * (`[reloading]`). Try it on a touch device or with touch emulation: pull the list down from the
 * top, past the resistance, and let go. The content follows the finger, the indicator winds up and
 * then spins until the reload is done. Under Reduce Motion the content stays still and only the
 * indicator shows. The reload here is a fake one that takes 1.2 s.
 */
const meta: Meta<PullRefreshShellComponent> = {
  title: 'Conformance/Pull to Refresh',
  component: PullRefreshShellComponent,
  parameters: {layout: 'fullscreen'},
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};

export default meta;
type Story = StoryObj<PullRefreshShellComponent>;

const ROUTES = [
  {path: '', redirectTo: 'shopping', pathMatch: 'full'},
  {path: 'shopping', component: ShoppingPageComponent, data: {title: 'Shopping'}},
  {path: 'pantry', component: PantryPageComponent, data: {title: 'Pantry'}},
] as const;

/** The page scrolls in the shell's `main`: a pull starts when `main` is at its top. */
export const ScrollingPage: Story = {
  decorators: [applicationConfig({providers: [provideRouter([...ROUTES], withHashLocation())]})],
};

/** A fill page scrolls only its list (`cmn-page-scroll`): a pull starts when that list is at its top. */
export const ScrollingList: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(
          [
            {path: '', redirectTo: 'shopping', pathMatch: 'full'},
            {path: 'shopping', component: ShoppingFillPageComponent, data: {title: 'Shopping'}},
            {path: 'pantry', component: PantryPageComponent, data: {title: 'Pantry'}},
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
};

/** Open on a tab root that registered no reload: pulling it does nothing, and the page scrolls as it did. */
export const NoReload: Story = {
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(
          [
            {path: '', redirectTo: 'pantry', pathMatch: 'full'},
            {path: 'shopping', component: ShoppingPageComponent, data: {title: 'Shopping'}},
            {path: 'pantry', component: PantryPageComponent, data: {title: 'Pantry'}},
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
};
