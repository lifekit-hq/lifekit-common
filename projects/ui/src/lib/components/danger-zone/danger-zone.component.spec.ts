import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDialogService} from '../../services/dialog/dialog.service';
import {DangerZoneComponent} from './danger-zone.component';

describe('DangerZoneComponent', () => {
  let fixture: ComponentFixture<DangerZoneComponent>;
  let confirm: ReturnType<typeof vi.fn>;
  let confirmedCount: number;

  beforeEach(async () => {
    confirm = vi.fn().mockReturnValue(of(true));
    await TestBed.configureTestingModule({
      imports: [DangerZoneComponent],
      providers: [{provide: CmnDialogService, useValue: {confirm}}],
    }).compileComponents();

    fixture = TestBed.createComponent(DangerZoneComponent);
    fixture.componentRef.setInput('description', 'Permanently delete your account.');
    fixture.componentRef.setInput('actionLabel', 'Delete account');
    confirmedCount = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmedCount++);
    fixture.detectChanges();
  });

  function button(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector(
      'cmn-button button'
    ) as HTMLButtonElement;
  }

  it('shows the heading, description and action', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h2')?.textContent?.trim()).toBe('Danger zone');
    expect(root.textContent).toContain('Permanently delete your account.');
    expect(button().textContent?.trim()).toBe('Delete account');
  });

  it('names the section by its heading', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
      root.querySelector('h2')?.id
    );
  });

  it('opens a destructive confirm dialog instead of acting at once', () => {
    button().click();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith({
      title: 'Delete account?',
      message: 'Permanently delete your account.',
      confirmLabel: 'Delete account',
      confirmVariant: 'destructive',
    });
  });

  it('uses the supplied dialog title and message', () => {
    fixture.componentRef.setInput('confirmTitle', 'Delete everything?');
    fixture.componentRef.setInput('confirmMessage', 'All your data goes with it.');
    fixture.detectChanges();
    button().click();
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete everything?',
        message: 'All your data goes with it.',
      })
    );
  });

  it('emits confirmed once the user confirms', () => {
    button().click();
    expect(confirmedCount).toBe(1);
  });

  it('emits nothing when the user cancels', () => {
    confirm.mockReturnValue(of(false));
    button().click();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirmedCount).toBe(0);
  });

  it('blocks the action while disabled or busy', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(button().disabled).toBe(true);

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-busy')).toBe('true');
  });
});
