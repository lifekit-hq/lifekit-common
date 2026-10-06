import {BreakpointObserver, type BreakpointState} from '@angular/cdk/layout';
import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';

import {DataTableComponent} from './data-table.component';
import {CmnCellDirective, CmnHeaderCellDirective} from './data-table-cell.directive';
import {CmnColumnComponent} from './data-table-column.component';
import {type CmnTablePagination} from './data-table-pagination.model';

interface Row {
  name: string;
  amount: number;
}

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

const ROWS: Row[] = [
  {name: 'Groceries', amount: 54},
  {name: 'Salary', amount: 5000},
];

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
