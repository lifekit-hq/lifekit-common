import {ChangeDetectionStrategy, Component} from '@angular/core';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import type {PageChromeData} from '../app-layout/page-chrome';
import {ButtonComponent} from '../button/button.component';
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
