import {Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {type ChartTable} from '@lifekit-hq/charts-core';
import {userEvent} from 'vitest/browser';

import {ChartFrameComponent} from './chart-frame.component';

const TABLE: ChartTable = {
  headers: ['Label', 'Revenue'],
  rows: [
    ['Q1', '$96'],
    ['Q2', '$101'],
  ],
};

@Component({
  imports: [ChartFrameComponent],
  template: `
    <cmn-chart-frame [table]="table" label="Revenue">
      <div data-testid="plot">plot</div>
      <span chartCaption data-testid="slotted">Blue bars are actuals.</span>
    </cmn-chart-frame>
  `,
})
class HostComponent {
  public table = TABLE;
}

describe('ChartFrameComponent', () => {
  let fixture: ComponentFixture<ChartFrameComponent>;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);
  const chip = (): HTMLButtonElement | null =>
    query('[data-testid="chart-table-chip"] button') as HTMLButtonElement | null;
  const plot = (): HTMLElement => query('[data-testid="chart-plot"]') as HTMLElement;
  const table = (): HTMLElement | null => query('[data-testid="chart-data-table"]');

  function set(inputs: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(ChartFrameComponent);
    fixture.detectChanges();
  });

  it('titles the frame', () => {
    set({label: 'Revenue'});
    expect(fixture.nativeElement.textContent).toContain('Revenue');
  });

  describe('table chip', () => {
    it('is absent without a table, so an empty chart offers nothing to swap to', () => {
      expect(chip()).toBeNull();
    });

    it('swaps the plot for the table and back, and says which is showing', () => {
      set({label: 'Revenue', table: TABLE});
      expect(chip()?.getAttribute('aria-pressed')).toBe('false');
      expect(plot().classList).not.toContain('hidden');
      expect(table()?.classList).toContain('sr-only');

      chip()?.click();
      fixture.detectChanges();
      expect(chip()?.getAttribute('aria-pressed')).toBe('true');
      expect(plot().classList).toContain('hidden');
      expect(table()?.classList).not.toContain('sr-only');

      chip()?.click();
      fixture.detectChanges();
      expect(chip()?.getAttribute('aria-pressed')).toBe('false');
      expect(plot().classList).not.toContain('hidden');
    });

    it('is reached by Tab and pressed by Enter and Space', async () => {
      set({table: TABLE});
      document.body.appendChild(fixture.nativeElement);
      await userEvent.tab();
      expect(document.activeElement).toBe(chip());

      await userEvent.keyboard('{Enter}');
      fixture.detectChanges();
      expect(chip()?.getAttribute('aria-pressed')).toBe('true');
      expect(table()?.classList).not.toContain('sr-only');

      await userEvent.keyboard(' ');
      fixture.detectChanges();
      expect(chip()?.getAttribute('aria-pressed')).toBe('false');
      expect(table()?.classList).toContain('sr-only');
      fixture.nativeElement.remove();
    });

    it('opens on the table when tableOpen is set', () => {
      set({table: TABLE, tableOpen: true});
      expect(plot().classList).toContain('hidden');
      expect(table()?.classList).not.toContain('sr-only');
    });

    it('keeps the plot when asked for the table but there is none', () => {
      set({table: null, tableOpen: true});
      expect(plot().classList).not.toContain('hidden');
    });

    it('names the table for a screen reader by tableName, else by the title', () => {
      set({label: 'Revenue', table: TABLE});
      expect(query('caption')?.textContent?.trim()).toBe('Revenue');
      set({tableName: 'Quarterly revenue'});
      expect(query('caption')?.textContent?.trim()).toBe('Quarterly revenue');
    });
  });

  describe('sources', () => {
    it('adds no Source column when the data has none', () => {
      set({table: TABLE});
      const heads = [...fixture.nativeElement.querySelectorAll('th[scope="col"]')];
      expect(heads.map(th => th.textContent.trim())).toEqual(['Label', 'Revenue']);
    });

    it('adds a Source column with one source per row', () => {
      set({table: TABLE, sources: ['SEC filing', 'Analyst consensus'], tableOpen: true});
      const heads = [...fixture.nativeElement.querySelectorAll('th[scope="col"]')];
      expect(heads.map(th => th.textContent.trim())).toEqual(['Label', 'Revenue', 'Source']);
      const rows = [...fixture.nativeElement.querySelectorAll('tbody tr')].map(tr =>
        [...tr.children].map(cell => cell.textContent.trim())
      );
      expect(rows).toEqual([
        ['Q1', '$96', 'SEC filing'],
        ['Q2', '$101', 'Analyst consensus'],
      ]);
    });

    it('leaves the cell empty for a row the sources do not reach', () => {
      set({table: TABLE, sources: ['SEC filing']});
      const last = fixture.nativeElement.querySelectorAll('tbody tr')[1].lastElementChild;
      expect(last.textContent.trim()).toBe('');
    });
  });

  describe('caption', () => {
    it('takes no room when there is none', () => {
      const caption = query('[data-testid="chart-caption"]') as HTMLElement;
      expect(caption.children).toHaveLength(0);
      expect(caption.textContent?.trim()).toBe('');
      expect(caption.classList).toContain('empty:hidden');
    });

    it('shows the plain-language line under the plot', () => {
      set({caption: 'Revenue per quarter (blue bars); forecast (hatched).'});
      const caption = query('[data-testid="chart-caption"]') as HTMLElement;
      expect(caption.tagName).toBe('FIGCAPTION');
      expect(caption.textContent?.trim()).toBe(
        'Revenue per quarter (blue bars); forecast (hatched).'
      );
      expect(
        plot().compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  describe('host box', () => {
    const hostClasses = (): DOMTokenList => (fixture.nativeElement as HTMLElement).classList;

    it('is a real box when framed, so a parent can measure the chart', () => {
      set({label: 'Revenue'});
      expect(hostClasses()).toContain('block');
      expect(hostClasses()).not.toContain('contents');
    });

    it('dissolves when bare, so the plot keeps the height its parent gives it', () => {
      set({bare: true});
      expect(hostClasses()).toContain('contents');
      expect(hostClasses()).not.toContain('block');
    });
  });

  describe('bare', () => {
    it('draws the plot alone: no title, chip or caption', () => {
      set({label: 'Revenue', table: TABLE, caption: 'Caption', bare: true});
      expect(chip()).toBeNull();
      expect(query('figcaption')).toBeNull();
      expect(query('span.font-label')).toBeNull();
      expect(plot().classList).toContain('contents');
    });

    it('keeps the plot showing when opened on the table, as there is no chip to return', () => {
      set({table: TABLE, bare: true, tableOpen: true});
      expect(plot().classList).not.toContain('hidden');
      expect(table()?.classList).toContain('sr-only');
    });
  });

  it('announces what the plot is reading, politely', () => {
    set({announcement: 'Q2: $101'});
    expect(query('[data-testid="chart-announcement"]')?.textContent?.trim()).toBe('Q2: $101');
  });

  describe('projected content', () => {
    it('projects the plot and a slotted caption', () => {
      const host = TestBed.createComponent(HostComponent);
      host.detectChanges();
      const el: HTMLElement = host.nativeElement;
      expect(el.querySelector('[data-testid="plot"]')).toBeTruthy();
      expect(el.querySelector('figcaption [data-testid="slotted"]')?.textContent).toContain(
        'Blue bars are actuals.'
      );
    });
  });
});
