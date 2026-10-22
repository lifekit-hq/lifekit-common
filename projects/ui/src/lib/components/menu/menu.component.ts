import {type FocusableOption, FocusKeyManager} from '@angular/cdk/a11y';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
  Overlay,
} from '@angular/cdk/overlay';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';

import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {AccountAvatarComponent} from '../account-avatar/account-avatar.component';
import {IconComponent, type LucideIconName} from '../icon/icon.component';

export interface MenuItem {
  /**
   * What the app tells the item apart by. An id that is an absolute path (`/settings`) is a
   * route: `cmn-app-layout` and `cmn-more-page` navigate there themselves.
   */
  id: string;
  label: string;
  icon?: LucideIconName;
  destructive?: boolean;
  disabled?: boolean;
  /** Draws a divider above the item, to set it apart from the group before it. */
  separatorBefore?: boolean;
}

/** A non-interactive header above a menu's items, e.g. the signed-in identity. */
export interface MenuHeader {
  title: string;
  subtitle?: string;
  /** Profile picture shown beside the text; the avatar's initials show without it. */
  pictureUrl?: string;
  /** What the avatar's initials are taken from; defaults to `title`. */
  avatarLabel?: string;
}

// The trigger presses as at least --size-touch square on a phone; the items are rows that tall.
const TRIGGER_BASE_CLASSES =
  'inline-flex items-center justify-center rounded-cmn-md focus:outline-none ' +
  `focus:ring-2 focus:ring-border-focus focus:ring-offset-1 ${PHONE_HIT_AREA_CLASSES}`;

const PANEL_BASE_CLASSES =
  'min-w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-cmn-lg border border-border-default ' +
  'bg-surface-card py-cmn-2 shadow-cmn-lg';

const HEADER_CLASSES =
  'mb-cmn-2 flex items-center gap-cmn-3 border-b border-border-default px-cmn-4 pb-cmn-3 pt-cmn-2';
const SEPARATOR_CLASSES = 'my-cmn-2 border-t border-border-default';

const ITEM_BASE_CLASSES =
  'flex w-full max-md:min-h-cmn-touch items-center gap-cmn-3 px-cmn-4 py-cmn-2 text-left ' +
  'text-cmn-sm transition-colors ' +
  'focus:outline-none focus:bg-surface-raised ' +
  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus';

const ITEM_DEFAULT_CLASSES = 'text-text-primary hover:bg-surface-raised';
const ITEM_DESTRUCTIVE_CLASSES = 'text-status-error hover:bg-status-error/10';

const PANEL_FOCUS_CLASSES = 'focus:outline-none';

/** Where focus lands when the menu opens: an item from the keyboard, the panel from a pointer. */
type OpenFocus = 'first' | 'last' | 'panel';

/** A menu item as the key manager sees it: something to focus, with a label to type ahead on. */
class MenuItemFocusTarget implements FocusableOption {
  constructor(private readonly element: HTMLButtonElement) {}

  public get disabled(): boolean {
    return this.element.disabled;
  }

  public focus(): void {
    this.element.focus();
  }

  public getLabel(): string {
    return this.element.textContent?.trim() ?? '';
  }
}

const MENU_POSITIONS: ConnectedPosition[] = [
  {
    originX: 'end',
    originY: 'bottom',
    overlayX: 'end',
    overlayY: 'top',
    offsetY: 8,
  },
  {
    originX: 'end',
    originY: 'top',
    overlayX: 'end',
    overlayY: 'bottom',
    offsetY: -8,
  },
];

@Component({
  selector: 'cmn-menu',
  imports: [AccountAvatarComponent, CdkConnectedOverlay, CdkOverlayOrigin, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #menuOrigin="cdkOverlayOrigin"
      #trigger
      [attr.aria-label]="ariaLabel()"
      [attr.aria-haspopup]="'menu'"
      [attr.aria-expanded]="isOpen()"
      [class]="triggerClasses()"
      (click)="toggle($event)"
      (keydown)="onTriggerKeydown($event)"
      cdkOverlayOrigin
      type="button"
    >
      <ng-content />
    </button>

    <ng-template
      [cdkConnectedOverlayOrigin]="menuOrigin"
      [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayHasBackdrop]="true"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
      (attach)="focusOnOpen()"
      (backdropClick)="close()"
      (overlayKeydown)="onOverlayKeydown($event)"
      cdkConnectedOverlay
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
    >
      <div
        #panel
        [class]="panelClasses()"
        [attr.aria-label]="panelLabel()"
        role="menu"
        tabindex="-1"
      >
        @if (header(); as menuHeader) {
          <div [class]="headerClasses" role="presentation" data-menu-header>
            <cmn-account-avatar
              [label]="menuHeader.avatarLabel ?? menuHeader.title"
              [pictureUrl]="menuHeader.pictureUrl"
              size="md"
            />
            <div class="min-w-0">
              <p class="truncate text-cmn-sm font-medium text-text-primary">
                {{ menuHeader.title }}
              </p>
              @if (menuHeader.subtitle) {
                <p class="truncate text-cmn-xs text-text-secondary">{{ menuHeader.subtitle }}</p>
              }
            </div>
          </div>
        }
        @for (item of items(); track item.id; let first = $first) {
          @if (item.separatorBefore && !first) {
            <div [class]="separatorClasses" role="separator"></div>
          }
          <button
            #menuItem
            [disabled]="item.disabled"
            [attr.aria-disabled]="item.disabled || null"
            [class]="itemClasses(item)"
            (click)="select(item)"
            type="button"
            role="menuitem"
            tabindex="-1"
          >
            @if (item.icon) {
              <cmn-icon [name]="item.icon" size="sm" aria-hidden="true" />
            }
            <span>{{ item.label }}</span>
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class MenuComponent {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly menuItems = viewChildren<ElementRef<HTMLButtonElement>>('menuItem');
  private readonly keyManager = new FocusKeyManager(
    computed(() => this.menuItems().map(ref => new MenuItemFocusTarget(ref.nativeElement))),
    this.injector
  )
    .withVerticalOrientation()
    .withWrap()
    .withHomeAndEnd()
    .withTypeAhead();
  private openFocus: OpenFocus = 'panel';

  public readonly items = input<MenuItem[]>([]);
  /** Identity or context shown above the items; not a menu item, so it can't be selected. */
  public readonly header = input<MenuHeader | undefined>(undefined);
  public readonly ariaLabel = input<string>('Open menu');
  public readonly triggerClass = input<string>('');
  public readonly panelClass = input<string>('');

  public readonly itemSelect = output<MenuItem>();

  public readonly positions = MENU_POSITIONS;
  public readonly isOpen = signal(false);
  public readonly triggerClasses = computed(() =>
    this.joinClasses(TRIGGER_BASE_CLASSES, this.triggerClass())
  );
  public readonly panelClasses = computed(() =>
    this.joinClasses(PANEL_BASE_CLASSES, PANEL_FOCUS_CLASSES, this.panelClass())
  );
  public readonly scrollStrategy = this.overlay.scrollStrategies.reposition();
  /** The header's text names the menu, since a menu reads out its items and not the header. */
  public readonly panelLabel = computed<string | null>(() => {
    const header = this.header();
    return header ? [header.title, header.subtitle].filter(Boolean).join(', ') : null;
  });
  public readonly headerClasses = HEADER_CLASSES;
  public readonly separatorClasses = SEPARATOR_CLASSES;

  /**
   * Opens or closes the menu. A click from the keyboard (Enter or Space, `detail` 0) opens on the
   * first item; a pointer click opens on the panel, so no item looks picked before one is.
   */
  public toggle(event?: MouseEvent): void {
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.open(event?.detail === 0 ? 'first' : 'panel');
  }

  /** Closes the menu and hands focus back to the trigger. */
  public close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.trigger().nativeElement.focus();
    this.keyManager.cancelTypeahead();
    this.isOpen.set(false);
  }

  public onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    this.open(event.key === 'ArrowDown' ? 'first' : 'last');
  }

  /** Moves focus into the menu once its items are on the page. */
  public focusOnOpen(): void {
    afterNextRender(
      () => {
        if (this.openFocus === 'first') {
          this.keyManager.setFirstItemActive();
        } else if (this.openFocus === 'last') {
          this.keyManager.setLastItemActive();
        } else {
          this.keyManager.updateActiveItem(-1);
          this.panel()?.nativeElement.focus();
        }
      },
      {injector: this.injector}
    );
  }

  public select(item: MenuItem): void {
    if (item.disabled) {
      return;
    }
    this.close();
    this.itemSelect.emit(item);
  }

  /** The APG menu keys: arrows, Home, End and typeahead move; Escape and Tab close. */
  public onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      // Focus goes back to the trigger first, so Tab carries on from there through the page.
      this.close();
      return;
    }
    if (event.key === 'ArrowUp' && this.keyManager.activeItemIndex === -1) {
      event.preventDefault();
      this.keyManager.setLastItemActive();
      return;
    }
    this.keyManager.onKeydown(event);
  }

  private open(focus: OpenFocus): void {
    this.openFocus = focus;
    this.isOpen.set(true);
  }

  public itemClasses(item: MenuItem): string {
    const toneClasses = item.destructive ? ITEM_DESTRUCTIVE_CLASSES : ITEM_DEFAULT_CLASSES;
    return this.joinClasses(ITEM_BASE_CLASSES, toneClasses);
  }

  private joinClasses(...classes: (string | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
  }
}
