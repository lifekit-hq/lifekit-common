import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import type {Meta, StoryObj} from '@storybook/angular';

import {ButtonComponent} from '../button/button.component';
import type {ToastVariant} from './toast.component';
import {ToastService} from './toast.service';

const LONG_DURATION_MS = 20_000;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'cmn-story-toast-launcher',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-wrap gap-cmn-3">
      @for (variant of variants; track variant) {
        <cmn-button (clicked)="show(variant)" variant="secondary">{{ variant }}</cmn-button>
      }
      <cmn-button (clicked)="showAction()" variant="secondary">with action</cmn-button>
      <cmn-button (clicked)="showStacked()" class="cmn-story-stack">stack four</cmn-button>
      <cmn-button (clicked)="showLong()" variant="secondary">long duration</cmn-button>
    </div>
    <p class="mt-cmn-4 max-w-prose text-cmn-sm text-text-secondary">
      Toasts dock bottom-centre, above the tab bar and the bottom inset, newest at the bottom and at
      most three in view. Info, success and warning dismiss themselves after 3s, paused while the
      stack is hovered or focused; an error, or a toast with an action, stays until it is used or
      dismissed.
    </p>
    @if (undone()) {
      <p class="mt-cmn-2 text-cmn-sm text-text-primary">Undone.</p>
    }
  `,
})
class StoryToastLauncherComponent {
  private readonly toast = inject(ToastService);

  protected readonly variants: ToastVariant[] = ['info', 'success', 'warning', 'error'];
  protected readonly undone = signal(false);

  protected show(variant: ToastVariant): void {
    this.toast.show(`This is a ${variant} toast.`, variant);
  }

  protected showAction(): void {
    this.undone.set(false);
    this.toast.success('Transaction deleted.', {
      action: {label: 'Undo', run: () => this.undone.set(true)},
    });
  }

  /** Four persistent toasts: the oldest waits out of view until one of the three is dismissed. */
  protected showStacked(): void {
    this.toast.error('First: waits until there is room.');
    this.toast.error('Second.');
    this.toast.info('Third.', {action: {label: 'Undo', run: () => this.undone.set(true)}});
    this.toast.error('Fourth, the newest, nearest the bottom.');
  }

  protected showLong(): void {
    this.toast.warning('This one stays up for 20 seconds.', LONG_DURATION_MS);
  }
}

const meta: Meta<StoryToastLauncherComponent> = {
  title: 'Services/Toast',
  component: StoryToastLauncherComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<StoryToastLauncherComponent>;

/**
 * `ToastService` in its real states: one toast per variant (the error one persists until
 * dismissed), several stacked at once, and one held open for 20 seconds.
 */
export const Playground: Story = {};

/** A toast carrying one action ("Undo"); it stays until the action is used or it is dismissed. */
export const WithAction: Story = {
  play: async ({canvasElement}) => {
    [...canvasElement.querySelectorAll('cmn-button')]
      .find(el => el.textContent?.trim() === 'with action')
      ?.querySelector('button')
      ?.click();
  },
};

/** Four toasts at once: three in view with the newest at the bottom, the oldest held back. */
export const Stacked: Story = {
  play: async ({canvasElement}) => {
    canvasElement.querySelector<HTMLButtonElement>('.cmn-story-stack button')?.click();
  },
};
