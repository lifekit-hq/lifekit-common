import {BreakpointObserver} from '@angular/cdk/layout';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {beforeEach, describe, expect, it} from 'vitest';

import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import {accountMenu, type AppLayoutAccount, AppLayoutComponent} from './app-layout.component';

const ACCOUNT: AppLayoutAccount = {
  label: 'Ada Lovelace',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  menuItems: accountMenu({settingsRoute: '/settings'}),
};

/** The shell draws before the session resolves: the account's place is held, then filled. */
describe('AppLayoutComponent accountPending', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  let viewport: PinnedBreakpointObserver;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const avatarTrigger = (): HTMLButtonElement | null =>
    host().querySelector('button[aria-label="Account menu"]');
  const placeholder = (): HTMLElement | null => host().querySelector('header .cmn-skeleton-sweep');

  beforeEach(async () => {
    viewport = new PinnedBreakpointObserver('sidebar');
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter([{path: '**', children: []}]),
        {provide: BreakpointObserver, useValue: viewport},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('accountPending', true);
  });

  it('draws the shell with a placeholder disc, never a "?" avatar or a menu', () => {
    fixture.detectChanges();
    expect(host().querySelector('header')).toBeTruthy();
    expect(placeholder()).toBeTruthy();
    expect(avatarTrigger()).toBeNull();
    expect(host().querySelector('header')?.textContent).not.toContain('?');
  });

  it('leaves the avatar out on a phone whose account will live on More', () => {
    viewport.pin('phone');
    fixture.componentRef.setInput('moreRoute', '/more');
    fixture.detectChanges();
    expect(placeholder()).toBeNull();
    expect(avatarTrigger()).toBeNull();
  });

  it('holds the avatar slot on a phone with no More page', () => {
    viewport.pin('phone');
    fixture.detectChanges();
    expect(placeholder()).toBeTruthy();
  });

  it('swaps the placeholder for the avatar once the account arrives', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('account', ACCOUNT);
    fixture.detectChanges();
    expect(placeholder()).toBeNull();
    expect(avatarTrigger()).toBeTruthy();
  });

  it('reads a missing account as no account when nothing is pending', () => {
    fixture.componentRef.setInput('accountPending', false);
    fixture.detectChanges();
    expect(placeholder()).toBeNull();
    expect(avatarTrigger()).toBeTruthy();
  });
});
