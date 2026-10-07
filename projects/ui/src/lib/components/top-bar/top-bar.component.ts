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
  'flex h-14 items-center gap-cmn-2 border-b border-border-default px-cmn-4 md:gap-cmn-4 md:px-cmn-6';
/** Page chrome (back, actions) meets the 44px touch target below md, desktop density from md. */
const CHROME_BUTTON_CLASSES =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-cmn-md text-text-secondary ' +
  'transition-colors hover:bg-surface-raised hover:text-text-primary md:h-8 md:w-8';
/** The chevron's glyph sits on the content edge below md, as on iOS. */
const BACK_BUTTON_CLASSES = `${CHROME_BUTTON_CLASSES} -ml-cmn-2 md:ml-0`;
const INLINE_TITLE_CLASSES =
  'min-w-0 truncate font-headline text-cmn-base font-semibold text-text-primary';
/** The inline copy of a large title fades, never slides; Reduce Motion drops the fade. */
const INLINE_LABEL_CLASSES = `${INLINE_TITLE_CLASSES} transition-opacity duration-150 motion-reduce:transition-none`;
const HEADER_SOLID_CLASSES = 'bg-surface-card';
/**
 * Below md the bar is translucent and blurred so content scrolling under it shows through, and
 * it grows by the top safe-area inset so it sits under the status bar of an edge-to-edge PWA.
 */
const HEADER_OVERLAY_CLASSES =
  'bg-surface-card max-md:h-[calc(3.5rem+env(safe-area-inset-top))] max-md:pt-[env(safe-area-inset-top)] ' +
  'max-md:bg-[color-mix(in_srgb,var(--color-surface-card)_80%,transparent)] max-md:backdrop-blur-md';

@Component({
  selector: 'cmn-top-bar',
  imports: [IconComponent, MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
      @for (action of actions(); track action.id) {
        <button
          [class]="chromeButtonClasses"
          [attr.aria-label]="action.label"
          [title]="action.label"
          (click)="actionClick.emit(action)"
          type="button"
        >
          <cmn-icon [name]="action.icon" size="sm" />
        </button>
      }

      <!-- Search trigger: icon-only below md -->
      <button
        (click)="searchClick.emit()"
        class="flex h-8 w-8 shrink-0 items-center justify-center gap-cmn-2 rounded-cmn-md text-cmn-sm text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary md:h-auto md:w-auto md:border md:border-border-default md:bg-surface-bg md:px-cmn-3 md:py-1.5 md:hover:border-border-strong md:hover:bg-surface-bg"
        type="button"
        aria-label="Search"
      >
        <cmn-icon name="Search" size="sm" />
        <span class="hidden md:inline">Search…</span>
        <kbd
          class="ml-cmn-2 hidden rounded border border-border-default px-1 py-0.5 font-mono text-cmn-xs text-text-secondary md:inline"
        >
          ⌘K
        </kbd>
      </button>

      <!-- Theme toggle -->
      @if (showThemeToggle()) {
        <button
          (click)="themeToggle.emit()"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-cmn-md text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors"
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
        (itemSelect)="avatarMenuSelect.emit($event)"
        ariaLabel="Account menu"
        triggerClass="h-8 w-8 shrink-0 rounded-cmn-full bg-accent-default text-cmn-xs font-semibold text-text-inverse hover:opacity-90 transition-opacity"
      >
        {{ avatarInitial() }}
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
  /** Phone overlay styling: translucent, blurred, and padded by the top safe-area inset below md. */
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

  protected readonly backButtonClasses = BACK_BUTTON_CLASSES;
  protected readonly chromeButtonClasses = CHROME_BUTTON_CLASSES;
  protected readonly inlineTitleClasses = INLINE_TITLE_CLASSES;
  protected readonly inlineLabelClasses = INLINE_LABEL_CLASSES;

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
