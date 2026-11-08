import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

import {AsyncStateComponent, type AsyncStateStatus} from '../async-state/async-state.component';
import {ButtonComponent} from '../button/button.component';
import {type WhatsNewVersion} from './whats-new.model';

export const WHATS_NEW_ERROR_MESSAGE = "Couldn't load what's new. Try again.";

/**
 * The releases of an app in plain language, newest first: each with its date, the lines written for
 * it, and a fold with every filtered change. Presentational: it takes the releases and the load
 * state, so the sheet (`CmnWhatsNewService.open()`), a Settings About section and a story all draw
 * the same list. A release without lines opens its change fold; one without either says so.
 *
 * ```html
 * <cmn-whats-new [versions]="whatsNew.versions()" [status]="whatsNew.status()" (retry)="whatsNew.load()" />
 * ```
 */
@Component({
  selector: 'cmn-whats-new',
  imports: [AsyncStateComponent, ButtonComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {class: 'block'},
  template: `
    <cmn-async-state
      [emptyMessage]="'Nothing to show yet'"
      [emptySubMessage]="'Release notes show here once there is a new version.'"
      [errorMessage]="errorMessage"
      [isEmpty]="versions().length === 0"
      [skeletonRows]="3"
      [status]="status()"
      skeletonHeight="3rem"
    >
      <div class="flex flex-col gap-cmn-6" data-whats-new-list>
        @for (release of versions(); track release.version) {
          <section [attr.data-whats-new-version]="release.version">
            <header class="flex items-baseline justify-between gap-cmn-3">
              <h3 class="text-cmn-lg font-semibold text-text-primary">{{ release.version }}</h3>
              @if (release.date; as date) {
                <time [attr.datetime]="date" class="text-cmn-xs text-text-secondary">{{
                  date | date: 'mediumDate'
                }}</time>
              }
            </header>

            @if (release.notes.length > 0) {
              <ul
                class="mt-cmn-3 flex list-disc flex-col gap-cmn-2 pl-cmn-5 text-cmn-sm text-text-primary"
              >
                @for (note of release.notes; track note.text) {
                  <li data-whats-new-note>{{ note.text }}</li>
                }
              </ul>
            }

            @if (release.changes.length > 0) {
              <details [open]="release.notes.length === 0" class="mt-cmn-3" data-whats-new-changes>
                <summary
                  class="cursor-pointer text-cmn-sm font-medium text-accent-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Every change in this version
                </summary>
                <ul
                  class="mt-cmn-2 flex list-disc flex-col gap-cmn-1 pl-cmn-5 text-cmn-xs text-text-secondary"
                >
                  @for (change of release.changes; track change) {
                    <li>{{ change }}</li>
                  }
                </ul>
              </details>
            } @else if (release.notes.length === 0) {
              <p class="mt-cmn-3 text-cmn-sm text-text-secondary">
                No changes to show for this version.
              </p>
            }
          </section>
        }
      </div>
      <cmn-button (clicked)="retry.emit()" error-action size="sm" variant="secondary">
        Retry
      </cmn-button>
    </cmn-async-state>
  `,
})
export class WhatsNewComponent {
  /** The releases to list, newest first. Filter owner lines before passing them: the list shows what it is given. */
  public readonly versions = input.required<WhatsNewVersion[]>();
  /** The load state; the skeleton and the error show while the releases are not in yet. */
  public readonly status = input<AsyncStateStatus>('success');
  /** The Retry button was pressed on the error state. */
  public readonly retry = output<void>();

  protected readonly errorMessage = WHATS_NEW_ERROR_MESSAGE;
}
