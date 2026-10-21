import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
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
      <cmn-button (clicked)="showStacked()">stack three</cmn-button>
      <cmn-button (clicked)="showLong()" variant="secondary">long duration</cmn-button>
    </div>
    <p class="mt-cmn-4 text-cmn-sm text-text-secondary">
      Toasts dock bottom-centre. Info, success and warning dismiss themselves after 3s; an error
      stays until its close button is used.
    </p>
  `,
})
class StoryToastLauncherComponent {
  private readonly toast = inject(ToastService);

  protected readonly variants: ToastVariant[] = ['info', 'success', 'warning', 'error'];

  protected show(variant: ToastVariant): void {
    this.toast.show(`This is a ${variant} toast.`, variant);
  }

  protected showStacked(): void {
    this.toast.info('First.');
    this.toast.success('Second.');
    this.toast.error('Third.');
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
