import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';

import {avatarInitials} from './avatar-initials';

/** Who the signed-in account is: the fields every account surface (menu header, More page) reads. */
export interface AccountIdentity {
  name?: string;
  email?: string;
  /** Absolute URL of the profile picture; the initials show when it is absent or fails to load. */
  pictureUrl?: string;
}

export type AccountAvatarSize = 'sm' | 'md';

const BASE_CLASSES =
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-cmn-full ' +
  'bg-accent-default font-semibold text-text-inverse transition-opacity group-hover:opacity-90';

const SIZE_CLASSES: Record<AccountAvatarSize, string> = {
  sm: 'h-8 w-8 text-cmn-xs',
  md: 'h-10 w-10 text-cmn-sm',
};

/** Largest edge of the picture, in px, so the browser can pick a sharp source for the disc. */
const PICTURE_PX: Record<AccountAvatarSize, number> = {sm: 32, md: 40};

/**
 * The account's disc: its picture when it has one, otherwise the initials of `label`. Decorative:
 * the name and email it stands for are always printed next to it.
 */
@Component({
  selector: 'cmn-account-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'inline-flex shrink-0'},
  template: `
    <span [class]="classes()" aria-hidden="true">
      @if (picture(); as src) {
        <!-- A plain src: NgOptimizedImage throws on the data: URIs an IdP can supply -->
        <!-- eslint-disable @angular-eslint/template/prefer-ngsrc -->
        <img
          [src]="src"
          [width]="pixels()"
          [height]="pixels()"
          (error)="onPictureError(src)"
          class="h-full w-full object-cover"
          alt=""
          referrerpolicy="no-referrer"
        />
        <!-- eslint-enable @angular-eslint/template/prefer-ngsrc -->
      } @else {
        {{ initials() }}
      }
    </span>
  `,
})
export class AccountAvatarComponent {
  /** The picture URL that failed to load, so a later, different URL is tried again. */
  private readonly failedPicture = signal<string | null>(null);

  /** What the initials are taken from: a name, an email, or initials already. */
  public readonly label = input<string>('');
  public readonly pictureUrl = input<string | undefined>(undefined);
  public readonly size = input<AccountAvatarSize>('md');

  protected readonly initials = computed<string>(() => avatarInitials(this.label()));

  protected readonly picture = computed<string | null>(() => {
    const url = this.pictureUrl();
    return url && url !== this.failedPicture() ? url : null;
  });

  protected readonly pixels = computed<number>(() => PICTURE_PX[this.size()]);

  protected readonly classes = computed<string>(
    () => `${BASE_CLASSES} ${SIZE_CLASSES[this.size()]}`
  );

  protected onPictureError(url: string): void {
    this.failedPicture.set(url);
  }
}
