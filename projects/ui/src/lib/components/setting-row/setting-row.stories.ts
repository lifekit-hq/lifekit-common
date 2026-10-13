import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {SelectComponent} from '../select/select.component';
import {ToggleComponent} from '../toggle/toggle.component';
import {SettingRowComponent} from './setting-row.component';

const meta: Meta<SettingRowComponent> = {
  title: 'Components/SettingRow',
  component: SettingRowComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({imports: [ButtonComponent, SelectComponent, ToggleComponent]})],
  argTypes: {
    label: {control: 'text'},
    description: {control: 'text'},
  },
};

export default meta;
type Story = StoryObj<SettingRowComponent>;

export const ToggleRow: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="max-w-xl">
        <cmn-setting-row [label]="label" [description]="description">
          <cmn-toggle [checked]="true" [label]="label" />
        </cmn-setting-row>
      </div>
    `,
  }),
  args: {
    label: 'Email alerts',
    description: 'Receive a weekly digest and important account notifications.',
  },
};

export const SelectRow: Story = {
  render: args => ({
    props: {
      ...args,
      options: [
        {label: 'US dollar', value: 'USD'},
        {label: 'Euro', value: 'EUR'},
        {label: 'Ukrainian hryvnia', value: 'UAH'},
      ],
    },
    template: `
      <div class="max-w-xl">
        <cmn-setting-row [label]="label" [description]="description">
          <cmn-select [options]="options" class="block w-40" />
        </cmn-setting-row>
      </div>
    `,
  }),
  args: {
    label: 'Base currency',
    description: 'Totals and charts are shown in this currency.',
  },
};

export const ButtonRow: Story = {
  render: args => ({
    props: args,
    template: `
      <div class="max-w-xl">
        <cmn-setting-row [label]="label" [description]="description">
          <cmn-button variant="secondary" size="sm">Manage</cmn-button>
        </cmn-setting-row>
      </div>
    `,
  }),
  args: {
    label: 'People',
    description: 'Invite people to this account and revoke access.',
  },
};

export const LabelOnly: Story = {
  render: () => ({
    template: `
      <div class="max-w-xl">
        <cmn-setting-row label="Push notifications">
          <cmn-toggle [checked]="false" label="Push notifications" />
        </cmn-setting-row>
      </div>
    `,
  }),
};

/** A long description wraps in its own column and never pushes the control off the row. */
export const LongDescription: Story = {
  render: () => ({
    template: `
      <div class="max-w-sm">
        <cmn-setting-row
          label="Watchlist analyst alerts"
          description="Also alert on analyst upgrades and downgrades for watchlist names. Held names always alert, whatever this is set to."
        >
          <cmn-toggle [checked]="true" label="Watchlist analyst alerts" />
        </cmn-setting-row>
      </div>
    `,
  }),
};

export const Stack: Story = {
  render: () => ({
    template: `
      <div class="max-w-xl space-y-cmn-5">
        <cmn-setting-row label="Email alerts" description="Weekly digest.">
          <cmn-toggle [checked]="true" label="Email alerts" />
        </cmn-setting-row>
        <cmn-setting-row label="Low balance warnings" description="When an account drops below your threshold.">
          <cmn-toggle [checked]="false" label="Low balance warnings" />
        </cmn-setting-row>
        <cmn-setting-row label="Language">
          <cmn-select [options]="[{label: 'English', value: 'en'}, {label: 'Ukrainian', value: 'uk'}]" class="block w-40" />
        </cmn-setting-row>
      </div>
    `,
  }),
};
