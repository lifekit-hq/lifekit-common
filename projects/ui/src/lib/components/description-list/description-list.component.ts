import {NgTemplateOutlet} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  type TemplateRef,
  viewChild,
} from '@angular/core';

/** Shown for an item with no value and no projected content. */
const EMPTY_VALUE = '—';

/**
 * One term and its value in a `cmn-description-list`. Give the value as text (`value`) or project
 * it as content (a tag, a link, a formatted amount). With neither, the value shows a dash.
 *
 * The item renders nothing in place: the list draws each item's `<dt>` and `<dd>` itself, so the
 * `<dl>` holds only the groups HTML allows.
 */
@Component({
  selector: 'cmn-description-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #valueTemplate>
      <ng-content>{{ displayValue() }}</ng-content>
    </ng-template>
  `,
})
export class DescriptionItemComponent {
  public readonly label = input.required<string>();
  public readonly value = input<string | null | undefined>(null);
  /** The value's content, drawn into the list's `<dd>`. */
  public readonly valueTemplate = viewChild.required<TemplateRef<unknown>>('valueTemplate');
  protected readonly displayValue = computed(() => this.value()?.trim() || EMPTY_VALUE);
}

/**
 * A key-value list: labelled facts about one thing (an account's details, a holding's key stats),
 * as a semantic `<dl>` with a `<dt>`/`<dd>` pair per `cmn-description-item`.
 *
 * Label and value sit side by side from `sm` up, the label in the first of three columns, and
 * stack on a phone. Long labels and values wrap, breaking a long unspaced value (an IBAN, a
 * URL) rather than overflowing. Rows are divided by a hairline; set it in a `cmn-card` for a
 * surface.
 */
@Component({
  selector: 'cmn-description-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  host: {class: 'block'},
  template: `
    <dl class="divide-y divide-border-default">
      @for (item of items(); track item) {
        <div class="py-cmn-3 sm:grid sm:grid-cols-3 sm:gap-cmn-4">
          <dt class="min-w-0 break-words font-label text-cmn-sm font-medium text-text-secondary">
            {{ item.label() }}
          </dt>
          <dd
            class="mt-cmn-1 min-w-0 break-words text-cmn-sm text-text-primary sm:col-span-2 sm:mt-0"
          >
            <ng-container [ngTemplateOutlet]="item.valueTemplate()" />
          </dd>
        </div>
      }
    </dl>
  `,
})
export class DescriptionListComponent {
  protected readonly items = contentChildren(DescriptionItemComponent);
}
