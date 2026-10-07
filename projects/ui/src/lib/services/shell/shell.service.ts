import {BreakpointObserver} from '@angular/cdk/layout';
import {computed, inject, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';

import {
  CMN_MEDIA_EXPANDED,
  CMN_MEDIA_MEDIUM,
  CMN_MEDIA_PHONE_LANDSCAPE,
} from '../../tokens/breakpoints';

/**
 * Which navigation chrome the app shell shows:
 * - `phone`: the bottom tab bar, for a compact window or a landscape phone.
 * - `rail`: the sidebar collapsed to icons, for a medium window.
 * - `sidebar`: the full sidebar, for an expanded window.
 */
export type CmnShellMode = 'phone' | 'rail' | 'sidebar';

const SHELL_QUERIES = [CMN_MEDIA_MEDIUM, CMN_MEDIA_EXPANDED, CMN_MEDIA_PHONE_LANDSCAPE];

function modeOf(matches: (query: string) => boolean): CmnShellMode {
  if (matches(CMN_MEDIA_PHONE_LANDSCAPE) || !matches(CMN_MEDIA_MEDIUM)) {
    return 'phone';
  }
  return matches(CMN_MEDIA_EXPANDED) ? 'sidebar' : 'rail';
}

/**
 * The one answer to "which shell is this?", from the window size class and the device (a short,
 * coarse-pointer viewport is a landscape phone whatever its width). `cmn-app-layout` reads it
 * to pick its navigation chrome; an app that lays out around the shell reads it too, rather
 * than repeating width checks of its own.
 */
@Injectable({providedIn: 'root'})
export class CmnShellService {
  private readonly breakpoints = inject(BreakpointObserver);

  public readonly mode = toSignal(
    this.breakpoints
      .observe(SHELL_QUERIES)
      .pipe(map(state => modeOf(query => state.breakpoints[query] ?? false))),
    {initialValue: modeOf(query => this.breakpoints.isMatched(query))}
  );

  /** The bottom tab bar is the navigation. */
  public readonly isPhone = computed<boolean>(() => this.mode() === 'phone');
}
