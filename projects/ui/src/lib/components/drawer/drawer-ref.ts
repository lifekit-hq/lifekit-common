import {type OverlayRef} from '@angular/cdk/overlay';
import {Injectable} from '@angular/core';
import {type Observable, Subject} from 'rxjs';

import {motionDurationMs, prefersReducedMotion} from '../../tokens/motion';

/** CDK's class on a backdrop while it is shown; taking it off starts the scrim's fade-out. */
const BACKDROP_SHOWING_CLASS = 'cdk-overlay-backdrop-showing';

@Injectable()
export class CmnDrawerRef<R = unknown> {
  private readonly beforeCloseSubject$ = new Subject<void>();
  private readonly closedSubject$ = new Subject<R | undefined>();
  private isClosed = false;

  public readonly beforeClose$: Observable<void> = this.beforeCloseSubject$.asObservable();

  public overlayRef!: OverlayRef;

  public close(result?: R): void {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    this.beforeCloseSubject$.next();
    this.beforeCloseSubject$.complete();
    // The panel leaves over `--cmn-duration-short`; the scrim fades with it, not after it.
    this.overlayRef.backdropElement?.classList.remove(BACKDROP_SHOWING_CLASS);
    setTimeout(
      () => {
        this.overlayRef.dispose();
        this.closedSubject$.next(result);
        this.closedSubject$.complete();
      },
      prefersReducedMotion() ? 0 : motionDurationMs('short')
    );
  }

  public afterClosed(): Observable<R | undefined> {
    return this.closedSubject$.asObservable();
  }
}
