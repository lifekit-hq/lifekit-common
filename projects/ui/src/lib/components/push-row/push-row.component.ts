import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {PUSH_BACKEND, PushSubscriptionService} from '@lifekit-hq/core/pwa';

import {AlertComponent, type AlertVariant} from '../alert/alert.component';
import {ToggleComponent} from '../toggle/toggle.component';

export type PushRowState = 'off' | 'on' | 'denied' | 'install' | 'unavailable';

interface PushRowNotice {
  readonly variant: AlertVariant;
  readonly text: string;
}

/**
 * The notification opt-in row: a switch with its explanation and, when the switch cannot work, an
 * inline notification saying why (Carbon: Toggle plus inline Notification). The state comes from
 * `PushSubscriptionService`; the server half comes from the app's `PUSH_BACKEND`.
 *
 * Turning it on asks permission and registers the subscription; turning it off drops the browser
 * subscription and tells the backend. A failure leaves the switch where it was and says so.
 */
@Component({
  selector: 'cmn-push-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertComponent, ToggleComponent],
  template: `
    <div class="flex items-center justify-between gap-cmn-4">
      <div class="min-w-0">
        <p class="font-label text-cmn-base font-medium text-text-primary">{{ label() }}</p>
        <p class="text-cmn-sm text-text-secondary">{{ description() }}</p>
      </div>
      <cmn-toggle
        [checked]="state() === 'on'"
        [disabled]="!usable()"
        [loading]="busy()"
        [label]="label()"
        (toggled)="change($event)"
      />
    </div>
    @if (notice(); as n) {
      <cmn-alert [variant]="n.variant" class="mt-cmn-3 block">{{ n.text }}</cmn-alert>
    }
  `,
})
export class PushRowComponent {
  private readonly push = inject(PushSubscriptionService);
  private readonly backend = inject(PUSH_BACKEND);
  private readonly failure = signal<string | null>(null);

  /** Names the row and its switch. */
  public readonly label = input('Notifications');
  /** What the row does, shown under the label. */
  public readonly description = input('Get a push notification on this device.');
  /** Named in the install-first text, e.g. "Finance Sentry". */
  public readonly appName = input('this app');

  /** iOS only delivers push to an installed app, so install-first outranks "unavailable". */
  public readonly state = computed<PushRowState>(() => {
    if (this.push.requiresInstall()) {
      return 'install';
    }
    if (!this.push.isSupported()) {
      return 'unavailable';
    }
    if (this.push.permission() === 'denied') {
      return 'denied';
    }
    return this.push.subscription() ? 'on' : 'off';
  });

  protected readonly busy = signal(false);

  protected readonly usable = computed(() => this.state() === 'on' || this.state() === 'off');

  protected readonly notice = computed<PushRowNotice | null>(() => {
    const failure = this.failure();
    if (failure && this.usable()) {
      return {variant: 'error', text: failure};
    }
    switch (this.state()) {
      case 'install':
        return {
          variant: 'info',
          text: `On iPhone and iPad add ${this.appName()} to your Home Screen first, then open it from there to turn notifications on.`,
        };
      case 'denied':
        return {
          variant: 'warning',
          text: 'Notifications blocked. Allow them for this site in your browser settings, then come back.',
        };
      case 'unavailable':
        return {
          variant: 'info',
          text: 'This browser cannot receive push notifications.',
        };
      default:
        return null;
    }
  });

  protected async change(on: boolean): Promise<void> {
    this.busy.set(true);
    this.failure.set(null);
    try {
      await (on ? this.enable() : this.disable());
    } catch {
      this.failure.set(
        on
          ? 'Could not turn notifications on. Try again.'
          : 'Could not turn notifications off. Try again.'
      );
    } finally {
      this.busy.set(false);
    }
  }

  private async enable(): Promise<void> {
    const subscription = await this.push.subscribe(await this.backend.publicKey());
    try {
      await this.backend.register(subscription);
    } catch (error) {
      // Keep the browser and the server agreeing: no half-registered device.
      await this.push.unsubscribe();
      throw error;
    }
  }

  private async disable(): Promise<void> {
    const endpoint = this.push.subscription()?.endpoint;
    await this.push.unsubscribe();
    if (endpoint) {
      await this.backend.unregister(endpoint);
    }
  }
}
