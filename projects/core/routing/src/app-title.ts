import {
  type EnvironmentProviders,
  inject,
  Injectable,
  makeEnvironmentProviders,
} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {type RouterStateSnapshot, TitleStrategy} from '@angular/router';

/** Separates the page from the app name in the tab title (`Accounts · Finance Sentry`). */
export const APP_TITLE_SEPARATOR = ' · ';

export function formatAppTitle(appName: string, page: string | undefined): string {
  return page ? `${page}${APP_TITLE_SEPARATOR}${appName}` : appName;
}

/**
 * Sets the tab title to `{Page} · {App}` from the deepest route `title`, and to the bare app name
 * when no route in the matched chain has one. See `docs/BROWSER-CHROME.md`.
 */
export function provideAppTitle(appName: string): EnvironmentProviders {
  @Injectable()
  class AppTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);

    public override updateTitle(snapshot: RouterStateSnapshot): void {
      this.title.setTitle(formatAppTitle(appName, this.buildTitle(snapshot)));
    }
  }

  return makeEnvironmentProviders([{provide: TitleStrategy, useClass: AppTitleStrategy}]);
}
