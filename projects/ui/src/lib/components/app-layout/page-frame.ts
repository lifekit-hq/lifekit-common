import {computed, Injectable, signal} from '@angular/core';

/**
 * The handshake between the shell (`cmn-app-layout`) and the page template (`cmn-page`) over who
 * draws the large title. The shell provides it, so a routed page reaches it through the outlet.
 *
 * Without a template the shell draws the title above the page, and the page's own padding has to
 * line up under it. A `cmn-page` claims the title instead: it draws it inside its own frame, on
 * the page's one left edge and with the template's gap under it, and the shell steps aside while
 * still collapsing the title into the top bar on scroll.
 */
@Injectable()
export class PageFrameService {
  private readonly source = signal<() => string>(() => '');
  private readonly owners = signal(0);
  private readonly element = signal<HTMLElement | null>(null);
  private readonly declared = signal('');

  /** The large title the current route declares in its data, or ''. */
  public readonly routeTitle = computed(() => this.source()());

  /** A page template is showing, so the shell draws no large title of its own. */
  public readonly pageOwnsTitle = computed(() => this.owners() > 0);

  /** The title element the page template drew, which the shell watches to collapse it on scroll. */
  public readonly titleElement = this.element.asReadonly();

  /** The title a page template declares when the route data declares none. */
  public readonly declaredTitle = this.declared.asReadonly();

  /** The shell: where the route's title comes from. */
  public connect(routeTitle: () => string): void {
    this.source.set(routeTitle);
  }

  /** A page template took over the title; pair every call with `release`. */
  public claim(): void {
    this.owners.update(count => count + 1);
  }

  public release(): void {
    this.owners.update(count => Math.max(0, count - 1));
  }

  /** The page template's title element (null once it is gone) and the text it declares itself. */
  public setTitle(element: HTMLElement | null, declared = ''): void {
    this.element.set(element);
    this.declared.set(element ? declared : '');
  }

  /** Clears the title only if it is still `element`: the next page may have set its own already. */
  public clearTitle(element: HTMLElement): void {
    if (this.element() === element) {
      this.setTitle(null);
    }
  }
}
