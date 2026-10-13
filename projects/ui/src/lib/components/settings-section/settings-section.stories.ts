import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {FormFieldComponent} from '../form-field/form-field.component';
import {InputComponent} from '../input/input.component';
import {SettingRowComponent} from '../setting-row/setting-row.component';
import {ToggleComponent} from '../toggle/toggle.component';
import {SettingsSectionComponent} from './settings-section.component';

const meta: Meta<SettingsSectionComponent> = {
  title: 'Components/SettingsSection',
  component: SettingsSectionComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        ButtonComponent,
        FormFieldComponent,
        InputComponent,
        SettingRowComponent,
        ToggleComponent,
      ],
    }),
  ],
  argTypes: {
    saveLabel: {control: 'text'},
    saveDisabled: {control: 'boolean'},
    saving: {control: 'boolean'},
  },
};

export default meta;
type Story = StoryObj<SettingsSectionComponent>;

/** Heading and description on the left at md and up; the projected content on the right. */
export const Default: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-settings-section [heading]="heading" [description]="description" [caption]="caption">
        <cmn-setting-row label="Email alerts" description="Weekly digest and account notices.">
          <cmn-toggle [checked]="true" label="Email alerts" />
        </cmn-setting-row>
        <cmn-setting-row label="Sync failure alerts" description="When a provider fails to sync for a day.">
          <cmn-toggle [checked]="false" label="Sync failure alerts" />
        </cmn-setting-row>
      </cmn-settings-section>
    `,
  }),
  args: {
    heading: 'Notifications',
    description: 'Control when and how the app alerts you.',
    caption: '',
  },
};

/** The caption says where the values live, so every tier is labelled the same way. */
export const WithCaption: Story = {
  ...Default,
  args: {
    heading: 'Appearance',
    description: 'Light or dark, and the colour the app takes.',
    caption: 'Synced to your account',
  },
};

/** A text form keeps one explicit Save per section (immediate apply is for toggles and selects). */
export const WithSave: Story = {
  render: args => ({
    props: args,
    template: `
      <cmn-settings-section
        [heading]="heading"
        [description]="description"
        [saveLabel]="saveLabel"
        [saveDisabled]="saveDisabled"
        [saving]="saving"
      >
        <cmn-form-field label="First name" fieldId="story-first">
          <cmn-input id="story-first" autocomplete="given-name" />
        </cmn-form-field>
        <cmn-form-field label="Last name" fieldId="story-last">
          <cmn-input id="story-last" autocomplete="family-name" />
        </cmn-form-field>
      </cmn-settings-section>
    `,
  }),
  args: {
    heading: 'Profile',
    description: 'Your name as it appears across the app.',
    saveLabel: 'Save profile',
    saveDisabled: false,
    saving: false,
  },
};

export const Saving: Story = {
  ...WithSave,
  args: {...WithSave.args, saving: true},
};

export const SaveDisabledUntilDirty: Story = {
  ...WithSave,
  args: {...WithSave.args, saveDisabled: true},
};

/** Sections stack with their own divider; the last one drops it. */
export const Stacked: Story = {
  render: () => ({
    template: `
      <div class="max-w-[900px]">
        <cmn-settings-section heading="Preferences" description="Display and regional settings.">
          <cmn-setting-row label="Compact tables">
            <cmn-toggle [checked]="false" label="Compact tables" />
          </cmn-setting-row>
        </cmn-settings-section>
        <cmn-settings-section heading="Notifications" description="When the app alerts you.">
          <cmn-setting-row label="Push notifications">
            <cmn-toggle [checked]="true" label="Push notifications" />
          </cmn-setting-row>
        </cmn-settings-section>
        <cmn-settings-section heading="About" description="Version and links.">
          <p class="text-cmn-sm text-text-primary">Version 3.3.0</p>
        </cmn-settings-section>
      </div>
    `,
  }),
};
