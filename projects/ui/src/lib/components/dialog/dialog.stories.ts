import {DialogRef} from '@angular/cdk/dialog';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {CmnDialogService} from '../../services/dialog/dialog.service';
import {ButtonComponent} from '../button/button.component';
import {InputComponent} from '../input/input.component';
import {DialogActionsComponent} from './dialog-actions.component';
import {CmnDialogBareContainerComponent} from './dialog-bare-container.component';
import type {CmnDialogSize} from './dialog-config';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-dialog-content',
  imports: [ButtonComponent, DialogActionsComponent, InputComponent],
  template: `
    <p class="text-cmn-sm text-text-secondary">
      A dialog's body is the caller's component — the container supplies the shell, the title and
      the close button.
    </p>
    <cmn-input placeholder="Nickname for this account" class="mt-cmn-4 block" />
    <cmn-dialog-actions>
      <cmn-button (clicked)="ref.close()" variant="secondary">Cancel</cmn-button>
      <cmn-button (clicked)="ref.close(true)">Save</cmn-button>
    </cmn-dialog-actions>
  `,
})
class StoryDialogContentComponent {
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-bare-dialog-content',
  imports: [ButtonComponent],
  template: `
    <div
      class="w-[22rem] rounded-2xl border border-accent-default bg-surface-card p-cmn-6 shadow-cmn-md"
    >
      <p class="mb-cmn-4 font-headline text-cmn-lg text-text-primary">Custom chrome</p>
      <p class="mb-cmn-4 text-cmn-sm text-text-secondary">
        The bare container draws no shell, so this dialog owns its own frame.
      </p>
      <cmn-button (clicked)="ref.close()" variant="secondary">Close</cmn-button>
    </div>
  `,
})
class StoryBareDialogContentComponent {
  protected readonly ref = inject(DialogRef);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-dialog-launcher',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-wrap gap-cmn-3">
      @for (size of sizes; track size) {
        <cmn-button (clicked)="openSized(size)" variant="secondary">{{ size }}</cmn-button>
      }
      <cmn-button (clicked)="openUntitled()" variant="secondary">no title</cmn-button>
      <cmn-button (clicked)="openLocked()" variant="secondary">disableClose</cmn-button>
      <cmn-button (clicked)="openBare()" variant="secondary">bare container</cmn-button>
      <cmn-button (clicked)="confirm()" variant="destructive">confirm()</cmn-button>
    </div>
    <p class="mt-cmn-4 text-cmn-sm text-text-secondary">Last result: {{ result() }}</p>
  `,
})
class StoryDialogLauncherComponent {
  private readonly dialog = inject(CmnDialogService);

  protected readonly sizes: CmnDialogSize[] = ['sm', 'md', 'lg', 'full'];
  protected readonly result = signal('—');

  protected openSized(size: CmnDialogSize): void {
    this.dialog
      .open<boolean>(StoryDialogContentComponent, {title: `Dialog — ${size}`, size})
      .afterClosed()
      .subscribe(r => this.result.set(String(r)));
  }

  protected openUntitled(): void {
    this.dialog.open(StoryDialogContentComponent, {ariaLabel: 'Untitled dialog'});
  }

  protected openLocked(): void {
    this.dialog.open(StoryDialogContentComponent, {
      title: 'Cannot be dismissed from the header',
      disableClose: true,
    });
  }

  protected openBare(): void {
    this.dialog.open(StoryBareDialogContentComponent, {
      container: CmnDialogBareContainerComponent,
    });
  }

  protected confirm(): void {
    this.dialog
      .confirm({
        title: 'Disconnect this account?',
        message: 'Historical transactions stay, but nothing new will sync.',
        confirmLabel: 'Disconnect',
        confirmVariant: 'destructive',
      })
      .subscribe(r => this.result.set(String(r)));
  }
}

const meta: Meta<StoryDialogLauncherComponent> = {
  title: 'Components/Dialog',
  component: StoryDialogLauncherComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [StoryDialogContentComponent, StoryBareDialogContentComponent],
    }),
  ],
};

export default meta;
type Story = StoryObj<StoryDialogLauncherComponent>;

/**
 * Every dialog state the container supports: the four sizes, a headerless
 * dialog, one that refuses to close from its header, the bare container for
 * dialogs that draw their own chrome, and the built-in confirm flow.
 */
export const Playground: Story = {};
