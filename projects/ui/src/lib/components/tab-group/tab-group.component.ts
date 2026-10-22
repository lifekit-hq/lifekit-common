import {_IdGenerator, type FocusableOption, FocusKeyManager} from '@angular/cdk/a11y';
import {Directionality} from '@angular/cdk/bidi';
import {CdkObserveContent} from '@angular/cdk/observers';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

export interface CmnTab {
  id: string;
  label: string;
  /** Router link commands or URL. When any tab sets it, the group renders as routed navigation. */
  link?: string | unknown[];
  /** Routed mode only: require an exact URL match for the tab to count as active. */
  exact?: boolean;
}

// On a phone a tab is --size-touch tall and keeps its label on one line; the row scrolls sideways.
const TAB_BASE =
  'inline-flex shrink-0 items-center whitespace-nowrap max-md:min-h-cmn-touch px-cmn-4 py-cmn-2 ' +
  'text-cmn-sm font-medium transition-colors border-b-2';
const ROW_CLASSES = 'flex gap-cmn-2 overflow-x-auto border-b border-border-default';
const TAB_ACTIVE = 'text-text-primary border-accent-default';
const TAB_INACTIVE = 'text-text-secondary border-transparent hover:text-text-primary';

/** A tab button as the key manager sees it: something to focus. */
class TabFocusTarget implements FocusableOption {
  constructor(private readonly element: HTMLElement) {}

  public focus(): void {
    this.element.focus();
  }
}

/** Whether a node holds something to read: an element or non-blank text, not a control-flow anchor. */
function isContentNode(node: Node): boolean {
  return (
    node.nodeType === Node.ELEMENT_NODE ||
    (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '')
  );
}

@Component({
  selector: 'cmn-tab-group',
  imports: [CdkObserveContent, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {style: 'display: block'},
  template: `
    @if (routed()) {
      <nav [attr.aria-label]="ariaLabel()" [class]="rowClasses">
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
      <div [attr.aria-label]="ariaLabel()" [class]="rowClasses" role="tablist">
        @for (tab of tabs(); track tab.id; let index = $index) {
          <button
            #tabButton
            [id]="tabId(index)"
            [attr.aria-selected]="tab.id === activeTab()"
            [attr.aria-controls]="tab.id === activeTab() && hasPanelContent() ? panelId : null"
            [attr.tabindex]="index === focusableIndex() ? 0 : -1"
            [class]="tabClass(tab.id === activeTab())"
            (click)="selectTab(tab.id)"
            (keydown)="onTabKeydown($event, index)"
            type="button"
            role="tab"
          >
            {{ tab.label }}
          </button>
        }
      </div>
    }
    <!-- Content projected below the tab bar is the selected tab's panel. With none (the app
         draws the panel elsewhere) the wrapper is left without a role, so no tab points at it. -->
    <div
      #panel
      [id]="panelId"
      [attr.role]="isPanel() ? 'tabpanel' : null"
      [attr.aria-labelledby]="isPanel() ? selectedTabId() : null"
      (cdkObserveContent)="syncPanelContent()"
    >
      <ng-content />
    </div>
  `,
})
export class TabGroupComponent {
  private readonly injector = inject(Injector);
  private readonly direction = inject(Directionality);
  private readonly idPrefix = inject(_IdGenerator).getId('cmn-tab-group-');
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly keyManager = new FocusKeyManager(
    computed(() => this.tabButtons().map(ref => new TabFocusTarget(ref.nativeElement))),
    this.injector
  )
    .withVerticalOrientation(false)
    .withHorizontalOrientation(this.direction.value)
    .withWrap()
    .withHomeAndEnd();

  private readonly selectedIndex = computed(() =>
    this.tabs().findIndex(tab => tab.id === this.activeTab())
  );

  public readonly tabs = input.required<CmnTab[]>();
  public readonly activeTab = model<string>('');
  /** Accessible name for the tab bar. */
  public readonly ariaLabel = input<string | null>(null);

  protected readonly rowClasses = ROW_CLASSES;
  protected readonly panelId = `${this.idPrefix}-panel`;
  protected readonly hasPanelContent = signal(false);

  protected readonly routed = computed(() => this.tabs().some(tab => tab.link !== undefined));
  /** The one tab in the page's tab order: the selected tab, or the first when none is selected. */
  protected readonly focusableIndex = computed(() => Math.max(this.selectedIndex(), 0));
  protected readonly selectedTabId = computed(() => {
    const index = this.selectedIndex();
    return index < 0 ? null : this.tabId(index);
  });
  protected readonly isPanel = computed(() => !this.routed() && this.hasPanelContent());

  constructor() {
    afterNextRender(() => this.syncPanelContent());
  }

  protected tabId(index: number): string {
    return `${this.idPrefix}-tab-${index}`;
  }

  protected tabClass(active: boolean): string {
    return active ? `${TAB_BASE} ${TAB_ACTIVE}` : `${TAB_BASE} ${TAB_INACTIVE}`;
  }

  protected selectTab(id: string): void {
    this.activeTab.set(id);
  }

  /** Arrow keys, Home and End move focus between tabs, and the focused tab is selected. */
  protected onTabKeydown(event: KeyboardEvent, focused: number): void {
    this.keyManager.withHorizontalOrientation(this.direction.value);
    this.keyManager.updateActiveItem(focused);
    this.keyManager.onKeydown(event);
    const next = this.keyManager.activeItemIndex;
    if (next !== null && next !== focused) {
      this.selectTab(this.tabs()[next].id);
    }
  }

  protected syncPanelContent(): void {
    this.hasPanelContent.set(Array.from(this.panel().nativeElement.childNodes).some(isContentNode));
  }
}
