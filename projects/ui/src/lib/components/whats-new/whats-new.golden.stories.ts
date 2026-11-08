import {afterNextRender, ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {applicationConfig, type Meta, type StoryObj} from '@storybook/angular';

import {BadgeComponent} from '../badge/badge.component';
import {ButtonComponent} from '../button/button.component';
import {
  GOLDEN_DESKTOP,
  GOLDEN_PHONE,
  GOLDEN_VIEWPORTS,
  goldenProviders,
  GoldenShellComponent,
} from '../page/golden-screen';
import {PageComponent} from '../page/page.component';
import {SettingRowComponent} from '../setting-row/setting-row.component';
import {SettingsSectionComponent} from '../settings-section/settings-section.component';
import {ToggleComponent} from '../toggle/toggle.component';
import {provideWhatsNew, type WhatsNewStorage} from './whats-new.config';
import {WHATS_NEW_FIXTURE} from './whats-new.fixtures';
import {CmnWhatsNewService} from './whats-new.service';

const SEEN_KEY = 'golden.whatsNew.lastSeen';

/** A device that last opened the sheet at 4.4.2, held in memory so no story leaks into the next. */
function unreadDevice(): WhatsNewStorage {
  const items: Record<string, string> = {[SEEN_KEY]: '4.4.2'};
  return {getItem: key => items[key] ?? null, setItem: (key, value) => void (items[key] = value)};
}

/**
 * The Settings page of a household app, About section last (docs/APP-SHELL-STANDARD.md): the
 * version, and What's new beside it with its dot until the running version has been opened. With
 * `open` on the route the sheet is already up: a bottom sheet on a phone, a side panel from md up.
 */
@Component({
  selector: 'cmn-golden-whats-new-page',
  imports: [
    BadgeComponent,
    ButtonComponent,
    PageComponent,
    SettingRowComponent,
    SettingsSectionComponent,
    ToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-page kind="settings">
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
      <cmn-settings-section heading="About" description="Version and what changed.">
        <cmn-setting-row [description]="whatsNew.version" label="Version">
          <cmn-badge [dot]="whatsNew.hasUnread()" status="error">
            <cmn-button (clicked)="whatsNew.open()" size="sm" variant="secondary">
              What's new
            </cmn-button>
          </cmn-badge>
        </cmn-setting-row>
      </cmn-settings-section>
    </cmn-page>
  `,
})
class WhatsNewPageComponent {
  protected readonly whatsNew = inject(CmnWhatsNewService);

  constructor() {
    const open = inject(ActivatedRoute).snapshot.data['open'] === true;
    afterNextRender(() => {
      if (open) {
        this.whatsNew.open();
      }
    });
  }
}

/**
 * Golden screens for What's new (#268): the reference other lifekit apps copy. Each is the real
 * shell and real components with fake data. `Phone` and `Desktop` have the sheet open on the
 * releases (the dot has just cleared); `*WithBadge` is the page before it is opened, with the dot
 * on What's new. Run the screen check against them at 390 and 1280.
 */
const meta: Meta<GoldenShellComponent> = {
  title: 'Templates/Whats new',
  component: GoldenShellComponent,
  parameters: {layout: 'fullscreen', viewport: {options: GOLDEN_VIEWPORTS}},
  decorators: [
    applicationConfig({
      providers: [
        ...goldenProviders([
          {
            path: 'settings',
            component: WhatsNewPageComponent,
            data: {title: 'Settings', open: true},
          },
          {
            path: 'badge',
            component: WhatsNewPageComponent,
            data: {title: 'Settings'},
          },
        ]),
        provideWhatsNew({
          version: '4.5.0',
          storage: unreadDevice(),
          storageKey: SEEN_KEY,
          load: () => Promise.resolve(WHATS_NEW_FIXTURE),
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

export const PhoneWithBadge: Story = {globals: GOLDEN_PHONE, args: {start: '/badge'}};

export const PhoneWithBadgeDark: Story = {
  globals: {...GOLDEN_PHONE, theme: 'dark'},
  args: {start: '/badge'},
};

export const DesktopWithBadge: Story = {globals: GOLDEN_DESKTOP, args: {start: '/badge'}};

export const DesktopWithBadgeDark: Story = {
  globals: {...GOLDEN_DESKTOP, theme: 'dark'},
  args: {start: '/badge'},
};
