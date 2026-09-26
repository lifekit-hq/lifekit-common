import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

import {ButtonComponent} from '../button/button.component';
import {type LucideIconName} from '../icon/icon.component';

@Component({
  selector: 'cmn-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  host: {style: 'display: block'},
  template: `
    <div class="flex flex-wrap items-start justify-between gap-cmn-4">
      <div class="flex min-w-0 flex-1 basis-64 flex-col gap-cmn-1">
        <h1 class="font-headline text-cmn-3xl break-words font-semibold text-text-primary">
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <p class="font-body text-cmn-sm text-text-secondary">
            {{ subtitle() }}
          </p>
        }
      </div>
      @if (actionLabel() || secondaryActionLabel()) {
        <div class="flex items-center gap-cmn-2">
          @if (secondaryActionLabel()) {
            <cmn-button
              [icon]="secondaryActionIcon()"
              [disabled]="secondaryActionDisabled()"
              (clicked)="secondaryClick.emit()"
              variant="secondary"
            >
              {{ secondaryActionLabel() }}
            </cmn-button>
          }
          @if (actionLabel()) {
            <cmn-button
              [icon]="actionIcon()"
              [loading]="actionLoading()"
              [disabled]="actionDisabled()"
              (clicked)="actionClick.emit()"
              variant="primary"
            >
              {{ actionLabel() }}
            </cmn-button>
          }
        </div>
      }
    </div>
  `,
})
export class PageHeaderComponent {
  public readonly title = input.required<string>();
  public readonly subtitle = input<string>('');
  public readonly actionLabel = input<string | null>(null);
  public readonly actionIcon = input<LucideIconName | null>(null);
  public readonly actionLoading = input<boolean>(false);
  public readonly actionDisabled = input<boolean>(false);
  public readonly secondaryActionLabel = input<string | null>(null);
  public readonly secondaryActionIcon = input<LucideIconName | null>(null);
  public readonly secondaryActionDisabled = input<boolean>(false);

  public readonly actionClick = output<void>();
  public readonly secondaryClick = output<void>();
}
