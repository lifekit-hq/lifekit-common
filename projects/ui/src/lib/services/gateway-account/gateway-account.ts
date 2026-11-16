import {DOCUMENT} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {
  computed,
  type EnvironmentProviders,
  inject,
  InjectionToken,
  makeEnvironmentProviders,
  type Signal,
  type Type,
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {AppPreferencesStore} from '@lifekit-hq/core/preferences';
import {catchError, map, type Observable, of} from 'rxjs';

import {accountMenu} from '../../components/app-layout/account-menu';
import {type AppLayoutAccount} from '../../components/app-layout/app-layout.component';
import {type MenuItem} from '../../components/menu/menu.component';

/** What the sign-in gate (oauth2-proxy) knows about the user, as `/oauth2/userinfo` reports it. */
export interface GatewayUser {
  name: string;
  email: string;
  picture: string;
}

export interface GatewayAccountOptions {
  /** The gate's userinfo endpoint on the app's own origin, normally `/oauth2/userinfo`. */
  userinfoUrl: string;
  /** Where Sign out goes: a URL, or a function of the page origin when it must return there. */
  signOutUrl: string | ((origin: string) => string);
  /** The Settings route in the account menu; defaults to `/settings`. */
  settingsRoute?: string;
  /** The app's own menu items between Settings and Sign out; read on every change. */
  extras?: () => MenuItem[];
  /** The app's own preferences store when it is not `AppPreferencesStore`; cleared at sign-out. */
  store?: Type<{clear(): void}>;
}

export interface GatewayAccount {
  /** The signed-in user, or null while loading and when there is no readable session. */
  readonly user: Signal<GatewayUser | null>;
  /** The account as `cmn-app-layout` takes it: identity header, Settings, extras and Sign out. */
  readonly account: Signal<AppLayoutAccount>;
  /** Clears the preferences store so the next user starts empty, then goes to the sign-out URL. */
  signOut(): void;
}

export const GATEWAY_ACCOUNT = new InjectionToken<GatewayAccount>('GATEWAY_ACCOUNT');

const DEFAULT_SETTINGS_ROUTE = '/settings';

/**
 * What the identity header reads without a session. It is a statement about the account, not a
 * disabled menu row: a disabled row is a greyed-out action the reader cannot take.
 */
const NOT_SIGNED_IN = 'Not signed in';

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** The profile picture shows only as an absolute https URL; anything else falls back to initials. */
const pictureUrl = (picture: string): string | undefined =>
  picture.startsWith('https://') ? picture : undefined;

/**
 * Maps an oauth2-proxy userinfo body to the user. Name falls back to `preferredUsername`, `user`
 * and then the email. Null when the body names nobody (local dev, a lapsed cookie).
 */
export function gatewayUserFromUserinfo(body: Record<string, unknown>): GatewayUser | null {
  const email = text(body['email']);
  const name = text(body['name']) || text(body['preferredUsername']) || text(body['user']) || email;
  if (!name && !email) {
    return null;
  }
  return {name, email, picture: text(body['picture'])};
}

/**
 * The layout account for a user. Without one the identity says "Not signed in" and the menu offers
 * Settings and the extras but no Sign out.
 */
export function layoutAccountFor(
  user: GatewayUser | null,
  settingsRoute: string = DEFAULT_SETTINGS_ROUTE,
  extras: MenuItem[] = []
): AppLayoutAccount {
  if (!user) {
    return {
      label: '',
      name: NOT_SIGNED_IN,
      menuItems: accountMenu({settingsRoute, signOut: false, extras}),
    };
  }
  return {
    label: user.name || user.email,
    name: user.name && user.name !== user.email ? user.name : undefined,
    email: user.email || undefined,
    pictureUrl: pictureUrl(user.picture),
    menuItems: accountMenu({settingsRoute, extras}),
  };
}

/**
 * The gateway account mapping in one call: reads the signed-in user from the gate's userinfo
 * endpoint and exposes it as the `cmn-app-layout` account, with a `signOut()` that clears the
 * preferences store before navigating. Inject it with `inject(GATEWAY_ACCOUNT)`.
 *
 * Only the mapping is shared. The app keeps its own gate configuration and decides what Sign out
 * does by passing `signOutUrl`.
 *
 * ```ts
 * provideGatewayAccount({
 *   userinfoUrl: '/oauth2/userinfo',
 *   signOutUrl: origin => `/oauth2/sign_out?rd=${encodeURIComponent(`${origin}/`)}`,
 * })
 * ```
 */
export function provideGatewayAccount(options: GatewayAccountOptions): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: GATEWAY_ACCOUNT,
      useFactory: (): GatewayAccount => {
        const http = inject(HttpClient);
        const document = inject(DOCUMENT);
        const store = inject(options.store ?? AppPreferencesStore);
        const settingsRoute = options.settingsRoute ?? DEFAULT_SETTINGS_ROUTE;
        const user = toSignal(
          http.get<Record<string, unknown>>(options.userinfoUrl).pipe(
            map(gatewayUserFromUserinfo),
            catchError((): Observable<GatewayUser | null> => of(null))
          ),
          {initialValue: null}
        );
        return {
          user,
          account: computed(() => layoutAccountFor(user(), settingsRoute, options.extras?.())),
          signOut: (): void => {
            store.clear();
            const {origin} = document.location;
            document.location.assign(
              typeof options.signOutUrl === 'string'
                ? options.signOutUrl
                : options.signOutUrl(origin)
            );
          },
        };
      },
    },
  ]);
}
