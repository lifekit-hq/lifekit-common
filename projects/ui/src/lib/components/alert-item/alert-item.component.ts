import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {formatRelativeTime} from '@lifekit-hq/core/format';

import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {type Nullable} from '../../types';
import {IconComponent, type LucideIconName} from '../icon/icon.component';
import {TagComponent} from '../tag/tag.component';

export type AlertItemSeverity = 'error' | 'warning' | 'info';
export type AlertItemDensity = 'card' | 'flat';

/** 24px drawn, at least --size-touch pressed on a phone. */
const DISMISS_CLASSES =
  'relative z-10 flex shrink-0 rounded-cmn-role-inset p-1 text-text-disabled transition-colors hover:bg-surface-raised ' +
  `hover:text-text-primary ${PHONE_HIT_AREA_CLASSES}`;

/**
 * The title's `::after` stretches over the whole item; the item is `relative`, so the stretch is
 * the item's own box. A feed row opens through this, never through a button the host lays over the
 * row with `absolute inset-0`: the design judge reads such an element, in a row below the fold, as
 * clipped by the app shell (`clipped-overflow-container`), and axe counts the overlay as a target
 * lying on top of the title. The ring is drawn on the stretch so a keyboard sees the whole row.
 */
const TITLE_CLASSES =
  "text-left font-label text-cmn-sm font-semibold after:absolute after:inset-0 after:content-['']";
const OPEN_FOCUS_CLASSES =
  'after:rounded-cmn-role-inset focus-visible:outline-none focus-visible:after:ring-2 ' +
  'focus-visible:after:ring-inset focus-visible:after:ring-border-focus';

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
      [class.rounded-cmn-role-surface]="!flat()"
      [class.border]="!flat()"
      [class.p-cmn-4]="!flat()"
      [class.border-b]="flat()"
      [class.px-cmn-1]="flat()"
      [class.py-cmn-3]="flat()"
      [style.border-color]="!flat() && !isRead() ? color() + '30' : ''"
      [style.background]="!flat() && !isRead() ? color() + '08' : ''"
      [class.cursor-pointer]="!isRead() || openable()"
      class="relative flex items-start gap-cmn-3 transition-colors"
    >
      <div
        [style.background]="color() + '18'"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-cmn-role-inset"
      >
        <cmn-icon [name]="resolvedIcon()" [style.color]="color()" size="sm" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="mb-cmn-1 flex flex-wrap items-center gap-cmn-2">
          @if (isRead() && !openable()) {
            <span class="font-label text-cmn-sm font-semibold text-text-primary">{{
              title()
            }}</span>
          } @else {
            <!-- The title is the card's one control: its ::after stretches over the whole card, so a
                 tap anywhere marks the item read (or opens it) and a keyboard reaches it as a real
                 button. -->
            <button
              [class]="titleClasses()"
              [style.color]="isRead() ? '' : color()"
              (click)="onContainerClick()"
              type="button"
            >
              {{ title() }}
            </button>
          }
          @if (badgeLabel()) {
            <cmn-tag [variant]="severity()">{{ badgeLabel() }}</cmn-tag>
          }
          @if (referenceLabel()) {
            <span
              class="rounded-cmn-role-inset bg-surface-raised px-1.5 py-0.5 text-cmn-xs text-text-secondary"
              >{{ referenceLabel() }}</span
            >
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
          <span class="text-cmn-xs text-text-secondary">{{ relativeTime() }}</span>
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
          [class]="dismissClasses"
          (click)="onDismissClick($event)"
          type="button"
          aria-label="Dismiss"
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
  /**
   * Makes the whole item, read or unread, open on a press: the title becomes the item's one
   * control (as it is for an unread item) and `opened` reports the press. A feed whose rows open a
   * detail sets it instead of laying its own button over the row.
   */
  public readonly openable = input(false, {transform: booleanAttribute});

  public readonly read = output<void>();
  /** The item was pressed and `openable` is on; an unread item reports `read` first. */
  public readonly opened = output<void>();
  public readonly dismissed = output<void>();

  public readonly color = computed(() => SEVERITY_COLOR[this.severity()]);
  public readonly resolvedIcon = computed<LucideIconName>(
    () => this.icon() ?? SEVERITY_ICON[this.severity()]
  );
  public readonly relativeTime = computed(() => formatRelativeTime(this.timestamp()));
  public readonly flat = computed(() => this.density() === 'flat');
  protected readonly titleClasses = computed(() =>
    [
      TITLE_CLASSES,
      this.openable() ? OPEN_FOCUS_CLASSES : '',
      this.isRead() ? 'text-text-primary' : '',
    ]
      .filter(Boolean)
      .join(' ')
  );

  protected readonly dismissClasses = DISMISS_CLASSES;

  public onContainerClick(): void {
    if (!this.isRead()) {
      this.read.emit();
    }
    if (this.openable()) {
      this.opened.emit();
    }
  }

  public onDismissClick(event: MouseEvent): void {
    event.stopPropagation();
    this.dismissed.emit();
  }
}
