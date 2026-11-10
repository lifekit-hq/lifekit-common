import {DestroyRef, inject, Injectable, InjectionToken} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {type BrandApp, markSvg, seedMarkColors} from '@lifekit-hq/tokens/brand/mark';

import {DOCUMENT, ThemeService} from '../theme/theme.service';

/** The mark an app draws when it does not say otherwise: the lifekit `lk` mark. */
export const DEFAULT_APP_MARK: BrandApp = 'lk';

/**
 * The app's own mark (its initials in `@lifekit-hq/tokens/brand/mark`'s `BRAND_APPS`). Set it
 * once with `provideAppMark(...)`; `<cmn-app-mark>` and the favicon follow it.
 */
export const APP_MARK = new InjectionToken<BrandApp>('APP_MARK', {
  providedIn: 'root',
  factory: () => DEFAULT_APP_MARK,
});

const FAVICON_SELECTOR = 'link[rel~="icon"][type="image/svg+xml"]';

/**
 * Keeps the tab icon on the user's chosen colour. The build-time icon set (favicon, apple-touch,
 * PWA icons) wears the app's own seed and cannot change afterwards; the one icon a page can
 * rewrite is the SVG favicon `<link>`, so while the user has their own colour that link points at
 * the app's mark drawn in it, and it goes back to the shipped file when the colour is reset.
 *
 * The rewritten icon is a `data:` URL, so an app with a strict `img-src` needs `data:` in it.
 */
@Injectable({providedIn: 'root'})
export class AppMarkService {
  private readonly doc = inject(DOCUMENT);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private followed = false;

  /** The app's mark. */
  public readonly app = inject(APP_MARK);

  /** Starts following the chosen colour; calling it again does nothing. */
  public followSeed(): void {
    const link = this.doc.querySelector<HTMLLinkElement>(FAVICON_SELECTOR);
    if (this.followed || !link) {
      return;
    }
    this.followed = true;
    const shipped = link.getAttribute('href');
    this.theme.activeSeed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(seed => {
      if (seed) {
        const colors = seedMarkColors(seed.seed, seed.intensity);
        const svg = markSvg({app: this.app, ...colors});
        link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(svg)}`);
      } else if (shipped !== null) {
        link.setAttribute('href', shipped);
      }
    });
  }
}
