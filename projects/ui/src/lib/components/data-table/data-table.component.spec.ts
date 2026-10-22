import {BreakpointObserver, type BreakpointState} from '@angular/cdk/layout';
import {ChangeDetectionStrategy, Component, input, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {BehaviorSubject} from 'rxjs';

import {TooltipDirective} from '../../directives/tooltip/tooltip.directive';
import {CardComponent} from '../card/card.component';
import {DataTableComponent} from './data-table.component';
import {
  CmnCellDirective,
  CmnHeaderCellDirective,
  CmnSummaryCellDirective,
} from './data-table-cell.directive';
import {CmnColumnComponent} from './data-table-column.component';
import {type CmnPageChange, type CmnTablePagination} from './data-table-pagination.model';
import {type CmnSortMode, type CmnTableSort} from './data-table-sort.model';

interface Row {
  name: string;
  amount: number;
}

const ROWS: Row[] = [
  {name: 'Groceries', amount: 54},
  {name: 'Salary', amount: 5000},
];

@Component({
  selector: 'cmn-test-host',
  imports: [CmnCellDirective, CmnColumnComponent, CmnHeaderCellDirective, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-data-table [rows]="rows()" [emptyMessage]="emptyMessage()" [rowsActionable]="actionable()">
      <cmn-column key="name" header="Name">
        <ng-template let-row cmnCell>{{ row.name }}</ng-template>
      </cmn-column>
      <cmn-column key="amount" align="right">
        <ng-template cmnHeaderCell>Amount</ng-template>
        <ng-template let-row cmnCell>\${{ row.amount }}</ng-template>
      </cmn-column>
    </cmn-data-table>
  `,
})
class TestHostComponent {
  public readonly rows = input<Row[]>([]);
  public readonly emptyMessage = input<string>('No data');
  public readonly actionable = input(false);
}

@Component({
  selector: 'cmn-test-loading-host',
  imports: [CmnColumnComponent, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-data-table [loading]="true">
      <cmn-column key="a" header="A" />
      <cmn-column key="b" header="B" />
      <cmn-column key="c" header="C" />
    </cmn-data-table>
  `,
})
class LoadingHostComponent {}

@Component({
  selector: 'cmn-test-card-host',
  imports: [CardComponent, CmnColumnComponent, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-card [fill]="true" padding="none">
      <cmn-data-table [rows]="rows">
        <cmn-column key="name" header="Name" />
      </cmn-data-table>
    </cmn-card>
  `,
})
class CardHostComponent {
  protected readonly rows = ROWS;
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show empty message when rows is empty', () => {
    fixture.componentRef.setInput('emptyMessage', 'Nothing here');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nothing here');
  });

  it('should render column headers (string and template)', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Name');
    expect(text).toContain('Amount');
  });

  it('should leave widths unset when no column declares one', () => {
    fixture.componentRef.setInput('rows', ROWS);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll('th, td') as NodeListOf<HTMLElement>;
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach(cell => expect(cell.style.width).toBe(''));
  });

  it('should render row data via projected cell templates', () => {
    fixture.componentRef.setInput('rows', ROWS);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Groceries');
    expect(text).toContain('$5000');
  });

  it('keeps rows inert by default', () => {
    fixture.componentRef.setInput('rows', ROWS);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('tr[cdk-row]') as HTMLElement;
    expect(row.hasAttribute('tabindex')).toBe(false);
    expect(row.className).not.toContain('hover:');
    expect(row.className).not.toContain('cursor-pointer');
  });

  it('makes rows focusable and actionable when rowsActionable is set', () => {
    fixture.componentRef.setInput('rows', ROWS);
    fixture.componentRef.setInput('actionable', true);
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector('tr[cdk-row]') as HTMLElement;
    expect(row.getAttribute('tabindex')).toBe('0');
    expect(row.className).toContain('hover:bg-surface-raised');
    expect(row.className).toContain('cursor-pointer');
  });

  it('renders one skeleton bar per column in every loading row', () => {
    const loading = TestBed.createComponent(LoadingHostComponent);
    loading.detectChanges();
    const rows = (loading.nativeElement as HTMLElement).querySelectorAll(
      '[data-testid="skeleton-row"]'
    );
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach(row => expect(row.querySelectorAll('cmn-skeleton')).toHaveLength(3));
  });

  it('sizes each skeleton bar on its host so the bar is visible in a flex row', () => {
    const loading = TestBed.createComponent(LoadingHostComponent);
    loading.detectChanges();
    const bars = (loading.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '[data-testid="skeleton-row"] cmn-skeleton'
    );
    expect(Array.from(bars).every(bar => bar.style.width !== '')).toBe(true);
  });

  it('draws its own frame on its own', () => {
    const frame: HTMLElement = fixture.nativeElement.querySelector('table').parentElement;
    expect(frame.classList).toContain('border');
    expect(frame.classList).toContain('bg-surface-card');
  });

  it('leaves the frame to an enclosing card, so a card never holds a second card', () => {
    const cardFixture = TestBed.createComponent(CardHostComponent);
    cardFixture.detectChanges();
    const frame: HTMLElement = cardFixture.nativeElement.querySelector('table').parentElement;
    expect(frame.classList).toContain('overflow-auto');
    expect(frame.classList).not.toContain('border');
    expect(frame.classList).not.toContain('bg-surface-card');
  });

  it('pins header cells with the sticky classes', () => {
    const headers = fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>;
    expect(headers.length).toBe(2);
    headers.forEach(th => {
      expect(th.classList).toContain('sticky');
      expect(th.classList).toContain('top-0');
    });
  });

  it.each([
    ['left', 'text-left'],
    ['center', 'text-center'],
    ['right', 'text-right'],
  ] as const)('maps %s alignment to the literal %s class', (align, expected) => {
    const table = fixture.debugElement.children[0].componentInstance as DataTableComponent;
    expect(table.headerCellClass(align)).toContain(expected);
    expect(table.dataCellClass(align)).toContain(expected);
  });
});

interface Txn {
  id: number;
  merchant: string;
  account: string;
  category: string;
  amount: string;
  base: string;
  status: string;
}

@Component({
  selector: 'cmn-test-list-host',
  imports: [CmnCellDirective, CmnColumnComponent, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-data-table
      [loading]="loading()"
      [mode]="mode()"
      [pagination]="pagination()"
      [rows]="rows()"
      [rowsActionable]="actionable()"
      [trackBy]="trackById"
      (rowClick)="clicked = $event"
      emptyMessage="No transactions"
    >
      <cmn-column key="logo" listSlot="leading">
        <ng-template let-row cmnCell
          ><span class="logo">{{ row.merchant[0] }}</span></ng-template
        >
      </cmn-column>
      <cmn-column key="merchant" header="Merchant" listSlot="primary" />
      <cmn-column key="account" header="Account" listSlot="secondary" />
      <cmn-column key="category" header="Category" listSlot="secondary" />
      <cmn-column key="status" header="Status" />
      <cmn-column key="amount" align="right" header="Amount" listSlot="trailing" />
      <cmn-column key="base" header="Base" listSlot="trailing-secondary" />
    </cmn-data-table>
  `,
})
class ListHostComponent {
  public readonly rows = input<Txn[]>([]);
  public readonly mode = input<'responsive' | 'table' | 'list'>('responsive');
  public readonly loading = input(false);
  public readonly actionable = input(true);
  public readonly pagination = input<CmnTablePagination | null>(null);
  public clicked: Txn | null = null;

  public readonly trackById = (_: number, row: Txn): number => row.id;
}

const TXNS: Txn[] = [
  {
    id: 1,
    merchant: 'Whole Foods',
    account: 'Checking',
    category: 'Groceries',
    amount: '-€87.43',
    base: '-$94.10',
    status: 'Pending',
  },
  {
    id: 2,
    merchant: 'Salary',
    account: 'Checking',
    category: 'Income',
    amount: '+€5,000.00',
    base: '+$5,381.00',
    status: 'Settled',
  },
];

/** Stands in for the viewport: `matches` is true from `md` up. */
class FakeBreakpointObserver {
  public readonly state$ = new BehaviorSubject<BreakpointState>({matches: true, breakpoints: {}});

  public setWide(matches: boolean): void {
    this.state$.next({matches, breakpoints: {}});
  }

  public isMatched(): boolean {
    return this.state$.value.matches;
  }

  public observe(): BehaviorSubject<BreakpointState> {
    return this.state$;
  }
}

describe('DataTableComponent list-row mode', () => {
  let fixture: ComponentFixture<ListHostComponent>;
  let viewport: FakeBreakpointObserver;
  let el: HTMLElement;

  beforeEach(async () => {
    viewport = new FakeBreakpointObserver();
    await TestBed.configureTestingModule({
      imports: [ListHostComponent],
      providers: [{provide: BreakpointObserver, useValue: viewport}],
    }).compileComponents();
    fixture = TestBed.createComponent(ListHostComponent);
    fixture.componentRef.setInput('rows', TXNS);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  function listRows(): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('[data-testid="list-row"]'));
  }

  function slot(row: HTMLElement, name: string): string {
    return row.querySelector(`[data-testid="list-${name}"]`)?.textContent?.trim() ?? '';
  }

  it('renders the table from md up', () => {
    expect(el.querySelector('table')).not.toBeNull();
    expect(listRows()).toHaveLength(0);
  });

  it('switches to list rows below md and back', () => {
    viewport.setWide(false);
    fixture.detectChanges();
    expect(el.querySelector('table')).toBeNull();
    expect(listRows()).toHaveLength(2);

    viewport.setWide(true);
    fixture.detectChanges();
    expect(el.querySelector('table')).not.toBeNull();
  });

  it('places each column in its declared slot', () => {
    fixture.componentRef.setInput('mode', 'list');
    fixture.detectChanges();
    const [first] = listRows();
    expect(first.querySelector('.logo')?.textContent).toBe('W');
    expect(slot(first, 'primary')).toBe('Whole Foods');
    expect(slot(first, 'secondary')).toMatch(/^Checking\s*·\s*Groceries$/);
    expect(slot(first, 'trailing')).toBe('-€87.43');
    expect(slot(first, 'trailing-secondary')).toBe('-$94.10');
  });

  it('hides columns without a slot in list mode', () => {
    fixture.componentRef.setInput('mode', 'list');
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Pending');
  });

  it('keeps the table below md when pinned to table mode', () => {
    viewport.setWide(false);
    fixture.componentRef.setInput('mode', 'table');
    fixture.detectChanges();
    expect(el.querySelector('table')).not.toBeNull();
    expect(el.textContent).toContain('Pending');
  });

  it('makes table rows focusable and actionable when rowsActionable is set', () => {
    const row = el.querySelector('tr[cdk-row]') as HTMLElement;
    expect(row.getAttribute('tabindex')).toBe('0');
    expect(row.className).toContain('hover:bg-surface-raised');
    expect(row.className).toContain('cursor-pointer');
  });

  it.each(['Enter', ' '])('emits rowClick when a table row receives %j', key => {
    const row = el.querySelector('tr[cdk-row]') as HTMLElement;
    const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true});
    row.dispatchEvent(event);
    expect(fixture.componentInstance.clicked?.merchant).toBe('Whole Foods');
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores other keys and keys pressed inside a cell control', () => {
    const row = el.querySelector('tr[cdk-row]') as HTMLElement;
    row.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', bubbles: true}));
    expect(fixture.componentInstance.clicked).toBeNull();

    const cell = row.querySelector('td') as HTMLElement;
    cell.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    expect(fixture.componentInstance.clicked).toBeNull();
  });

  it('keeps table and list rows inert and silent when rowsActionable is off', () => {
    fixture.componentRef.setInput('actionable', false);
    fixture.detectChanges();
    const row = el.querySelector('tr[cdk-row]') as HTMLElement;
    expect(row.hasAttribute('tabindex')).toBe(false);
    expect(row.className).not.toContain('cursor-pointer');
    row.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    expect(fixture.componentInstance.clicked).toBeNull();

    fixture.componentRef.setInput('mode', 'list');
    fixture.detectChanges();
    const [first] = listRows();
    expect(first.hasAttribute('tabindex')).toBe(false);
    expect(first.className).not.toContain('hover:');
    first.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true}));
    expect(fixture.componentInstance.clicked).toBeNull();
  });

  it('makes list rows focusable and emits on Enter', () => {
    fixture.componentRef.setInput('mode', 'list');
    fixture.detectChanges();
    const [first] = listRows();
    expect(first.getAttribute('tabindex')).toBe('0');
    expect(first.className).toContain('hover:bg-surface-raised');
    first.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    expect(fixture.componentInstance.clicked?.merchant).toBe('Whole Foods');
  });

  it('emits rowClick from a list row', () => {
    fixture.componentRef.setInput('mode', 'list');
    fixture.detectChanges();
    listRows()[1].click();
    expect(fixture.componentInstance.clicked?.merchant).toBe('Salary');
  });

  it('shows the empty message as a list row', () => {
    fixture.componentRef.setInput('mode', 'list');
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();
    expect(el.querySelector('ul')?.textContent).toContain('No transactions');
  });

  it('shows two-line skeleton rows while loading', () => {
    fixture.componentRef.setInput('mode', 'list');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="list-skeleton"]')).not.toBeNull();
    expect(listRows()).toHaveLength(0);
  });

  it('keeps pagination under the list', () => {
    fixture.componentRef.setInput('mode', 'list');
    fixture.componentRef.setInput('pagination', {
      totalCount: 40,
      offset: 0,
      limit: 20,
      hasMore: true,
    });
    fixture.detectChanges();
    expect(el.textContent).toContain('Page 1 of 2');
  });

  it('stays a table below md when no column declares a slot', async () => {
    viewport.setWide(false);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [{provide: BreakpointObserver, useValue: viewport}],
    }).compileComponents();
    const plain = TestBed.createComponent(TestHostComponent);
    plain.componentRef.setInput('rows', ROWS);
    plain.detectChanges();
    expect((plain.nativeElement as HTMLElement).querySelector('table')).not.toBeNull();
  });
});

@Component({
  selector: 'cmn-test-width-host',
  imports: [CmnCellDirective, CmnColumnComponent, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-data-table [rows]="rows()">
      <cmn-column key="name" header="Name" />
      <cmn-column [width]="amountWidth()" key="amount" align="right" header="Amount" />
    </cmn-data-table>
  `,
})
class WidthHostComponent {
  public readonly rows = input<Row[]>([]);
  public readonly amountWidth = input<string | null>('7rem');
}

describe('DataTableComponent column widths', () => {
  let fixture: ComponentFixture<WidthHostComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [WidthHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(WidthHostComponent);
    fixture.componentRef.setInput('rows', ROWS);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  function cellsOf(column: string): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>(`.cdk-column-${column}`));
  }

  it('applies the width to the header and every cell of that column', () => {
    const cells = cellsOf('amount');
    expect(cells).toHaveLength(ROWS.length + 1);
    cells.forEach(cell => expect(cell.style.width).toBe('7rem'));
  });

  it('leaves other columns without a width', () => {
    cellsOf('name').forEach(cell => expect(cell.style.width).toBe(''));
  });

  it('updates and clears the width reactively', () => {
    fixture.componentRef.setInput('amountWidth', '20%');
    fixture.detectChanges();
    cellsOf('amount').forEach(cell => expect(cell.style.width).toBe('20%'));

    fixture.componentRef.setInput('amountWidth', null);
    fixture.detectChanges();
    cellsOf('amount').forEach(cell => expect(cell.style.width).toBe(''));
  });
});

interface Account {
  name: string;
  balance: number | null;
  note: string | null;
}

const ACCOUNTS: Account[] = [
  {name: 'savings 10', balance: 300, note: 'Rainy day'},
  {name: 'Checking', balance: null, note: null},
  {name: 'savings 9', balance: -20, note: ''},
  {name: 'Brokerage', balance: 1200, note: 'Long-term index funds held across two providers'},
];

@Component({
  selector: 'cmn-test-sort-host',
  imports: [CmnCellDirective, CmnColumnComponent, CmnSummaryCellDirective, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-data-table
      [mode]="mode()"
      [rows]="rows()"
      [sortMode]="sortMode()"
      [(sort)]="sort"
      emptyCellLabel="Not set"
    >
      <cmn-column key="name" header="Name" listSlot="primary" sortable summary="Total" />
      <cmn-column
        [compare]="byAbsolute()"
        key="balance"
        align="right"
        header="Balance"
        listSlot="trailing"
        sortable
      >
        <ng-template cmnSummaryCell><b class="sum">1,480</b></ng-template>
      </cmn-column>
      <cmn-column [truncate]="truncate()" key="note" header="Note" />
      <cmn-column key="custom" header="Custom" truncate>
        <ng-template let-row cmnCell>{{ row.note ?? '' }}</ng-template>
      </cmn-column>
    </cmn-data-table>
  `,
})
class SortHostComponent {
  public readonly rows = input<Account[]>(ACCOUNTS);
  public readonly sortMode = input<CmnSortMode>('client');
  public readonly mode = input<'responsive' | 'table' | 'list'>('table');
  public readonly truncate = input(true);
  public readonly sort = signal<CmnTableSort | null>(null);
  public readonly byAbsolute = signal<((a: Account, b: Account) => number) | null>(null);
}

describe('DataTableComponent sorting', () => {
  let fixture: ComponentFixture<SortHostComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [SortHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(SortHostComponent);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  function header(key: string): HTMLElement {
    return el.querySelector(`th.cdk-column-${key}`) as HTMLElement;
  }

  function names(): string[] {
    return Array.from(el.querySelectorAll('td.cdk-cell.cdk-column-name')).map(
      td => td.textContent?.trim() ?? ''
    );
  }

  function clickSort(key: string): void {
    (header(key).querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('marks only sortable headers with aria-sort and a button', () => {
    expect(header('name').getAttribute('aria-sort')).toBe('none');
    expect(header('name').querySelector('button')?.type).toBe('button');
    expect(header('note').hasAttribute('aria-sort')).toBe(false);
    expect(header('note').querySelector('button')).toBeNull();
  });

  it('cycles ascending, descending and back to the given order', () => {
    const given = names();

    clickSort('name');
    expect(header('name').getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(['Brokerage', 'Checking', 'savings 9', 'savings 10']);
    expect(fixture.componentInstance.sort()).toEqual({key: 'name', direction: 'asc'});

    clickSort('name');
    expect(header('name').getAttribute('aria-sort')).toBe('descending');
    expect(names()).toEqual(['savings 10', 'savings 9', 'Checking', 'Brokerage']);

    clickSort('name');
    expect(header('name').getAttribute('aria-sort')).toBe('none');
    expect(names()).toEqual(given);
    expect(fixture.componentInstance.sort()).toBeNull();
  });

  it('sorts numbers by value and keeps empty values last in both directions', () => {
    clickSort('balance');
    expect(names()).toEqual(['savings 9', 'savings 10', 'Brokerage', 'Checking']);
    clickSort('balance');
    expect(names()).toEqual(['Brokerage', 'savings 10', 'savings 9', 'Checking']);
  });

  it('starts another column ascending and resets the previous header', () => {
    clickSort('name');
    clickSort('name');
    clickSort('balance');
    expect(header('balance').getAttribute('aria-sort')).toBe('ascending');
    expect(header('name').getAttribute('aria-sort')).toBe('none');
  });

  it('uses the column compare function when given', () => {
    fixture.componentInstance.byAbsolute.set(
      (a, b): number => Math.abs(a.balance ?? 0) - Math.abs(b.balance ?? 0)
    );
    fixture.componentInstance.sort.set({key: 'balance', direction: 'asc'});
    fixture.detectChanges();
    expect(names()).toEqual(['Checking', 'savings 9', 'savings 10', 'Brokerage']);
  });

  it('applies a sort bound from outside', () => {
    fixture.componentInstance.sort.set({key: 'name', direction: 'desc'});
    fixture.detectChanges();
    expect(names()[0]).toBe('savings 10');
    expect(header('name').getAttribute('aria-sort')).toBe('descending');
  });

  it('leaves rows in the given order and only reports the sort in server mode', () => {
    fixture.componentRef.setInput('sortMode', 'server');
    fixture.detectChanges();
    const given = names();
    clickSort('name');
    expect(fixture.componentInstance.sort()).toEqual({key: 'name', direction: 'asc'});
    expect(header('name').getAttribute('aria-sort')).toBe('ascending');
    expect(names()).toEqual(given);
  });

  it('ignores a sort on an unknown column', () => {
    const given = names();
    fixture.componentInstance.sort.set({key: 'missing', direction: 'asc'});
    fixture.detectChanges();
    expect(names()).toEqual(given);
  });

  it('ignores a sort on a column that is not sortable', () => {
    const given = names();
    fixture.componentInstance.sort.set({key: 'note', direction: 'desc'});
    fixture.detectChanges();
    expect(names()).toEqual(given);
  });

  describe('empty cells', () => {
    function noteCells(): HTMLElement[] {
      return Array.from(el.querySelectorAll<HTMLElement>('td.cdk-cell.cdk-column-note'));
    }

    it('renders a dash for null and blank values, with a label for screen readers', () => {
      const [, nullCell, blankCell] = noteCells();
      for (const cell of [nullCell, blankCell]) {
        expect(cell.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('\u2014');
        expect(cell.querySelector('.sr-only')?.textContent?.trim()).toBe('Not set');
      }
    });

    it('renders values as they are', () => {
      expect(noteCells()[0].textContent?.trim()).toBe('Rainy day');
      expect(noteCells()[0].querySelector('.sr-only')).toBeNull();
    });

    it('leaves a projected cell template alone', () => {
      const custom = el.querySelectorAll<HTMLElement>('td.cdk-cell.cdk-column-custom')[1];
      expect(custom.textContent?.trim()).toBe('');
    });
  });

  describe('truncation', () => {
    it('wraps a truncated cell in a focusable box carrying the full value as its tooltip', () => {
      const cell = el.querySelectorAll<HTMLElement>('td.cdk-cell.cdk-column-note')[3];
      expect(cell.classList).toContain('max-w-0');
      const box = cell.querySelector('[data-testid="truncated-cell"]') as HTMLElement;
      expect(box.classList).toContain('truncate');
      expect(box.tabIndex).toBe(0);

      const tooltips = fixture.debugElement
        .queryAll(By.directive(TooltipDirective))
        .map(d => d.injector.get(TooltipDirective));
      expect(tooltips.map(t => t.cmnTooltip())).toContain(ACCOUNTS[3].note);
      expect(tooltips.every(t => t.cmnTooltipTruncatedOnly())).toBe(true);
    });

    it('leaves empty cells and custom cell templates untruncated', () => {
      const notes = el.querySelectorAll<HTMLElement>('td.cdk-cell.cdk-column-note');
      for (const empty of [notes[1], notes[2]]) {
        expect(empty.classList).not.toContain('max-w-0');
        expect(empty.querySelector('[data-testid="truncated-cell"]')).toBeNull();
      }
      const custom = el.querySelectorAll<HTMLElement>('td.cdk-cell.cdk-column-custom');
      custom.forEach(td => {
        expect(td.classList).not.toContain('max-w-0');
        expect(td.querySelector('[data-testid="truncated-cell"]')).toBeNull();
      });
    });

    it('renders cells directly without truncate', () => {
      fixture.componentRef.setInput('truncate', false);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="truncated-cell"]')).toBeNull();
      expect(el.querySelector('td.cdk-cell.cdk-column-note')?.classList).not.toContain('max-w-0');
    });
  });

  describe('summary row', () => {
    it('renders each column summary text or template in a footer row', () => {
      const row = el.querySelector('[data-testid="summary-row"]') as HTMLElement;
      expect(row.closest('tfoot')).not.toBeNull();
      expect(row.querySelector('.cdk-column-name')?.textContent?.trim()).toBe('Total');
      expect(row.querySelector('.cdk-column-balance .sum')?.textContent).toBe('1,480');
      expect(row.querySelector('.cdk-column-note')?.textContent?.trim()).toBe('');
    });

    it('hides the summary row when there are no rows', () => {
      fixture.componentRef.setInput('rows', []);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="summary-row"]')?.classList).toContain('hidden');

      fixture.componentRef.setInput('rows', ACCOUNTS);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="summary-row"]')?.classList).not.toContain('hidden');
    });

    it('shows the summary as the last list row on a phone', () => {
      fixture.componentRef.setInput('mode', 'list');
      fixture.detectChanges();
      const summary = el.querySelector('[data-testid="list-summary"]') as HTMLElement;
      expect(summary.textContent).toContain('Total');
      expect(summary.querySelector('.sum')?.textContent).toBe('1,480');
    });
  });
});

@Component({
  selector: 'cmn-test-no-summary-host',
  imports: [CmnColumnComponent, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-data-table [rows]="rows" mode="list">
      <cmn-column key="name" header="Name" listSlot="primary" />
    </cmn-data-table>
    <cmn-data-table [rows]="rows" mode="table">
      <cmn-column key="name" header="Name" />
    </cmn-data-table>
  `,
})
class NoSummaryHostComponent {
  protected readonly rows = ROWS;
}

describe('DataTableComponent without summaries', () => {
  it('renders no summary row in either layout', async () => {
    await TestBed.configureTestingModule({imports: [NoSummaryHostComponent]}).compileComponents();
    const fixture = TestBed.createComponent(NoSummaryHostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="list-summary"]')).toBeNull();
    expect(el.querySelector('[data-testid="summary-row"]')).toBeNull();
    expect(el.querySelector('tfoot tr')).toBeNull();
  });
});

@Component({
  selector: 'cmn-test-pager-host',
  imports: [CmnColumnComponent, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cmn-data-table
      [pageSizeOptions]="sizes()"
      [pagination]="pagination()"
      [rows]="rows"
      (nextPage)="events.push('next')"
      (pageChange)="pages.push($event)"
      (previousPage)="events.push('previous')"
    >
      <cmn-column key="name" header="Name" />
    </cmn-data-table>
  `,
})
class PagerHostComponent {
  public readonly pagination = input<CmnTablePagination | null>(null);
  public readonly sizes = input<number[]>([]);
  public readonly events: string[] = [];
  public readonly pages: CmnPageChange[] = [];
  protected readonly rows = ROWS;
}

describe('DataTableComponent pager', () => {
  let fixture: ComponentFixture<PagerHostComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [PagerHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(PagerHostComponent);
    el = fixture.nativeElement as HTMLElement;
  });

  function show(offset: number, totalCount = 200, limit = 10): void {
    fixture.componentRef.setInput('pagination', {
      totalCount,
      offset,
      limit,
      hasMore: offset + limit < totalCount,
    });
    fixture.detectChanges();
  }

  function items(): string[] {
    return Array.from(el.querySelectorAll('[data-testid="page-numbers"] li')).map(
      li => li.textContent?.trim() ?? ''
    );
  }

  function pageButton(label: string): HTMLButtonElement {
    return el.querySelector(`button[aria-label="Page ${label}"]`) as HTMLButtonElement;
  }

  it.each([
    [0, 30, ['1', '2', '3']],
    [0, 70, ['1', '2', '3', '4', '5', '6', '7']],
    [0, 200, ['1', '2', '3', '4', '5', '\u2026', '20']],
    [30, 200, ['1', '2', '3', '4', '5', '\u2026', '20']],
    [90, 200, ['1', '\u2026', '9', '10', '11', '\u2026', '20']],
    [160, 200, ['1', '\u2026', '16', '17', '18', '19', '20']],
    [190, 200, ['1', '\u2026', '16', '17', '18', '19', '20']],
  ] as const)('lists pages for offset %i of %i', (offset, total, expected) => {
    show(offset, total);
    expect(items()).toEqual(expected);
  });

  it('marks the current page', () => {
    show(90);
    expect(pageButton('10').getAttribute('aria-current')).toBe('page');
    expect(pageButton('9').hasAttribute('aria-current')).toBe(false);
  });

  it('keeps the page count as text for narrow screens', () => {
    show(90);
    expect(el.textContent).toContain('Page 10 of 20');
  });

  it('emits the page a number asks for, and nothing for the current page', () => {
    show(90);
    pageButton('20').click();
    pageButton('10').click();
    expect(fixture.componentInstance.pages).toEqual([{offset: 190, limit: 10}]);
  });

  it('emits both the legacy event and pageChange from Previous and Next', () => {
    show(90);
    (el.querySelector('button[aria-label="Previous page"]') as HTMLButtonElement).click();
    (el.querySelector('button[aria-label="Next page"]') as HTMLButtonElement).click();
    expect(fixture.componentInstance.events).toEqual(['previous', 'next']);
    expect(fixture.componentInstance.pages).toEqual([
      {offset: 80, limit: 10},
      {offset: 100, limit: 10},
    ]);
  });

  it('hides the page size choice by default', () => {
    show(0);
    expect(el.querySelector('[data-testid="page-size"]')).toBeNull();
  });

  it('goes back to the first page with the new size when one is picked', async () => {
    fixture.componentRef.setInput('sizes', [10, 25, 50]);
    show(90);
    await fixture.whenStable();
    fixture.detectChanges();
    const select = el.querySelector('[data-testid="page-size"] select') as HTMLSelectElement;
    expect(select.getAttribute('aria-label')).toBe('Rows per page');
    expect(select.value).toBe('10');
    select.value = '25';
    select.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.pages).toEqual([{offset: 0, limit: 25}]);
  });
});
