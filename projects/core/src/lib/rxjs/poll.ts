import {defer, EMPTY, fromEvent, type Observable, of, timer} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeWhile,
} from 'rxjs/operators';

export interface PollOptions<T> {
  intervalMs: number;
  isDone: (value: T) => boolean;
  startImmediately?: boolean;
}

/** Emits whether the tab is showing, then again on each change. Always visible without a document. */
function tabVisible(): Observable<boolean> {
  if (typeof document === 'undefined') {
    return of(true);
  }
  return fromEvent(document, 'visibilitychange').pipe(
    startWith(null),
    map(() => !document.hidden),
    distinctUntilChanged()
  );
}

/**
 * Reads `request` every `intervalMs` until `isDone`. While the tab is hidden it makes no request;
 * when the tab shows again it reads once at once and resumes the interval.
 */
export function poll<T>(request: () => Observable<T>, options: PollOptions<T>): Observable<T> {
  const startDelay = options.startImmediately === false ? options.intervalMs : 0;
  return defer(() => {
    // The first run honours startImmediately; a return to the tab always reads straight away.
    let first = true;
    return tabVisible().pipe(
      switchMap(visible => {
        if (!visible) {
          return EMPTY;
        }
        const delay = first ? startDelay : 0;
        first = false;
        return timer(delay, options.intervalMs);
      }),
      switchMap(() => request()),
      takeWhile(value => !options.isDone(value), true)
    );
  }).pipe(shareReplay({bufferSize: 1, refCount: true}));
}
