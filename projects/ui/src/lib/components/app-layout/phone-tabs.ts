import {MAX_BOTTOM_TABS} from '../bottom-tab-bar/bottom-tab-bar.component';
import {type NavItem} from '../sidebar-nav/sidebar-nav.component';

/**
 * The nav items the phone tab bar shows: those named in `tabRoutes`, in that order, or the
 * first items when none are named, at most `MAX_BOTTOM_TABS`.
 */
export function phoneTabItems(navItems: NavItem[], tabRoutes: string[] = []): NavItem[] {
  const tabs = tabRoutes.length
    ? tabRoutes.flatMap(route => navItems.filter(item => item.route === route))
    : navItems;
  return tabs.slice(0, MAX_BOTTOM_TABS);
}

/** The nav items that are not phone tabs: the ones the More page lists. */
export function overflowNavItems(navItems: NavItem[], tabRoutes: string[] = []): NavItem[] {
  const tabs = phoneTabItems(navItems, tabRoutes);
  return navItems.filter(item => !tabs.includes(item));
}
