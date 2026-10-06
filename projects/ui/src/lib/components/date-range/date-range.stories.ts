import {FormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {DateRangeComponent} from './date-range.component';

const meta: Meta = {
  title: 'Components/DateRange',
  component: DateRangeComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [FormsModule]})],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => ({
    props: {range: {from: null, to: null}},
    template: `
      <div class="w-96">
        <cmn-date-range [(ngModel)]="range" />
        <p class="mt-2 text-cmn-sm text-text-secondary">{{ range | json }}</p>
      </div>
    `,
  }),
};

export const Prefilled: Story = {
  render: () => ({
    props: {range: {from: '2026-01-01', to: '2026-01-31'}},
    template: '<div class="w-96"><cmn-date-range [(ngModel)]="range" /></div>',
  }),
};

export const InvertedRange: Story = {
  render: () => ({
    props: {range: {from: '2026-03-10', to: '2026-03-01'}},
    template: '<div class="w-96"><cmn-date-range [(ngModel)]="range" /></div>',
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: {range: {from: '2026-01-01', to: null}},
    template: '<div class="w-96"><cmn-date-range [(ngModel)]="range" [disabled]="true" /></div>',
  }),
};
