import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';

import {AccountAvatarComponent} from '../account-avatar/account-avatar.component';
import {type AppLayoutAccount} from '../app-layout/app-layout.component';
import {overflowNavItems} from '../app-layout/phone-tabs';
import {BadgeComponent} from '../badge/badge.component';
import {CardComponent} from '../card/card.component';
import {IconComponent} from '../icon/icon.component';
import {ListItemRowComponent} from '../list-item-row/list-item-row.component';
import {isRouteMenuItem, type MenuItem} from '../menu/menu.component';
import {PageContainerComponent} from '../page-container/page-container.component';
import {type NavItem} from '../sidebar-nav/sidebar-nav.component';

/** A link or a button in a More-page card: an inset focus ring, so the card's clip keeps it. */
const ROW_CLASSES =
  'block w-full border-b border-border-default text-left last:border-b-0 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ' +
  'focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60';

/**
 * The phone's More tab: the nav items that did not fit the tab bar, then the account (identity,
 * the account menu's items, Sign out) and the app version. The app declares it as the `moreRoute`
 * page and binds the same `account` and `navItems` it gives `cmn-app-layout`:
 *
 * ```html
 * <cmn-more-page [items]="navItems" [account]="account()" [versionLabel]="version" (itemSelect)="onAccountItem($event)" />
 * ```
 *
 * It owns no sign-in: a route item (Settings) is a link and every other item is reported by
 * `itemSelect`, like `cmn-app-layout`'s `avatarMenuSelect`, for the app to handle.
 */
@Component({
  selector: 'cmn-more-page',
  imports: [
    AccountAvatarComponent,
    BadgeComponent,
    CardComponent,
    IconComponent,
    ListItemRowComponent,
    PageContainerComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {style: 'display: block'},
  template: `
    <cmn-page-container spacing="none">
      <div class="space-y-cmn-4">
        @if (overflow().length > 0) {
          <cmn-card padding="none" data-more-section="nav">
            @for (item of overflow(); track item.route) {
              <a [routerLink]="item.route" [class]="rowClasses">
                <cmn-list-item-row [label]="item.label">
                  <cmn-badge [count]="item.badge?.() ?? null" avatar status="error">
                    <cmn-icon [name]="item.icon" />
                  </cmn-badge>
                  <cmn-icon meta name="ChevronRight" size="sm" />
                </cmn-list-item-row>
              </a>
            }
          </cmn-card>
        }

        @if (account(); as signedIn) {
          @for (group of groups(); track $index; let first = $first) {
            <cmn-card padding="none" data-more-section="account">
              @if (first && identity(); as who) {
                <div
                  class="flex items-center gap-cmn-3 border-b border-border-default px-cmn-4 py-cmn-3"
                  data-more-identity
                >
                  <cmn-account-avatar [label]="who.avatarLabel" [pictureUrl]="who.pictureUrl" />
                  <div class="min-w-0">
                    <p class="truncate text-cmn-sm font-medium text-text-primary">
                      {{ who.title }}
                    </p>
                    @if (who.subtitle) {
                      <p class="truncate text-cmn-xs text-text-secondary">{{ who.subtitle }}</p>
                    }
                  </div>
                </div>
              }
              @for (item of group; track item.id) {
                @if (isRoute(item) && !item.disabled) {
                  <a [routerLink]="item.id" [class]="rowClasses" (click)="itemSelect.emit(item)">
                    <cmn-list-item-row [label]="item.label">
                      @if (item.icon) {
                        <cmn-icon [name]="item.icon" avatar />
                      }
                      <cmn-icon meta name="ChevronRight" size="sm" />
                    </cmn-list-item-row>
                  </a>
                } @else {
                  <button
                    [class]="rowClasses"
                    [disabled]="item.disabled"
                    (click)="itemSelect.emit(item)"
                    type="button"
                  >
                    <cmn-list-item-row [label]="item.label">
                      @if (item.icon) {
                        <cmn-icon
                          [name]="item.icon"
                          [class.text-status-error]="item.destructive"
                          avatar
                        />
                      }
                    </cmn-list-item-row>
                  </button>
                }
              }
            </cmn-card>
          }
        }

        @if (versionLabel()) {
          <p class="text-center text-cmn-xs text-text-secondary" data-more-version>
            {{ versionLabel() }}
          </p>
        }
      </div>
    </cmn-page-container>
  `,
})
export class MorePageComponent {
  /** The app's nav items; the ones `tabRoutes` leaves out of the tab bar are listed. */
  public readonly items = input<NavItem[]>([]);
  /** The routes shown as phone tabs, as given to `cmn-app-layout`; those are not repeated here. */
  public readonly tabRoutes = input<string[]>([]);
  /** The signed-in account; without it only the nav items and the version show. */
  public readonly account = input<AppLayoutAccount | undefined>(undefined);
  /** Shown as a caption at the end of the page, e.g. `v3.2.0`. */
  public readonly versionLabel = input<string>('');
  /**
   * An account item was selected: a route item (Settings) as it navigates, any other as the app
   * is to handle it (Sign out is `ACCOUNT_SIGN_OUT_ID`).
   */
  public readonly itemSelect = output<MenuItem>();

  protected readonly rowClasses = ROW_CLASSES;

  protected readonly overflow = computed<NavItem[]>(() =>
    overflowNavItems(this.items(), this.tabRoutes())
  );

  /** The account's items in cards: a new card starts at each item that sets `separatorBefore`. */
  protected readonly groups = computed<MenuItem[][]>(() => {
    const groups: MenuItem[][] = [];
    for (const item of this.account()?.menuItems ?? []) {
      const current = groups.at(-1);
      if (current && !item.separatorBefore) {
        current.push(item);
      } else {
        groups.push([item]);
      }
    }
    return groups.length > 0 ? groups : [[]];
  });

  protected readonly identity = computed(() => {
    const account = this.account();
    const name = account?.name?.trim() ?? '';
    const email = account?.email?.trim() ?? '';
    const title = name || email;
    if (!account || !title) {
      return undefined;
    }
    return {
      title,
      subtitle: name && email ? email : undefined,
      pictureUrl: account.pictureUrl,
      avatarLabel: account.label.trim() || title,
    };
  });

  protected isRoute(item: MenuItem): boolean {
    return isRouteMenuItem(item);
  }
}
