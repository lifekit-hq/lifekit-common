import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {ButtonComponent} from '../button/button.component';
import {SettingRowComponent} from '../setting-row/setting-row.component';
import {SettingsSectionComponent} from '../settings-section/settings-section.component';

/**
 * The standard Session section of a Settings page: one "Sign out of {app}" row with a secondary
 * Sign out button. It owns no sign-in; the app handles `signOut`, as it does the account menu's
 * Sign out item.
 *
 * ```html
 * <cmn-session-section appName="Lifekit" (signOut)="auth.signOut()" />
 * ```
 */
@Component({
  selector: 'cmn-session-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, SettingRowComponent, SettingsSectionComponent],
  host: {style: 'display: block'},
  template: `
    <cmn-settings-section heading="Session" description="End your sign-in on this device.">
      <cmn-setting-row [label]="label()">
        <cmn-button (clicked)="signOut.emit()" icon="LogOut" size="sm" variant="secondary"
          >Sign out</cmn-button
        >
      </cmn-setting-row>
    </cmn-settings-section>
  `,
})
export class SessionSectionComponent {
  /** The product name in the row label: "Sign out of Lifekit". Omitted, the row reads "Sign out". */
  public readonly appName = input<string>('');

  public readonly signOut = output<void>();

  protected readonly label = computed(() =>
    this.appName() ? `Sign out of ${this.appName()}` : 'Sign out'
  );
}
