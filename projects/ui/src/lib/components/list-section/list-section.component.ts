import {_IdGenerator} from '@angular/cdk/a11y';
import {NgTemplateOutlet} from '@angular/common';
import {booleanAttribute, ChangeDetectionStrategy, Component, inject, input} from '@angular/core';

import {CardComponent} from '../card/card.component';

/**
 * Sticky on a phone, pinned under the app shell's top bar and its notices. Inside `cmn-app-layout`'s
 * scroll container a sticky offset counts from the container's padding edge, which the shell
 * already pushes below the top bar (`--cmn-content-inset-top`), so the header only adds the
 * notices' height (`--cmn-sticky-top`, 0px anywhere else). The surface fill hides the rows that
 * scroll under it.
 */
const HEADING_CLASSES =
  'flex items-baseline justify-between gap-cmn-2 bg-surface-bg px-cmn-1 py-cmn-2 ' +
  'text-cmn-xs font-semibold uppercase tracking-wide text-text-secondary ' +
  'max-md:sticky max-md:top-[var(--cmn-sticky-top,0px)] max-md:z-10';

/**
 * A group of rows under a heading: one day of transactions, one status of alerts. The heading
 * names the section (`section` labelled by the heading text, not its aside) and, on a phone, sticks under the top bar while
 * its rows scroll past; the next section's heading pushes it out. The rows sit in an unpadded
 * `cmn-card` (`padding="none"`), so each row draws its own padding and dividers.
 *
 * Project a trailing summary (a day's total, a count) with the `cmnListSectionAside` attribute;
 * it sits at the heading's end. Set `card` to false when the rows bring their own container.
 */
@Component({
  selector: 'cmn-list-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, NgTemplateOutlet],
  host: {class: 'block'},
  template: `
    <section [attr.aria-labelledby]="headingId">
      <h2 [class]="headingClasses">
        <span [id]="headingId" class="min-w-0 truncate">{{ heading() }}</span>
        <ng-content select="[cmnListSectionAside]" />
      </h2>
      <ng-template #rows><ng-content /></ng-template>
      @if (card()) {
        <cmn-card padding="none"><ng-container *ngTemplateOutlet="rows" /></cmn-card>
      } @else {
        <ng-container *ngTemplateOutlet="rows" />
      }
    </section>
  `,
})
export class ListSectionComponent {
  public readonly heading = input.required<string>();
  /** Wraps the rows in a `cmn-card`; false leaves them bare. */
  public readonly card = input(true, {transform: booleanAttribute});

  protected readonly headingId = inject(_IdGenerator).getId('cmn-list-section-');
  protected readonly headingClasses = HEADING_CLASSES;
}
