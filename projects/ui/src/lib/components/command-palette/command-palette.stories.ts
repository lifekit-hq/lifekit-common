import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {CmnDialogService} from '../../services/dialog/dialog.service';
import {ButtonComponent} from '../button/button.component';
import {CmnDialogBareContainerComponent} from '../dialog/dialog-bare-container.component';
import {CommandPaletteComponent} from './command-palette.component';
import type {CommandPaletteItem, PaletteResult} from './command-palette-item.model';

const ITEMS: CommandPaletteItem[] = [
  {id: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', group: 'Pages'},
  {id: '/accounts', label: 'Accounts', icon: 'Building2', group: 'Pages'},
  {id: '/transactions', label: 'Transactions', icon: 'ArrowLeftRight', group: 'Pages'},
  {id: '/budgets', label: 'Budgets', icon: 'Zap', group: 'Pages'},
  {id: '/settings', label: 'Settings', icon: 'Settings2', group: 'Pages'},
  {id: '_connect', label: 'Connect Account', icon: 'Link', group: 'Actions'},
  {id: '_theme', label: 'Toggle Dark Mode', icon: 'Moon', group: 'Actions'},
];

const ONE_GROUP: CommandPaletteItem[] = ITEMS.filter(i => i.group === 'Pages');

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-palette-launcher',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-wrap gap-cmn-3">
      <cmn-button (clicked)="open(items)">Open palette</cmn-button>
      <cmn-button (clicked)="open(oneGroup)" variant="secondary">Single group</cmn-button>
      <cmn-button (clicked)="open([])" variant="secondary">No items</cmn-button>
    </div>
    <p class="mt-cmn-4 text-cmn-sm text-text-secondary">
      Arrow keys move the selection, Enter activates, Escape closes. Last result: {{ result() }}
    </p>
  `,
})
class StoryPaletteLauncherComponent {
  private readonly dialog = inject(CmnDialogService);

  protected readonly items = ITEMS;
  protected readonly oneGroup = ONE_GROUP;
  protected readonly result = signal('—');

  protected open(items: CommandPaletteItem[]): void {
    this.dialog
      .open<PaletteResult, CommandPaletteItem[]>(CommandPaletteComponent, {
        data: items,
        hasBackdrop: false,
        container: CmnDialogBareContainerComponent,
        panelClass: 'cmn-command-palette-panel',
      })
      .afterClosed()
      .subscribe(r => this.result.set(r ? `${r.type}:${r.id}` : 'dismissed'));
  }
}

const meta: Meta<StoryPaletteLauncherComponent> = {
  title: 'Components/Command Palette',
  component: StoryPaletteLauncherComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<StoryPaletteLauncherComponent>;

/**
 * The palette in its real states: grouped results, a single group, and the
 * empty result set you get by typing a query nothing matches (or by opening it
 * with no items at all).
 */
export const Playground: Story = {};
