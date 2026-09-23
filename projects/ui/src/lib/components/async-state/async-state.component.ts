import {ChangeDetectionStrategy, Component, input} from '@angular/core';

import {AlertComponent} from '../alert/alert.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';

export type AsyncStateStatus = 'idle' | 'loading' | 'success' | 'error';

const DEFAULT_SKELETON_ROWS = 3;

@Component({
  selector: 'cmn-async-state',
  imports: [AlertComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A single <ng-content /> on purpose: Angular projects light DOM into the
  // FIRST matching outlet only, so a second one in another branch would render
  // empty. The branches below are ordered so exactly one outlet exists.
  template: `
    @if (status() === 'loading') {
      <div class="space-y-cmn-3">
        @for (_ of skeletonArray; track $index) {
          <cmn-skeleton [height]="skeletonHeight()" />
        }
      </div>
    } @else if (status() === 'error') {
      <cmn-alert variant="error">{{ errorMessage() || 'Something went wrong.' }}</cmn-alert>
    } @else if (status() === 'success' && isEmpty()) {
      <p class="py-cmn-6 text-center text-cmn-sm text-text-secondary">
        {{ emptyMessage() }}
      </p>
    } @else {
      <ng-content />
    }
  `,
})
export class AsyncStateComponent {
  public readonly status = input<AsyncStateStatus>('idle');
  public readonly errorMessage = input<string>('');
  public readonly isEmpty = input<boolean>(false);
  public readonly emptyMessage = input<string>('No data available.');
  public readonly skeletonHeight = input<string>('1.25rem');
  public readonly skeletonRows = input<number>(DEFAULT_SKELETON_ROWS);

  protected get skeletonArray(): readonly undefined[] {
    return Array.from({length: this.skeletonRows()});
  }
}
