import {NgOptimizedImage} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';

const MAX_INITIALS = 2;

const BASE_CLASSES =
  'inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-cmn-md border ' +
  'border-border-default bg-surface-card text-cmn-xs font-bold text-text-secondary ' +
  'shadow-sm';

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-cmn-xs',
  md: 'h-7 w-7 text-cmn-xs',
  lg: 'h-9 w-9 text-cmn-sm',
} as const;

const STATUS_BASE_CLASSES =
  'absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full ring-2 ring-surface-card';

const STATUS_CLASSES = {
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
  neutral: 'bg-text-disabled',
} as const;

export type InstitutionAvatarSize = keyof typeof SIZE_CLASSES;
export type InstitutionAvatarStatus = keyof typeof STATUS_CLASSES;

@Component({
  selector: 'cmn-institution-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  host: {
    '[class.relative]': '!!status()',
    '[class.inline-flex]': '!!status()',
  },
  template: `
    <span [class]="classes()" [attr.aria-label]="name()">
      @if (showLogo()) {
        <img
          [ngSrc]="logoUrl()!"
          [alt]="name() + ' logo'"
          (error)="onLogoError()"
          width="64"
          height="64"
          class="m-auto max-h-full max-w-full object-contain"
        />
      } @else {
        {{ initials() }}
      }
    </span>
    @if (status(); as status) {
      <span
        [class]="statusClasses()"
        [attr.aria-label]="statusLabel()"
        [attr.title]="statusLabel()"
        data-testid="avatar-status"
        role="img"
      ></span>
    }
  `,
})
export class InstitutionAvatarComponent {
  private readonly logoFailed = signal(false);

  public readonly name = input.required<string>();
  public readonly size = input<InstitutionAvatarSize>('md');
  /** Optional remote logo. Falls back to initials if absent or it fails to load. */
  public readonly logoUrl = input<string | null>(null);

  /** Optional state dot on the bottom-right corner. Null renders no dot. */
  public readonly status = input<InstitutionAvatarStatus | null>(null);
  /** Accessible name (and tooltip) for the dot, so state is never colour-only. */
  public readonly statusLabel = input<string | null>(null);

  public readonly initials = computed(() => InstitutionAvatarComponent.deriveInitials(this.name()));

  public readonly showLogo = computed(() => !!this.logoUrl() && !this.logoFailed());

  public readonly classes = computed(() => `${BASE_CLASSES} ${SIZE_CLASSES[this.size()]}`);

  public readonly statusClasses = computed(() => {
    const status = this.status();
    return status ? `${STATUS_BASE_CLASSES} ${STATUS_CLASSES[status]}` : '';
  });

  private static deriveInitials(value: string): string {
    const trimmed = value?.trim() ?? '';
    if (trimmed.length === 0) {
      return '';
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, MAX_INITIALS).toUpperCase();
    }
    return words
      .slice(0, MAX_INITIALS)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  public onLogoError(): void {
    this.logoFailed.set(true);
  }
}
