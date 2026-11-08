import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';

import {CardComponent} from '../components/card/card.component';
import {DataTableComponent} from '../components/data-table/data-table.component';
import {
  CmnCellDirective,
  CmnHeaderCellDirective,
  CmnSummaryCellDirective,
} from '../components/data-table/data-table-cell.directive';
import {CmnColumnComponent} from '../components/data-table/data-table-column.component';
import {
  DescriptionItemComponent,
  DescriptionListComponent,
} from '../components/description-list/description-list.component';
import {DisclosureRowComponent} from '../components/disclosure-row/disclosure-row.component';
import {ListItemRowComponent} from '../components/list-item-row/list-item-row.component';
import {ListSectionComponent} from '../components/list-section/list-section.component';
import {SearchInputComponent} from '../components/search-input/search-input.component';
import {
  SegmentedComponent,
  type SegmentedOption,
} from '../components/segmented/segmented.component';
import {SkeletonComponent} from '../components/skeleton/skeleton.component';
import {type CmnTab, TabGroupComponent} from '../components/tab-group/tab-group.component';

interface Payment {
  date: string;
  payee: string;
  account: string;
  amount: string;
}

const PAYMENTS: readonly Payment[] = [
  {date: 'Nov 6', payee: 'Northwind Grocers', account: 'Northwind checking', amount: '-€42.10'},
  {date: 'Nov 5', payee: 'Harbor Transit', account: 'Harbor savings', amount: '-€18.00'},
  {date: 'Nov 4', payee: 'Cedar Brokerage', account: 'Cedar brokerage', amount: '+€250.00'},
  {date: 'Nov 3', payee: 'Orchard Pension', account: 'Orchard pension', amount: '+€180.00'},
];

const TABS: readonly CmnTab[] = [
  {id: 'accounts', label: 'Accounts'},
  {id: 'payments', label: 'Payments'},
  {id: 'rules', label: 'Rules'},
];

const RANGES: readonly SegmentedOption[] = [
  {value: '1M', label: '1M'},
  {value: '3M', label: '3M'},
  {value: '1Y', label: '1Y'},
  {value: 'All', label: 'All'},
];

/**
 * The golden lists screen: the list and table family of Carbon step 3 (epic #279) drawn once, so
 * a change to a token or a component moves a pixel here. It is not an app screen, so it is not on
 * the page template; it lists the pieces the way Carbon's own pages do. Hover and focus cannot be
 * reached by a still page, so a wrapper marked `data-force` names the state it holds;
 * `e2e/screens/lists.spec.ts` forces that pseudo-class on the control inside it. Only fake data.
 */
@Component({
  selector: 'cmn-lists-golden',
  imports: [
    CardComponent,
    CmnCellDirective,
    CmnColumnComponent,
    CmnHeaderCellDirective,
    CmnSummaryCellDirective,
    DataTableComponent,
    DescriptionItemComponent,
    DescriptionListComponent,
    DisclosureRowComponent,
    FormsModule,
    ListItemRowComponent,
    ListSectionComponent,
    SearchInputComponent,
    SegmentedComponent,
    SkeletonComponent,
    TabGroupComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block bg-surface-bg p-cmn-4 md:p-cmn-8'},
  template: `
    <div class="mx-auto flex max-w-[75rem] flex-col gap-cmn-8" data-lists-golden>
      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-tabs">
        <h2 id="g-tabs" class="text-cmn-lg font-semibold text-text-primary">Tabs and switcher</h2>
        <cmn-tab-group [tabs]="tabs" [(activeTab)]="tab" ariaLabel="Sections" />
        <span data-force="focus"
          ><cmn-segmented [options]="ranges" [(value)]="range" label="Range"
        /></span>
        <cmn-segmented [options]="ranges" [disabled]="true" value="3M" label="Range, unavailable" />
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-search">
        <h2 id="g-search" class="text-cmn-lg font-semibold text-text-primary">Search</h2>
        <div class="grid items-start gap-cmn-4 md:grid-cols-2">
          <cmn-search-input [ngModel]="''" placeholder="Search payments" />
          <cmn-search-input [ngModel]="'harbor'" placeholder="Search payments" />
          <span data-force="hover"><cmn-search-input [ngModel]="''" placeholder="Hover" /></span>
          <span data-force="focus"><cmn-search-input [ngModel]="''" placeholder="Focus" /></span>
          <cmn-search-input [ngModel]="''" [disabled]="true" placeholder="Search is off" />
          <cmn-search-input [ngModel]="''" size="sm" placeholder="Small, 32px" />
        </div>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-list">
        <h2 id="g-list" class="text-cmn-lg font-semibold text-text-primary">Contained list</h2>
        <cmn-list-section heading="Today">
          <span class="text-cmn-sm tabular-nums text-text-secondary" cmnListSectionAside>
            -€60.10
          </span>
          <cmn-list-item-row label="Northwind Grocers" sublabel="Northwind checking">
            <span amount class="text-cmn-sm tabular-nums text-text-primary">-€42.10</span>
          </cmn-list-item-row>
          <span data-force="hover">
            <cmn-list-item-row [action]="true" label="Harbor Transit" sublabel="Harbor savings">
              <span amount class="text-cmn-sm tabular-nums text-text-primary">-€18.00</span>
            </cmn-list-item-row>
          </span>
          <cmn-list-item-row
            [action]="true"
            label="Cedar Brokerage"
            sublabel="Cedar brokerage"
            trailingIcon="Ellipsis"
          >
            <span amount class="text-cmn-sm tabular-nums text-text-primary">+€250.00</span>
          </cmn-list-item-row>
        </cmn-list-section>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-structured">
        <h2 id="g-structured" class="text-cmn-lg font-semibold text-text-primary">
          Structured list
        </h2>
        <cmn-card padding="none">
          <div class="px-cmn-4">
            <cmn-description-list>
              <cmn-description-item label="Institution" value="Northwind Bank" />
              <cmn-description-item label="Account" value="Checking, EUR" />
              <cmn-description-item label="Last sync" value="Nov 7, 09:12" />
            </cmn-description-list>
          </div>
        </cmn-card>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-expand">
        <h2 id="g-expand" class="text-cmn-lg font-semibold text-text-primary">Expandable rows</h2>
        <cmn-card padding="none">
          <cmn-disclosure-row
            [amount]="12450.75"
            [open]="true"
            avatarName="Northwind Bank"
            currency="EUR"
            label="Northwind Bank"
            sublabel="2 accounts"
          >
            <p class="px-cmn-4 py-cmn-3 text-cmn-sm text-text-secondary">
              Checking and savings, synced this morning.
            </p>
          </cmn-disclosure-row>
          <span data-force="hover">
            <cmn-disclosure-row
              [amount]="3200"
              [open]="false"
              avatarName="Harbor Credit Union"
              currency="EUR"
              label="Harbor Credit Union"
              sublabel="1 account"
            />
          </span>
        </cmn-card>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-table">
        <h2 id="g-table" class="text-cmn-lg font-semibold text-text-primary">Data table</h2>
        <cmn-data-table [rows]="payments" [rowsActionable]="true">
          <cmn-column key="date" header="Date" />
          <cmn-column key="payee" header="Payee" />
          <cmn-column key="account" header="Account" />
          <cmn-column key="amount" header="Amount" align="right">
            <ng-template let-row cmnCell
              ><span class="tabular-nums">{{ row.amount }}</span></ng-template
            >
          </cmn-column>
        </cmn-data-table>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-loading">
        <h2 id="g-loading" class="text-cmn-lg font-semibold text-text-primary">Loading</h2>
        <cmn-skeleton [count]="2" shape="list" />
      </section>
    </div>
  `,
})
class ListsGoldenComponent {
  protected readonly tabs = TABS;
  protected readonly ranges = RANGES;
  protected readonly payments = PAYMENTS;
  protected readonly tab = signal('payments');
  protected readonly range = signal('3M');
}

const meta: Meta<ListsGoldenComponent> = {
  title: 'Lists/Golden',
  component: ListsGoldenComponent,
  parameters: {layout: 'fullscreen'},
};

export default meta;
type Story = StoryObj<ListsGoldenComponent>;

/** Every Carbon-step-3 list and table piece, once: tabs, switcher, search, rows, table, loading. */
export const Matrix: Story = {};
