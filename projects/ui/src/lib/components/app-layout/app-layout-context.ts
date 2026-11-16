import {computed, Injectable, type Signal, signal} from '@angular/core';

import {type NavItem} from '../sidebar-nav/sidebar-nav.component';
import {type AppLayoutAccount} from './app-layout.component';

/**
 * What the enclosing `cmn-app-layout` knows, for the pages it hosts: `cmn-more-page` reads its
 * nav items, tab routes, account and version from here so the app binds them once, on the layout.
 * The layout provides it and fills it; outside a layout there is none (`inject(..., {optional: true})`).
 */
@Injectable()
export class AppLayoutContext {
  private readonly source = signal<AppLayoutSource | undefined>(undefined);

  public readonly navItems: Signal<NavItem[]> = this.pick(source => source.navItems(), []);
  public readonly tabRoutes: Signal<string[]> = this.pick(source => source.tabRoutes(), []);
  public readonly account: Signal<AppLayoutAccount | undefined> = this.pick(
    source => source.account(),
    undefined
  );
  public readonly versionLabel: Signal<string> = this.pick(source => source.versionLabel(), '');

  /** Called by the layout once, with the signals it owns. */
  public connect(source: AppLayoutSource): void {
    this.source.set(source);
  }

  /** Ends the session: the layout's `signOut` output. */
  public signOut(): void {
    this.source()?.signOut();
  }

  private pick<T>(read: (source: AppLayoutSource) => T, fallback: T): Signal<T> {
    return computed(() => {
      const source = this.source();
      return source ? read(source) : fallback;
    });
  }
}

export interface AppLayoutSource {
  navItems: Signal<NavItem[]>;
  tabRoutes: Signal<string[]>;
  account: Signal<AppLayoutAccount | undefined>;
  versionLabel: Signal<string>;
  signOut: () => void;
}
