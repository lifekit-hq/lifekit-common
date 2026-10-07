import {CdkTrapFocus} from '@angular/cdk/a11y';
import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';

import {BadgeComponent} from '../badge/badge.component';
import {IconComponent} from '../icon/icon.component';
import {type NavItem} from '../sidebar-nav/sidebar-nav.component';

/** Primary tabs a phone bar can hold before the rest moves under "More". */
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

const SHEET_ITEM_BASE_CLASSES =
  'flex w-full items-center gap-cmn-3 rounded-cmn-md px-cmn-3 py-cmn-3 text-left transition-colors ' +
  'focus:outline-none focus-visible:bg-surface-raised';
const SHEET_ITEM_ACTIVE_CLASSES = 'bg-accent-subtle text-accent-default font-semibold';
const SHEET_ITEM_INACTIVE_CLASSES = 'text-text-primary hover:bg-surface-raised';

/**
 * Phone navigation: up to four primary tabs plus a "More" tab that opens the remaining
 * destinations in a bottom sheet. Badges come from `NavItem.badge`, same as the sidebar.
 */
@Component({
  selector: 'cmn-bottom-tab-bar',
  imports: [CdkTrapFocus, BadgeComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tabs().length || moreItems().length) {
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
        @if (moreItems().length) {
          <button
            [class]="tabClass(moreActive() || moreOpen())"
            [attr.aria-current]="moreActive() ? 'page' : null"
            [attr.aria-expanded]="moreOpen()"
            (click)="toggleMore()"
            type="button"
            aria-haspopup="dialog"
          >
            <cmn-badge [dot]="moreHasBadge()" status="error">
              <cmn-icon name="Ellipsis" size="md" aria-hidden="true" />
            </cmn-badge>
            <span
              class="max-w-full shrink-0 truncate font-label text-cmn-xs font-medium leading-tight"
              >More</span
            >
          </button>
        }
      </nav>
    }

    @if (moreOpen()) {
      <div class="fixed inset-0 z-40">
        <div (click)="closeMore()" class="cmn-drawer-backdrop absolute inset-0"></div>
        <div
          (keydown.escape)="closeMore()"
          class="absolute inset-x-0 bottom-0 rounded-t-cmn-lg border-t border-border-default bg-surface-card px-cmn-2 pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-cmn-lg"
          role="dialog"
          aria-modal="true"
          aria-label="More"
          cdkTrapFocus
          cdkTrapFocusAutoCapture
        >
          <!-- Initial focus lands on the title so no item looks preselected on touch -->
          <h2 class="sr-only" tabindex="-1" cdkFocusInitial>More</h2>
          <div class="mx-auto my-cmn-2 h-1 w-10 rounded-cmn-full bg-border-strong"></div>
          <ul class="flex flex-col gap-cmn-1">
            @for (item of moreItems(); track item.route) {
              <li>
                <button
                  [class]="sheetItemClass(isActive(item))"
                  [attr.aria-current]="isActive(item) ? 'page' : null"
                  (click)="selectMore(item)"
                  type="button"
                >
                  <cmn-badge [count]="item.badge ? item.badge() : 0" status="error">
                    <cmn-icon [name]="item.icon" size="md" aria-hidden="true" />
                  </cmn-badge>
                  <span class="truncate font-label text-cmn-sm font-medium">{{ item.label }}</span>
                </button>
              </li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class BottomTabBarComponent {
  /** Primary destinations; anything past the fourth is ignored. */
  public readonly items = input<NavItem[]>([]);
  /** Destinations listed in the "More" sheet; the More tab only renders when there are some. */
  public readonly moreItems = input<NavItem[]>([]);
  public readonly activeRoute = input<string>('');
  /** Floats the bar as an inset, translucent pill instead of docking it edge to edge. */
  public readonly floating = input<boolean>(false);

  public readonly navClick = output<NavItem>();

  public readonly moreOpen = signal<boolean>(false);

  public readonly tabs = computed<NavItem[]>(() => this.items().slice(0, MAX_BOTTOM_TABS));
  public readonly moreActive = computed<boolean>(() =>
    this.moreItems().some(item => this.isActive(item))
  );
  public readonly moreHasBadge = computed<boolean>(() =>
    this.moreItems().some(item => (item.badge ? item.badge() : 0) > 0)
  );

  public readonly navClass = computed<string>(() =>
    this.floating() ? NAV_FLOATING_CLASSES : NAV_DOCKED_CLASSES
  );

  public isActive(item: NavItem): boolean {
    return this.activeRoute() === item.route;
  }

  public toggleMore(): void {
    this.moreOpen.update(open => !open);
  }

  public closeMore(): void {
    this.moreOpen.set(false);
  }

  public selectMore(item: NavItem): void {
    this.closeMore();
    this.navClick.emit(item);
  }

  public tabClass(active: boolean): string {
    const state = active ? TAB_ACTIVE_CLASSES : TAB_INACTIVE_CLASSES;
    if (!this.floating()) {
      return `${TAB_BASE_CLASSES} ${state}`;
    }
    const floatingState = active ? ` ${TAB_FLOATING_ACTIVE_CLASSES}` : '';
    return `${TAB_BASE_CLASSES} ${TAB_FLOATING_CLASSES} ${state}${floatingState}`;
  }

  public sheetItemClass(active: boolean): string {
    return `${SHEET_ITEM_BASE_CLASSES} ${active ? SHEET_ITEM_ACTIVE_CLASSES : SHEET_ITEM_INACTIVE_CLASSES}`;
  }
}
