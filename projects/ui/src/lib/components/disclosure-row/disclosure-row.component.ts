import {DecimalPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, input, linkedSignal} from '@angular/core';

import {
  InstitutionAvatarComponent,
  type InstitutionAvatarStatus,
} from '../institution-avatar/institution-avatar.component';

let rowCounter = 0;

/**
 * Carbon's expandable row: at least the 48px layout step tall, a hover fill, a chevron that turns
 * a quarter turn from pointing right to pointing down, and the expanded content on the page
 * ground under the row. From `md` the chevron leads the row, as in Carbon's table; on a phone it
 * trails, where iOS draws a disclosure indicator. The turn is a transform, held still under
 * Reduce Motion.
 */
const ROW_CLASSES =
  'relative flex min-h-cmn-size-lg items-center justify-between gap-cmn-4 px-cmn-4 py-cmn-3 ' +
  'transition-colors duration-cmn-short ease-cmn-standard hover:bg-surface-hover';
const CHEVRON_CLASSES =
  'size-4 shrink-0 text-text-secondary transition-transform duration-cmn-short ' +
  'ease-cmn-standard motion-reduce:transition-none md:order-first';

@Component({
  selector: 'cmn-disclosure-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InstitutionAvatarComponent, DecimalPipe],
  host: {style: 'display: block'},
  template: `
    <div class="border-b border-border-default last:border-0">
      <!-- The row is one press target (the button's ::after covers it); actions sit above it, so
           their controls are never nested inside the toggle. -->
      <div [class]="rowClasses">
        <button
          [attr.aria-expanded]="expanded()"
          [attr.aria-controls]="bodyId"
          (click)="toggle()"
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-cmn-3 text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-border-focus"
          type="button"
        >
          @if (avatarName()) {
            <cmn-institution-avatar
              [name]="avatarName()!"
              [logoUrl]="avatarLogoUrl()"
              [status]="avatarStatus()"
              [statusLabel]="avatarStatusLabel()"
            />
          }
          <span class="min-w-0">
            <span class="block font-medium text-text-primary">{{ label() }}</span>
            @if (sublabel()) {
              <span class="block text-cmn-xs text-text-secondary">{{ sublabel() }}</span>
            }
          </span>
        </button>
        <ng-content select="[status]" />
        @if (amount() !== null) {
          <div class="tabular-nums font-medium text-text-primary text-right min-w-[7rem]">
            @if (currency()) {
              {{ currency() }}
            }
            {{ amount() | number: '1.2-2' }}
          </div>
        }
        <div class="relative z-10 empty:hidden"><ng-content select="[actions]" /></div>
        <svg
          [class.rotate-90]="expanded()"
          [class]="chevronClasses"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <div [id]="bodyId" [hidden]="!expanded()" class="bg-surface-bg">
        <ng-content />
      </div>
    </div>
  `,
})
export class DisclosureRowComponent {
  public readonly label = input.required<string>();
  public readonly sublabel = input<string | null>(null);
  public readonly amount = input<number | null>(null);
  public readonly currency = input<string | null>(null);
  public readonly avatarName = input<string | null>(null);
  /** Optional remote logo for the avatar; falls back to initials if absent/broken. */
  public readonly avatarLogoUrl = input<string | null>(null);
  /** Optional state dot on the avatar; null renders none. */
  public readonly avatarStatus = input<InstitutionAvatarStatus | null>(null);
  /** Accessible name for the avatar's state dot. */
  public readonly avatarStatusLabel = input<string | null>(null);
  /** Whether the row starts expanded; a later change to it re-applies. */
  public readonly open = input<boolean>(true);

  protected readonly rowClasses = ROW_CLASSES;
  protected readonly chevronClasses = CHEVRON_CLASSES;
  protected readonly bodyId = `cmn-disclosure-row-${++rowCounter}`;
  protected readonly expanded = linkedSignal(() => this.open());

  protected toggle(): void {
    this.expanded.update(open => !open);
  }
}
