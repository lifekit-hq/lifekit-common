import {DialogRef} from '@angular/cdk/dialog';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CMN_DIALOG_DATA} from '../dialog/dialog-config';
import {CommandPaletteComponent} from './command-palette.component';
import {type CommandPaletteItem} from './command-palette-item.model';

const ITEMS: CommandPaletteItem[] = [
  {id: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', group: 'Pages'},
  {id: '/accounts', label: 'Accounts', icon: 'Building2', group: 'Pages'},
  {id: '_connect', label: 'Connect Account', icon: 'Link', group: 'Actions'},
];

describe('CommandPaletteComponent', () => {
  let fixture: ComponentFixture<CommandPaletteComponent>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: DialogRef, useValue: {close}},
        {provide: CMN_DIALOG_DATA, useValue: ITEMS},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CommandPaletteComponent);
    fixture.detectChanges();
  });

  function rows(): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.cursor-pointer')
    );
  }

  function groupHeadings(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.uppercase')
    ).map(el => el.textContent?.trim() ?? '');
  }

  function search(): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
  }

  function type(value: string): void {
    const el = search();
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function press(key: string): void {
    window.dispatchEvent(new KeyboardEvent('keydown', {key}));
    fixture.detectChanges();
  }

  it('lists every item grouped by its group', () => {
    expect(rows()).toHaveLength(3);
    expect(groupHeadings()).toEqual(['Pages', 'Actions']);
  });

  it('filters by label', () => {
    type('accou');
    expect(rows()).toHaveLength(2);
  });

  it('filters by group name too', () => {
    type('actions');
    expect(rows()).toHaveLength(1);
  });

  it('shows an empty state naming the query when nothing matches', () => {
    type('zzzz');
    expect(rows()).toHaveLength(0);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No results for "zzzz"');
  });

  it('moves the selection down and stops at the last item', () => {
    press('ArrowDown');
    press('ArrowDown');
    press('ArrowDown');
    press('ArrowDown');
    press('Enter');
    expect(close).toHaveBeenCalledWith({type: 'action', id: '_connect'});
  });

  it('moves the selection up and stops at the first item', () => {
    press('ArrowDown');
    press('ArrowUp');
    press('ArrowUp');
    press('Enter');
    expect(close).toHaveBeenCalledWith({type: 'navigate', id: '/dashboard'});
  });

  it('resets the selection to the top when the result set changes', () => {
    press('ArrowDown');
    press('ArrowDown');
    type('pages');
    expect(rows()).toHaveLength(2);

    press('Enter');
    expect(close).toHaveBeenCalledWith({type: 'navigate', id: '/dashboard'});
  });

  it('classifies an underscore-prefixed id as an action and everything else as navigation', () => {
    rows()[2].click();
    expect(close).toHaveBeenCalledWith({type: 'action', id: '_connect'});

    close.mockClear();
    rows()[0].click();
    expect(close).toHaveBeenCalledWith({type: 'navigate', id: '/dashboard'});
  });

  it('selects the row the pointer hovers', () => {
    rows()[1].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    press('Enter');
    expect(close).toHaveBeenCalledWith({type: 'navigate', id: '/accounts'});
  });

  it('closes with no result on Escape', () => {
    press('Escape');
    expect(close).toHaveBeenCalledWith();
  });

  it('closes with no result when the backdrop is clicked', () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.fixed')?.click();
    expect(close).toHaveBeenCalledWith();
  });

  it('keeps the palette open when the panel itself is clicked', () => {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.cmn-palette-panel')
      ?.click();
    expect(close).not.toHaveBeenCalled();
  });

  it('does nothing on Enter when the filter matches nothing', () => {
    type('zzzz');
    press('Enter');
    expect(close).not.toHaveBeenCalled();
  });
});
