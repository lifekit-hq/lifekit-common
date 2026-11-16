import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

import {type AppLayoutAccount} from '../app-layout/app-layout.component';
import {SettingRowComponent} from '../setting-row/setting-row.component';
import {SettingsSectionComponent} from '../settings-section/settings-section.component';

/**
 * The standard Account section of a Settings page for an app whose identity comes from a gateway:
 * the signed-in person's name and email, read-only. Bind the same `account` the app gives
 * `cmn-app-layout`:
 *
 * ```html
 * <cmn-account-section [account]="account()" caption="Signed in through the Lifekit gate" />
 * ```
 *
 * The Name row is left out when there is no name or it only repeats the email. Without an account
 * (or one with neither field) the section says "Not signed in". An app that owns an editable
 * profile composes `cmn-settings-section` with its own form instead.
 */
@Component({
  selector: 'cmn-account-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SettingRowComponent, SettingsSectionComponent],
  host: {style: 'display: block'},
  template: `
    <cmn-settings-section
      [caption]="caption()"
      heading="Account"
      description="Who you are signed in as."
    >
      @if (name(); as value) {
        <cmn-setting-row label="Name">
          <span class="text-cmn-sm text-text-primary" data-account-name>{{ value }}</span>
        </cmn-setting-row>
      }
      @if (email(); as value) {
        <cmn-setting-row label="Email">
          <span class="text-cmn-sm text-text-primary" data-account-email>{{ value }}</span>
        </cmn-setting-row>
      }
      @if (!name() && !email()) {
        <p class="text-cmn-sm text-text-secondary" data-account-empty>Not signed in</p>
      }
    </cmn-settings-section>
  `,
})
export class AccountSectionComponent {
  private readonly trimmedEmail = computed(() => this.account()?.email?.trim() ?? '');

  /** The signed-in account, as given to `cmn-app-layout`; only its name and email are shown. */
  public readonly account = input<Pick<AppLayoutAccount, 'name' | 'email'> | undefined>(undefined);
  /** Where the identity comes from, e.g. "Signed in through the Lifekit gate". */
  public readonly caption = input<string>('');

  protected readonly email = this.trimmedEmail;
  protected readonly name = computed(() => {
    const name = this.account()?.name?.trim() ?? '';
    return name === this.trimmedEmail() ? '' : name;
  });
}
