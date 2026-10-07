import {ChangeDetectionStrategy, Component} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {RelativeTimePipe} from './relative-time.pipe';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const NOW = Date.now();

@Component({
  selector: 'cmn-relative-time-showcase',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RelativeTimePipe],
  template: `
    <dl class="flex flex-col gap-cmn-2 p-cmn-6 bg-surface-bg">
      @for (row of rows; track row.label) {
        <div class="flex gap-cmn-4">
          <dt class="w-40 text-text-secondary">{{ row.label }}</dt>
          <dd>{{ row.value | cmnRelativeTime: '—' }}</dd>
        </div>
      }
    </dl>
  `,
})
class RelativeTimeShowcaseComponent {
  protected readonly rows: {label: string; value: Date | string | number | null | undefined}[] = [
    {label: 'Just now', value: new Date(NOW - MS_PER_MINUTE / 2)},
    {label: '5 minutes (Date)', value: new Date(NOW - 5 * MS_PER_MINUTE)},
    {label: '3 hours (ISO string)', value: new Date(NOW - 3 * MS_PER_HOUR).toISOString()},
    {label: '2 days (epoch ms)', value: NOW - 2 * MS_PER_DAY},
    {label: '3 weeks', value: new Date(NOW - 21 * MS_PER_DAY)},
    {label: 'null → fallback', value: null},
    {label: 'undefined → fallback', value: undefined},
    {label: 'invalid → fallback', value: 'not a date'},
  ];
}

const meta: Meta = {
  title: 'Pipes/RelativeTime',
  component: RelativeTimeShowcaseComponent,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllInputs: Story = {};
