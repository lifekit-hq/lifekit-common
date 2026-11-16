import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {AboutSectionComponent} from '../about-section/about-section.component';
import {AccountSectionComponent} from '../account-section/account-section.component';
import {AppearanceSettingsComponent} from '../appearance-settings/appearance-settings.component';
import {ButtonComponent} from '../button/button.component';
import {DangerZoneComponent} from '../danger-zone/danger-zone.component';
import {SelectComponent, type SelectOption} from '../select/select.component';
import {SessionSectionComponent} from '../session-section/session-section.component';
import {SettingRowComponent} from '../setting-row/setting-row.component';
import {SettingsSectionComponent} from '../settings-section/settings-section.component';
import {ToggleComponent} from '../toggle/toggle.component';
import {provideWhatsNew} from '../whats-new/whats-new.config';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
  GoldenShellComponent,
} from './golden-screen';
import {PageComponent} from './page.component';

const WEEK_STARTS: readonly SelectOption[] = [
  {label: 'Monday', value: 'monday'},
  {label: 'Sunday', value: 'sunday'},
];

/**
 * The golden settings screen: the standard Settings page on the settings template, built only from
 * library parts, in the fixed section order (Account, Appearance, Notifications, the app's own
 * section, About, then the Danger zone and the Session section). Each section's heading sits beside its
 * controls from md up and above them on a phone; the template sets the rhythm between sections.
 */
@Component({
  selector: 'cmn-golden-settings-page',
  imports: [
    AboutSectionComponent,
    AccountSectionComponent,
    AppearanceSettingsComponent,
    ButtonComponent,
    DangerZoneComponent,
    FormsModule,
    PageComponent,
    SelectComponent,
    SessionSectionComponent,
    SettingRowComponent,
    SettingsSectionComponent,
    ToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="settings">
      <cmn-account-section [account]="account" caption="Signed in through the Lifekit gate" />
      <cmn-settings-section
        heading="Appearance"
        description="Light or dark, and the colour the app takes."
      >
        <cmn-appearance-settings appSeed="#175a6d" />
      </cmn-settings-section>
      <cmn-settings-section
        heading="Notifications"
        description="When the app tells you about a task."
      >
        <cmn-setting-row
          label="Due-date reminders"
          description="A notification at 9:00 the day before a task is due."
        >
          <cmn-toggle [checked]="true" label="Due-date reminders" />
        </cmn-setting-row>
        <cmn-setting-row
          label="Weekly summary"
          description="An email on Sunday evening with the week ahead."
        >
          <cmn-toggle label="Weekly summary" />
        </cmn-setting-row>
      </cmn-settings-section>
      <cmn-settings-section
        heading="Household"
        description="Shared by everyone in the Morgan household."
        caption="Synced to your account"
      >
        <cmn-setting-row label="Week starts on" description="For the calendar and due dates.">
          <cmn-select
            [ngModel]="'monday'"
            [options]="weekStarts"
            aria-label="Week starts on"
            class="block w-44"
          />
        </cmn-setting-row>
        <cmn-setting-row label="People" description="Alex and Sam. Invite someone or remove them.">
          <cmn-button variant="secondary" size="sm" icon="Users">Manage people</cmn-button>
        </cmn-setting-row>
      </cmn-settings-section>
      <cmn-about-section />
      <cmn-danger-zone
        description="Leave the Morgan household. Your tasks stay with the household; you lose access to them."
        actionLabel="Leave household"
        heading="Leave household"
      />
      <cmn-session-section appName="Lifekit" />
    </cmn-page>
  `,
})
class SettingsPageComponent {
  protected readonly account = {name: 'Alex Morgan', email: 'alex@example.com'};
  protected readonly weekStarts = WEEK_STARTS;
}

/**
 * Golden screens for the settings template: the reference other lifekit apps copy and the owner
 * approves once. Each is the real shell and real components; run the screen check
 * (`lifekit-chrome-check screen`, docs/SCREEN-CHECK.md) against them at 390 and 1280.
 */
const meta: Meta<GoldenShellComponent> = {
  title: 'Templates/Settings',
  component: GoldenShellComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: [
        ...goldenProviders([
          {path: 'settings', component: SettingsPageComponent, data: {title: 'Settings'}},
        ]),
        provideWhatsNew({
          version: '4.4.0',
          storage: {getItem: () => '4.4.0', setItem: () => undefined},
        }),
      ],
    }),
  ],
  args: {start: '/settings', notice: false},
};

export default meta;
type Story = StoryObj<GoldenShellComponent>;

export const Phone: Story = {globals: GOLDEN_PHONE};

export const PhoneDark: Story = {globals: {...GOLDEN_PHONE, theme: 'dark'}};

export const Desktop: Story = {globals: GOLDEN_DESKTOP};

export const DesktopDark: Story = {globals: {...GOLDEN_DESKTOP, theme: 'dark'}};
