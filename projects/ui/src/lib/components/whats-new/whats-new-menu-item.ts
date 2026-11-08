import {type MenuItem} from '../menu/menu.component';
import {WHATS_NEW_LABEL} from './whats-new.config';

/** Id of the What's new account-menu item; the app opens the sheet when the menu reports it. */
export const WHATS_NEW_MENU_ID = '_whatsNew';

/**
 * The What's new item for the account menu (`accountMenu({extras: [...]})`), carrying the unread
 * badge while the running version has not been opened. Rebuild it from `hasUnread()` so the dot
 * clears when the sheet opens:
 *
 * ```ts
 * menuItems = computed(() => accountMenu({settingsRoute: '/settings', extras: [whatsNewMenuItem(whatsNew.hasUnread())]}));
 * ```
 */
export function whatsNewMenuItem(unread: boolean): MenuItem {
  return {id: WHATS_NEW_MENU_ID, label: WHATS_NEW_LABEL, icon: 'Megaphone', dot: unread};
}
