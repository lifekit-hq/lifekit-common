import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {BadgeComponent} from '../badge/badge.component';
import {IconComponent} from '../icon/icon.component';
import {type NavItem} from '../sidebar-nav/sidebar-nav.component';

/** Primary tabs a phone bar can hold, besides the "More" tab. */
export const MAX_BOTTOM_TABS = 4;

/**
 * Tabs share the bar equally, but never below their label (`min-w-fit`): a long label widens its
 * tab and the others give way, so no label is ever cut. `min-h` keeps the touch target.
 */
const TAB_BASE_CLASSES =
  'flex min-h-cmn-touch min-w-fit flex-1 flex-col items-center justify-center gap-0.5 px-0.5 ' +
  'transition-colors focus:outline-none focus-visible:bg-surface-raised ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus';
const TAB_DOCKED_CLASSES = 'pb-cmn-1 pt-cmn-2';
const TAB_LABEL_CLASSES = 'whitespace-nowrap font-label text-cmn-xs font-medium leading-tight';
const TAB_FLOATING_CLASSES = 'my-0.5 rounded-cmn-full py-1';
const TAB_ACTIVE_CLASSES = 'text-accent-default';
const TAB_FLOATING_ACTIVE_CLASSES = 'bg-accent-subtle';
const TAB_INACTIVE_CLASSES = 'text-text-secondary hover:text-text-primary';

const NAV_DOCKED_CLASSES =
  'flex border-t border-border-default bg-surface-card pb-[env(safe-area-inset-bottom)]';
/**
 * The iOS tab bar: edge to edge on the bottom edge, 49pt of items and only the bottom safe-area
 * inset below them, no margin. Translucent and blurred so content scrolling under it shows
 * through; the active tab keeps its pill. Keep the 49px (px, so the host root font size cannot
 * shrink it) in step with the shell's measured inset, which pads main to clear the bar.
 */
const NAV_FLOATING_CLASSES =
  'flex h-[calc(49px+env(safe-area-inset-bottom))] border-t border-border-default px-cmn-1 ' +
  'pb-[env(safe-area-inset-bottom)] ' +
  'bg-[color-mix(in_srgb,var(--color-surface-card)_80%,transparent)] backdrop-blur-md';

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
            <span [class]="labelClasses">
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
            <span [class]="labelClasses">
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
  /** Makes the bar translucent and blurred, over the content, instead of an opaque docked bar. */
  public readonly floating = input<boolean>(false);

  public readonly navClick = output<NavItem>();

  public readonly tabs = computed<NavItem[]>(() => this.items().slice(0, MAX_BOTTOM_TABS));
  public readonly moreHasBadge = computed<boolean>(() => (this.more()?.badge?.() ?? 0) > 0);

  public readonly navClass = computed<string>(() =>
    this.floating() ? NAV_FLOATING_CLASSES : NAV_DOCKED_CLASSES
  );

  protected readonly labelClasses = TAB_LABEL_CLASSES;

  public isActive(item: NavItem): boolean {
    return this.activeRoute() === item.route;
  }

  public tabClass(active: boolean): string {
    const state = active ? TAB_ACTIVE_CLASSES : TAB_INACTIVE_CLASSES;
    if (!this.floating()) {
      return `${TAB_BASE_CLASSES} ${TAB_DOCKED_CLASSES} ${state}`;
    }
    const floatingState = active ? ` ${TAB_FLOATING_ACTIVE_CLASSES}` : '';
    return `${TAB_BASE_CLASSES} ${TAB_FLOATING_CLASSES} ${state}${floatingState}`;
  }
}
