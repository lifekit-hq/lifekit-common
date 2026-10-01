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
const TAB_ACTIVE_CLASSES = 'text-accent-default';
const TAB_INACTIVE_CLASSES = 'text-text-secondary hover:text-text-primary';

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
      <nav
        class="flex border-t border-border-default bg-surface-card pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
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
            <span class="max-w-full truncate font-label text-[11px] font-medium leading-tight">
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
            <span class="max-w-full truncate font-label text-[11px] font-medium leading-tight"
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

  public readonly navClick = output<NavItem>();

  public readonly moreOpen = signal<boolean>(false);

  public readonly tabs = computed<NavItem[]>(() => this.items().slice(0, MAX_BOTTOM_TABS));
  public readonly moreActive = computed<boolean>(() =>
    this.moreItems().some(item => this.isActive(item))
  );
  public readonly moreHasBadge = computed<boolean>(() =>
    this.moreItems().some(item => (item.badge ? item.badge() : 0) > 0)
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
    return `${TAB_BASE_CLASSES} ${active ? TAB_ACTIVE_CLASSES : TAB_INACTIVE_CLASSES}`;
  }

  public sheetItemClass(active: boolean): string {
    return `${SHEET_ITEM_BASE_CLASSES} ${active ? SHEET_ITEM_ACTIVE_CLASSES : SHEET_ITEM_INACTIVE_CLASSES}`;
  }
}
