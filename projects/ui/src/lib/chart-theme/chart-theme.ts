import {inject, type Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {combineLatest, map} from 'rxjs';

import {ThemeService} from '../services/theme/theme.service';

/**
 * A key that changes whenever the active theme or the user's seed colour does.
 *
 * A chart draws on a canvas with colours read from the CSS tokens once, when its config is built,
 * so it cannot follow a live theme change on its own. Read this signal in the chart's update
 * effect and rebuild when it differs from the key the chart was built with: `ThemeService` has
 * already rewritten the tokens by the time it emits, so the rebuild reads the new values.
 *
 * Must be called in an injection context.
 */
export function injectChartThemeKey(): Signal<string> {
  const theme = inject(ThemeService);
  const key$ = combineLatest([theme.activeTheme$, theme.activeSeed$]).pipe(
    map(([active, seed]) => `${active}|${seed?.seed ?? ''}|${seed?.intensity ?? ''}`)
  );
  return toSignal(key$, {requireSync: true});
}
