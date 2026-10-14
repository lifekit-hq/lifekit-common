import {type ChipRowOption, LkChipRow} from '@lifekit-hq/elements';

// Imported by name so a bundler cannot tree-shake the customElements.define() call.
if (!customElements.get('lk-chip-row')) {
  customElements.define('lk-chip-row', LkChipRow);
}

import {CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {ChipComponent} from '../chip/chip.component';
import {
  type FilterBarChip,
  FilterBarComponent,
  FilterBarSheetDirective,
} from './filter-bar.component';

const PERIODS: ChipRowOption[] = [
  {value: 'week', label: 'This week'},
  {value: 'month', label: 'This month'},
  {value: 'last-month', label: 'Last month'},
  {value: 'quarter', label: 'Last three months'},
  {value: 'year', label: 'This year'},
];

const CATEGORIES = ['Groceries', 'Transport', 'Dining out', 'Rent', 'Utilities'];

interface StoryState {
  query: string;
  applied: FilterBarChip[];
  categories: string[];
  periods: ChipRowOption[];
  period: string[];
}

/** Story-local filter state, standing in for the page's store. */
function state(applied: FilterBarChip[] = []): StoryState & Record<string, unknown> {
  return {
    query: '',
    applied,
    categories: CATEGORIES,
    periods: PERIODS,
    period: ['month'],
    isOn: function (this: StoryState, category: string): boolean {
      return this.applied.some(chip => chip.id === category);
    },
    toggle: function (this: StoryState, category: string): void {
      this.applied = this.applied.some(chip => chip.id === category)
        ? this.applied.filter(chip => chip.id !== category)
        : [...this.applied, {id: category, label: `Category: ${category}`}];
    },
    drop: function (this: StoryState, id: string): void {
      this.applied = this.applied.filter(chip => chip.id !== id);
    },
    clearAll: function (this: StoryState): void {
      this.applied = [];
    },
    onPeriod: function (this: StoryState, event: Event): void {
      this.period = (event as CustomEvent<{selected: string[]}>).detail.selected;
    },
  };
}

const TEMPLATE = `
  <div class="max-w-xl">
    <cmn-filter-bar
      [(query)]="query"
      [activeCount]="applied.length"
      [applied]="applied"
      (remove)="drop($event)"
      (clear)="clearAll()"
      placeholder="Search transactions"
    >
      <lk-chip-row
        [options]="periods"
        [selected]="period"
        (lk-chip-row-change)="onPeriod($event)"
        cmnFilterBarQuick
        label="Period"
      ></lk-chip-row>
      <ng-template cmnFilterBarSheet let-close="close">
        <div class="flex flex-col gap-cmn-4 p-cmn-4">
          <p class="text-cmn-sm font-medium text-text-primary">Category</p>
          <div class="flex flex-wrap gap-cmn-2">
            @for (category of categories; track category) {
              <cmn-chip [selected]="isOn(category)" (clicked)="toggle(category)">{{ category }}</cmn-chip>
            }
          </div>
          <cmn-button (clicked)="close()">Show results</cmn-button>
        </div>
      </ng-template>
    </cmn-filter-bar>
    <p class="mt-cmn-4 text-cmn-xs text-text-secondary">Query: "{{ query }}"</p>
  </div>
`;

const meta: Meta = {
  title: 'Components/FilterBar',
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [FilterBarComponent, FilterBarSheetDirective, ChipComponent, ButtonComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }),
  ],
  render: () => ({props: state(), template: TEMPLATE}),
};

export default meta;
type Story = StoryObj;

/**
 * Search, the Filters button and a period chip row. The Filters button opens the
 * `cmnFilterBarSheet` template: a bottom sheet on a phone, a side drawer from `md` up. Pick a
 * category there and it shows as a removable chip with a Clear action.
 */
export const Default: Story = {};

/** Filters applied: the Filters button carries their count, and each one is a removable chip. */
export const WithAppliedFilters: Story = {
  render: () => ({
    props: state([
      {id: 'Groceries', label: 'Category: Groceries'},
      {id: 'Dining out', label: 'Category: Dining out'},
    ]),
    template: TEMPLATE,
  }),
};

/** At phone width the search shrinks beside a 44px Filters target; the chip row scrolls. */
export const Phone: Story = {
  ...WithAppliedFilters,
  globals: {viewport: {value: 'mobile2', isRotated: false}},
};
