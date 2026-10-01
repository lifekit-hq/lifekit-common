import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

import {IconComponent} from '../icon/icon.component';
import {MenuComponent, type MenuItem} from '../menu/menu.component';

@Component({
  selector: 'cmn-top-bar',
  imports: [IconComponent, MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="flex h-14 items-center gap-cmn-2 border-b border-border-default bg-surface-card px-cmn-4 md:gap-cmn-4 md:px-cmn-6"
    >
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
  public readonly avatarLabel = input<string>('');
  public readonly avatarMenuItems = input<MenuItem[]>([]);

  public readonly searchClick = output<void>();
  public readonly themeToggle = output<void>();
  public readonly avatarMenuSelect = output<MenuItem>();

  public avatarInitial(): string {
    return this.avatarLabel().charAt(0).toUpperCase() || '?';
  }
}
