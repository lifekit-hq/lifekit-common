import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Title} from '@angular/platform-browser';
import {provideRouter, Router, type Routes} from '@angular/router';
import {beforeEach, describe, expect, it} from 'vitest';

import {formatAppTitle, provideAppTitle} from './app-title';

@Component({template: ''})
class StubPage {}

const APP = 'Finance Sentry';

const ROUTES: Routes = [
  {path: 'accounts', title: 'Accounts', component: StubPage},
  {
    path: 'settings',
    title: 'Settings',
    children: [
      {path: 'profile', title: 'Profile', component: StubPage},
      {path: 'plain', component: StubPage},
    ],
  },
  {path: 'untitled', component: StubPage},
  {path: '', title: APP, component: StubPage},
];

describe('provideAppTitle', () => {
  let router: Router;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter(ROUTES), provideAppTitle(APP)]});
    router = TestBed.inject(Router);
    title = TestBed.inject(Title);
  });

  it('sets "Page · App" from the route title', async () => {
    await router.navigateByUrl('/accounts');
    expect(title.getTitle()).toBe('Accounts · Finance Sentry');
  });

  it('uses the deepest titled route for nested routes', async () => {
    await router.navigateByUrl('/settings/profile');
    expect(title.getTitle()).toBe('Profile · Finance Sentry');
  });

  it('falls back to the parent title when the child has none', async () => {
    await router.navigateByUrl('/settings/plain');
    expect(title.getTitle()).toBe('Settings · Finance Sentry');
  });

  it('shows the bare app name when no route has a title', async () => {
    await router.navigateByUrl('/untitled');
    expect(title.getTitle()).toBe(APP);
  });
});

describe('formatAppTitle', () => {
  it('treats an empty page as no page', () => {
    expect(formatAppTitle(APP, '')).toBe(APP);
    expect(formatAppTitle(APP, undefined)).toBe(APP);
  });
});
