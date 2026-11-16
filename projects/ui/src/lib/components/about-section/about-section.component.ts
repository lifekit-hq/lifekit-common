import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';

import {BadgeComponent} from '../badge/badge.component';
import {ButtonComponent} from '../button/button.component';
import {SettingRowComponent} from '../setting-row/setting-row.component';
import {SettingsSectionComponent} from '../settings-section/settings-section.component';
import {CMN_WHATS_NEW_CONFIG, WHATS_NEW_LABEL} from '../whats-new/whats-new.config';
import {CmnWhatsNewService} from '../whats-new/whats-new.service';

/**
 * The standard About section of a Settings page: a Version row and, when the app has called
 * `provideWhatsNew`, the What's new button beside it, wearing the same dot as the account menu's
 * item until the running version has been opened. The version is the one `provideWhatsNew` was
 * given; `version` overrides it and is all an app without What's new needs.
 *
 * ```html
 * <cmn-about-section />
 * ```
 */
@Component({
  selector: 'cmn-about-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, ButtonComponent, SettingRowComponent, SettingsSectionComponent],
  host: {style: 'display: block'},
  template: `
    <cmn-settings-section heading="About" description="Version and what changed.">
      <cmn-setting-row [description]="shownVersion()" label="Version">
        @if (whatsNew) {
          <cmn-badge [dot]="whatsNew.hasUnread()" status="error">
            <cmn-button (clicked)="whatsNew.open()" size="sm" variant="secondary">{{
              label
            }}</cmn-button>
          </cmn-badge>
        }
      </cmn-setting-row>
    </cmn-settings-section>
  `,
})
export class AboutSectionComponent {
  /** The version to show; defaults to the one given to `provideWhatsNew`. */
  public readonly version = input<string>('');

  protected readonly label = WHATS_NEW_LABEL;
  protected readonly whatsNew = inject(CMN_WHATS_NEW_CONFIG, {optional: true})
    ? inject(CmnWhatsNewService)
    : null;

  protected readonly shownVersion = computed(() => this.version() || this.whatsNew?.version || '');
}
