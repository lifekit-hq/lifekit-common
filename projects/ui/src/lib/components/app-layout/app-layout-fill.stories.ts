import {ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input} from '@angular/core';
import {provideRouter, RouterOutlet, withHashLocation} from '@angular/router';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {EmptyStateComponent} from '../empty-state/empty-state.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {PageComponent} from '../page/page.component';
import {PageScrollComponent} from '../page-scroll/page-scroll.component';
import type {NavItem} from '../sidebar-nav/sidebar-nav.component';
import {defineAppChromeElements} from './app-chrome-elements';
import {AppLayoutComponent} from './app-layout.component';

defineAppChromeElements();

const ROWS = 60;
const GROUPS = ['Today', 'Yesterday', 'Mon 12 Oct', 'Sun 11 Oct', 'Sat 10 Oct'];
const ROWS_PER_GROUP = 8;

const NAV_ITEMS: NavItem[] = [
  {label: 'Events', icon: 'CalendarDays', route: '/events'},
  {label: 'Alerts', icon: 'Bell', route: '/alerts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
];

// The pages below carry no host styling and no height classes: the contract is
// `cmn-page fill` holding a `cmn-page-scroll`, and nothing else sizes.

@Component({
  selector: 'cmn-fill-long-list-page',
  imports: [ListItemRowComponent, PageComponent, PageScrollComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="list" fill>
      <p class="pb-cmn-4 text-cmn-sm text-text-secondary" data-above-list>
        What is coming, what fired, and what it meant
      </p>
      <cmn-page-scroll label="Events" data-list>
        @for (row of rows; track row) {
          <cmn-list-item-row [label]="'Event ' + row" sublabel="Scheduled" />
        }
      </cmn-page-scroll>
    </cmn-page>
  `,
})
class LongListPageComponent {
  protected readonly rows = Array.from({length: ROWS}, (_, i) => i + 1);
}

@Component({
  selector: 'cmn-fill-empty-list-page',
  imports: [EmptyStateComponent, PageComponent, PageScrollComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="list" fill>
      <p class="pb-cmn-4 text-cmn-sm text-text-secondary" data-above-list>
        What is coming, what fired, and what it meant
      </p>
      <cmn-page-scroll label="Alerts" data-list>
        <div class="flex min-h-0 flex-1 items-center justify-center">
          <cmn-empty-state message="Nothing here" subMessage="No alerts have fired." icon="Bell" />
        </div>
      </cmn-page-scroll>
    </cmn-page>
  `,
})
class EmptyListPageComponent {}

/** A transactions-style page: a header above the list, then day groups with sticky headings. */
@Component({
  selector: 'cmn-fill-grouped-list-page',
  imports: [ListItemRowComponent, ListSectionComponent, PageComponent, PageScrollComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="list" fill>
      <p class="pb-cmn-4 text-cmn-sm text-text-secondary" data-above-list>Everything that moved</p>
      <cmn-page-scroll label="Transactions" data-list>
        @for (group of groups; track group) {
          <cmn-list-section [heading]="group">
            @for (row of rowsPerGroup; track row) {
              <cmn-list-item-row [label]="group + ' payment ' + row" sublabel="Card payment" />
            }
          </cmn-list-section>
        }
      </cmn-page-scroll>
    </cmn-page>
  `,
})
class GroupedListPageComponent {
  protected readonly groups = GROUPS;
  protected readonly rowsPerGroup = Array.from({length: ROWS_PER_GROUP}, (_, i) => i + 1);
}

/**
 * A budgets-style overview: `cmn-page kind="overview" fill`, a stepper above a `cmn-page-scroll`
 * holding a card grid, and a rail beside it from xl. The main column must be bounded from xl up
 * too, so the card grid is the one scroller.
 */
@Component({
  selector: 'cmn-fill-overview-page',
  imports: [ListItemRowComponent, ListSectionComponent, PageComponent, PageScrollComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="overview" fill>
      <p class="pb-cmn-4 text-cmn-sm text-text-secondary" data-above-list>November 2026</p>
      <cmn-page-scroll label="Budgets" data-list>
        <div class="grid grid-cols-1 gap-cmn-4 md:grid-cols-2 xl:grid-cols-3">
          @for (card of cards; track card) {
            <div class="rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4">
              <p class="text-cmn-sm text-text-secondary">Budget {{ card }}</p>
              <p class="h-24 text-cmn-lg text-text-primary">€{{ card * 40 }} left</p>
            </div>
          }
        </div>
      </cmn-page-scroll>
      <cmn-list-section cmnPageRail heading="Coming up">
        <cmn-list-item-row label="Rent" sublabel="Friday" />
      </cmn-list-section>
    </cmn-page>
  `,
})
class OverviewFillPageComponent {
  protected readonly cards = Array.from({length: ROWS}, (_, i) => i + 1);
}

/** A `fill` page with no `cmn-page-scroll`: on a phone it grows with its rows and main scrolls it. */
@Component({
  selector: 'cmn-fill-unscrolled-page',
  imports: [ListItemRowComponent, PageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="list" fill>
      <p class="pb-cmn-4 text-cmn-sm text-text-secondary">
        Rows straight in the page, no list scroller
      </p>
      @for (row of rows; track row) {
        <cmn-list-item-row [label]="'Report ' + row" sublabel="Monthly" data-row />
      }
    </cmn-page>
  `,
})
class UnscrolledFillPageComponent {
  protected readonly rows = Array.from({length: ROWS}, (_, i) => i + 1);
}

/**
 * A page that fits the slot with a viewport calculation instead of `fill`: from md it is exactly the
 * window less the top bar and the large title (8.1rem: 3.5rem bar, 2rem title padding, one 2rem line at 1.3), and on a phone it takes the frame. It leaves
 * `main` no slack, so any height the shell spends above it (a notice column with nothing showing)
 * makes `main` scroll around the page.
 */
@Component({
  selector: 'cmn-fill-fixed-height-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block h-full overflow-hidden md:h-[calc(100dvh-8.1rem)]'},
  template: `
    <div class="h-full rounded-cmn-lg border border-border-default bg-surface-card p-cmn-4">
      <p class="text-cmn-sm text-text-secondary">A page that takes the slot, nothing more</p>
    </div>
  `,
})
class FixedHeightPageComponent {}

@Component({
  selector: 'cmn-fill-shell',
  imports: [AppLayoutComponent, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <cmn-app-layout [navItems]="navItems" [phoneOverlay]="true">
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
class FillShellComponent {
  /** The app's PWA notices are in the shell, none of them showing. */
  public readonly appChrome = input(false);
  protected readonly navItems = NAV_ITEMS;
}

/**
 * A list page that scrolls only its list. The page is `cmn-page fill` holding a
 * `cmn-page-scroll`; the shell gives the page everything below the large title and notices, at
 * every width, so `main` never scrolls and the list is the one scroller. Apps add no height
 * classes: the pages here have no host styling at all. The conformance suite measures these
 * stories at 1440x900 and 390x844.
 */
const meta: Meta<FillShellComponent> = {
  title: 'Conformance/Fill App Layout',
  component: FillShellComponent,
  parameters: {layout: 'fullscreen'},
};

export default meta;

const fillStory = (
  path: string,
  title: string,
  appChrome = false
): StoryObj<FillShellComponent> => ({
  args: {appChrome},
  decorators: [
    applicationConfig({
      providers: [
        provideRouter(
          [
            {path: '', redirectTo: path, pathMatch: 'full'},
            {path: 'events', component: LongListPageComponent, data: {title}},
            {path: 'alerts', component: EmptyListPageComponent, data: {title}},
            {path: 'transactions', component: GroupedListPageComponent, data: {title}},
            {path: 'reports', component: UnscrolledFillPageComponent, data: {title}},
            {path: 'ledger', component: FixedHeightPageComponent, data: {title}},
            {path: 'budgets', component: OverviewFillPageComponent, data: {title}},
          ],
          withHashLocation()
        ),
      ],
    }),
  ],
});

/** Many rows: only the list scrolls. */
export const LongList = fillStory('events', 'Events');

/** No rows: nothing scrolls, and the empty state is centred in the space left. */
export const EmptyList = fillStory('alerts', 'Alerts');

/** A generic grouped list page (transactions): sticky day headings inside the scrolling list. */
export const GroupedList = fillStory('transactions', 'Transactions');

/** A `fill` page without a `cmn-page-scroll`: on a phone main scrolls it, bottom padding included. */
export const FillWithoutListScroll = fillStory('reports', 'Reports');

/**
 * The same list page in a shell whose three notices are there and none is showing, as an app wires
 * it: the notices cost the page nothing, so `main` still has nothing to scroll.
 */
export const LongListWithAppChrome = fillStory('events', 'Events', true);

/**
 * A page sized from the viewport (`calc(100dvh - 8.1rem)`) in the shell with its notices there and
 * none showing: `main` and the document still do not scroll.
 */
export const FixedHeightWithAppChrome = fillStory('ledger', 'Ledger', true);

/**
 * An overview page with `fill` and a `cmn-page-scroll` in its main column: the card grid is the one
 * scroller at every width, xl and up included, where the rail sits beside the main column.
 */
export const OverviewFill = fillStory('budgets', 'Budgets');
