import {computed, inject, type Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {combineLatest, map} from 'rxjs';

import {PresetService} from '../services/preset/preset.service';
import {ThemeService} from '../services/theme/theme.service';

/**
 * A key that changes whenever the active theme, the user's seed colour or the design preset does.
 *
 * A chart draws on a canvas with colours read from the CSS tokens once, when its config is built,
 * so it cannot follow a live theme change on its own. Read this signal in the chart's update
 * effect and rebuild when it differs from the key the chart was built with: `ThemeService` and
 * `PresetService` have already rewritten the tokens (and `data-preset`) by the time they emit, so the
 * rebuild reads the new values. A preset moves the font and the geometry the charts read.
 *
 * Must be called in an injection context.
 */
export function injectChartThemeKey(): Signal<string> {
  const theme = inject(ThemeService);
  const preset = inject(PresetService);
  const key$ = combineLatest([theme.activeTheme$, theme.activeSeed$]).pipe(
    map(([active, seed]) => `${active}|${seed?.seed ?? ''}|${seed?.intensity ?? ''}`)
  );
  const themeKey = toSignal(key$, {requireSync: true});
  return computed(() => `${themeKey()}|${preset.preset()}`);
}
