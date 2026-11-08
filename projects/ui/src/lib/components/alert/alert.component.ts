import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {type Nullable} from '../../types';
import {IconComponent, type LucideIconName} from '../icon/icon.component';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'accent';

// Carbon's inline notification: the kind's tinted background, a 3px stripe in the kind's colour on
// the leading edge and a 1px hairline of it on the others. Colour from the status roles.
const VARIANT_CONTAINER_CLASSES: Record<AlertVariant, string> = {
  info: 'bg-status-info-subtle border-status-info/40 border-l-status-info text-text-primary',
  success:
    'bg-status-success-subtle border-status-success/40 border-l-status-success text-text-primary',
  warning:
    'bg-status-warning-subtle border-status-warning/40 border-l-status-warning text-text-primary',
  error: 'bg-status-error-subtle border-status-error/40 border-l-status-error text-text-primary',
  accent: 'bg-accent-subtle border-accent-default/40 border-l-accent-default text-accent-default',
};

const VARIANT_ICON_COLOR: Record<
  AlertVariant,
  `var(--color-status-${AlertVariant})` | 'var(--color-accent-default)'
> = {
  info: 'var(--color-status-info)',
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  error: 'var(--color-status-error)',
  accent: 'var(--color-accent-default)',
};

const VARIANT_ICON_NAME: Record<AlertVariant, LucideIconName> = {
  info: 'Info',
  success: 'CircleCheck',
  warning: 'TriangleAlert',
  error: 'CircleAlert',
  accent: 'Sparkles',
};

const VARIANT_ROLE: Record<AlertVariant, string> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
  accent: 'note',
};

const DISMISS_CLASSES =
  '-my-cmn-1 -mr-cmn-2 inline-flex h-cmn-size-sm w-cmn-size-sm shrink-0 items-center justify-center ' +
  'rounded-cmn-sm transition-colors duration-cmn-short ease-cmn-standard hover:bg-surface-hover ' +
  `focus:outline-none focus:ring-2 focus:ring-border-focus ${PHONE_HIT_AREA_CLASSES}`;

@Component({
  selector: 'cmn-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div [attr.role]="role()" [class]="containerClasses()">
      <cmn-icon [name]="resolvedIcon()" [color]="iconColor()" size="sm" aria-hidden="true" />

      <div class="flex-1 min-w-0">
        @if (title()) {
          <p class="font-label text-cmn-sm font-semibold mb-0.5">
            {{ title() }}
          </p>
        }
        <ng-content />
      </div>

      @if (dismissible()) {
        <button
          [class]="dismissClasses"
          (click)="dismissed.emit()"
          type="button"
          aria-label="Dismiss"
        >
          <cmn-icon name="X" size="sm" aria-hidden="true" />
        </button>
      }
    </div>
  `,
})
export class AlertComponent {
  public readonly variant = input<AlertVariant>('info');
  public readonly title = input<string>('');
  public readonly icon = input<Nullable<LucideIconName>>(null);
  public readonly dismissible = input<boolean>(false);

  public readonly dismissed = output<void>();

  /** A 32px square that presses as the 44px a phone needs; it sits flush to the notification's edge. */
  public readonly dismissClasses = DISMISS_CLASSES;

  public readonly role = computed(() => VARIANT_ROLE[this.variant()]);
  public readonly resolvedIcon = computed<LucideIconName>(
    () => this.icon() ?? VARIANT_ICON_NAME[this.variant()]
  );
  public readonly iconColor = computed(() => VARIANT_ICON_COLOR[this.variant()]);

  public readonly containerClasses = computed(() =>
    [
      'flex min-h-cmn-control-h items-start gap-cmn-3 rounded-cmn-md border border-l-cmn-bar px-cmn-4 py-cmn-3',
      VARIANT_CONTAINER_CLASSES[this.variant()],
    ].join(' ')
  );
}
