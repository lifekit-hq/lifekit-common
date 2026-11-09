import {ChangeDetectionStrategy, Component} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {
  AllocationBarComponent,
  type AllocationSegment,
} from '../allocation-bar/allocation-bar.component';
import type {PageChromeData} from '../app-layout/page-chrome';
import {ButtonComponent} from '../button/button.component';
import {
  DescriptionItemComponent,
  DescriptionListComponent,
} from '../description-list/description-list.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {type CmnTile, TileGridComponent} from '../tile-grid/tile-grid.component';
import {TilePanelDirective} from '../tile-grid/tile-panel.directive';
import {VerdictHeaderComponent} from '../verdict-header/verdict-header.component';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
  GoldenShellComponent,
} from './golden-screen';
import {PageComponent} from './page.component';

interface Entry {
  readonly id: number;
  readonly label: string;
  readonly note: string;
}

const DOCUMENTS: readonly Entry[] = [
  {id: 1, label: 'Renewal quote 2026', note: 'PDF · received 3 Nov'},
  {id: 2, label: 'Policy schedule 2025', note: 'PDF · 4 pages'},
];

const HISTORY: readonly Entry[] = [
  {id: 3, label: 'Asked two other insurers for a quote', note: '4 Nov · Sam'},
  {id: 4, label: 'Renewal quote arrived, up £38 on last year', note: '3 Nov · Alex'},
  {id: 5, label: 'Task added', note: '2 Oct · Alex'},
];

/**
 * The golden detail screen: one record read top to bottom on the detail template, built only from
 * library parts. Its status, the facts as a key-value list, the related rows, then the record's
 * own actions; the top bar carries the back chevron (the route's parent) and Edit.
 */
@Component({
  selector: 'cmn-golden-task-detail-page',
  imports: [
    ButtonComponent,
    DescriptionItemComponent,
    DescriptionListComponent,
    ListItemRowComponent,
    ListSectionComponent,
    PageComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="detail">
      <div class="flex flex-col gap-cmn-group-gap">
        <p class="text-cmn-sm font-medium text-text-secondary">Due 14 Nov · Assigned to Sam</p>
        <p class="text-cmn-sm leading-relaxed text-text-primary">
          Compare at least two quotes before renewing. Last year the no-claims discount was applied
          late, so check it is on the new schedule before paying.
        </p>
      </div>
      <cmn-list-section heading="Policy">
        <cmn-description-list class="px-cmn-4">
          <cmn-description-item label="Insurer" value="Northwind Mutual" />
          <cmn-description-item label="Policy number" value="NWM-4471-2290-K" />
          <cmn-description-item label="Renews" value="14 November 2026" />
          <cmn-description-item label="Premium" value="£524.20 a year, paid monthly" />
          <cmn-description-item label="Drivers" value="Sam Morgan, Alex Morgan" />
        </cmn-description-list>
      </cmn-list-section>
      <cmn-list-section [heading]="'Documents · ' + documents.length">
        @for (document of documents; track document.id) {
          <cmn-list-item-row
            [label]="document.label"
            [sublabel]="document.note"
            [trailingLabel]="'Download ' + document.label"
            trailingIcon="Download"
          />
        }
      </cmn-list-section>
      <cmn-list-section heading="History">
        @for (entry of history; track entry.id) {
          <cmn-list-item-row [label]="entry.label" [sublabel]="entry.note" />
        }
      </cmn-list-section>
      <div class="flex flex-wrap gap-cmn-group-gap">
        <cmn-button icon="Check">Mark as done</cmn-button>
        <cmn-button variant="secondary" icon="Clock">Snooze a week</cmn-button>
      </div>
    </cmn-page>
  `,
})
class TaskDetailPageComponent {
  protected readonly documents = DOCUMENTS;
  protected readonly history = HISTORY;
}

const POLICY_TILES: readonly CmnTile[] = [
  {id: 'premium', label: 'Premium', headline: '£524.20'},
  {id: 'renews', label: 'Renews', headline: '14 Nov'},
  {id: 'quotes', label: 'Quotes', headline: '3'},
  {id: 'documents', label: 'Documents', headline: '2'},
  {id: 'drivers', label: 'Drivers', headline: '2'},
  {id: 'excess', label: 'Excess', headline: '£250'},
];

const PREMIUM_SPLIT: readonly AllocationSegment[] = [
  {label: 'Base cover', value: 389.8},
  {label: 'Add-ons', value: 96},
  {label: 'Tax and fees', value: 38.4},
];

/**
 * The same record read as facts: a tile grid in place of the sections, one panel shared by all
 * six tiles. The premium panel is open, the way a person lands from a link to it
 * (`#premium`): the summary first, then one chart as evidence, then a link out for the rest.
 */
@Component({
  selector: 'cmn-golden-task-detail-tiles-page',
  imports: [
    AllocationBarComponent,
    ButtonComponent,
    DescriptionItemComponent,
    DescriptionListComponent,
    PageComponent,
    TileGridComponent,
    TilePanelDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="detail">
      <p class="text-cmn-sm font-medium text-text-secondary">Due 14 Nov · Assigned to Sam</p>
      <cmn-tile-grid [tiles]="tiles" ariaLabel="Policy facts" open="premium">
        <ng-template cmnTilePanel="premium">
          <cmn-description-list>
            <cmn-description-item label="Paid" value="Monthly, £43.68" />
            <cmn-description-item label="Change on last year" value="Up £38" />
          </cmn-description-list>
          <cmn-allocation-bar [segments]="split" currency="GBP" label="Where the premium goes" />
          <a
            class="inline-flex min-h-cmn-touch items-center self-start text-cmn-sm font-medium text-accent-default underline underline-offset-2"
            href="/tasks/car-insurance/payments"
          >
            All payments
          </a>
        </ng-template>
      </cmn-tile-grid>
      <div class="flex flex-wrap gap-cmn-group-gap">
        <cmn-button icon="Check">Mark as done</cmn-button>
        <cmn-button variant="secondary" icon="Clock">Snooze a week</cmn-button>
      </div>
    </cmn-page>
  `,
})
class TaskDetailTilesPageComponent {
  protected readonly tiles = POLICY_TILES;
  protected readonly split = PREMIUM_SPLIT;
}

const REASONS: readonly Entry[] = [
  {id: 1, label: 'Revenue grew 18% a year for three years', note: 'Filings · FY2023 to FY2025'},
  {id: 2, label: 'Net cash covers two years of spending', note: 'Balance sheet · Q3 2026'},
  {id: 3, label: 'Trades at 31 times earnings, above its peers', note: 'Valuation · 6 Nov'},
];

/**
 * The golden detail screen led by its verdict: the same template, with the state of the thing as
 * the first read (the status word, two pills, the caveat, the price and the day's move), then the
 * facts and the reasons under it.
 */
@Component({
  selector: 'cmn-golden-verdict-detail-page',
  imports: [
    DescriptionItemComponent,
    DescriptionListComponent,
    ListItemRowComponent,
    ListSectionComponent,
    PageComponent,
    VerdictHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="detail">
      <cmn-verdict-header
        [status]="{tone: 'success', label: 'Strong buy'}"
        [pills]="[{label: 'High conviction', tone: 'info'}, {label: '12 months'}]"
        [price]="182.4"
        [change]="{percent: 0.018, amount: 3.2}"
        caveat="Priced for perfection; wait for a pullback before adding."
        currency="EUR"
      />
      <cmn-list-section heading="Position">
        <cmn-description-list class="px-cmn-4">
          <cmn-description-item label="Shares" value="42" />
          <cmn-description-item label="Average cost" value="€141.10" />
          <cmn-description-item label="Market value" value="€7,660.80" />
          <cmn-description-item label="Weight" value="4.2% of the portfolio" />
        </cmn-description-list>
      </cmn-list-section>
      <cmn-list-section heading="Why">
        @for (reason of reasons; track reason.id) {
          <cmn-list-item-row [label]="reason.label" [sublabel]="reason.note" />
        }
      </cmn-list-section>
    </cmn-page>
  `,
})
class VerdictDetailPageComponent {
  protected readonly reasons = REASONS;
}

const VERDICT_DATA: PageChromeData = {
  title: 'Northwind Holdings',
  parent: '/tasks',
};

const DETAIL_DATA: PageChromeData = {
  title: 'Car insurance',
  parent: '/tasks',
  actions: [{id: 'edit', label: 'Edit', icon: 'Pencil'}],
};

/**
 * Golden screens for the detail template: the reference other lifekit apps copy and the owner
 * approves once. Each is the real shell and real components; run the screen check
 * (`lifekit-chrome-check screen`, docs/SCREEN-CHECK.md) against them at 390 and 1280.
 */
const meta: Meta<GoldenShellComponent> = {
  title: 'Templates/Detail',
  component: GoldenShellComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: goldenProviders([
        {path: 'tasks/car-insurance', component: TaskDetailPageComponent, data: DETAIL_DATA},
        {
          path: 'tasks/car-insurance-tiles',
          component: TaskDetailTilesPageComponent,
          data: DETAIL_DATA,
        },
        {path: 'tasks/northwind', component: VerdictDetailPageComponent, data: VERDICT_DATA},
      ]),
    }),
  ],
  args: {start: '/tasks/car-insurance', notice: false},
};

export default meta;
type Story = StoryObj<GoldenShellComponent>;

export const Phone: Story = {globals: GOLDEN_PHONE};

export const PhoneDark: Story = {globals: {...GOLDEN_PHONE, theme: 'dark'}};

export const Desktop: Story = {globals: GOLDEN_DESKTOP};

export const DesktopDark: Story = {globals: {...GOLDEN_DESKTOP, theme: 'dark'}};

/**
 * The detail template with a tile grid, the one disclosure pattern for a detail view
 * (DESIGN.md, Tile grid). Its own screen for the route scan and the baselines.
 */
const TILES_START = {start: '/tasks/car-insurance-tiles'};

export const PhoneWithTiles: Story = {args: TILES_START, globals: GOLDEN_PHONE};

export const PhoneWithTilesDark: Story = {
  args: TILES_START,
  globals: {...GOLDEN_PHONE, theme: 'dark'},
};

export const DesktopWithTiles: Story = {args: TILES_START, globals: GOLDEN_DESKTOP};

export const DesktopWithTilesDark: Story = {
  args: TILES_START,
  globals: {...GOLDEN_DESKTOP, theme: 'dark'},
};

/**
 * The detail template led by a verdict header (`cmn-verdict-header`): the state of the thing is the
 * first read, stacked on a phone with the price under it and opposite it from 768px.
 */
export const PhoneWithVerdict: Story = {globals: GOLDEN_PHONE, args: {start: '/tasks/northwind'}};

export const PhoneWithVerdictDark: Story = {
  globals: {...GOLDEN_PHONE, theme: 'dark'},
  args: {start: '/tasks/northwind'},
};

export const DesktopWithVerdict: Story = {
  globals: GOLDEN_DESKTOP,
  args: {start: '/tasks/northwind'},
};

export const DesktopWithVerdictDark: Story = {
  globals: {...GOLDEN_DESKTOP, theme: 'dark'},
  args: {start: '/tasks/northwind'},
};
