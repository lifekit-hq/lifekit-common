import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';

import {type Nullable} from '../../types';
import {ButtonComponent} from '../button/button.component';
import {IconComponent, type IconName} from '../icon/icon.component';

/**
 * `card` is the standalone empty state of a page or tab and gets generous vertical air; `bare` sits
 * inside a region that already has its own frame (a card, a drawer) and stays compact. Neither
 * draws a box: both span the width of their column and carry their own side padding.
 */
export type EmptyStateVariant = 'card' | 'bare';

const BODY_CLASSES: Record<EmptyStateVariant, string> = {
  card: 'flex w-full flex-col items-center px-cmn-6 py-cmn-12 gap-cmn-3 text-center',
  bare: 'flex w-full flex-col items-center px-cmn-4 py-cmn-6 gap-cmn-2 text-center',
};

const MESSAGE_CLASSES: Record<EmptyStateVariant, string> = {
  card: 'text-cmn-lg font-semibold text-text-primary text-balance break-words',
  bare: 'text-cmn-sm text-text-secondary text-balance break-words',
};

const DESCRIPTION_CLASSES: Record<EmptyStateVariant, string> = {
  card: 'max-w-prose text-cmn-sm text-text-secondary text-pretty break-words',
  bare: 'max-w-prose text-cmn-xs text-text-secondary text-pretty break-words',
};

// Stacked and full width on a phone so each action is an easy thumb target; a centred row from sm.
// `empty:hidden` drops the row, and its margin, when no action is given or projected.
const ACTIONS_CLASSES =
  'mt-cmn-3 flex empty:hidden w-full max-w-sm flex-col items-stretch gap-cmn-2 ' +
  'sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center ' +
  '[&_button]:w-full sm:[&_button]:w-auto';

/**
 * What a list or page shows when there is nothing to list, following the Apple HIG empty-state
 * guidance: say what is missing and why in the caller's own words, then offer the way out.
 *
 * - `message` is the title and `subMessage` the one-line description. Name the situation
 *   ("No transactions on Monobank ••4242 in October"), not the generic ("No data").
 * - `actionLabel` renders the primary action and emits `action`; `secondaryLabel` renders the
 *   secondary one and emits `secondaryAction`. For anything richer, project into the `[cta]`
 *   slot (after the primary action) or the `[secondary]` slot (last).
 */
@Component({
  selector: 'cmn-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, IconComponent],
  host: {class: 'block w-full'},
  template: `
    <div [class]="bodyClass()">
      @if (icon()) {
        <span
          class="mb-cmn-1 inline-flex size-12 items-center justify-center rounded-cmn-full bg-surface-raised text-text-secondary"
        >
          <cmn-icon [name]="icon()!" [class]="iconClass()" size="lg" />
        </span>
      }
      <p [class]="messageClass()">{{ message() }}</p>
      @if (subMessage()) {
        <p [class]="descriptionClass()">{{ subMessage() }}</p>
      }
      <div [class]="actionsClass">
        @if (actionLabel()) {
          <cmn-button (clicked)="action.emit()">{{ actionLabel() }}</cmn-button>
        }
        <ng-content select="[cta]" />
        @if (secondaryLabel()) {
          <cmn-button (clicked)="secondaryAction.emit()" variant="secondary">{{
            secondaryLabel()
          }}</cmn-button>
        }
        <ng-content select="[secondary]" />
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  public readonly message = input.required<string>();
  public readonly subMessage = input<Nullable<string>>(null);
  public readonly icon = input<Nullable<IconName>>(null);
  public readonly iconClass = input<string>('');
  public readonly variant = input<EmptyStateVariant>('card');
  /** Label of the primary action button; nothing renders without it. */
  public readonly actionLabel = input<Nullable<string>>(null);
  /** Label of the secondary action button; nothing renders without it. */
  public readonly secondaryLabel = input<Nullable<string>>(null);

  public readonly action = output<void>();
  public readonly secondaryAction = output<void>();

  public readonly bodyClass = computed(() => BODY_CLASSES[this.variant()]);
  public readonly messageClass = computed(() => MESSAGE_CLASSES[this.variant()]);
  public readonly descriptionClass = computed(() => DESCRIPTION_CLASSES[this.variant()]);

  protected readonly actionsClass = ACTIONS_CLASSES;
}
