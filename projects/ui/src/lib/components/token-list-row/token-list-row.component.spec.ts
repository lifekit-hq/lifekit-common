import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {TokenListRowComponent} from './token-list-row.component';

describe('TokenListRowComponent', () => {
  let fixture: ComponentFixture<TokenListRowComponent>;
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [TokenListRowComponent]});
    fixture = TestBed.createComponent(TokenListRowComponent);
    fixture.componentRef.setInput('label', 'Laptop');
    fixture.componentRef.setInput('issuedAt', new Date(Date.now() - 2 * 86_400_000));
    fixture.detectChanges();
  });

  it('shows the label, the issued time and Never used for a token that was not used', () => {
    expect(root().textContent).toContain('Laptop');
    expect(root().textContent).toContain('Issued 2d ago');
    expect(root().textContent).toContain('Never used');
  });

  it('shows the prefix and last-used time when known', () => {
    fixture.componentRef.setInput('prefix', 'lk_pat_4f9c');
    fixture.componentRef.setInput('lastUsedAt', new Date(Date.now() - 3 * 3_600_000));
    fixture.detectChanges();
    expect(root().querySelector('code')?.textContent).toBe('lk_pat_4f9c…');
    expect(root().textContent).toContain('Last used 3h ago');
  });

  it('emits revoke from a Revoke button named for the token', () => {
    const revoke = vi.fn();
    fixture.componentInstance.revoke.subscribe(revoke);
    const button = root().querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Revoke Laptop');
    button.click();
    expect(revoke).toHaveBeenCalledOnce();
  });

  it('swaps Revoke for a Revoked tag once revoked', () => {
    fixture.componentRef.setInput('revoked', true);
    fixture.detectChanges();
    expect(root().querySelector('button')).toBeNull();
    expect(root().textContent).toContain('Revoked');
  });
});
