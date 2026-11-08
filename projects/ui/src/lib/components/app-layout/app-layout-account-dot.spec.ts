import {BreakpointObserver} from '@angular/cdk/layout';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {beforeEach, describe, expect, it} from 'vitest';

import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import {type NavItem} from '../sidebar-nav/sidebar-nav.component';
import {type AppLayoutAccount, AppLayoutComponent} from './app-layout.component';

const MORE_ROUTE = '/more';

const NAV: NavItem[] = [
  {label: 'Tasks', icon: 'ListChecks', route: '/tasks'},
  {label: 'Calendar', icon: 'Calendar', route: '/calendar'},
  {label: 'People', icon: 'Users', route: '/people'},
];

const withDot = (dot: boolean): AppLayoutAccount => ({
  label: 'Ada Lovelace',
  menuItems: [{id: 'whatsNew', label: "What's new", icon: 'Megaphone', dot}],
});

/** An account item with something new behind it (What's new, unread) is seen from the tab that leads to it. */
describe('AppLayoutComponent account dot', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;

  const moreTab = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      'cmn-bottom-tab-bar nav > button:last-child'
    ) as HTMLButtonElement;

  beforeEach(async () => {
    const viewport = new PinnedBreakpointObserver('phone');
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter([{path: '**', children: []}]),
        {provide: BreakpointObserver, useValue: viewport},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('navItems', NAV);
    fixture.componentRef.setInput('moreRoute', MORE_ROUTE);
  });

  it('dots the More tab while an account item behind it has something new, and clears it', () => {
    fixture.componentRef.setInput('account', withDot(true));
    fixture.detectChanges();
    expect(moreTab().querySelector('.cmn-badge-indicator')).toBeTruthy();

    fixture.componentRef.setInput('account', withDot(false));
    fixture.detectChanges();
    expect(moreTab().querySelector('.cmn-badge-indicator')).toBeNull();
  });

  it('does not dot the More tab for an account that stays in the top bar', () => {
    fixture.componentRef.setInput('accountOnPhone', 'avatar');
    fixture.componentRef.setInput('account', withDot(true));
    fixture.detectChanges();

    expect(moreTab().querySelector('.cmn-badge-indicator')).toBeNull();
  });
});
