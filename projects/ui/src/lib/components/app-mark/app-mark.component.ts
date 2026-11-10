import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {DomSanitizer, type SafeHtml} from '@angular/platform-browser';
import {type BrandApp, markSvg} from '@lifekit-hq/tokens/brand/mark';

import {APP_MARK} from '../../services/app-mark/app-mark.service';

/** The mark's side on a sign-in or "cannot reach" page, in px. */
const DEFAULT_SIZE = 56;

/** The mark's own colours as tokens, so it follows the theme and the user's chosen colour. */
const TILE = 'var(--color-accent-default)';
const INK = 'var(--color-text-inverse)';

/**
 * The app's mark: its initials on a rounded tile in the accent colour. The colours are the
 * `--color-accent-default` / `--color-text-inverse` tokens, so the tile follows the app's seed, a
 * colour the user picked and light/dark, which an `<img src="/favicon.svg">` never can.
 *
 * Which mark is the app's own is set once with `provideAppMark()`; `app` overrides it for one
 * place. Decorative unless `label` is set.
 */
@Component({
  selector: 'cmn-app-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex shrink-0',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  template: '<span [innerHTML]="markup()" class="block h-full w-full"></span>',
})
export class AppMarkComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly appMark = inject(APP_MARK);

  /** Which app's mark to draw. Defaults to the one `provideAppMark()` set. */
  public readonly app = input<BrandApp | undefined>(undefined);
  /** Side length in px. */
  public readonly size = input(DEFAULT_SIZE);
  /** Accessible name. Leave empty when the app name sits next to the mark. */
  public readonly label = input('');

  protected readonly markup = computed<SafeHtml>(() => {
    const svg = markSvg({app: this.app() ?? this.appMark, tile: TILE, ink: INK});
    // The SVG is generated from the package's own glyph geometry and two token names, never
    // from user input, so it is trusted; the default sanitiser would drop the whole <svg>.
    return this.sanitizer.bypassSecurityTrustHtml(
      svg.replace('<svg ', '<svg width="100%" height="100%" ')
    );
  });
}
