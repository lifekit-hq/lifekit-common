import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {IconComponent} from '../icon/icon.component';
import {MenuComponent, type MenuItem} from '../menu/menu.component';

const MAX_INITIALS = 2;
const HEADER_BASE_CLASSES =
  'flex h-14 items-center gap-cmn-2 border-b border-border-default px-cmn-4 md:gap-cmn-4 md:px-cmn-6';
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
      <!-- Title -->
      <h1 class="min-w-0 truncate font-headline text-cmn-base font-semibold text-text-primary">
        {{ title() }}
      </h1>

      <!-- Spacer -->
      <div class="flex-1"></div>

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

  public readonly searchClick = output<void>();
  public readonly themeToggle = output<void>();
  public readonly avatarMenuSelect = output<MenuItem>();

  public readonly headerClass = computed<string>(
    () => `${HEADER_BASE_CLASSES} ${this.overlay() ? HEADER_OVERLAY_CLASSES : HEADER_SOLID_CLASSES}`
  );

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
