import type {Meta, StoryObj} from '@storybook/angular';

import {ToggleComponent} from './toggle.component';

const meta: Meta<ToggleComponent> = {
  title: 'Components/Toggle',
  component: ToggleComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<ToggleComponent>;

export const Off: Story = {
  args: {checked: false, label: 'Dark mode'},
};

export const On: Story = {
  args: {checked: true, label: 'Dark mode'},
};

export const Disabled: Story = {
  render: () => ({
    template: `
      <div class="flex items-center gap-cmn-4">
        <cmn-toggle [checked]="false" [disabled]="true" label="Disabled, off" />
        <cmn-toggle [checked]="true" [disabled]="true" label="Disabled, on" />
      </div>
    `,
  }),
};

export const InARow: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-sm flex-col gap-cmn-3">
        @for (row of rows; track row.label) {
          <label class="flex items-center justify-between gap-cmn-4">
            <span class="font-label text-cmn-sm text-text-primary">{{ row.label }}</span>
            <cmn-toggle [checked]="row.checked" [label]="row.label" />
          </label>
        }
      </div>
    `,
    props: {
      rows: [
        {label: 'Email alerts', checked: true},
        {label: 'Push notifications', checked: false},
        {label: 'Weekly digest', checked: true},
      ],
    },
  }),
};
