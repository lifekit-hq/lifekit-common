import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {BadgeComponent} from '../badge/badge.component';
import {IconComponent} from '../icon/icon.component';
import {type NavItem} from '../sidebar-nav/sidebar-nav.component';

/** Primary tabs a phone bar can hold, besides the "More" tab. */
export const MAX_BOTTOM_TABS = 4;

const TAB_BASE_CLASSES =
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pb-cmn-1 pt-cmn-2 ' +
  'transition-colors focus:outline-none focus-visible:bg-surface-raised';
const TAB_FLOATING_CLASSES = 'my-0.5 rounded-cmn-full';
const TAB_ACTIVE_CLASSES = 'text-accent-default';
const TAB_FLOATING_ACTIVE_CLASSES = 'bg-accent-subtle';
const TAB_INACTIVE_CLASSES = 'text-text-secondary hover:text-text-primary';

const NAV_DOCKED_CLASSES =
  'flex border-t border-border-default bg-surface-card pb-[env(safe-area-inset-bottom)]';
/**
 * Inset pill above the bottom safe-area inset: translucent and blurred so content scrolling
 * under it shows through. Keep its 64px height (px, so the host root font size cannot shrink
 * it) and 8px bottom gap in sync with MAIN_OVERLAY_BOTTOM_CLASSES in app-layout, which pads
 * main to clear it.
 */
const NAV_FLOATING_CLASSES =
  'mx-cmn-3 mb-[calc(env(safe-area-inset-bottom)+8px)] flex h-[64px] rounded-cmn-full border border-border-default px-cmn-1 ' +
  'bg-[color-mix(in_srgb,var(--color-surface-card)_80%,transparent)] shadow-cmn-md backdrop-blur-md';

/**
 * Phone navigation: up to four primary tabs, plus a "More" tab when the app declares a More
 * page. Every tab is a plain destination: More navigates to the page like any other tab, and
 * there is no overflow sheet. Badges come from `NavItem.badge`, same as the sidebar; on More
 * a positive count shows as a dot.
 */
@Component({
  selector: 'cmn-bottom-tab-bar',
  imports: [BadgeComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Chrome is for pressing: a long press on a label selects nothing
  host: {class: 'select-none'},
  template: `
    @if (tabs().length || more()) {
      <nav [class]="navClass()" aria-label="Primary">
        @for (item of tabs(); track item.route) {
          <button
            [class]="tabClass(isActive(item))"
            [attr.aria-current]="isActive(item) ? 'page' : null"
            (click)="navClick.emit(item)"
            type="button"
          >
            <cmn-badge [count]="item.badge ? item.badge() : 0" status="error">
              <cmn-icon [name]="item.icon" size="md" aria-hidden="true" />
            </cmn-badge>
            <span
              class="max-w-full shrink-0 truncate font-label text-cmn-xs font-medium leading-tight"
            >
              {{ item.label }}
            </span>
          </button>
        }
        @if (more(); as moreItem) {
          <button
            [class]="tabClass(isActive(moreItem))"
            [attr.aria-current]="isActive(moreItem) ? 'page' : null"
            (click)="navClick.emit(moreItem)"
            type="button"
          >
            <cmn-badge [dot]="moreHasBadge()" status="error">
              <cmn-icon [name]="moreItem.icon" size="md" aria-hidden="true" />
            </cmn-badge>
            <span
              class="max-w-full shrink-0 truncate font-label text-cmn-xs font-medium leading-tight"
            >
              {{ moreItem.label }}
            </span>
          </button>
        }
      </nav>
    }
  `,
})
export class BottomTabBarComponent {
  /** Primary destinations; anything past the fourth is ignored. */
  public readonly items = input<NavItem[]>([]);
  /**
   * The "More" destination, a page the app declares; rendered as the last tab when set. Its
   * `badge`, when positive, shows as a dot.
   */
  public readonly more = input<NavItem | undefined>(undefined);
  public readonly activeRoute = input<string>('');
  /** Floats the bar as an inset, translucent pill instead of docking it edge to edge. */
  public readonly floating = input<boolean>(false);

  public readonly navClick = output<NavItem>();

  public readonly tabs = computed<NavItem[]>(() => this.items().slice(0, MAX_BOTTOM_TABS));
  public readonly moreHasBadge = computed<boolean>(() => (this.more()?.badge?.() ?? 0) > 0);

  public readonly navClass = computed<string>(() =>
    this.floating() ? NAV_FLOATING_CLASSES : NAV_DOCKED_CLASSES
  );

  public isActive(item: NavItem): boolean {
    return this.activeRoute() === item.route;
  }

  public tabClass(active: boolean): string {
    const state = active ? TAB_ACTIVE_CLASSES : TAB_INACTIVE_CLASSES;
    if (!this.floating()) {
      return `${TAB_BASE_CLASSES} ${state}`;
    }
    const floatingState = active ? ` ${TAB_FLOATING_ACTIVE_CLASSES}` : '';
    return `${TAB_BASE_CLASSES} ${TAB_FLOATING_CLASSES} ${state}${floatingState}`;
  }
}
