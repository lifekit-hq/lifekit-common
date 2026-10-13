import {ChangeDetectionStrategy, Component, computed, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import {DangerZoneComponent} from '../danger-zone/danger-zone.component';
import {FormFieldComponent} from '../form-field/form-field.component';
import {InputComponent} from '../input/input.component';
import {PageContainerComponent} from '../page-container/page-container.component';
import {SelectComponent, type SelectOption} from '../select/select.component';
import {SettingRowComponent} from '../setting-row/setting-row.component';
import {ToggleComponent} from '../toggle/toggle.component';
import {SettingsSectionComponent} from './settings-section.component';

const SAVE_DELAY_MS = 600;

const CURRENCIES: SelectOption[] = [
  {label: 'US dollar', value: 'USD'},
  {label: 'Euro', value: 'EUR'},
  {label: 'Ukrainian hryvnia', value: 'UAH'},
];

/**
 * The standard Settings page, in the fixed section order: Account, Appearance, Notifications,
 * app-specific sections, Security / People / admin links, About, then the Danger zone and Sign out.
 * An app includes only the sections that apply to it. Nothing here is app code to copy
 * verbatim; it shows which kit piece carries which kind of setting.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-settings-page',
  imports: [
    ButtonComponent,
    DangerZoneComponent,
    FormFieldComponent,
    FormsModule,
    InputComponent,
    PageContainerComponent,
    SelectComponent,
    SettingRowComponent,
    SettingsSectionComponent,
    ToggleComponent,
  ],
  template: `
    <cmn-page-container maxWidth="max-w-[900px]" spacing="none">
      <p class="mb-cmn-8 text-cmn-sm text-text-secondary">
        Manage your profile, preferences, and security.
      </p>

      <!-- 1. Account: identity, and the one text form, so it carries the per-section Save. -->
      <cmn-settings-section
        [saveDisabled]="!profileDirty()"
        [saving]="profileSaving()"
        (save)="saveProfile()"
        heading="Account"
        description="Your name and contact details."
        saveLabel="Save profile"
      >
        <div class="flex items-center gap-cmn-4">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-default font-bold text-cmn-md text-text-inverse"
            aria-hidden="true"
          >
            {{ initials() }}
          </div>
          <div class="min-w-0">
            <div class="font-label text-cmn-sm font-semibold text-text-primary">
              {{ firstName() }} {{ lastName() }}
            </div>
            <div class="truncate text-cmn-xs text-text-secondary">ada&#64;example.com</div>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-cmn-3 sm:grid-cols-2">
          <cmn-form-field label="First name" fieldId="story-page-first">
            <cmn-input
              [ngModel]="firstName()"
              (ngModelChange)="editName('first', $event)"
              id="story-page-first"
              autocomplete="given-name"
            />
          </cmn-form-field>
          <cmn-form-field label="Last name" fieldId="story-page-last">
            <cmn-input
              [ngModel]="lastName()"
              (ngModelChange)="editName('last', $event)"
              id="story-page-last"
              autocomplete="family-name"
            />
          </cmn-form-field>
        </div>
      </cmn-settings-section>

      <!-- 2. Appearance: the shared cmn-appearance-settings lands here (a later kit piece). -->
      <cmn-settings-section
        heading="Appearance"
        description="Light or dark, and the colour the app takes."
        caption="Synced to your account"
      >
        <div
          class="rounded-cmn-lg border border-dashed border-border-strong p-cmn-5 text-cmn-sm text-text-secondary"
          role="note"
        >
          Placeholder: the shared appearance section (System / Light / Dark and the seed colour)
          drops in here.
        </div>
      </cmn-settings-section>

      <!-- 3. Notifications: toggles apply immediately, so no Save. -->
      <cmn-settings-section
        heading="Notifications"
        description="Control when and how the app alerts you."
      >
        <cmn-setting-row
          label="Push notifications"
          description="A headline on your device when something needs attention. Details stay in the app."
        >
          <cmn-toggle
            [checked]="push()"
            (toggled)="apply('Push notifications', $event ? 'on' : 'off'); push.set($event)"
            label="Push notifications"
          />
        </cmn-setting-row>
        <cmn-setting-row
          label="Email alerts"
          description="Receive a weekly digest and important account notifications."
        >
          <cmn-toggle
            [checked]="emailAlerts()"
            (toggled)="apply('Email alerts', $event ? 'on' : 'off'); emailAlerts.set($event)"
            label="Email alerts"
          />
        </cmn-setting-row>
      </cmn-settings-section>

      <!-- 4. App-specific: the app's own sections, after the shared ones. -->
      <cmn-settings-section
        heading="Preferences"
        description="Display and regional configuration."
        caption="Synced to your account"
      >
        <cmn-setting-row label="Base currency" description="Totals and charts use this currency.">
          <cmn-select
            [ngModel]="currency()"
            [options]="currencies"
            (ngModelChange)="apply('Base currency', $event); currency.set($event)"
            class="block w-44"
          />
        </cmn-setting-row>
      </cmn-settings-section>

      <!-- 5. Security / People / admin links. -->
      <cmn-settings-section
        heading="Security"
        description="Sign-in and who can reach this account."
      >
        <cmn-setting-row
          label="People"
          description="Invite people to this account and revoke access."
        >
          <cmn-button variant="secondary" size="sm" icon="Users">Manage people</cmn-button>
        </cmn-setting-row>
      </cmn-settings-section>

      <!-- 6. About: version and links. -->
      <cmn-settings-section heading="About" description="Version and what changed.">
        <cmn-setting-row label="Version" description="3.3.0">
          <cmn-button variant="secondary" size="sm">What's new</cmn-button>
        </cmn-setting-row>
      </cmn-settings-section>

      <!-- 7. Danger zone, then Sign out. -->
      <cmn-danger-zone
        (confirmed)="apply('Account', 'deleted')"
        description="Permanently delete your account and all associated data. This cannot be undone."
        actionLabel="Delete account"
      />
      <div class="flex justify-end pt-cmn-6 pb-cmn-6">
        <cmn-button (clicked)="apply('Session', 'signed out')" variant="secondary" icon="LogOut"
          >Sign out</cmn-button
        >
      </div>

      <p class="text-cmn-xs text-text-secondary" aria-live="polite">
        Last change: {{ lastChange() }}
      </p>
    </cmn-page-container>
  `,
})
class StorySettingsPageComponent {
  protected readonly currencies = CURRENCIES;

  protected readonly firstName = signal('Ada');
  protected readonly lastName = signal('Lovelace');
  protected readonly profileDirty = signal(false);
  protected readonly profileSaving = signal(false);
  protected readonly push = signal(true);
  protected readonly emailAlerts = signal(false);
  protected readonly currency = signal('USD');
  protected readonly lastChange = signal('none yet');

  protected readonly initials = computed(() =>
    `${this.firstName().charAt(0)}${this.lastName().charAt(0)}`.toUpperCase()
  );

  protected editName(part: 'first' | 'last', value: string): void {
    (part === 'first' ? this.firstName : this.lastName).set(value);
    this.profileDirty.set(true);
  }

  protected saveProfile(): void {
    this.profileSaving.set(true);
    setTimeout(() => {
      this.profileSaving.set(false);
      this.profileDirty.set(false);
      this.apply('Profile', 'saved');
    }, SAVE_DELAY_MS);
  }

  /** Toggles and selects take effect on change; a real app also toasts on a failed save. */
  protected apply(what: string, to: string): void {
    this.lastChange.set(`${what} ${to}`);
  }
}

const meta: Meta<StorySettingsPageComponent> = {
  title: 'Patterns/Settings page',
  component: StorySettingsPageComponent,
  parameters: {layout: 'fullscreen'},
  decorators: [moduleMetadata({imports: [StorySettingsPageComponent]})],
};

export default meta;
type Story = StoryObj<StorySettingsPageComponent>;

/**
 * Immediate apply for toggles and selects (watch "Last change" update at once); the text form in
 * Account keeps a per-section Save that stays disabled until a field is edited.
 */
export const Standard: Story = {
  render: () => ({template: '<cmn-story-settings-page />'}),
};

/** The same page in the phone viewport: each section stacks its heading above its content. */
export const Phone: Story = {
  globals: {viewport: {value: 'mobile2', isRotated: false}},
  render: () => ({template: '<cmn-story-settings-page />'}),
};
