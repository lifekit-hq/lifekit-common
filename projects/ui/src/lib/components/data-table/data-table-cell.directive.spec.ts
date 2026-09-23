import {ChangeDetectionStrategy, Component, viewChild} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {
  type CmnCellContext,
  CmnCellDirective,
  CmnHeaderCellDirective,
} from './data-table-cell.directive';

interface Row {
  amount: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CmnCellDirective, CmnHeaderCellDirective],
  template: `
    <ng-template cmnHeaderCell><span class="header">Amount</span></ng-template>
    <ng-template let-row let-i="index" cmnCell>
      <span class="cell">{{ i }}:{{ row.amount }}</span>
    </ng-template>
  `,
})
class HostComponent {
  public readonly cell = viewChild.required(CmnCellDirective<Row>);
  public readonly headerCell = viewChild.required(CmnHeaderCellDirective);

  public readonly context: CmnCellContext<Row> = {$implicit: {amount: '-$15.99'}, index: 2};
}

describe('CmnCellDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('captures the template it is applied to', () => {
    expect(fixture.componentInstance.cell().template).toBeTruthy();
  });

  it('renders row and index from the context it declares', () => {
    const view = fixture.componentInstance
      .cell()
      .template.createEmbeddedView(fixture.componentInstance.context);
    view.detectChanges();

    const text = view.rootNodes.map((n: Node) => (n as HTMLElement).textContent ?? '').join('');
    expect(text).toContain('2:-$15.99');
  });

  it('accepts any context through its template guard — `let-row` needs no explicit type', () => {
    expect(
      CmnCellDirective.ngTemplateContextGuard(fixture.componentInstance.cell(), {
        $implicit: {amount: '1'},
        index: 0,
      })
    ).toBe(true);
  });
});

describe('CmnHeaderCellDirective', () => {
  it('captures the header template it is applied to', async () => {
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const view = fixture.componentInstance.headerCell().template.createEmbeddedView({});
    view.detectChanges();
    const text = view.rootNodes.map((n: Node) => (n as HTMLElement).textContent ?? '').join('');
    expect(text).toContain('Amount');
  });
});
