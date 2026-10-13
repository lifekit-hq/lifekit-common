import {type MenuItem} from '../menu/menu.component';

/** Id of the standard Sign out item; the app ends the session when `avatarMenuSelect` reports it. */
export const ACCOUNT_SIGN_OUT_ID = '_signOut';

export interface AccountMenuOptions {
  /**
   * Absolute route of the app's Settings page. It becomes the Settings item's id, so the layout
   * and `cmn-more-page` navigate there themselves. Omit it for an app with no settings page.
   */
  settingsRoute?: string;
  /** The app's own items (What's new, Report a problem), between Settings and Sign out. */
  extras?: MenuItem[];
  /** Ends the menu with Sign out, set apart by a divider. Defaults to true. */
  signOut?: boolean;
}

/**
 * The account menu every lifekit app shows, in the same order with the same ids, icons and
 * labels: Settings, the app's extras, then Sign out. Pass it as `AppLayoutAccount.menuItems`.
 * The layout navigates to Settings itself; the app handles `ACCOUNT_SIGN_OUT_ID` and its extras.
 */
export function accountMenu(options: AccountMenuOptions = {}): MenuItem[] {
  const {settingsRoute, extras = [], signOut = true} = options;
  const items: MenuItem[] = [];
  if (settingsRoute) {
    items.push({id: settingsRoute, label: 'Settings', icon: 'Settings2'});
  }
  items.push(...extras);
  if (signOut) {
    items.push({
      id: ACCOUNT_SIGN_OUT_ID,
      label: 'Sign out',
      icon: 'LogOut',
      destructive: true,
      separatorBefore: items.length > 0,
    });
  }
  return items;
}
