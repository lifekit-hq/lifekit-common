import {NgClass} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';

import {isOutputObserved} from '../../chart-click/output-observed';
import {BadgeComponent} from '../badge/badge.component';
import {IconComponent, LucideIconName} from '../icon/icon.component';

export interface NavItem {
  label: string;
  icon: LucideIconName;
  route: string;
  badge?: () => number;
}

const HEADER_BASE_CLASSES =
  'flex h-cmn-size-lg shrink-0 items-center border-b border-border-default';
const NAV_LINK_CLASSES =
  'flex min-h-cmn-touch w-full items-center gap-cmn-4 px-cmn-4 text-left transition-colors md:min-h-cmn-size-sm ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus';

@Component({
  selector: 'cmn-sidebar-nav',
  imports: [NgClass, IconComponent, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Chrome is for pressing: a long press on a label selects nothing
  host: {class: 'select-none'},
  template: `
    <aside
      [ngClass]="[
        'flex flex-col h-full border-r border-border-default bg-surface-card',
        isCollapsed() ? 'w-cmn-nav-rail' : 'w-cmn-nav',
      ]"
    >
      <!-- Logo / toggle: the header's height, so the two read as one band -->
      <div [ngClass]="headerClass()">
        @if (!isCollapsed()) {
          <span class="font-headline text-cmn-sm font-semibold text-text-primary tracking-tight">
            {{ brand() }}
          </span>
        }
        @if (!rail()) {
          <button
            [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            [attr.aria-expanded]="!collapsed()"
            (click)="toggleCollapsed()"
            type="button"
            class="ml-auto flex h-cmn-size-lg w-cmn-size-lg shrink-0 items-center justify-center text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
          >
            <cmn-icon [name]="collapsed() ? 'PanelLeftOpen' : 'PanelLeftClose'" size="sm" />
          </button>
        }
      </div>

      <!-- Nav items -->
      <nav class="flex flex-1 flex-col">
        @for (item of items(); track item.route) {
          <button
            [ngClass]="navItemClass(item)"
            [title]="isCollapsed() ? item.label : ''"
            [attr.aria-current]="activeRoute() === item.route ? 'page' : null"
            (click)="navClick.emit(item)"
            type="button"
          >
            <cmn-badge class="flex" [count]="item.badge ? item.badge() : 0" status="error">
              <cmn-icon [name]="item.icon" size="sm" />
            </cmn-badge>
            @if (!isCollapsed()) {
              <span class="truncate font-label text-cmn-sm">{{ item.label }}</span>
            }
          </button>
        }
      </nav>

      <!-- Version footer: a button while the app listens for versionClick, static text otherwise -->
      @if (versionLabel()) {
        @if (clickable()) {
          <button
            [title]="isCollapsed() ? versionLabel() : ''"
            [attr.aria-label]="isCollapsed() ? collapsedVersionName() : null"
            (click)="versionClick.emit()"
            type="button"
            class="flex w-full items-center gap-cmn-2 border-t border-border-default px-cmn-4 py-cmn-2 text-left text-cmn-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus transition-colors"
          >
            @if (!isCollapsed()) {
              <span class="truncate">{{ versionLabel() }}</span>
              @if (versionDot()) {
                <cmn-badge [dot]="true" [standalone]="true" status="error" />
                <span class="sr-only">(new)</span>
              }
            } @else {
              <cmn-badge [dot]="versionDot()" status="error">
                <cmn-icon name="Info" size="sm" />
              </cmn-badge>
            }
          </button>
        } @else {
          <div
            [title]="isCollapsed() ? versionLabel() : ''"
            class="border-t border-border-default px-cmn-4 py-cmn-2 text-cmn-xs text-text-secondary"
          >
            @if (!isCollapsed()) {
              {{ versionLabel() }}
            } @else {
              <cmn-icon name="Info" size="sm" />
            }
          </div>
        }
      }
    </aside>
  `,
})
export class SidebarNavComponent {
  public readonly items = input<NavItem[]>([]);
  public readonly activeRoute = input<string>('');
  public readonly versionLabel = input<string>('');
  /** Marks the version footer with a dot, e.g. while there is something new to read. Only shown while the footer is a button. */
  public readonly versionDot = input<boolean>(false);
  /**
   * Whether the version footer is a button. Left unset, it is one exactly when the host template
   * listens to `versionClick`; a wrapper that always forwards the output passes its own answer.
   */
  public readonly versionClickable = input<boolean | undefined>(undefined);
  /** Product name shown in the sidebar header while expanded. */
  public readonly brand = input<string>('Lifekit');

  public readonly navClick = output<NavItem>();
  public readonly collapsedChange = output<boolean>();
  /** The version footer was pressed. Binding it turns the static footer into a button. */
  public readonly versionClick = output<void>();

  /**
   * Shows the sidebar as a navigation rail: collapsed to icons, with no toggle to widen it. The
   * reader's own collapsed choice is kept and applies again once the rail is off.
   */
  public readonly rail = input<boolean>(false);

  public readonly collapsed = signal<boolean>(false);

  protected readonly isCollapsed = computed<boolean>(() => this.rail() || this.collapsed());

  protected readonly collapsedVersionName = computed<string>(() =>
    this.versionDot() ? `${this.versionLabel()} (new)` : this.versionLabel()
  );

  /** The header band: the top bar's height, brand on the left and the toggle flush right. */
  protected readonly headerClass = computed<string>(() =>
    this.isCollapsed() ? `${HEADER_BASE_CLASSES} justify-center` : `${HEADER_BASE_CLASSES} pl-cmn-4`
  );

  protected clickable(): boolean {
    return this.versionClickable() ?? isOutputObserved(this.versionClick);
  }

  public toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    this.collapsedChange.emit(next);
  }

  /**
   * Carbon's side-nav link: 32px tall (a touch target on a coarse pointer), the icon on the 16px
   * inset that keeps it centred in the 48px rail, a hover fill, and a selected link that fills,
   * takes the primary text colour in semibold and draws a 3px bar on its leading edge.
   */
  public navItemClass(item: NavItem): string {
    const isActive = this.activeRoute() === item.route;
    const active = 'bg-accent-subtle font-semibold text-text-primary shadow-cmn-nav-active';
    const inactive = 'text-text-secondary hover:bg-surface-hover hover:text-text-primary';
    return `${NAV_LINK_CLASSES} ${isActive ? active : inactive}`;
  }
}
