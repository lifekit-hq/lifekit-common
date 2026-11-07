import {NgTemplateOutlet} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {AccountAvatarComponent} from '../account-avatar/account-avatar.component';
import {CardComponent} from '../card/card.component';
import {
  DescriptionItemComponent,
  DescriptionListComponent,
} from '../description-list/description-list.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
} from '../page/golden-screen';
import {PageComponent} from '../page/page.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';
import {StatCardComponent} from '../stat-card/stat-card.component';
import {accountMenu, type AppLayoutAccount, AppLayoutComponent} from './app-layout.component';

/** Window event that ends the boot: the session call "resolving". The e2e spec sends it. */
export const FIRST_PAINT_RESOLVE_EVENT = 'cmn-first-paint-resolve';
/** Without anyone resolving it, the catalog shows the loaded page after this long. */
const AUTO_RESOLVE_MS = 4000;

const ACCOUNT: AppLayoutAccount = {
  label: 'Alex Morgan',
  name: 'Alex Morgan',
  email: 'alex@example.com',
  menuItems: accountMenu({settingsRoute: '/settings'}),
};

const NAV_ITEMS = [
  {label: 'Tasks', icon: 'ListChecks' as const, route: '/tasks'},
  {label: 'Calendar', icon: 'Calendar' as const, route: '/calendar'},
  {label: 'People', icon: 'Users' as const, route: '/people'},
];

const ROWS = [1, 2, 3];
const STATS = ['Due this week', 'Overdue', 'Done', 'Shared with you'];

type Kind = 'list' | 'card' | 'detail' | 'overview';

/** The route's page: its title comes from route data, as in an app, and nothing else. */
@Component({
  selector: 'cmn-first-paint-route',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class RoutePlaceholderComponent {}

/**
 * An app's cold boot, reduced to what the library owns: the shell is drawn at once with the
 * account held (`accountPending`), the page content is a layout-matching skeleton while the
 * "session" resolves, and the loaded page replaces it block for block. The phone suite measures
 * the layout shift across that swap (`first-paint-cls.spec.ts`) and holds it under 0.1.
 */
@Component({
  selector: 'cmn-first-paint',
  imports: [
    AccountAvatarComponent,
    AppLayoutComponent,
    CardComponent,
    DescriptionItemComponent,
    DescriptionListComponent,
    ListItemRowComponent,
    ListSectionComponent,
    NgTemplateOutlet,
    PageComponent,
    SkeletonComponent,
    StatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-app-layout
      [account]="resolved() ? account : undefined"
      [accountPending]="!resolved()"
      [navItems]="navItems"
      [phoneOverlay]="true"
      brand="Tasks"
    >
      <cmn-page [kind]="pageKind()" [attr.data-first-paint]="resolved() ? 'loaded' : 'loading'">
        @if (!resolved()) {
          <span class="sr-only" role="status">Loading</span>
          <cmn-skeleton [shape]="kind()" />
        } @else {
          @switch (kind()) {
            @case ('list') {
              @for (heading of ['Today', 'Later']; track heading) {
                <cmn-list-section [heading]="heading">
                  @for (row of rows; track row) {
                    <ng-container *ngTemplateOutlet="taskRow" />
                  }
                </cmn-list-section>
              }
            }
            @case ('card') {
              <cmn-card>
                <div class="flex flex-col gap-cmn-2">
                  <p class="text-cmn-sm font-semibold text-text-primary">Household</p>
                  <p class="text-cmn-sm text-text-secondary">Two adults and a dog.</p>
                  <p class="text-cmn-sm text-text-secondary">Bins go out on Friday morning.</p>
                  <p class="text-cmn-sm text-text-secondary">Shared with Sam.</p>
                </div>
              </cmn-card>
            }
            @case ('detail') {
              <div class="flex flex-col gap-cmn-group-gap">
                <p class="text-cmn-sm text-text-secondary">Due 14 Nov · Assigned to Sam</p>
                <p class="text-cmn-sm text-text-primary">Renew before the discount ends.</p>
              </div>
              <cmn-list-section heading="Policy">
                <cmn-description-list class="px-cmn-4">
                  <cmn-description-item label="Insurer" value="Northwind Mutual" />
                  <cmn-description-item label="Policy number" value="NWM-4471-2290-K" />
                  <cmn-description-item label="Renews" value="14 November 2026" />
                  <cmn-description-item label="Drivers" value="Sam, Alex" />
                </cmn-description-list>
              </cmn-list-section>
              <cmn-list-section heading="Documents">
                @for (row of [1, 2]; track row) {
                  <ng-container *ngTemplateOutlet="taskRow" />
                }
              </cmn-list-section>
            }
            @case ('overview') {
              <div class="grid grid-cols-2 gap-cmn-group-gap md:grid-cols-4">
                @for (label of stats; track label) {
                  <cmn-stat-card [label]="label" [value]="7" />
                }
              </div>
              @for (heading of ['Due today', 'Later this week']; track heading) {
                <cmn-list-section [heading]="heading">
                  @for (row of rows; track row) {
                    <ng-container *ngTemplateOutlet="taskRow" />
                  }
                </cmn-list-section>
              }
            }
          }
        }
      </cmn-page>
    </cmn-app-layout>
    <ng-template #taskRow>
      <cmn-list-item-row label="Call the dentist" sublabel="Today · Alex">
        <cmn-account-avatar avatar label="Call the dentist" />
        <span amount class="text-cmn-sm tabular-nums text-text-primary">€12.24</span>
      </cmn-list-item-row>
    </ng-template>
  `,
})
class FirstPaintComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  public readonly kind = input<Kind>('list');
  protected readonly resolved = signal(false);
  protected readonly account = ACCOUNT;
  protected readonly navItems = NAV_ITEMS;
  protected readonly rows = ROWS;
  protected readonly stats = STATS;

  protected pageKind(): 'list' | 'detail' | 'overview' {
    const kind = this.kind();
    return kind === 'card' ? 'list' : kind;
  }

  public ngOnInit(): void {
    const resolve = (): void => this.resolved.set(true);
    const timer = setTimeout(resolve, AUTO_RESOLVE_MS);
    window.addEventListener(FIRST_PAINT_RESOLVE_EVENT, resolve);
    this.destroyRef.onDestroy(() => {
      clearTimeout(timer);
      window.removeEventListener(FIRST_PAINT_RESOLVE_EVENT, resolve);
    });
  }
}

const meta: Meta<FirstPaintComponent> = {
  title: 'Conformance/First Paint',
  component: FirstPaintComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: goldenProviders([
        {path: 'tasks', component: RoutePlaceholderComponent, data: {title: 'This week'}},
      ]),
    }),
  ],
};

export default meta;
type Story = StoryObj<FirstPaintComponent>;

/*
 * Each story boots with the shell drawn, the account held and the skeleton for its page kind, and
 * shows the loaded page four seconds later (or on `cmn-first-paint-resolve`).
 */
export const ListPhone: Story = {args: {kind: 'list'}, globals: GOLDEN_PHONE};
export const CardPhone: Story = {args: {kind: 'card'}, globals: GOLDEN_PHONE};
export const DetailPhone: Story = {args: {kind: 'detail'}, globals: GOLDEN_PHONE};
export const OverviewPhone: Story = {args: {kind: 'overview'}, globals: GOLDEN_PHONE};
export const ListDesktop: Story = {args: {kind: 'list'}, globals: GOLDEN_DESKTOP};
export const DetailDesktop: Story = {args: {kind: 'detail'}, globals: GOLDEN_DESKTOP};
export const OverviewDesktop: Story = {args: {kind: 'overview'}, globals: GOLDEN_DESKTOP};
