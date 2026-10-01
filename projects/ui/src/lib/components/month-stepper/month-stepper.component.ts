import {ChangeDetectionStrategy, Component, computed, input, model} from '@angular/core';

import {type Nullable} from '../../types';
import {IconComponent} from '../icon/icon.component';

const BUTTON_CLASSES =
  'inline-flex h-8 w-8 items-center justify-center rounded-cmn-full text-text-secondary ' +
  'transition-colors hover:bg-surface-hover hover:text-text-primary focus:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none ' +
  'disabled:opacity-40';

const MONTHS_PER_YEAR = 12;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthIndex(date: Date): number {
  return date.getFullYear() * MONTHS_PER_YEAR + date.getMonth();
}

/**
 * Previous / next month control, e.g. `‹ October 2026 ›`. The value is always
 * normalised to the first day of the month. Arrow keys step while the group
 * has focus; `min` / `max` disable the controls at either end.
 */
@Component({
  selector: 'cmn-month-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    role: 'group',
    '[attr.aria-label]': 'ariaLabel()',
    '(keydown.arrowLeft)': 'onKey($event, -1)',
    '(keydown.arrowRight)': 'onKey($event, 1)',
    class: 'inline-flex items-center gap-cmn-1',
  },
  template: `
    <button
      [class]="buttonClasses"
      [disabled]="!canStep(-1)"
      (click)="step(-1)"
      type="button"
      aria-label="Previous month"
    >
      <cmn-icon name="ChevronLeft" size="sm" />
    </button>
    <span
      class="min-w-32 text-center font-label text-cmn-sm font-semibold text-text-primary"
      aria-live="polite"
      >{{ label() }}</span
    >
    <button
      [class]="buttonClasses"
      [disabled]="!canStep(1)"
      (click)="step(1)"
      type="button"
      aria-label="Next month"
    >
      <cmn-icon name="ChevronRight" size="sm" />
    </button>
  `,
})
export class MonthStepperComponent {
  public readonly value = model.required<Date>();
  public readonly min = input<Nullable<Date>>(null);
  public readonly max = input<Nullable<Date>>(null);
  public readonly locale = input<string | undefined>(undefined);
  public readonly ariaLabel = input<string>('Month');

  public readonly label = computed(() =>
    new Intl.DateTimeFormat(this.locale(), {month: 'long', year: 'numeric'}).format(this.value())
  );

  public readonly buttonClasses = BUTTON_CLASSES;

  public canStep(delta: -1 | 1): boolean {
    const bound = delta < 0 ? this.min() : this.max();
    if (!bound) {
      return true;
    }
    const target = monthIndex(this.value()) + delta;
    return delta < 0 ? target >= monthIndex(bound) : target <= monthIndex(bound);
  }

  public step(delta: -1 | 1): void {
    if (!this.canStep(delta)) {
      return;
    }
    const current = this.value();
    this.value.set(startOfMonth(new Date(current.getFullYear(), current.getMonth() + delta, 1)));
  }

  public onKey(event: Event, delta: -1 | 1): void {
    event.preventDefault();
    this.step(delta);
  }
}
