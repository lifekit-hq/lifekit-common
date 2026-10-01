import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {BottomTabBarComponent, MAX_BOTTOM_TABS} from '../bottom-tab-bar/bottom-tab-bar.component';
import {type MenuItem} from '../menu/menu.component';
import {type NavItem, SidebarNavComponent} from '../sidebar-nav/sidebar-nav.component';
import {TopBarComponent} from '../top-bar/top-bar.component';

export {type NavItem} from '../sidebar-nav/sidebar-nav.component';

@Component({
  selector: 'cmn-app-layout',
  imports: [BottomTabBarComponent, SidebarNavComponent, TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen h-dvh overflow-hidden bg-surface-bg">
      <!-- Sidebar from md up; below md the bottom tab bar takes over -->
      <cmn-sidebar-nav
        [items]="navItems()"
        [activeRoute]="activeRoute()"
        [versionLabel]="versionLabel()"
        (navClick)="navClick.emit($event)"
        (collapsedChange)="collapsedChange.emit($event)"
        class="hidden md:block"
      />
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <cmn-top-bar
          [title]="title()"
          [isDark]="isDark()"
          [avatarLabel]="avatarLabel()"
          [avatarMenuItems]="avatarMenuItems()"
          (searchClick)="searchClick.emit()"
          (themeToggle)="themeToggle.emit()"
          (avatarMenuSelect)="avatarMenuSelect.emit($event)"
        />
        <main class="flex-1 overflow-y-auto">
          <ng-content />
        </main>
        <cmn-bottom-tab-bar
          [items]="phoneTabs()"
          [moreItems]="phoneMoreItems()"
          [activeRoute]="activeRoute()"
          (navClick)="navClick.emit($event)"
          class="md:hidden"
        />
      </div>
    </div>
  `,
})
export class AppLayoutComponent {
  public readonly navItems = input<NavItem[]>([]);
  public readonly activeRoute = input<string>('');
  public readonly title = input<string>('');
  public readonly isDark = input<boolean>(false);
  public readonly avatarLabel = input<string>('');
  public readonly avatarMenuItems = input<MenuItem[]>([]);
  public readonly versionLabel = input<string>('');
  /**
   * Routes (from `navItems`) shown as bottom tabs below the md breakpoint, in this order, at
   * most four. Empty means the first four nav items. Every other nav item goes under "More".
   */
  public readonly tabRoutes = input<string[]>([]);

  public readonly navClick = output<NavItem>();
  public readonly collapsedChange = output<boolean>();
  public readonly searchClick = output<void>();
  public readonly themeToggle = output<void>();
  public readonly avatarMenuSelect = output<MenuItem>();

  public readonly phoneTabs = computed<NavItem[]>(() => {
    const items = this.navItems();
    const routes = this.tabRoutes();
    const tabs = routes.length
      ? routes.flatMap(route => items.filter(item => item.route === route))
      : items;
    return tabs.slice(0, MAX_BOTTOM_TABS);
  });

  public readonly phoneMoreItems = computed<NavItem[]>(() => {
    const tabs = this.phoneTabs();
    return this.navItems().filter(item => !tabs.includes(item));
  });
}
