import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';

import {AuthPageComponent} from './auth-page.component';

@Component({
  imports: [AuthPageComponent],
  template: `
    <cmn-auth-page [lead]="lead" title="Sign in">
      <button id="go">Continue</button>
      <a footer href="/privacy">Privacy</a>
    </cmn-auth-page>
  `,
})
class HostComponent {
  public lead = 'Use your account.';
}

describe('AuthPageComponent', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('is the main landmark, headed by one h1 with the title', () => {
    const el = render();
    expect(el.querySelectorAll('main').length).toBe(1);
    const headings = el.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.trim()).toBe('Sign in');
  });

  it('is the status page kind: main holds the one column and the title', () => {
    const main = render().querySelector('main') as HTMLElement;
    expect(main.getAttribute('data-cmn-page')).toBe('status');
    const columns = main.querySelectorAll('[data-cmn-page-column]');
    expect(columns).toHaveLength(1);
    expect(columns[0].querySelector('h1')?.hasAttribute('data-cmn-page-title')).toBe(true);
    expect(columns[0].querySelector('#go')).toBeTruthy();
  });

  it('draws the mark, the lead, and the projected content and footer', () => {
    const el = render();
    expect(el.querySelector('cmn-app-mark')).toBeTruthy();
    expect(el.querySelector('p')?.textContent?.trim()).toBe('Use your account.');
    expect(el.querySelector('#go')).toBeTruthy();
    expect(el.querySelector('a[footer]')?.textContent).toBe('Privacy');
  });

  it('omits the lead paragraph when none is given', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.lead = '';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('p')).toBeNull();
  });
});
