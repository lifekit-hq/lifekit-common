import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {SessionSectionComponent} from './session-section.component';

describe('SessionSectionComponent', () => {
  let fixture: ComponentFixture<SessionSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [SessionSectionComponent]}).compileComponents();
    fixture = TestBed.createComponent(SessionSectionComponent);
  });

  function el(): HTMLElement {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('names the app in the row', () => {
    fixture.componentRef.setInput('appName', 'Lifekit');
    expect(el().textContent).toContain('Sign out of Lifekit');
  });

  it('reads "Sign out" when no app name is given', () => {
    expect(el().querySelector('[role="group"]')?.textContent).toContain('Sign out');
    expect(el().textContent).not.toContain('Sign out of');
  });

  it('emits signOut when the button is pressed', () => {
    let signedOut = 0;
    fixture.componentInstance.signOut.subscribe(() => signedOut++);
    el().querySelector<HTMLButtonElement>('cmn-button button')?.click();
    expect(signedOut).toBe(1);
  });
});
