import {ChangeDetectionStrategy, Component} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {AccountAvatarComponent} from '../account-avatar/account-avatar.component';
import {type ChartPoint, LineChartComponent} from '../line-chart/line-chart.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {StatCardComponent} from '../stat-card/stat-card.component';
import {SkeletonComponent} from './skeleton.component';

const POINTS: ChartPoint[] = [
  {label: 'Aug', value: 1340},
  {label: 'Sep', value: 1360},
  {label: 'Oct', value: 1380},
];
const ROWS = [1, 2, 3];

/**
 * Each skeleton preset beside the component it stands in for, in the same column. The phone
 * conformance suite measures every pair and holds the preset to within 8px of the real thing
 * (`[data-pair]`, `[data-skeleton]`, `[data-loaded]`).
 */
@Component({
  selector: 'cmn-skeleton-geometry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccountAvatarComponent,
    LineChartComponent,
    ListItemRowComponent,
    ListSectionComponent,
    SkeletonComponent,
    StatCardComponent,
  ],
  template: `
    <div class="flex max-w-sm flex-col gap-cmn-6 bg-surface-bg p-cmn-4">
      <div data-pair="stat" class="flex flex-col gap-cmn-2">
        <div data-skeleton><cmn-skeleton shape="stat" /></div>
        <div data-loaded>
          <cmn-stat-card
            [delta]="2.1"
            deltaLabel="+2.1% this month"
            icon="Wallet"
            label="Net worth"
            value="€12,480.00"
          />
        </div>
      </div>
      <div data-pair="chart" class="flex flex-col gap-cmn-2">
        <div data-skeleton><cmn-skeleton shape="chart" /></div>
        <div data-loaded><cmn-line-chart [data]="points" label="Balance" /></div>
      </div>
      <div data-pair="row" class="flex flex-col gap-cmn-2">
        <div data-skeleton>
          <div class="rounded-cmn-md border border-border-default bg-surface-card">
            <cmn-skeleton [count]="3" shape="row" />
          </div>
        </div>
        <div data-loaded>
          <div class="rounded-cmn-md border border-border-default bg-surface-card">
            @for (row of rows; track row) {
              <cmn-list-item-row label="Grocery store" sublabel="Card payment">
                <cmn-account-avatar avatar label="Grocery store" />
                <span amount class="text-cmn-sm tabular-nums text-text-primary">-€12.24</span>
              </cmn-list-item-row>
            }
          </div>
        </div>
      </div>
      <div data-pair="section" class="flex flex-col gap-cmn-2">
        <div data-skeleton><cmn-skeleton shape="section" /></div>
        <div data-loaded>
          <cmn-list-section heading="Today">
            <span cmnListSectionAside class="normal-case tabular-nums">-€36.72</span>
            @for (row of rows; track row) {
              <cmn-list-item-row label="Grocery store" sublabel="Card payment">
                <cmn-account-avatar avatar label="Grocery store" />
                <span amount class="text-cmn-sm tabular-nums text-text-primary">-€12.24</span>
              </cmn-list-item-row>
            }
          </cmn-list-section>
        </div>
      </div>
    </div>
  `,
})
class SkeletonGeometryComponent {
  protected readonly points = POINTS;
  protected readonly rows = ROWS;
}

/**
 * Fixture for the phone conformance suite: the skeleton presets beside the rendered components
 * they copy, and the sweep the Reduce Motion check looks for.
 */
const meta: Meta<SkeletonGeometryComponent> = {
  title: 'Conformance/Skeleton Geometry',
  component: SkeletonGeometryComponent,
  parameters: {layout: 'fullscreen'},
};

export default meta;

export const Geometry: StoryObj<SkeletonGeometryComponent> = {
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};
