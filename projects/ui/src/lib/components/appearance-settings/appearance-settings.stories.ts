import {signal} from '@angular/core';
import {APP_SEEDS} from '@lifekit-hq/tokens/engine';
import {type Meta, moduleMetadata, type StoryObj} from '@storybook/angular';

import {APPEARANCE_STORE, type AppearanceStore} from '../../services/appearance/appearance.service';
import {SettingsSectionComponent} from '../settings-section/settings-section.component';
import {AppearanceSettingsComponent} from './appearance-settings.component';

/** Stands in for an app's `accountPreferencesStore`: it keeps the saved appearance in memory. */
function fakeAccountStore(): AppearanceStore {
  const appearance = signal<{theme: 'system' | 'light' | 'dark'} | null>(null);
  return {
    appearance: appearance as AppearanceStore['appearance'],
    patch: partial => {
      appearance.set(partial.appearance as never);
      return Promise.resolve(true);
    },
  };
}

const meta: Meta<AppearanceSettingsComponent> = {
  title: 'Components/AppearanceSettings',
  component: AppearanceSettingsComponent,
  tags: ['autodocs'],
  args: {appSeed: APP_SEEDS.fs.seed},
  parameters: {layout: 'padded'},
};

export default meta;
type Story = StoryObj<AppearanceSettingsComponent>;

/** The app has an account preferences store: the caption says the choice is synced. */
export const SyncedToAccount: Story = {
  decorators: [
    moduleMetadata({providers: [{provide: APPEARANCE_STORE, useFactory: fakeAccountStore}]}),
  ],
};

/** No preferences endpoint: the choice is kept in this browser only, and the caption says so. */
export const DeviceOnly: Story = {};

/** The way an app places it: the body of the standard Appearance section. */
export const InASettingsSection: Story = {
  decorators: [
    moduleMetadata({
      imports: [SettingsSectionComponent],
      providers: [{provide: APPEARANCE_STORE, useFactory: fakeAccountStore}],
    }),
  ],
  render: args => ({
    props: args,
    template: `
      <div class="max-w-[900px]">
        <cmn-settings-section
          heading="Appearance"
          description="Light or dark, and the colour the app takes."
        >
          <cmn-appearance-settings [appSeed]="appSeed" />
        </cmn-settings-section>
      </div>
    `,
  }),
};
