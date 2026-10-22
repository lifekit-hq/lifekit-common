import {type ComponentFixture, TestBed} from '@angular/core/testing';

import {ChartA11yComponent} from './chart-a11y.component';

describe('ChartA11yComponent', () => {
  let fixture: ComponentFixture<ChartA11yComponent>;
  const TABLE = {
    headers: ['Label', 'Spend'],
    rows: [
      ['Jan', '$100'],
      ['Feb', '$200'],
    ],
  };

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  beforeEach(() => {
    fixture = TestBed.createComponent(ChartA11yComponent);
    fixture.detectChanges();
  });

  it('keeps a polite live region present even with nothing to announce', () => {
    const region = query('[data-testid="chart-announcement"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.getAttribute('aria-atomic')).toBe('true');
    expect(region?.textContent?.trim()).toBe('');
    fixture.componentRef.setInput('announcement', 'Feb: $200');
    fixture.detectChanges();
    expect(region?.textContent?.trim()).toBe('Feb: $200');
  });

  it('renders no table without data', () => {
    expect(query('table')).toBeNull();
  });

  it('renders the data as a captioned table, a header per column and per row', () => {
    fixture.componentRef.setInput('table', TABLE);
    fixture.componentRef.setInput('caption', 'Spending');
    fixture.detectChanges();
    expect(query('caption')?.textContent?.trim()).toBe('Spending');
    const cols = [...fixture.nativeElement.querySelectorAll('th[scope="col"]')];
    expect(cols.map(th => th.textContent.trim())).toEqual(['Label', 'Spend']);
    const rows = [...fixture.nativeElement.querySelectorAll('tbody tr')].map(tr =>
      [...tr.children].map(cell => [cell.tagName, cell.textContent.trim()])
    );
    expect(rows).toEqual([
      [
        ['TH', 'Jan'],
        ['TD', '$100'],
      ],
      [
        ['TH', 'Feb'],
        ['TD', '$200'],
      ],
    ]);
  });

  it('hides the table visually unless asked to show it', () => {
    fixture.componentRef.setInput('table', TABLE);
    fixture.detectChanges();
    const wrapper = query('[data-testid="chart-data-table"]');
    expect(wrapper?.classList).toContain('sr-only');
    // The hidden wrapper already clips; a caption positioned inside it would be clipped twice.
    expect(query('caption')?.classList).not.toContain('sr-only');
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(wrapper?.classList).not.toContain('sr-only');
    expect(query('caption')?.classList).toContain('sr-only');
  });
});
