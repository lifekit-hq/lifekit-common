import {OverlayContainer} from '@angular/cdk/overlay';
import {Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {
  type FilterBarChip,
  FilterBarComponent,
  FilterBarSheetDirective,
} from './filter-bar.component';

const ACTIVE = 3;
/** Past the drawer's close animation (220ms), after which its overlay is disposed. */
const CLOSE_WAIT_MS = 300;

@Component({
  imports: [FilterBarComponent, FilterBarSheetDirective],
  template: `
    <cmn-filter-bar
      [activeCount]="active()"
      [applied]="applied()"
      [(query)]="query"
      (remove)="removed.push($event)"
      (clear)="cleared = cleared + 1"
      (filtersClick)="clicks = clicks + 1"
      placeholder="Search transactions"
      sheetTitle="Transaction filters"
    >
      <div class="quick" cmnFilterBarQuick>Quick filters</div>
      @if (withSheet()) {
        <ng-template let-close="close" cmnFilterBarSheet>
          <p class="sheet-body">Sheet body</p>
          <button (click)="close()" class="sheet-done" type="button">Done</button>
        </ng-template>
      }
    </cmn-filter-bar>
  `,
})
class HostComponent {
  public readonly query = signal('');
  public readonly active = signal(0);
  public readonly applied = signal<FilterBarChip[]>([]);
  public readonly withSheet = signal(true);
  public readonly removed: string[] = [];
  public cleared = 0;
  public clicks = 0;
}

describe('FilterBarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;
  let overlay: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  function filtersButton(): HTMLButtonElement {
    return el.querySelector('cmn-badge button') as HTMLButtonElement;
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('writes what the reader types into query', async () => {
    const input = el.querySelector('cmn-search-input input') as HTMLInputElement;
    expect(input.placeholder).toBe('Search transactions');
    input.value = 'coffee';
    input.dispatchEvent(new Event('input'));
    await settle();
    expect(host.query()).toBe('coffee');
  });

  it('shows a query the host sets', async () => {
    host.query.set('rent');
    await settle();
    expect((el.querySelector('cmn-search-input input') as HTMLInputElement).value).toBe('rent');
  });

  it('names the icon-only Filters button and badges it with the active count', async () => {
    expect(filtersButton().textContent?.trim()).toBe('Filters');
    expect(el.querySelector('.cmn-badge-indicator')).toBeNull();
    host.active.set(ACTIVE);
    await settle();
    expect(el.querySelector('.cmn-badge-indicator')?.textContent?.trim()).toBe(String(ACTIVE));
  });

  it('projects the quick-filter slot', () => {
    expect(el.querySelector('cmn-filter-bar .quick')?.textContent).toBe('Quick filters');
  });

  it('shows no applied row while nothing is applied', () => {
    expect(el.querySelector('lk-dismissible-chip')).toBeNull();
    expect(el.textContent).not.toContain('Clear');
  });

  it('reports a removed chip by id and a clear', async () => {
    host.applied.set([
      {id: 'cat', label: 'Category: Groceries'},
      {id: 'dates', label: 'Dates: Sep'},
    ]);
    await settle();
    const chips = el.querySelectorAll('lk-dismissible-chip');
    expect(Array.from(chips).map(c => (c as HTMLElement & {label: string}).label)).toEqual([
      'Category: Groceries',
      'Dates: Sep',
    ]);
    chips[1].dispatchEvent(new CustomEvent('lk-dismissible-chip-remove', {bubbles: true}));
    expect(host.removed).toEqual(['dates']);

    const clear = Array.from(el.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Clear'
    );
    clear?.click();
    expect(host.cleared).toBe(1);
  });

  it('opens the sheet template in a drawer, and closes it from the template', async () => {
    filtersButton().click();
    await settle();
    expect(host.clicks).toBe(1);
    expect(overlay.querySelector('.sheet-body')?.textContent).toBe('Sheet body');
    expect(overlay.textContent).toContain('Transaction filters');

    filtersButton().click();
    await settle();
    expect(overlay.querySelectorAll('.sheet-body').length).toBe(1);

    (overlay.querySelector('.sheet-done') as HTMLButtonElement).click();
    await new Promise(resolve => setTimeout(resolve, CLOSE_WAIT_MS));
    expect(overlay.querySelector('.sheet-body')).toBeNull();

    filtersButton().click();
    await settle();
    expect(overlay.querySelectorAll('.sheet-body').length).toBe(1);
  });

  it('only emits filtersClick when there is no sheet template', async () => {
    host.withSheet.set(false);
    await settle();
    filtersButton().click();
    await settle();
    expect(host.clicks).toBe(1);
    expect(overlay.querySelector('cmn-filter-bar-sheet-host')).toBeNull();
  });

  it('closes an open sheet when the bar is destroyed', async () => {
    filtersButton().click();
    await settle();
    expect(overlay.querySelector('cmn-filter-bar-sheet-host')).not.toBeNull();
    fixture.destroy();
    await new Promise(resolve => setTimeout(resolve, CLOSE_WAIT_MS));
    expect(overlay.querySelector('.sheet-body')).toBeNull();
  });
});
