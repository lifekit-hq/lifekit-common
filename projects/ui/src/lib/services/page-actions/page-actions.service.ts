import {Injectable} from '@angular/core';
import {filter, map, type Observable, Subject} from 'rxjs';

/**
 * Delivers presses of the top-bar actions a page declares in route data (`data.actions`) to the
 * page that declared them, so a page reacts without owning any header code:
 * `inject(CmnPageActionsService).on('add').pipe(takeUntilDestroyed()).subscribe(...)`.
 */
@Injectable({providedIn: 'root'})
export class CmnPageActionsService {
  private readonly pressed$ = new Subject<string>();

  /** Emits each time the action with this id is pressed. */
  public on(id: string): Observable<void> {
    return this.pressed$.pipe(
      filter(pressedId => pressedId === id),
      map(() => undefined)
    );
  }

  /** Called by the shell when a declared action is pressed. */
  public press(id: string): void {
    this.pressed$.next(id);
  }
}
