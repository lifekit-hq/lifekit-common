import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {type PageAction} from '../app-layout/page-chrome';
import {IconComponent} from '../icon/icon.component';
import {MenuComponent, type MenuItem} from '../menu/menu.component';

/**
 * How the bar shows its title. `none`: the bar's title is the page heading (h1). With a large
 * title in the content, the bar's copy is a plain label: hidden while the large title is in view
 * (`visible`) and faded in once it has scrolled under the bar (`collapsed`).
 */
export type TopBarLargeTitle = 'none' | 'visible' | 'collapsed';

const MAX_INITIALS = 2;
const HEADER_BASE_CLASSES =
  'flex h-14 items-center border-b border-border-default px-cmn-4 md:gap-cmn-4 md:px-cmn-6';
/**
 * Every chrome control meets the touch target (`--size-touch`) below md, desktop density from md.
 * The targets abut below md, so the bar has no gap there: the glyphs still sit a target apart.
 */
const CHROME_BUTTON_CLASSES =
  'flex h-cmn-touch w-cmn-touch shrink-0 items-center justify-center rounded-cmn-md ' +
  'text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary ' +
  'disabled:opacity-50 md:h-8 md:w-8';
/**
 * On a 320px phone the fullest bar (back, two actions, search, theme toggle, avatar) leaves the
 * title ~32px, so the theme toggle yields below 360px once a page declares more than one action
 * (title ~76px). It stays in the DOM, hidden, so no control ever shrinks under its touch target.
 */
const NARROW_HIDDEN_CLASSES = 'max-[359px]:hidden';
/**
 * Three actions inline (360px and up) plus the theme toggle would leave a 360px title ~28px, so
 * with more than two actions the theme toggle yields until 400px, where it fits beside a 64px title.
 */
const THEME_HIDDEN_OVER_THRESHOLD_CLASSES = 'max-[399px]:hidden';
/**
 * Below 360px a page with more than two actions keeps only its first one inline and moves the rest
 * into an overflow menu, so back, action, overflow, search and avatar (five targets) leave the same
 * ~76px title as two actions do. From 360px nothing moves: every action stays inline.
 */
const OVERFLOW_HIDDEN_CLASSES = 'max-[359px]:hidden';
const OVERFLOW_ONLY_CLASSES = 'min-[360px]:hidden';
const OVERFLOW_THRESHOLD = 2;
const OVERFLOW_INLINE_COUNT = 1;
/** The panel clears the side safe areas (landscape notch) and never outgrows a 320px screen. */
const OVERFLOW_PANEL_CLASSES =
  'min-w-48 max-w-[calc(100vw-2rem-env(safe-area-inset-left)-env(safe-area-inset-right))] ' +
  'overflow-hidden rounded-cmn-lg bg-surface-card py-cmn-2 shadow-cmn-lg ' +
  'mr-[env(safe-area-inset-right)]';
const OVERFLOW_ITEM_CLASSES =
  'flex w-full items-center gap-cmn-3 px-cmn-4 py-cmn-2 text-left text-cmn-sm text-text-primary ' +
  'transition-colors hover:bg-surface-raised focus:bg-surface-raised focus:outline-none ' +
  'min-h-cmn-touch disabled:opacity-50 aria-disabled:opacity-50';
/** The avatar's disc stays 32px inside its touch-sized, invisible button. */
const AVATAR_TRIGGER_CLASSES =
  'group h-cmn-touch w-cmn-touch shrink-0 rounded-cmn-full md:h-8 md:w-8';
const AVATAR_DISC_CLASSES =
  'flex h-8 w-8 items-center justify-center rounded-cmn-full bg-accent-default text-cmn-xs ' +
  'font-semibold text-text-inverse transition-opacity group-hover:opacity-90';
/** Keyboard hints mean nothing without a keyboard: hidden wherever hover is unavailable. */
const KEY_HINT_CLASSES =
  'ml-cmn-2 hidden rounded border border-border-default px-1 py-0.5 font-mono text-cmn-xs ' +
  'text-text-secondary md:inline [@media(hover:none)]:hidden';
/** The chevron's glyph sits on the content edge below md, as on iOS. */
const BACK_BUTTON_CLASSES = `${CHROME_BUTTON_CLASSES} -ml-cmn-2 md:ml-0`;
const INLINE_TITLE_CLASSES =
  'min-w-0 truncate font-headline text-cmn-base font-semibold text-text-primary';
/** The inline copy of a large title fades, never slides; Reduce Motion drops the fade. */
const INLINE_LABEL_CLASSES = `${INLINE_TITLE_CLASSES} transition-opacity duration-150 motion-reduce:transition-none`;
const HEADER_SOLID_CLASSES = 'bg-surface-card';
/**
 * In overlay mode the bar is translucent and blurred so content scrolling under it shows through,
 * and it grows by the top safe-area inset so it sits under the status bar of an edge-to-edge PWA.
 */
const HEADER_OVERLAY_CLASSES =
  'h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] ' +
  'bg-[color-mix(in_srgb,var(--color-surface-card)_80%,transparent)] backdrop-blur-md';

@Component({
  selector: 'cmn-top-bar',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent, MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Chrome is for pressing: a long press on a label selects nothing
  host: {class: 'select-none'},
  template: `
    <header [class]="headerClass()">
      <!-- Back: a chevron only, no "Back" text -->
      @if (showBack()) {
        <button
          [class]="backButtonClasses"
          (click)="backClick.emit()"
          type="button"
          aria-label="Back"
        >
          <cmn-icon name="ChevronLeft" size="md" />
        </button>
      }

      <!-- Title: omitted when empty so the page owns the only h1. Beside a large title it is a
           plain label (the large title is the h1), shown once the large title scrolls away -->
      @if (title()) {
        @if (largeTitle() === 'none') {
          <h1 [class]="inlineTitleClasses">{{ title() }}</h1>
        } @else {
          <p
            [class]="inlineLabelClasses"
            [class.opacity-0]="largeTitle() === 'visible'"
            aria-hidden="true"
            data-inline-title
          >
            {{ title() }}
          </p>
        }
      }

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Page actions, declared by the page in route data -->
      @for (action of actions(); track action.id; let i = $index) {
        <button
          [class]="inlineActionClasses(i)"
          [attr.aria-label]="action.label"
          [title]="action.label"
          [disabled]="action.disabled"
          (click)="actionClick.emit(action)"
          type="button"
        >
          <cmn-icon [name]="action.icon" size="sm" />
        </button>
      }

      <!-- Overflow: the actions that no longer fit inline below 360px -->
      @if (overflowActions().length) {
        <button
          [class]="overflowTriggerClasses"
          [cdkMenuTriggerFor]="overflowMenu"
          type="button"
          aria-label="More actions"
          title="More actions"
          data-overflow-trigger
        >
          <cmn-icon name="Ellipsis" size="sm" />
        </button>
        <ng-template #overflowMenu>
          <div [class]="overflowPanelClasses" cdkMenu aria-label="More actions" data-overflow-menu>
            @for (action of overflowActions(); track action.id) {
              <button
                [class]="overflowItemClasses"
                [cdkMenuItemDisabled]="!!action.disabled"
                (cdkMenuItemTriggered)="actionClick.emit(action)"
                cdkMenuItem
                type="button"
              >
                <cmn-icon [name]="action.icon" size="sm" aria-hidden="true" />
                <span>{{ action.label }}</span>
              </button>
            }
          </div>
        </ng-template>
      }

      <!-- Search trigger: icon-only below md -->
      <button
        (click)="searchClick.emit()"
        class="flex h-cmn-touch w-cmn-touch shrink-0 items-center justify-center gap-cmn-2 rounded-cmn-md text-cmn-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary md:h-auto md:w-auto md:border md:border-border-default md:bg-surface-bg md:px-cmn-3 md:py-1.5 md:hover:border-border-strong md:hover:bg-surface-bg"
        type="button"
        aria-label="Search"
      >
        <cmn-icon name="Search" size="sm" />
        <span class="hidden md:inline">Search…</span>
        <kbd [class]="keyHintClasses">⌘K</kbd>
      </button>

      <!-- Theme toggle -->
      @if (showThemeToggle()) {
        <button
          [class]="themeToggleClasses()"
          (click)="themeToggle.emit()"
          type="button"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <cmn-icon [name]="isDark() ? 'Sun' : 'Moon'" size="sm" />
        </button>
      }

      <!-- Avatar -->
      <cmn-menu
        [items]="avatarMenuItems()"
        [triggerClass]="avatarTriggerClasses"
        (itemSelect)="avatarMenuSelect.emit($event)"
        ariaLabel="Account menu"
      >
        <span [class]="avatarDiscClasses">{{ avatarInitial() }}</span>
      </cmn-menu>
    </header>
  `,
})
export class TopBarComponent {
  public readonly title = input<string>('');
  public readonly isDark = input<boolean>(false);
  public readonly showThemeToggle = input<boolean>(true);
  /**
   * Text shown in the avatar. A label of up to two characters without spaces is treated as
   * initials and shown as given, uppercased ('dt' → 'DT', 'Al' → 'AL'); a longer single word shows
   * its first letter ('Denys' → 'D'); several words show the first letters of the first two
   * ('Denys Taran' → 'DT'); an empty label shows '?'.
   */
  public readonly avatarLabel = input<string>('');
  public readonly avatarMenuItems = input<MenuItem[]>([]);
  /**
   * Phone overlay styling: translucent, blurred, and padded by the top safe-area inset. The
   * bar applies it whenever set; `cmn-app-layout` sets it only in the phone shell.
   */
  public readonly overlay = input<boolean>(false);
  /** Renders the back chevron at the leading edge; pressing it emits `backClick`. */
  public readonly showBack = input<boolean>(false);
  /** Trailing page actions, rendered as icon buttons before the search trigger. */
  public readonly actions = input<PageAction[]>([]);
  public readonly largeTitle = input<TopBarLargeTitle>('none');

  public readonly backClick = output<void>();
  public readonly actionClick = output<PageAction>();
  public readonly searchClick = output<void>();
  public readonly themeToggle = output<void>();
  public readonly avatarMenuSelect = output<MenuItem>();

  public readonly headerClass = computed<string>(
    () => `${HEADER_BASE_CLASSES} ${this.overlay() ? HEADER_OVERLAY_CLASSES : HEADER_SOLID_CLASSES}`
  );

  protected readonly themeToggleClasses = computed<string>(() => {
    const count = this.actions().length;
    if (count > OVERFLOW_THRESHOLD) {
      return `${CHROME_BUTTON_CLASSES} ${THEME_HIDDEN_OVER_THRESHOLD_CLASSES}`;
    }
    return count > 1 ? `${CHROME_BUTTON_CLASSES} ${NARROW_HIDDEN_CLASSES}` : CHROME_BUTTON_CLASSES;
  });
  /** The actions behind the overflow button: all but the first once a page declares over two. */
  protected readonly overflowActions = computed<PageAction[]>(() =>
    this.actions().length > OVERFLOW_THRESHOLD ? this.actions().slice(OVERFLOW_INLINE_COUNT) : []
  );
  protected readonly overflowTriggerClasses = `${CHROME_BUTTON_CLASSES} ${OVERFLOW_ONLY_CLASSES}`;
  protected readonly overflowPanelClasses = OVERFLOW_PANEL_CLASSES;
  protected readonly overflowItemClasses = OVERFLOW_ITEM_CLASSES;
  protected readonly backButtonClasses = BACK_BUTTON_CLASSES;
  protected readonly chromeButtonClasses = CHROME_BUTTON_CLASSES;
  protected readonly avatarTriggerClasses = AVATAR_TRIGGER_CLASSES;
  protected readonly avatarDiscClasses = AVATAR_DISC_CLASSES;
  protected readonly keyHintClasses = KEY_HINT_CLASSES;
  protected readonly inlineTitleClasses = INLINE_TITLE_CLASSES;
  protected readonly inlineLabelClasses = INLINE_LABEL_CLASSES;

  protected inlineActionClasses(index: number): string {
    return this.overflowActions().length > 0 && index >= OVERFLOW_INLINE_COUNT
      ? `${CHROME_BUTTON_CLASSES} ${OVERFLOW_HIDDEN_CLASSES}`
      : CHROME_BUTTON_CLASSES;
  }

  public avatarInitial(): string {
    const label = this.avatarLabel().trim();
    const words = label.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      return words
        .slice(0, MAX_INITIALS)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase();
    }
    const single = label.length <= MAX_INITIALS ? label : label.charAt(0);
    return single.toUpperCase() || '?';
  }
}
