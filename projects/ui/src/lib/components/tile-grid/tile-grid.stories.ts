import {provideRouter, withHashLocation} from '@angular/router';
import {applicationConfig, type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

import {BarChartComponent} from '../bar-chart/bar-chart.component';
import {
  DescriptionItemComponent,
  DescriptionListComponent,
} from '../description-list/description-list.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {type CmnTile, TileGridComponent} from './tile-grid.component';
import {TilePanelDirective} from './tile-panel.directive';

const POLICY: readonly CmnTile[] = [
  {id: 'premium', label: 'Premium', headline: '£524.20'},
  {id: 'renews', label: 'Renews', headline: '14 Nov'},
  {id: 'quotes', label: 'Quotes', headline: '3'},
  {id: 'documents', label: 'Documents', headline: '2'},
  {id: 'drivers', label: 'Drivers', headline: '2'},
  {id: 'excess', label: 'Excess', headline: '£250'},
];

const SEVEN: readonly CmnTile[] = [
  ...POLICY,
  {id: 'mileage', label: 'Mileage', headline: '6,000 mi'},
];

const LONG: readonly CmnTile[] = [
  {id: 'insurer', label: 'Insurer', headline: 'Northwind Mutual Insurance Group'},
  {id: 'policy', label: 'Policy number', headline: 'NWM-4471-2290-K'},
  {id: 'premium', label: 'Premium and any add-ons paid monthly', headline: '£1,524,200.00'},
];

const PREMIUM_BY_YEAR = {
  label: 'Premium by year',
  points: [
    {label: '2022', value: 431},
    {label: '2023', value: 468},
    {label: '2024', value: 486},
    {label: '2025', value: 524},
  ],
};

/** The panel every story reuses: the summary first, then the evidence, capped at two charts. */
const PANELS = `
  <ng-template cmnTilePanel="premium">
    <cmn-description-list>
      <cmn-description-item label="Paid" value="Monthly, £43.68" />
      <cmn-description-item label="Change on last year" value="Up £38" />
    </cmn-description-list>
    <cmn-bar-chart label="Premium by year" currency="GBP" [series]="[premiumByYear]" />
  </ng-template>
  <ng-template cmnTilePanel="renews">
    <cmn-description-list>
      <cmn-description-item label="Renewal date" value="14 November 2026" />
      <cmn-description-item label="Notice sent" value="3 November" />
    </cmn-description-list>
  </ng-template>
  <ng-template cmnTilePanel="quotes">
    <div>
      <cmn-list-item-row label="Harbor Mutual" sublabel="Asked 4 Nov" />
      <cmn-list-item-row label="Cedar Direct" sublabel="Asked 4 Nov" />
    </div>
  </ng-template>
`;

const meta: Meta<TileGridComponent> = {
  title: 'Components/TileGrid',
  component: TileGridComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        BarChartComponent,
        DescriptionItemComponent,
        DescriptionListComponent,
        ListItemRowComponent,
        TilePanelDirective,
      ],
    }),
  ],
  argTypes: {
    open: {control: 'select', options: [null, ...POLICY.map(tile => tile.id)]},
    linkable: {control: 'boolean'},
  },
  args: {tiles: POLICY, open: null, linkable: false, ariaLabel: 'Policy facts'},
  render: args => ({
    props: {...args, premiumByYear: PREMIUM_BY_YEAR},
    template: `
      <cmn-tile-grid class="max-w-3xl" [tiles]="tiles" [(open)]="open" [linkable]="linkable" [ariaLabel]="ariaLabel">
        ${PANELS}
      </cmn-tile-grid>
    `,
  }),
};

export default meta;
type Story = StoryObj<TileGridComponent>;

/** Six facts, none open. Two columns on a phone, three from `md`. */
export const Default: Story = {};

export const DefaultDark: Story = {globals: {theme: 'dark'}};

/**
 * The premium tile open: the panel sits full width under the row of the tile, repeats the tile in
 * its header and holds the summary, then one chart. Open another tile and the panel moves.
 */
export const Open: Story = {args: {open: 'premium'}};

export const OpenDark: Story = {args: {open: 'premium'}, globals: {theme: 'dark'}};

/** A tile in the last row: the panel goes under that row, at the foot of the grid. */
export const OpenInLastRow: Story = {args: {open: 'excess'}};

/** Seven tiles leave a short last row on both layouts; the panel still closes the row it belongs to. */
export const WithManyTiles: Story = {args: {tiles: SEVEN, open: 'renews'}};

/** Long values wrap inside the tile instead of being cut: an ellipsis would hide digits. */
export const WithLongHeadlines: Story = {args: {tiles: LONG, open: 'premium'}};

/**
 * Linkable: the open tile rides in the URL fragment (`#premium`), so a detail view can be shared
 * at the panel. Press a tile and watch the address; reload and it opens again.
 */
export const Linkable: Story = {
  args: {linkable: true},
  decorators: [applicationConfig({providers: [provideRouter([], withHashLocation())]})],
};
