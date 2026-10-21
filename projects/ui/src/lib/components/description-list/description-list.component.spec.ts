import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {DescriptionItemComponent, DescriptionListComponent} from './description-list.component';

@Component({
  selector: 'cmn-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DescriptionListComponent, DescriptionItemComponent],
  template: `
    <cmn-description-list>
      <cmn-description-item label="Sector" value="Technology" />
      <cmn-description-item label="Exchange"><a href="#nasdaq">NASDAQ</a></cmn-description-item>
      <cmn-description-item [value]="dividend()" label="Dividend yield" />
      <cmn-description-item label="Analyst target" value="   " />
      @if (showIsin()) {
        <cmn-description-item label="ISIN" value="US0378331005" />
      }
    </cmn-description-list>
  `,
})
class HostComponent {
  public readonly dividend = signal<string | null>(null);
  public readonly showIsin = signal(false);
}

describe('DescriptionListComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  function rows(): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>('dl > div'));
  }

  function values(): string[] {
    return Array.from(root.querySelectorAll('dd')).map(dd => dd.textContent?.trim() ?? '');
  }

  it('renders one dl whose only children are groups of a dt followed by a dd', () => {
    const lists = root.querySelectorAll('dl');
    expect(lists.length).toBe(1);
    const children = Array.from(lists[0].children);
    expect(children.length).toBe(4);
    for (const child of children) {
      expect(child.tagName).toBe('DIV');
      expect(Array.from(child.children).map(el => el.tagName)).toEqual(['DT', 'DD']);
    }
  });

  it('labels each term and leaves no item element inside the dl', () => {
    expect(Array.from(root.querySelectorAll('dt')).map(dt => dt.textContent?.trim())).toEqual([
      'Sector',
      'Exchange',
      'Dividend yield',
      'Analyst target',
    ]);
    expect(root.querySelector('dl cmn-description-item')).toBeNull();
  });

  it('shows a text value, or the projected content in its dd', () => {
    expect(values()[0]).toBe('Technology');
    const link = rows()[1].querySelector('dd > a');
    expect(link?.textContent).toBe('NASDAQ');
    expect(values()[1]).toBe('NASDAQ');
  });

  it('shows a dash for a missing or blank value, and the value once it arrives', () => {
    expect(values()[2]).toBe('—');
    expect(values()[3]).toBe('—');

    fixture.componentInstance.dividend.set('0.44%');
    fixture.detectChanges();
    expect(values()[2]).toBe('0.44%');
  });

  it('adds and removes rows as items come and go', () => {
    fixture.componentInstance.showIsin.set(true);
    fixture.detectChanges();
    expect(rows().length).toBe(5);
    expect(rows()[4].querySelector('dt')?.textContent?.trim()).toBe('ISIN');

    fixture.componentInstance.showIsin.set(false);
    fixture.detectChanges();
    expect(rows().length).toBe(4);
  });

  it('stacks label and value below sm and sets them side by side from sm up', () => {
    const row = rows()[0];
    expect(row.className).toContain('sm:grid');
    expect(row.className).not.toMatch(/(?:^|\s)grid(?:\s|$)/);
    expect(row.querySelector('dd')?.className).toContain('sm:col-span-2');
  });

  it('wraps long labels and values', () => {
    for (const cell of root.querySelectorAll('dt, dd')) {
      expect(cell.className).toContain('break-words');
      expect(cell.className).toContain('min-w-0');
    }
  });
});
