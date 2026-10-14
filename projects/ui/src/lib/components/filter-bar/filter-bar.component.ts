import {NgTemplateOutlet} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  Directive,
  inject,
  input,
  model,
  output,
  TemplateRef,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {LkDismissibleChip} from '@lifekit-hq/elements';

import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {BadgeComponent} from '../badge/badge.component';
import {ButtonComponent} from '../button/button.component';
import {CMN_DRAWER_DATA} from '../drawer/drawer-config';
import {CmnDrawerRef} from '../drawer/drawer-ref';
import {SearchInputComponent} from '../search-input/search-input.component';

/** One applied filter, shown as a removable chip under the search row. */
export interface FilterBarChip {
  /** What `remove` reports when the reader drops this chip. */
  id: string;
  /** The chip's text, e.g. "Category: Groceries". */
  label: string;
}

/** Context of a `cmnFilterBarSheet` template; `close` dismisses the sheet. */
export interface FilterBarSheetContext {
  $implicit: CmnDrawerRef;
  close: () => void;
}

/**
 * Marks the `ng-template` the filter bar opens when the reader presses its Filters button: a
 * bottom sheet on a phone, a side drawer from `md` up (`CmnDrawerService`, responsive mode).
 *
 * @example
 * <ng-template cmnFilterBarSheet let-close="close">…<cmn-button (clicked)="close()">Done</cmn-button></ng-template>
 */
@Directive({selector: 'ng-template[cmnFilterBarSheet]'})
export class FilterBarSheetDirective {
  public readonly template: TemplateRef<FilterBarSheetContext> = inject(TemplateRef);
}

/** What the filter bar hands its sheet host through the drawer. */
interface FilterBarSheetData {
  template: TemplateRef<FilterBarSheetContext>;
}

/** Renders a consumer's `cmnFilterBarSheet` template inside the drawer the filter bar opens. */
@Component({
  selector: 'cmn-filter-bar-sheet-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="data.template; context: context" />',
})
class FilterBarSheetHostComponent {
  private readonly drawerRef = inject(CmnDrawerRef);

  protected readonly data = inject<FilterBarSheetData>(CMN_DRAWER_DATA);
  protected readonly context: FilterBarSheetContext = {
    $implicit: this.drawerRef,
    close: () => this.drawerRef.close(),
  };
}

/**
 * The filter bar above a long list (transactions, events, alerts), as finance-sentry's ledger lays
 * it out: a search field with a Filters button beside it, a slot for a quick-filter row, and the
 * applied filters as removable chips with a Clear action.
 *
 * - `query` is two-way (`[(query)]`); the bar does not debounce it.
 * - `activeCount` badges the Filters button; 0 shows no badge.
 * - `applied` lists the applied filters; `remove` reports a dropped chip's `id` and `clear` asks
 *   the host to drop them all. The bar keeps no filter state of its own.
 * - Project a quick-filter row (an `lk-chip-row`, a `cmn-segmented`) with the `cmnFilterBarQuick`
 *   attribute; it sits between the search row and the applied chips.
 * - The Filters button emits `filtersClick`. With a `cmnFilterBarSheet` template inside, it also
 *   opens that template as a bottom sheet on a phone and a side drawer from `md` up.
 */
@Component({
  selector: 'cmn-filter-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SearchInputComponent, BadgeComponent, ButtonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {class: 'flex flex-col gap-cmn-3'},
  template: `
    <div class="flex items-center gap-cmn-2">
      <cmn-search-input
        [ngModel]="query()"
        [placeholder]="placeholder()"
        [ariaLabel]="searchLabel()"
        (ngModelChange)="query.set($event)"
        class="min-w-0 flex-1"
      />
      <cmn-badge [count]="activeCount()">
        <cmn-button (clicked)="openFilters()" variant="secondary" icon="SlidersHorizontal">
          <span class="sr-only">{{ filtersLabel() }}</span>
        </cmn-button>
      </cmn-badge>
    </div>
    <ng-content select="[cmnFilterBarQuick]" />
    @if (applied().length > 0) {
      <div class="flex flex-wrap items-center gap-x-cmn-2 gap-y-cmn-3">
        @for (chip of applied(); track chip.id) {
          <lk-dismissible-chip
            [label]="chip.label"
            (lk-dismissible-chip-remove)="remove.emit(chip.id)"
          />
        }
        <cmn-button (clicked)="clear.emit()" variant="secondary" size="sm">
          {{ clearLabel() }}
        </cmn-button>
      </div>
    }
  `,
})
export class FilterBarComponent {
  private readonly drawer = inject(CmnDrawerService);
  private drawerRef: CmnDrawerRef | null = null;

  public readonly query = model<string>('');
  public readonly placeholder = input<string>('Search');
  public readonly searchLabel = input<string>('Search');
  public readonly activeCount = input<number>(0);
  public readonly applied = input<readonly FilterBarChip[]>([]);
  /** Accessible name of the icon-only Filters button. */
  public readonly filtersLabel = input<string>('Filters');
  /** Heading of the sheet or drawer the Filters button opens. */
  public readonly sheetTitle = input<string>('Filters');
  public readonly clearLabel = input<string>('Clear');

  public readonly remove = output<string>();
  public readonly clear = output<void>();
  public readonly filtersClick = output<void>();

  protected readonly sheet = contentChild(FilterBarSheetDirective);

  constructor() {
    // Importing the class keeps the bundler from dropping the element; define it where it is used.
    if (!customElements.get('lk-dismissible-chip')) {
      customElements.define('lk-dismissible-chip', LkDismissibleChip);
    }
    inject(DestroyRef).onDestroy(() => this.closeFilters());
  }

  /** Emits `filtersClick` and opens the `cmnFilterBarSheet` template, when there is one. */
  public openFilters(): void {
    this.filtersClick.emit();
    const sheet = this.sheet();
    if (!sheet || this.drawerRef) {
      return;
    }
    const ref = this.drawer.open<unknown, FilterBarSheetData>(FilterBarSheetHostComponent, {
      mode: 'responsive',
      title: this.sheetTitle(),
      data: {template: sheet.template},
    });
    this.drawerRef = ref;
    ref.beforeClose$.subscribe({complete: () => (this.drawerRef = null)});
  }

  /** Closes the filters sheet if it is open. */
  public closeFilters(): void {
    this.drawerRef?.close();
  }
}
