import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {IconComponent, type LucideIconName} from '../icon/icon.component';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

const DEFAULT_DURATION_MS = 3000;

const VARIANT_CONTAINER_CLASSES: Record<ToastVariant, string> = {
  info: 'bg-status-info text-text-inverse',
  success: 'bg-status-success text-text-inverse',
  warning: 'bg-status-warning text-text-inverse',
  error: 'bg-status-error text-text-inverse',
};

const VARIANT_ICON_NAME: Record<ToastVariant, LucideIconName> = {
  info: 'Info',
  success: 'CircleCheck',
  warning: 'TriangleAlert',
  error: 'CircleAlert',
};

const VARIANT_ROLE: Record<ToastVariant, string> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
};

@Component({
  selector: 'cmn-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div [attr.role]="role()" [class]="containerClasses()">
      <cmn-icon [name]="iconName()" color="currentColor" size="sm" aria-hidden="true" />
      <span class="font-base text-cmn-sm">{{ message() }}</span>
      @if (action(); as label) {
        <button
          (click)="actioned.emit()"
          type="button"
          class="ml-auto shrink-0 rounded-cmn-sm px-cmn-2 py-0.5 font-base text-cmn-sm font-semibold underline underline-offset-2 hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          {{ label }}
        </button>
      }
      <button
        (click)="dismissed.emit()"
        type="button"
        class="ml-cmn-2 inline-flex items-center justify-center rounded-cmn-sm p-0.5 hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss"
      >
        <cmn-icon name="X" color="currentColor" size="sm" aria-hidden="true" />
      </button>
    </div>
  `,
})
export class ToastComponent {
  public readonly message = input<string>('');
  public readonly variant = input<ToastVariant>('info');
  /** Label of the toast's one action (e.g. "Undo"); two words or fewer. No button when unset. */
  public readonly action = input<string | undefined>(undefined);

  public readonly dismissed = output<void>();
  public readonly actioned = output<void>();

  public readonly role = computed(() => VARIANT_ROLE[this.variant()]);
  public readonly iconName = computed(() => VARIANT_ICON_NAME[this.variant()]);
  public readonly containerClasses = computed(() =>
    [
      'flex items-center gap-cmn-2 px-cmn-4 py-cmn-3 rounded-cmn-md shadow-cmn-md',
      'min-w-[280px] max-w-[480px]',
      VARIANT_CONTAINER_CLASSES[this.variant()],
    ].join(' ')
  );
}

export {DEFAULT_DURATION_MS};
