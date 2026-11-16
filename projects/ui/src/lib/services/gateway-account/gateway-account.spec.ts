import {DOCUMENT} from '@angular/common';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {AppPreferencesStore} from '@lifekit-hq/core/preferences';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {ACCOUNT_SIGN_OUT_ID} from '../../components/app-layout/account-menu';
import {
  GATEWAY_ACCOUNT,
  type GatewayAccountOptions,
  gatewayUserFromUserinfo,
  layoutAccountFor,
  provideGatewayAccount,
} from './gateway-account';

const USERINFO = '/oauth2/userinfo';
const EXTRA = {id: 'whats-new', label: "What's new"};

function setup(options: Partial<GatewayAccountOptions> = {}) {
  const assign = vi.fn();
  const clear = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withXhr()),
      provideHttpClientTesting(),
      {provide: DOCUMENT, useValue: {location: {origin: 'https://app.test', assign}}},
      {provide: AppPreferencesStore, useValue: {clear}},
      ...(options.store ? [options.store] : []),
      provideGatewayAccount({
        userinfoUrl: USERINFO,
        signOutUrl: origin => `/oauth2/sign_out?rd=${encodeURIComponent(`${origin}/`)}`,
        ...options,
      }),
    ],
  });
  return {
    assign,
    clear,
    gateway: TestBed.inject(GATEWAY_ACCOUNT),
    http: TestBed.inject(HttpTestingController),
  };
}

const ids = (items: {id: string}[]): string[] => items.map(item => item.id);

describe('gatewayUserFromUserinfo', () => {
  it('reads name, email and picture', () => {
    expect(
      gatewayUserFromUserinfo({name: 'Ada', email: 'ada@x.io', picture: 'https://x.io/a.png'})
    ).toEqual({name: 'Ada', email: 'ada@x.io', picture: 'https://x.io/a.png'});
  });

  it('falls back from name to preferredUsername, user, then email', () => {
    expect(gatewayUserFromUserinfo({preferredUsername: 'ada', email: 'a@x.io'})?.name).toBe('ada');
    expect(gatewayUserFromUserinfo({user: 'ada2', email: 'a@x.io'})?.name).toBe('ada2');
    expect(gatewayUserFromUserinfo({email: 'a@x.io'})?.name).toBe('a@x.io');
  });

  it('is null when the body names nobody', () => {
    expect(gatewayUserFromUserinfo({})).toBeNull();
    expect(gatewayUserFromUserinfo({name: 42})).toBeNull();
  });
});

describe('layoutAccountFor', () => {
  it('shows the name and email with Sign out when signed in', () => {
    const account = layoutAccountFor({name: 'Ada', email: 'ada@x.io', picture: ''});
    expect(account).toMatchObject({label: 'Ada', name: 'Ada', email: 'ada@x.io'});
    expect(ids(account.menuItems)).toEqual(['/settings', ACCOUNT_SIGN_OUT_ID]);
  });

  it('drops the repeated name when it is the email, and non-https pictures', () => {
    const account = layoutAccountFor({name: 'a@x.io', email: 'a@x.io', picture: 'http://x.io/a'});
    expect(account.name).toBeUndefined();
    expect(account.pictureUrl).toBeUndefined();
  });

  it('says Not signed in without a session and offers no Sign out', () => {
    const account = layoutAccountFor(null);
    expect(account).toMatchObject({label: '', name: 'Not signed in'});
    expect(ids(account.menuItems)).toEqual(['/settings']);
  });
});

describe('provideGatewayAccount', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('maps the userinfo response to the layout account', () => {
    const {gateway, http} = setup({extras: () => [EXTRA], settingsRoute: '/prefs'});
    expect(gateway.account().name).toBe('Not signed in');

    http.expectOne(USERINFO).flush({name: 'Ada', email: 'ada@x.io'});

    expect(gateway.user()?.name).toBe('Ada');
    expect(ids(gateway.account().menuItems)).toEqual(['/prefs', 'whats-new', ACCOUNT_SIGN_OUT_ID]);
  });

  it('stays signed out when userinfo fails', () => {
    const {gateway, http} = setup();
    http.expectOne(USERINFO).flush('no', {status: 401, statusText: 'Unauthorized'});
    expect(gateway.user()).toBeNull();
    expect(gateway.account().name).toBe('Not signed in');
  });

  it('clears preferences, then navigates to the sign-out URL built from the origin', () => {
    const {gateway, http, clear, assign} = setup();
    http.expectOne(USERINFO).flush({});
    assign.mockImplementation(() => expect(clear).toHaveBeenCalledOnce());

    gateway.signOut();

    expect(assign).toHaveBeenCalledWith('/oauth2/sign_out?rd=https%3A%2F%2Fapp.test%2F');
  });

  it('accepts a fixed sign-out URL and the apps own store', () => {
    const ownClear = vi.fn();
    class OwnStore {
      public clear = ownClear;
    }
    const {gateway, http, assign, clear} = setup({
      signOutUrl: '/bye',
      store: OwnStore,
      extras: undefined,
    });
    http.expectOne(USERINFO).flush({});

    gateway.signOut();

    expect(assign).toHaveBeenCalledWith('/bye');
    expect(ownClear).toHaveBeenCalledOnce();
    expect(clear).not.toHaveBeenCalled();
  });
});
