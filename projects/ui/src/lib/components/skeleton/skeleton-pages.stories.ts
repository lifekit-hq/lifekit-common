import {ChangeDetectionStrategy, Component, input, type OnInit, signal} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {AccountAvatarComponent} from '../account-avatar/account-avatar.component';
import {CardComponent} from '../card/card.component';
import {
  DescriptionItemComponent,
  DescriptionListComponent,
} from '../description-list/description-list.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {ListSectionComponent} from '../list-section/list-section.component';
import {PageComponent, type PageKind} from '../page/page.component';
import {StatCardComponent} from '../stat-card/stat-card.component';
import {SkeletonComponent} from './skeleton.component';

/** The kinds of page a page skeleton preset stands in for. */
export type SkeletonPageKind = 'list' | 'detail' | 'overview' | 'card';

const ROWS = [
  {id: 1, label: 'Boiler service', note: 'Due Friday', amount: '£90.00'},
  {id: 2, label: 'Car insurance', note: 'Due 14 Nov', amount: '£43.68'},
  {id: 3, label: 'Library books', note: 'Alex', amount: '£4.50'},
];
const RELATED = ROWS.slice(0, 2);
const STATS = [
  {label: 'Due this week', value: '7', delta: 1, deltaLabel: '+1 on last week'},
  {label: 'Overdue', value: '2', delta: -1, deltaLabel: '-1 on last week'},
  {label: 'Done', value: '12', delta: 3, deltaLabel: '+3 on last week'},
  {label: 'Shared with you', value: '4', delta: 0, deltaLabel: 'Same as last week'},
];
const CARD_LINES = ['Compare two quotes.', 'Check the discount.', 'Pay by the 14th.'];

/** The page the owner sees for each kind, and the data request that decides which one is drawn. */
const PAGE_OF: Readonly<Record<SkeletonPageKind, PageKind>> = {
  list: 'list',
  detail: 'detail',
  overview: 'overview',
  card: 'list',
};

/**
 * A page that fetches its data (`/api/skeleton-pages/<kind>`) and draws the matching skeleton
 * preset until it arrives. It is the fixture for the page-level skeleton conformance check: the
 * check holds the request, measures the page in its skeleton state, releases it and measures the
 * page again, so each preset is held to the loaded page of its own kind and not just to the
 * components it is drawn from. The loaded blocks are the ones the golden screens use.
 */
@Component({
  selector: 'cmn-skeleton-page-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccountAvatarComponent,
    CardComponent,
    DescriptionItemComponent,
    DescriptionListComponent,
    ListItemRowComponent,
    ListSectionComponent,
    PageComponent,
    SkeletonComponent,
    StatCardComponent,
  ],
  template: `
    <cmn-page [kind]="pageKind()" title="Skeleton page">
      @if (!loaded()) {
        <cmn-skeleton [shape]="kind()" />
      } @else {
        @switch (kind()) {
          @case ('list') {
            <cmn-list-section heading="To do · 3">
              @for (row of rows; track row.id) {
                <cmn-list-item-row [label]="row.label" [sublabel]="row.note">
                  <cmn-account-avatar [label]="row.label" avatar />
                  <span amount class="text-cmn-sm tabular-nums text-text-primary">{{
                    row.amount
                  }}</span>
                </cmn-list-item-row>
              }
            </cmn-list-section>
            <cmn-list-section heading="Done · 3">
              @for (row of rows; track row.id) {
                <cmn-list-item-row [label]="row.label" [sublabel]="row.note">
                  <cmn-account-avatar [label]="row.label" avatar />
                  <span amount class="text-cmn-sm tabular-nums text-text-primary">{{
                    row.amount
                  }}</span>
                </cmn-list-item-row>
              }
            </cmn-list-section>
          }
          @case ('card') {
            <cmn-card>
              <div class="flex flex-col gap-cmn-2">
                <h2 class="text-cmn-md font-semibold text-text-primary">Renewal notes</h2>
                @for (line of cardLines; track line) {
                  <p class="text-cmn-sm text-text-secondary">{{ line }}</p>
                }
              </div>
            </cmn-card>
          }
          @case ('detail') {
            <div class="flex flex-col gap-cmn-group-gap">
              <p class="text-cmn-sm font-medium text-text-secondary">
                Due 14 Nov · Assigned to Sam
              </p>
              <p class="text-cmn-sm text-text-primary">Compare two quotes before renewing.</p>
            </div>
            <cmn-list-section heading="Policy">
              <cmn-description-list class="px-cmn-4">
                <cmn-description-item label="Insurer" value="Northwind Mutual" />
                <cmn-description-item label="Policy number" value="NWM-4471-2290-K" />
                <cmn-description-item label="Renews" value="14 November 2026" />
                <cmn-description-item label="Premium" value="£524.20 a year" />
              </cmn-description-list>
            </cmn-list-section>
            <cmn-list-section heading="Documents · 2">
              @for (row of related; track row.id) {
                <cmn-list-item-row [label]="row.label" [sublabel]="row.note">
                  <cmn-account-avatar [label]="row.label" avatar />
                  <span amount class="text-cmn-sm tabular-nums text-text-primary">{{
                    row.amount
                  }}</span>
                </cmn-list-item-row>
              }
            </cmn-list-section>
          }
          @case ('overview') {
            <div class="grid grid-cols-2 gap-cmn-group-gap md:grid-cols-4">
              @for (stat of stats; track stat.label) {
                <cmn-stat-card
                  [label]="stat.label"
                  [value]="stat.value"
                  [delta]="stat.delta"
                  [deltaLabel]="stat.deltaLabel"
                />
              }
            </div>
            <cmn-list-section heading="Due today · 3">
              @for (row of rows; track row.id) {
                <cmn-list-item-row [label]="row.label" [sublabel]="row.note">
                  <cmn-account-avatar [label]="row.label" avatar />
                  <span amount class="text-cmn-sm tabular-nums text-text-primary">{{
                    row.amount
                  }}</span>
                </cmn-list-item-row>
              }
            </cmn-list-section>
            <cmn-list-section heading="Later this week · 3">
              @for (row of rows; track row.id) {
                <cmn-list-item-row [label]="row.label" [sublabel]="row.note">
                  <cmn-account-avatar [label]="row.label" avatar />
                  <span amount class="text-cmn-sm tabular-nums text-text-primary">{{
                    row.amount
                  }}</span>
                </cmn-list-item-row>
              }
            </cmn-list-section>
          }
        }
      }
    </cmn-page>
  `,
})
class SkeletonPageFixtureComponent implements OnInit {
  public readonly kind = input<SkeletonPageKind>('list');

  protected readonly loaded = signal(false);
  protected readonly rows = ROWS;
  protected readonly related = RELATED;
  protected readonly stats = STATS;
  protected readonly cardLines = CARD_LINES;

  protected pageKind(): PageKind {
    return PAGE_OF[this.kind()];
  }

  public ngOnInit(): void {
    void fetch(`/api/skeleton-pages/${this.kind()}`).then(() => this.loaded.set(true));
  }
}

/**
 * Fixture for the page-level skeleton conformance check (`e2e/phone/skeleton-pages.spec.ts`): one
 * story per page skeleton preset, a `cmn-page` that draws the preset while its data request is
 * pending and the real blocks of that kind of page once it lands. The check fails a preset whose
 * blocks sit more than 8px from the loaded page's, or that draws a block the page lacks.
 */
const meta: Meta<SkeletonPageFixtureComponent> = {
  title: 'Conformance/Skeleton Pages',
  component: SkeletonPageFixtureComponent,
  parameters: {layout: 'fullscreen'},
};

export default meta;

type Story = StoryObj<SkeletonPageFixtureComponent>;

export const List: Story = {args: {kind: 'list'}};
export const Card: Story = {args: {kind: 'card'}};
export const Detail: Story = {args: {kind: 'detail'}};
export const Overview: Story = {args: {kind: 'overview'}};
