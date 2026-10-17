import {Dialog, DialogRef} from '@angular/cdk/dialog';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {ConfirmDialogComponent, type ConfirmDialogData} from './confirm-dialog.component';
import {
  CMN_DIALOG_DATA,
  CMN_DIALOG_PRESENTATION,
  type CmnDialogPresentation,
} from './dialog-config';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  function setup(data: ConfirmDialogData, presentation?: CmnDialogPresentation): void {
    close = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: DialogRef, useValue: {close}},
        {provide: CMN_DIALOG_DATA, useValue: data},
        {provide: Dialog, useValue: {open: vi.fn()}},
        ...(presentation
          ? [{provide: CMN_DIALOG_PRESENTATION, useValue: signal(presentation)}]
          : []),
      ],
    });
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
  }

  function buttons(): HTMLButtonElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')
    );
  }

  beforeEach(() => {
    setup({message: 'Delete this account?'});
  });

  it('renders the message', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Delete this account?');
  });

  it('omits the heading when no title is supplied', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')).toBeNull();
  });

  it('renders the heading when a title is supplied', () => {
    setup({title: 'Are you sure?', message: 'This cannot be undone.'});
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')?.textContent?.trim()).toBe(
      'Are you sure?'
    );
  });

  it('defaults the action labels to Cancel and Confirm', () => {
    const labels = buttons().map(b => b.textContent?.trim());
    expect(labels).toEqual(['Cancel', 'Confirm']);
  });

  it('uses caller-supplied action labels', () => {
    setup({message: 'Disconnect?', cancelLabel: 'Keep it', confirmLabel: 'Disconnect'});
    const labels = buttons().map(b => b.textContent?.trim());
    expect(labels).toEqual(['Keep it', 'Disconnect']);
  });

  it('closes with true on confirm', () => {
    buttons()[1].click();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('closes with false on cancel', () => {
    buttons()[0].click();
    expect(close).toHaveBeenCalledWith(false);
  });

  it('honours a destructive confirm variant', () => {
    setup({message: 'Delete forever?', confirmVariant: 'destructive'});
    expect(buttons()[1].className).toContain('bg-status-error');
  });

  describe('as an action sheet', () => {
    beforeEach(() => {
      setup(
        {title: 'Disconnect?', message: 'Sync stops.', confirmLabel: 'Disconnect'},
        'action-sheet'
      );
    });

    it('leaves the title and Cancel to the container', () => {
      expect((fixture.nativeElement as HTMLElement).querySelector('h2')).toBeNull();
      expect(buttons().map(b => b.textContent?.trim())).toEqual(['Disconnect']);
    });

    it('centres the message and still confirms', () => {
      expect((fixture.nativeElement as HTMLElement).querySelector('p')?.className).toContain(
        'text-center'
      );
      buttons()[0].click();
      expect(close).toHaveBeenCalledWith(true);
    });
  });

  it('keeps the title and Cancel in a centred dialog', () => {
    setup({title: 'Disconnect?', message: 'Sync stops.'}, 'dialog');
    expect(buttons()).toHaveLength(2);
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')).not.toBeNull();
  });
});
