import {type BreakpointState} from '@angular/cdk/layout';
import {BehaviorSubject, map, type Observable} from 'rxjs';

import {
  CMN_MEDIA_EXPANDED,
  CMN_MEDIA_MD,
  CMN_MEDIA_MEDIUM,
  CMN_MEDIA_PHONE_LANDSCAPE,
} from '../../tokens/breakpoints';
import {type CmnShellMode} from './shell.service';

/** The device a pinned viewport stands in for. */
export type PinnedViewport = CmnShellMode | 'phone-landscape';

/** The media queries each pinned viewport matches. */
const MATCHING: Record<PinnedViewport, readonly string[]> = {
  phone: [],
  'phone-landscape': [
    CMN_MEDIA_MD,
    CMN_MEDIA_MEDIUM,
    CMN_MEDIA_EXPANDED,
    CMN_MEDIA_PHONE_LANDSCAPE,
  ],
  rail: [CMN_MEDIA_MD, CMN_MEDIA_MEDIUM],
  sidebar: [CMN_MEDIA_MD, CMN_MEDIA_MEDIUM, CMN_MEDIA_EXPANDED],
};

/**
 * Stands in for `BreakpointObserver` with a pinned device, for specs and stories: a story cannot
 * make Storybook's viewport report a coarse pointer, and a spec should not depend on the size of
 * the runner's window. Provide it as `BreakpointObserver`.
 */
export class PinnedBreakpointObserver {
  private readonly matching$: BehaviorSubject<readonly string[]>;

  constructor(viewport: PinnedViewport = 'sidebar') {
    this.matching$ = new BehaviorSubject(MATCHING[viewport]);
  }

  public pin(viewport: PinnedViewport): void {
    this.matching$.next(MATCHING[viewport]);
  }

  public isMatched(query: string | readonly string[]): boolean {
    return this.queries(query).some(one => this.matching$.value.includes(one));
  }

  public observe(query: string | readonly string[]): Observable<BreakpointState> {
    const queries = this.queries(query);
    return this.matching$.pipe(
      map(matching => ({
        matches: queries.some(one => matching.includes(one)),
        breakpoints: Object.fromEntries(queries.map(one => [one, matching.includes(one)])),
      }))
    );
  }

  private queries(query: string | readonly string[]): readonly string[] {
    return typeof query === 'string' ? [query] : query;
  }
}
