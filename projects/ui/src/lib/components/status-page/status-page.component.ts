import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {type Nullable} from '../../types';
import {AuthPageComponent} from '../auth-page/auth-page.component';
import {ButtonComponent} from '../button/button.component';

/** Which situation the page names: the user was signed out, may not enter, the API did not answer, or the route does not exist. */
export type StatusPagePreset = 'signed-out' | 'no-access' | 'unreachable' | 'not-found';

interface StatusPageCopy {
  readonly title: string;
  readonly lead: string;
  readonly primary: string;
  readonly secondary: Nullable<string>;
}

/** The default words of each preset; every one can be replaced with the matching input. */
export const STATUS_PAGE_COPY: Record<StatusPagePreset, StatusPageCopy> = {
  'signed-out': {
    title: 'You are signed out',
    lead: 'Sign in again to pick up where you left off.',
    primary: 'Sign in',
    secondary: null,
  },
  'no-access': {
    title: 'No access',
    lead: 'This account is not allowed to use the app. Ask the owner for access, or sign in with another account.',
    primary: 'Sign in with another account',
    secondary: null,
  },
  unreachable: {
    title: 'Cannot reach the server',
    lead: 'Check your connection and try again. Your data is unchanged.',
    primary: 'Try again',
    secondary: null,
  },
  'not-found': {
    title: 'Page not found',
    lead: 'The page does not exist or has moved.',
    primary: 'Go to home',
    secondary: 'Go back',
  },
};

/**
 * A full-page status on the sign-in frame (`cmn-auth-page`): the mark, a title, a sentence and the
 * way out. `preset` picks the words and the primary action; `title`, `lead`, `primaryLabel` and
 * `secondaryLabel` replace them. The page decides what an action does, so it emits `action` and
 * `secondaryAction` and navigates nothing itself. Anything projected (an alert with the reason, a
 * support address) sits under the lead, above the actions.
 */
@Component({
  selector: 'cmn-status-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthPageComponent, ButtonComponent],
  host: {class: 'block', '[attr.data-preset]': 'preset()'},
  template: `
    <cmn-auth-page [title]="resolvedTitle()" [lead]="resolvedLead()">
      <ng-content />
      <cmn-button (clicked)="action.emit()" class="block [&_button]:w-full">
        {{ resolvedPrimary() }}
      </cmn-button>
      @if (resolvedSecondary(); as secondary) {
        <cmn-button
          (clicked)="secondaryAction.emit()"
          class="block [&_button]:w-full"
          variant="tertiary"
        >
          {{ secondary }}
        </cmn-button>
      }
    </cmn-auth-page>
  `,
})
export class StatusPageComponent {
  public readonly preset = input.required<StatusPagePreset>();
  public readonly title = input<string>('');
  public readonly lead = input<string>('');
  public readonly primaryLabel = input<string>('');
  /** Replaces the preset's secondary action; leave empty to keep the preset's own (some have none). */
  public readonly secondaryLabel = input<string>('');

  public readonly action = output<void>();
  public readonly secondaryAction = output<void>();

  protected readonly resolvedTitle = computed(
    () => this.title() || STATUS_PAGE_COPY[this.preset()].title
  );
  protected readonly resolvedLead = computed(
    () => this.lead() || STATUS_PAGE_COPY[this.preset()].lead
  );
  protected readonly resolvedPrimary = computed(
    () => this.primaryLabel() || STATUS_PAGE_COPY[this.preset()].primary
  );
  protected readonly resolvedSecondary = computed(
    () => this.secondaryLabel() || STATUS_PAGE_COPY[this.preset()].secondary
  );
}
