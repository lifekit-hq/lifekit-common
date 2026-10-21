import {DialogRef} from '@angular/cdk/dialog';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';
import {moduleMetadata} from '@storybook/angular';

import {CmnDialogService} from '../../services/dialog/dialog.service';
import {ButtonComponent} from '../button/button.component';
import {InputComponent} from '../input/input.component';
import {DialogActionsComponent} from './dialog-actions.component';
import {CmnDialogBareContainerComponent} from './dialog-bare-container.component';
import type {CmnDialogPhoneMode, CmnDialogSize} from './dialog-config';

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
  selector: 'cmn-story-action-sheet-content',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-col gap-cmn-2 [&_button]:w-full">
      <cmn-button (clicked)="ref.close('rename')" variant="secondary">Rename account</cmn-button>
      <cmn-button (clicked)="ref.close('export')" variant="secondary"
        >Export transactions</cmn-button
      >
      <cmn-button (clicked)="ref.close('disconnect')" variant="destructive">Disconnect</cmn-button>
    </div>
  `,
})
class StoryActionSheetContentComponent {
  protected readonly ref = inject(DialogRef);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-form-dialog-content',
  imports: [ButtonComponent, DialogActionsComponent, InputComponent],
  template: `
    <div class="flex flex-col gap-cmn-4">
      @for (field of fields; track field) {
        <cmn-input [placeholder]="field" class="block" />
      }
    </div>
    <cmn-dialog-actions>
      <cmn-button (clicked)="ref.close()" variant="secondary">Cancel</cmn-button>
      <cmn-button (clicked)="ref.close(true)">Save</cmn-button>
    </cmn-dialog-actions>
  `,
})
class StoryFormDialogContentComponent {
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly fields = [
    'Account name',
    'Institution',
    'Opening balance',
    'Currency',
    'Account number',
    'Sort code',
    'Notes',
    'Statement day',
  ];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-bare-dialog-content',
  imports: [ButtonComponent],
  template: `
    <div class="w-[22rem] rounded-2xl bg-surface-card p-cmn-6 shadow-cmn-md">
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
    <p class="mt-cmn-5 mb-cmn-2 text-cmn-sm font-medium text-text-primary">
      Phone presentations (below 768px)
    </p>
    <div class="flex flex-wrap gap-cmn-3">
      @for (mode of phoneModes; track mode) {
        <cmn-button (clicked)="openPhone(mode)" variant="secondary">{{ mode }}</cmn-button>
      }
      <cmn-button (clicked)="openForm()" variant="secondary">long form (sheet)</cmn-button>
    </div>
    <p class="mt-cmn-4 text-cmn-sm text-text-secondary">Last result: {{ result() }}</p>
  `,
})
class StoryDialogLauncherComponent {
  private readonly dialog = inject(CmnDialogService);

  /** Opens one dialog as soon as the story renders, so a story can show an open dialog. */
  public readonly autoOpen = input<CmnDialogPhoneMode | 'confirm' | 'form' | 'locked' | null>(null);

  protected readonly sizes: CmnDialogSize[] = ['sm', 'md', 'lg', 'full'];
  protected readonly phoneModes: CmnDialogPhoneMode[] = ['sheet', 'full-screen', 'action-sheet'];
  protected readonly result = signal('—');

  constructor() {
    afterNextRender(() => {
      switch (this.autoOpen()) {
        case 'confirm':
          this.confirm();
          break;
        case 'form':
          this.openForm();
          break;
        case 'locked':
          this.openLocked();
          break;
        case 'sheet':
        case 'full-screen':
        case 'action-sheet':
          this.openPhone(this.autoOpen() as CmnDialogPhoneMode);
          break;
        default:
          break;
      }
    });
  }

  protected openPhone(phone: CmnDialogPhoneMode): void {
    if (phone === 'action-sheet') {
      this.dialog.open(StoryActionSheetContentComponent, {title: 'Account options', phone});
      return;
    }
    this.dialog.open(StoryDialogContentComponent, {title: `Dialog - ${phone}`, phone});
  }

  protected openForm(): void {
    this.dialog.open(StoryFormDialogContentComponent, {title: 'Add an account'});
  }

  protected openSized(size: CmnDialogSize): void {
    this.dialog
      .open<boolean>(StoryDialogContentComponent, {title: `Dialog - ${size}`, size})
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
      imports: [
        StoryDialogContentComponent,
        StoryBareDialogContentComponent,
        StoryActionSheetContentComponent,
        StoryFormDialogContentComponent,
      ],
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

const PHONE = {viewport: {value: 'mobile2', isRotated: false}};

/**
 * Below 768px a dialog is a bottom sheet by default (Apple HIG sheet): grabber, swipe down or tap the
 * backdrop to dismiss, safe-area aware, never taller than the screen minus the status bar. Pass
 * `phone` to `open()` to pick another presentation.
 */
export const Sheet: Story = {
  args: {autoOpen: 'sheet'},
  globals: {viewport: PHONE.viewport},
};

/**
 * `phone: 'full-screen'` (the default for `size: 'full'`) fills the screen, clear of the status bar
 * and home indicator, and does not swipe down: it is dismissed by its explicit close button.
 */
export const FullScreen: Story = {
  args: {autoOpen: 'full-screen'},
  globals: {viewport: PHONE.viewport},
};

/**
 * `phone: 'action-sheet'` floats a card with the choices above a separate Cancel button, for a
 * short list of actions or a confirmation.
 */
export const ActionSheet: Story = {
  args: {autoOpen: 'action-sheet'},
  globals: {viewport: PHONE.viewport},
};

/** `confirm()` is an action sheet on a phone: the destructive choice and a separate Cancel. */
export const ConfirmActionSheet: Story = {
  args: {autoOpen: 'confirm'},
  globals: {viewport: PHONE.viewport},
};

/** A form taller than the sheet scrolls inside it; the actions stay pinned at the bottom. */
export const SheetWithLongForm: Story = {
  args: {autoOpen: 'form'},
  globals: {viewport: PHONE.viewport},
};

/** `disableClose` removes the swipe, the backdrop tap, Escape and the close affordances. */
export const SheetThatCannotBeDismissed: Story = {
  args: {autoOpen: 'locked'},
  globals: {viewport: PHONE.viewport},
};

/** From 768px up the same call is the centred dialog it always was; `phone` is ignored. */
export const DesktopUnchanged: Story = {
  args: {autoOpen: 'sheet'},
};
