import {ChangeDetectionStrategy, Component, computed, input, model} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

export interface CmnTab {
  id: string;
  label: string;
  /** Router link commands or URL. When any tab sets it, the group renders as routed navigation. */
  link?: string | unknown[];
  /** Routed mode only: require an exact URL match for the tab to count as active. */
  exact?: boolean;
}

const TAB_BASE = 'px-cmn-4 py-cmn-2 text-cmn-sm font-medium transition-colors border-b-2';
const TAB_ACTIVE = 'text-text-primary border-accent-default';
const TAB_INACTIVE = 'text-text-secondary border-transparent hover:text-text-primary';

@Component({
  selector: 'cmn-tab-group',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {style: 'display: block'},
  template: `
    @if (routed()) {
      <nav [attr.aria-label]="ariaLabel()" class="flex gap-cmn-2 border-b border-border-default">
        @for (tab of tabs(); track tab.id) {
          <a
            #rla="routerLinkActive"
            [class]="tabClass(rla.isActive)"
            [routerLink]="tab.link ?? ''"
            [routerLinkActiveOptions]="{exact: tab.exact ?? false}"
            ariaCurrentWhenActive="page"
            routerLinkActive
          >
            {{ tab.label }}
          </a>
        }
      </nav>
    } @else {
      <div
        [attr.aria-label]="ariaLabel()"
        class="flex gap-cmn-2 border-b border-border-default"
        role="tablist"
      >
        @for (tab of tabs(); track tab.id) {
          <button
            [attr.aria-selected]="tab.id === activeTab()"
            [class]="tabClass(tab.id === activeTab())"
            (click)="selectTab(tab.id)"
            type="button"
            role="tab"
          >
            {{ tab.label }}
          </button>
        }
      </div>
    }
    <ng-content />
  `,
})
export class TabGroupComponent {
  public readonly tabs = input.required<CmnTab[]>();
  public readonly activeTab = model<string>('');
  /** Accessible name for the tab bar. */
  public readonly ariaLabel = input<string | null>(null);

  protected readonly routed = computed(() => this.tabs().some(tab => tab.link !== undefined));

  protected tabClass(active: boolean): string {
    return active ? `${TAB_BASE} ${TAB_ACTIVE}` : `${TAB_BASE} ${TAB_INACTIVE}`;
  }

  protected selectTab(id: string): void {
    this.activeTab.set(id);
  }
}
