import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

export type BadgeStatus = 'default' | 'success' | 'processing' | 'error' | 'warning';

const STATUS_CLASSES: Record<BadgeStatus, string> = {
  default: 'bg-text-secondary',
  success: 'bg-status-success',
  processing: 'bg-status-info animate-pulse',
  error: 'bg-status-error',
  warning: 'bg-status-warning',
};

const DEFAULT_OVERFLOW_COUNT = 99;
const COUNT_SIZE_CLASSES = 'min-w-5 h-5 px-1 text-cmn-xs font-semibold leading-none';
const DOT_SIZE_CLASSES = 'w-2 h-2';
const BASE_INDICATOR_CLASSES =
  'cmn-badge-indicator inline-flex items-center justify-center rounded-full text-text-inverse';
const ABSOLUTE_POSITION_CLASSES = 'absolute -right-1.5 -top-1.5';

@Component({
  selector: 'cmn-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="relative inline-flex">
      <ng-content />
      @if (visible()) {
        <span [class]="indicatorClasses()">
          @if (!dot()) {
            {{ displayValue() }}
          }
        </span>
      }
    </span>
  `,
})
export class BadgeComponent {
  public readonly count = input<number | null>(null);
  public readonly overflowCount = input<number>(DEFAULT_OVERFLOW_COUNT);
  public readonly showZero = input<boolean>(false);
  public readonly dot = input<boolean>(false);
  public readonly status = input<BadgeStatus>('error');
  public readonly standalone = input<boolean>(false);

  public readonly visible = computed<boolean>(() => {
    if (this.dot()) {
      return true;
    }
    const value = this.count();
    if (value === null || value === undefined) {
      return false;
    }
    if (value === 0 && !this.showZero()) {
      return false;
    }
    return true;
  });

  public readonly displayValue = computed<string>(() => {
    const value = this.count() ?? 0;
    const cap = this.overflowCount();
    return value > cap ? `${cap}+` : `${value}`;
  });

  public readonly indicatorClasses = computed<string>(() => {
    const sizing = this.dot() ? DOT_SIZE_CLASSES : COUNT_SIZE_CLASSES;
    const position = this.standalone() ? '' : ABSOLUTE_POSITION_CLASSES;
    const status = STATUS_CLASSES[this.status()];
    return [BASE_INDICATOR_CLASSES, sizing, status, position].filter(Boolean).join(' ');
  });
}
