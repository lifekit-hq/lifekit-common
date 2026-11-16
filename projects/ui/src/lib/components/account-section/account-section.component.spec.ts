import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {AccountSectionComponent} from './account-section.component';

describe('AccountSectionComponent', () => {
  let fixture: ComponentFixture<AccountSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [AccountSectionComponent]}).compileComponents();
    fixture = TestBed.createComponent(AccountSectionComponent);
  });

  function text(selector: string): string | undefined {
    fixture.detectChanges();
    const found = (fixture.nativeElement as HTMLElement).querySelector(selector);
    return found?.textContent?.trim();
  }

  it('shows the name and the email', () => {
    fixture.componentRef.setInput('account', {name: 'Ada Lovelace', email: 'ada@example.com'});
    expect(text('[data-account-name]')).toBe('Ada Lovelace');
    expect(text('[data-account-email]')).toBe('ada@example.com');
    expect(text('[data-account-empty]')).toBeUndefined();
  });

  it('leaves the Name row out when the name only repeats the email', () => {
    fixture.componentRef.setInput('account', {name: 'ada@example.com', email: 'ada@example.com'});
    expect(text('[data-account-name]')).toBeUndefined();
    expect(text('[data-account-email]')).toBe('ada@example.com');
  });

  it('shows the email alone when the account has no name', () => {
    fixture.componentRef.setInput('account', {email: 'ada@example.com'});
    expect(text('[data-account-name]')).toBeUndefined();
    expect(text('[data-account-email]')).toBe('ada@example.com');
  });

  it('says "Not signed in" without an account or an identity', () => {
    expect(text('[data-account-empty]')).toBe('Not signed in');
    fixture.componentRef.setInput('account', {name: ' ', email: ''});
    expect(text('[data-account-empty]')).toBe('Not signed in');
  });

  it('prints the caption of where the identity comes from', () => {
    fixture.componentRef.setInput('caption', 'Signed in through the Lifekit gate');
    expect(text('section')).toContain('Signed in through the Lifekit gate');
  });
});
