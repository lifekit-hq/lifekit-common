import {ChangeDetectionStrategy, Component} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {BottomTabBarComponent} from '../components/bottom-tab-bar/bottom-tab-bar.component';
import {type NavItem, SidebarNavComponent} from '../components/sidebar-nav/sidebar-nav.component';
import {TopBarComponent} from '../components/top-bar/top-bar.component';

const NAV_ITEMS: NavItem[] = [
  {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
  {label: 'Accounts', icon: 'Building2', route: '/accounts'},
  {label: 'Transactions', icon: 'ArrowLeftRight', route: '/transactions'},
  {label: 'Holdings', icon: 'ChartBar', route: '/holdings'},
  {label: 'Settings', icon: 'Settings', route: '/settings'},
];

const TAB_ITEMS: NavItem[] = NAV_ITEMS.slice(0, 4);
const MORE: NavItem = {label: 'More', icon: 'Ellipsis', route: '/more'};

/**
 * The golden shell screen: the desktop chrome of Carbon step 4 (epic #279) drawn once, so a change
 * to a token or to the sidebar, the top bar or the tab bar moves a pixel here. Not an app screen
 * (`cmn-app-layout` is `fixed` to the window), so it lays the pieces side by side the way Carbon's
 * UI Shell page does: the 48px header over a 256px side nav, the same side nav as its 48px rail,
 * and the phone's tab bar, which keeps its structure and takes Carbon's square geometry. Hover and
 * focus cannot be reached by a still page; `e2e/screens/shell.spec.ts` forces them on the controls
 * inside a frame marked `data-shell-states`. Only fake data.
 */
@Component({
  selector: 'cmn-shell-golden',
  imports: [BottomTabBarComponent, SidebarNavComponent, TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block bg-surface-bg p-cmn-4 md:p-cmn-8'},
  template: `
    <div class="mx-auto flex max-w-[75rem] flex-col gap-cmn-8" data-shell-golden>
      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-expanded">
        <h2 id="g-expanded" class="text-cmn-lg font-semibold text-text-primary">
          Header and side nav
        </h2>
        <div class="overflow-x-auto">
          <div
            class="flex h-[24rem] w-[60rem] border border-border-default bg-surface-bg"
            data-shell-states
          >
            <cmn-sidebar-nav
              [items]="items"
              [versionDot]="true"
              class="block"
              activeRoute="/accounts"
              brand="Lifekit"
              versionLabel="v4.5.0"
            />
            <div class="flex min-w-0 flex-1 flex-col">
              <cmn-top-bar
                [isDark]="false"
                [actions]="[{id: 'add', label: 'Add account', icon: 'Plus'}]"
                avatarLabel="AL"
                title="Accounts"
              />
              <p class="p-cmn-6 text-cmn-sm text-text-secondary">
                The header is 48px; the side nav is 256px, 32px links on a 16px inset, the selected
                link filled with a 3px bar on its leading edge.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-rail">
        <h2 id="g-rail" class="text-cmn-lg font-semibold text-text-primary">Rail</h2>
        <div class="overflow-x-auto">
          <div class="flex h-[16rem] w-[60rem] border border-border-default bg-surface-bg">
            <cmn-sidebar-nav [items]="items" [rail]="true" class="block" activeRoute="/holdings" />
            <div class="flex min-w-0 flex-1 flex-col">
              <cmn-top-bar [isDark]="true" avatarLabel="AL" title="Holdings" />
            </div>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-cmn-3" aria-labelledby="g-phone">
        <h2 id="g-phone" class="text-cmn-lg font-semibold text-text-primary">Phone tab bar</h2>
        <div class="grid items-start gap-cmn-4 md:grid-cols-2">
          <div class="max-w-[24rem] border border-border-default">
            <cmn-bottom-tab-bar [items]="tabs" [more]="more" activeRoute="/accounts" />
          </div>
          <div class="max-w-[24rem] border border-border-default">
            <cmn-bottom-tab-bar
              [floating]="true"
              [items]="tabs"
              [more]="more"
              activeRoute="/accounts"
            />
          </div>
        </div>
      </section>
    </div>
  `,
})
class ShellGoldenComponent {
  protected readonly items = NAV_ITEMS;
  protected readonly tabs = TAB_ITEMS;
  protected readonly more = MORE;
}

const meta: Meta<ShellGoldenComponent> = {
  title: 'Shell/Golden',
  component: ShellGoldenComponent,
  parameters: {layout: 'fullscreen'},
};

export default meta;
type Story = StoryObj<ShellGoldenComponent>;

/** The header, the side nav and its rail, and the phone tab bar, once. */
export const Matrix: Story = {};
