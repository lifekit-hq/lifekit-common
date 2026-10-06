import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

export type UsageChipTone = 'success' | 'warning' | 'error';

const PERCENT = 100;
const WARN_AT = 0.8;

const TONE_FILL: Record<UsageChipTone, string> = {
  success: 'bg-status-success opacity-25',
  warning: 'bg-status-warning opacity-25',
  error: 'bg-status-error opacity-25',
};

const TONE_TEXT: Record<UsageChipTone, string> = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  error: 'text-status-error',
};

const BASE_CLASSES =
  'relative inline-flex items-center overflow-hidden rounded-cmn-full bg-surface-raised ' +
  'px-cmn-3 py-cmn-1 text-cmn-sm font-medium tabular-nums';

@Component({
  selector: 'cmn-usage-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [class]="classes()"
      [attr.aria-label]="label() || null"
      [attr.aria-valuemax]="total()"
      [attr.aria-valuenow]="clampedUsed()"
      [attr.aria-valuetext]="readout()"
      role="meter"
      aria-valuemin="0"
    >
      <span
        [class]="fillClasses()"
        [style.width.%]="percent()"
        class="absolute inset-y-0 left-0"
      ></span>
      <span class="relative inline-flex items-baseline gap-1.5">
        @if (label()) {
          <span class="text-text-secondary">{{ label() }}</span>
        }
        <span [class]="textClasses()">{{ readout() }}</span>
      </span>
    </span>
  `,
})
export class UsageChipComponent {
  public readonly used = input.required<number>();
  public readonly total = input.required<number>();
  public readonly label = input<string>('');
  /** Appended to the readout, e.g. "calls" → "12 of 50 calls". */
  public readonly unit = input<string>('');

  public readonly clampedUsed = computed(() => Math.min(Math.max(this.used(), 0), this.total()));

  public readonly ratio = computed(() => {
    if (this.total() > 0) {
      return this.clampedUsed() / this.total();
    }
    return this.used() > 0 ? 1 : 0;
  });

  public readonly percent = computed(() => this.ratio() * PERCENT);

  public readonly tone = computed<UsageChipTone>(() => {
    if (this.ratio() >= 1) {
      return 'error';
    }
    return this.ratio() >= WARN_AT ? 'warning' : 'success';
  });

  public readonly readout = computed(() => {
    const unit = this.unit() ? ` ${this.unit()}` : '';
    return `${this.used()} of ${this.total()}${unit}`;
  });

  public readonly classes = computed(() => BASE_CLASSES);
  public readonly fillClasses = computed(() => TONE_FILL[this.tone()]);
  public readonly textClasses = computed(() => TONE_TEXT[this.tone()]);
}
