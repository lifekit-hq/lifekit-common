import {
  afterNextRender,
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  Injector,
  type Signal,
  signal,
  untracked,
} from '@angular/core';
import {isObservable, lastValueFrom} from 'rxjs';

import {motionDurationMs} from '../../tokens/motion';

/**
 * The reload a tab root hands the shell for pull to refresh: a function that fetches the page's
 * data again. It may return nothing (a store method that starts a request), a promise or an
 * observable; the refresh indicator stays up until a returned promise or observable settles.
 */
export type CmnReloadHook = () => unknown;

export interface CmnPullRefreshOptions {
  /**
   * A signal that is true while the reload is still running (a store's `isLoading`). For a hook that
   * returns nothing it is how the indicator knows when to leave. It must already be true when the
   * hook returns, which a store method that sets its status before the request starts satisfies.
   */
  busy?: Signal<boolean>;
}

interface Registration {
  reload: CmnReloadHook;
  busy?: Signal<boolean>;
}

function pause(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pull to refresh on a tab root (Apple HIG, Refreshing content): the gesture belongs to the shell
 * (`cmn-app-layout`), the reload belongs to the page. A tab root registers the function that
 * reloads its data, either with `[reload]` on `cmn-page` or with `registerPullRefresh()` from its
 * store or component; the shell draws the pull, calls it on release and keeps the indicator up
 * while it runs. A tab root that registers nothing has no pull, as before.
 *
 * `refresh()` runs the same reload without a gesture. The pull is a touch gesture and a gesture
 * alone is not enough, so an app puts a visible way to reload where a keyboard or a screen reader
 * reaches it too (a menu item, a command palette entry, Retry in `cmn-async-state`), and calls this.
 */
@Injectable({providedIn: 'root'})
export class CmnPullRefreshService {
  private readonly injector = inject(Injector);
  private readonly registrations = signal<readonly Registration[]>([]);
  private readonly running = signal(false);

  /** A tab root registered a reload, so the shell should offer the pull. */
  public readonly available = computed<boolean>(() => this.registrations().length > 0);

  /** A reload started here is still running. */
  public readonly refreshing = this.running.asReadonly();

  /**
   * Registers the reload of the page on screen and returns the function that withdraws it. The
   * latest registration wins, so a page entering while the last one is still leaving takes over;
   * withdrawing an older one never drops a newer one.
   */
  public register(reload: CmnReloadHook, options: CmnPullRefreshOptions = {}): () => void {
    const entry: Registration = {reload, busy: options.busy};
    this.registrations.update(list => [...list, entry]);
    return () => this.registrations.update(list => list.filter(item => item !== entry));
  }

  /**
   * Runs the registered reload and resolves when it has settled and the indicator has been up for
   * a long motion duration, so a reload that finishes at once still reads as one. A second call
   * while one is running does nothing, and a reload that throws or rejects ends the refresh:
   * the page's store shows its own error (`cmn-async-state`).
   */
  public async refresh(): Promise<void> {
    const entry = this.registrations().at(-1);
    if (!entry || this.running()) {
      return;
    }
    this.running.set(true);
    try {
      await Promise.all([this.settle(entry), pause(motionDurationMs('long'))]);
    } finally {
      this.running.set(false);
    }
  }

  private async settle(entry: Registration): Promise<void> {
    try {
      const result = entry.reload();
      if (isObservable(result)) {
        await lastValueFrom(result, {defaultValue: undefined});
      } else {
        await result;
      }
    } catch {
      // The page's own store reports the failure; the refresh just ends.
      return;
    }
    if (entry.busy) {
      await this.whenIdle(entry, entry.busy);
    }
  }

  /**
   * Resolves when `busy` clears or the registration is withdrawn (its page is gone, so nothing
   * will ever update `busy` again). The first look waits for the next render, because a page's
   * `busy` is an input that only catches up with the store on the parent's next change detection.
   */
  private async whenIdle(entry: Registration, busy: Signal<boolean>): Promise<void> {
    await new Promise<void>(resolve => afterNextRender(() => resolve(), {injector: this.injector}));
    await new Promise<void>(resolve => {
      const watcher = effect(
        () => {
          if (!busy() || !this.registrations().includes(entry)) {
            untracked(() => {
              watcher.destroy();
              resolve();
            });
          }
        },
        {injector: this.injector}
      );
    });
  }
}

/**
 * Registers `reload` as pull to refresh for the component, directive or store that is being
 * created, and withdraws it when that is destroyed. Call it in an injection context.
 *
 * ```ts
 * registerPullRefresh(() => store.load(), {busy: store.isLoading});
 * ```
 */
export function registerPullRefresh(reload: CmnReloadHook, options?: CmnPullRefreshOptions): void {
  const withdraw = inject(CmnPullRefreshService).register(reload, options);
  inject(DestroyRef).onDestroy(withdraw);
}
