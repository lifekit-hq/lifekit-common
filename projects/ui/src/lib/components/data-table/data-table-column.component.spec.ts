import {ChangeDetectionStrategy, Component, viewChild} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {CmnCellDirective, CmnHeaderCellDirective} from './data-table-cell.directive';
import {type CmnColumnAlign, CmnColumnComponent} from './data-table-column.component';

interface Row {
  amount: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CmnColumnComponent, CmnCellDirective, CmnHeaderCellDirective],
  template: `
    <cmn-column [key]="key" [header]="header" [align]="align">
      @if (withHeaderTemplate) {
        <ng-template cmnHeaderCell><span class="custom-header">Amount</span></ng-template>
      }
      @if (withCellTemplate) {
        <ng-template let-row let-i="index" cmnCell>
          <span class="custom-cell">{{ i }}:{{ row.amount }}</span>
        </ng-template>
      }
    </cmn-column>
  `,
})
class HostComponent {
  public readonly column = viewChild.required(CmnColumnComponent<Row>);

  public key = 'amount';
  public header = 'Amount';
  public align: CmnColumnAlign = 'left';
  public withCellTemplate = true;
  public withHeaderTemplate = true;
}

describe('CmnColumnComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('exposes its key, header and alignment', () => {
    host.align = 'right';
    fixture.detectChanges();

    expect(host.column().key()).toBe('amount');
    expect(host.column().header()).toBe('Amount');
    expect(host.column().align()).toBe('right');
  });

  it('defaults alignment to left and the header to empty', () => {
    host.header = '';
    fixture.detectChanges();
    expect(host.column().align()).toBe('left');
    expect(host.column().header()).toBe('');
  });

  it('picks up the projected cell and header templates', () => {
    fixture.detectChanges();
    expect(host.column().cell()).toBeTruthy();
    expect(host.column().headerCell()).toBeTruthy();
    expect(host.column().cell()?.template).toBeTruthy();
    expect(host.column().headerCell()?.template).toBeTruthy();
  });

  it('reports no templates when none are projected', () => {
    host.withCellTemplate = false;
    host.withHeaderTemplate = false;
    fixture.detectChanges();
    expect(host.column().cell()).toBeUndefined();
    expect(host.column().headerCell()).toBeUndefined();
  });
});
