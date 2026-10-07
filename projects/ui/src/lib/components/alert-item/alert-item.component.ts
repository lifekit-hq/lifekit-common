import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {formatRelativeTime} from '@lifekit-hq/core/format';

import {type Nullable} from '../../types';
import {IconComponent, type LucideIconName} from '../icon/icon.component';
import {TagComponent} from '../tag/tag.component';

export type AlertItemSeverity = 'error' | 'warning' | 'info';
export type AlertItemDensity = 'card' | 'flat';

const SEVERITY_COLOR: Record<AlertItemSeverity, string> = {
  error: 'var(--color-status-error)',
  warning: 'var(--color-status-warning)',
  info: 'var(--color-status-info)',
};

const SEVERITY_ICON: Record<AlertItemSeverity, LucideIconName> = {
  error: 'CircleAlert',
  warning: 'TriangleAlert',
  info: 'Info',
};

@Component({
  selector: 'cmn-alert-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TagComponent, IconComponent],
  template: `
    <div
      [class.border-border-default]="flat() || isRead()"
      [class.bg-surface-card]="isRead() && !flat()"
      [class.rounded-cmn-lg]="!flat()"
      [class.border]="!flat()"
      [class.p-cmn-4]="!flat()"
      [class.border-b]="flat()"
      [class.px-cmn-1]="flat()"
      [class.py-cmn-3]="flat()"
      [style.border-color]="!flat() && !isRead() ? color() + '30' : ''"
      [style.background]="!flat() && !isRead() ? color() + '08' : ''"
      (click)="onContainerClick()"
      class="relative flex cursor-pointer items-start gap-cmn-3 transition-colors"
    >
      <div
        [style.background]="color() + '18'"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-cmn-md"
      >
        <cmn-icon [name]="resolvedIcon()" [style.color]="color()" size="sm" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="mb-cmn-1 flex flex-wrap items-center gap-cmn-2">
          <span
            [class.text-text-primary]="isRead()"
            [style.color]="isRead() ? '' : color()"
            class="font-label text-cmn-sm font-semibold"
            >{{ title() }}</span
          >
          @if (badgeLabel()) {
            <cmn-tag [variant]="severity()">{{ badgeLabel() }}</cmn-tag>
          }
          @if (referenceLabel()) {
            <span class="rounded bg-surface-raised px-1.5 py-0.5 text-cmn-xs text-text-disabled">{{
              referenceLabel()
            }}</span>
          }
        </div>
        @if (description()) {
          <p class="mb-cmn-1 text-cmn-xs font-medium text-text-secondary">
            {{ description() }}
          </p>
        }
        <p class="mb-cmn-2 text-cmn-xs leading-relaxed text-text-secondary">
          {{ message() }}
        </p>
        @if (relativeTime()) {
          <span class="text-cmn-xs text-text-disabled">{{ relativeTime() }}</span>
        }
      </div>

      @if (!isRead()) {
        <span
          [class.absolute]="!flat()"
          [class.right-cmn-3]="!flat()"
          [class.top-cmn-3]="!flat()"
          [class.mt-1.5]="flat()"
          [class.shrink-0]="flat()"
          [style.background]="color()"
          class="h-2 w-2 rounded-full"
        ></span>
      }

      @if (dismissible()) {
        <button
          (click)="onDismissClick($event)"
          type="button"
          aria-label="Dismiss"
          class="flex shrink-0 rounded p-1 text-text-disabled transition-colors hover:bg-surface-raised hover:text-text-primary"
        >
          <cmn-icon name="X" size="sm" />
        </button>
      }
    </div>
  `,
})
export class AlertItemComponent {
  public readonly title = input.required<string>();
  public readonly message = input<string>('');
  public readonly severity = input<AlertItemSeverity>('info');
  public readonly icon = input<Nullable<LucideIconName>>(null);
  public readonly badgeLabel = input<Nullable<string>>(null);
  public readonly referenceLabel = input<Nullable<string>>(null);
  public readonly description = input<Nullable<string>>(null);
  public readonly timestamp = input<Nullable<string | number | Date>>(null);
  public readonly isRead = input<boolean>(false);
  public readonly dismissible = input<boolean>(true);
  /** `card` (default) is a bordered tile; `flat` is a hairline-separated feed row. */
  public readonly density = input<AlertItemDensity>('card');

  public readonly read = output<void>();
  public readonly dismissed = output<void>();

  public readonly color = computed(() => SEVERITY_COLOR[this.severity()]);
  public readonly resolvedIcon = computed<LucideIconName>(
    () => this.icon() ?? SEVERITY_ICON[this.severity()]
  );
  public readonly relativeTime = computed(() => formatRelativeTime(this.timestamp()));
  public readonly flat = computed(() => this.density() === 'flat');

  public onContainerClick(): void {
    if (!this.isRead()) {
      this.read.emit();
    }
  }

  public onDismissClick(event: MouseEvent): void {
    event.stopPropagation();
    this.dismissed.emit();
  }
}
