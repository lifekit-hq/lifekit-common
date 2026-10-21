import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {beforeEach, describe, expect, it} from 'vitest';

import {CMN_DIALOG_PRESENTATION, type CmnDialogPresentation} from '../dialog/dialog-config';
import {FormFieldComponent} from '../form-field/form-field.component';
import {InputComponent} from '../input/input.component';
import {ErrorSummaryComponent} from './error-summary.component';

const SERVER_ERROR = 'This email is already in use. Sign in instead.';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ErrorSummaryComponent, FormFieldComponent, InputComponent, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <cmn-error-summary [sheet]="sheet()" />
      @if (withNotes()) {
        <cmn-form-field [control]="form.controls.notes" label="Notes">
          <cmn-input formControlName="notes" />
        </cmn-form-field>
      }
      <cmn-form-field [control]="form.controls.name" label="Full name">
        <cmn-input formControlName="name" />
      </cmn-form-field>
      <cmn-form-field [control]="form.controls.email" [errorMessage]="serverError()" label="Email">
        <cmn-input formControlName="email" />
      </cmn-form-field>
      <cmn-form-field [control]="form.controls.phone" label="Phone">
        <cmn-input formControlName="phone" />
      </cmn-form-field>
    </form>
  `,
})
class ReactiveHostComponent {
  public readonly sheet = signal<boolean | null>(null);
  public readonly withNotes = signal(true);
  public readonly serverError = signal('');
  public rejectValidSubmit = false;
  public readonly form = new FormGroup({
    notes: new FormControl('', {nonNullable: true}),
    name: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
    email: new FormControl('', {nonNullable: true, validators: [Validators.email]}),
    phone: new FormControl('', {nonNullable: true, validators: [Validators.required]}),
  });

  public onSubmit(): void {
    this.serverError.set(this.rejectValidSubmit && this.form.valid ? SERVER_ERROR : '');
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ErrorSummaryComponent, FormFieldComponent, InputComponent, FormsModule],
  template: `
    <form #f="ngForm">
      <cmn-error-summary title="Check your details" />
      <cmn-form-field [control]="name.control" label="Full name">
        <cmn-input #name="ngModel" name="name" ngModel required />
      </cmn-form-field>
    </form>
  `,
})
class TemplateHostComponent {}

describe('ErrorSummaryComponent', () => {
  let fixture: ComponentFixture<ReactiveHostComponent>;
  let host: ReactiveHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [ReactiveHostComponent]}).compileComponents();
    fixture = TestBed.createComponent(ReactiveHostComponent);
    host = fixture.componentInstance;
  });

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const summary = (): HTMLElement | null => root().querySelector('cmn-error-summary > div');
  const links = (): HTMLAnchorElement[] =>
    Array.from(root().querySelectorAll<HTMLAnchorElement>('cmn-error-summary a'));
  const inlineErrors = (): string[] =>
    Array.from(root().querySelectorAll('cmn-form-field [role="alert"]')).map(
      el => el.textContent?.trim() ?? ''
    );

  async function submit(): Promise<void> {
    root().querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function type(index: number, value: string): void {
    const inputEl = root().querySelectorAll('input')[index];
    inputEl.value = value;
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('draws nothing before the form is submitted', () => {
    fixture.detectChanges();
    expect(summary()).toBeNull();
  });

  it('draws nothing on a submit without errors', async () => {
    fixture.detectChanges();
    type(1, 'Ada Lovelace');
    type(3, '0123 456 789');
    await submit();
    expect(summary()).toBeNull();
  });

  describe('on a submit with errors (guardrails V2)', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      type(2, 'not-an-email');
      await submit();
    });

    it('lists every error in the same words as the inline message, in form order', () => {
      expect(inlineErrors()).toHaveLength(3);
      expect(links().map(a => a.textContent?.trim())).toEqual(inlineErrors());
    });

    it('titles the summary and labels it by that title', () => {
      const heading = summary()?.querySelector('h2');
      expect(heading?.textContent?.trim()).toBe('There is a problem');
      expect(summary()?.getAttribute('aria-labelledby')).toBe(heading?.id);
      expect(summary()?.querySelector('[role="alert"]')).not.toBeNull();
    });

    it('links each entry to its field control', () => {
      const ids = links().map(a => a.getAttribute('href')?.slice(1));
      const invalid = Array.from(root().querySelectorAll('input[aria-invalid], input')).filter(el =>
        ids.includes(el.id)
      );
      expect(ids).toHaveLength(3);
      expect(invalid).toHaveLength(3);
    });

    it('moves focus to the summary', () => {
      expect(document.activeElement).toBe(summary());
    });

    it('focuses the field when a link is followed, without navigating', () => {
      const [first] = links();
      const event = new MouseEvent('click', {bubbles: true, cancelable: true});
      first.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement?.id).toBe(first.getAttribute('href')?.slice(1));
    });

    it('drops an entry as its field is fixed, and the summary with the last one', () => {
      type(1, 'Ada Lovelace');
      expect(links()).toHaveLength(2);
      type(2, 'ada@example.com');
      type(3, '0123 456 789');
      expect(summary()).toBeNull();
    });

    it('hides everything when the form is reset', () => {
      host.form.reset();
      fixture.detectChanges();
      expect(summary()).toBeNull();
    });

    it('moves focus back to the summary on the next submit', async () => {
      (root().querySelector('input') as HTMLInputElement).focus();
      await submit();
      expect(document.activeElement).toBe(summary());
    });
  });

  it('lists a server error set by the submit handler', async () => {
    host.rejectValidSubmit = true;
    fixture.detectChanges();
    type(1, 'Ada Lovelace');
    type(2, 'ada@example.com');
    type(3, '0123 456 789');
    await submit();
    expect(links().map(a => a.textContent?.trim())).toEqual([SERVER_ERROR]);
  });

  describe('a short sheet form (three or fewer fields)', () => {
    beforeEach(() => {
      host.withNotes.set(false);
    });

    it('draws no summary and focuses the first invalid field', async () => {
      host.sheet.set(true);
      fixture.detectChanges();
      type(1, 'not-an-email');
      await submit();
      expect(summary()).toBeNull();
      expect(inlineErrors()).toHaveLength(3);
      expect(document.activeElement).toBe(root().querySelectorAll('input')[0]);
    });

    it('still draws the summary outside a sheet', async () => {
      fixture.detectChanges();
      await submit();
      expect(document.activeElement).toBe(summary());
    });

    it('draws the summary on a sheet with more than three fields', async () => {
      host.withNotes.set(true);
      host.sheet.set(true);
      fixture.detectChanges();
      await submit();
      expect(document.activeElement).toBe(summary());
    });
  });

  describe('inside a cmn-dialog', () => {
    async function submitIn(presentation: CmnDialogPresentation): Promise<void> {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ReactiveHostComponent],
        providers: [{provide: CMN_DIALOG_PRESENTATION, useValue: signal(presentation)}],
      });
      fixture = TestBed.createComponent(ReactiveHostComponent);
      host = fixture.componentInstance;
      host.withNotes.set(false);
      fixture.detectChanges();
      await submit();
    }

    it('treats the phone sheet presentation as a sheet', async () => {
      await submitIn('sheet');
      expect(summary()).toBeNull();
      expect(document.activeElement).toBe(root().querySelectorAll('input')[0]);
    });

    it('draws the summary in the centred dialog', async () => {
      await submitIn('dialog');
      expect(document.activeElement).toBe(summary());
    });
  });

  it('works in a template-driven form with its own title', async () => {
    const tdFixture = TestBed.createComponent(TemplateHostComponent);
    tdFixture.detectChanges();
    await tdFixture.whenStable();
    const tdRoot = tdFixture.nativeElement as HTMLElement;
    tdRoot.querySelector('form')?.dispatchEvent(new Event('submit'));
    tdFixture.detectChanges();
    await tdFixture.whenStable();

    const tdSummary = tdRoot.querySelector('cmn-error-summary > div');
    expect(tdSummary?.querySelector('h2')?.textContent?.trim()).toBe('Check your details');
    expect(tdRoot.querySelectorAll('cmn-error-summary a')).toHaveLength(1);
    expect(document.activeElement).toBe(tdSummary);
  });
});
