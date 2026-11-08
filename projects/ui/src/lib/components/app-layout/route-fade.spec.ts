import {BreakpointObserver} from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  createEnvironmentInjector,
  DestroyRef,
  EnvironmentInjector,
} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router, type Routes} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import {AppLayoutComponent} from './app-layout.component';
import {fadeRouteChanges} from './route-fade';

@Component({
  selector: 'cmn-route-fade-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>page</p>',
})
class PageComponent {}

const ROUTES: Routes = [
  {path: 'budgets', component: PageComponent},
  {path: 'settings', component: PageComponent},
  {path: 'detail/:id', component: PageComponent},
];

const MEDIUM_MS = 240;

describe('fadeRouteChanges', () => {
  let router: Router;
  let page: HTMLElement;
  let scope: EnvironmentInjector;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideRouter(ROUTES)]});
    router = TestBed.inject(Router);
    page = document.createElement('main');
    document.body.appendChild(page);
    scope = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
    fadeRouteChanges(router, () => page, scope.get(DestroyRef));
  });

  afterEach(() => {
    page.remove();
    vi.restoreAllMocks();
  });

  it('draws the launch as it is', async () => {
    await router.navigateByUrl('/budgets');
    expect(page.getAnimations()).toHaveLength(0);
  });

  it('fades the page in when the matched page changes, on the medium duration', async () => {
    await router.navigateByUrl('/budgets');
    await router.navigateByUrl('/settings');
    const [fade] = page.getAnimations();
    expect(fade.effect?.getTiming().duration).toBe(MEDIUM_MS);
    const frames = (fade.effect as KeyframeEffect).getKeyframes();
    expect(frames.map(frame => frame['opacity'])).toEqual(['0', '1']);
    expect(frames.every(frame => frame['transform'] === undefined)).toBe(true);
  });

  it('does not fade when only params, query params or the fragment changed', async () => {
    await router.navigateByUrl('/detail/1');
    await router.navigateByUrl('/detail/2');
    await router.navigateByUrl('/detail/2?range=30d');
    await router.navigateByUrl('/detail/2?range=30d#chart');
    expect(page.getAnimations()).toHaveLength(0);
  });

  it('fades again when it returns to a page after leaving it', async () => {
    await router.navigateByUrl('/detail/1');
    await router.navigateByUrl('/budgets');
    page.getAnimations().forEach(animation => animation.finish());
    await router.navigateByUrl('/detail/1');
    expect(page.getAnimations()).toHaveLength(1);
  });

  it('does not fade under Reduce Motion', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({matches: true} as MediaQueryList);
    await router.navigateByUrl('/budgets');
    await router.navigateByUrl('/settings');
    expect(page.getAnimations()).toHaveLength(0);
  });

  it('does not fade a page that a view transition is already crossfading', async () => {
    await router.navigateByUrl('/budgets');
    Object.defineProperty(document, 'activeViewTransition', {value: {}, configurable: true});
    try {
      await router.navigateByUrl('/settings');
    } finally {
      Reflect.deleteProperty(document, 'activeViewTransition');
    }
    expect(page.getAnimations()).toHaveLength(0);
  });

  it('does nothing where Element.animate does not exist', async () => {
    await router.navigateByUrl('/budgets');
    Object.defineProperty(page, 'animate', {value: undefined, configurable: true});
    await expect(router.navigateByUrl('/settings')).resolves.toBe(true);
  });

  it('stops watching once its scope is destroyed', async () => {
    await router.navigateByUrl('/budgets');
    scope.destroy();
    await router.navigateByUrl('/settings');
    expect(page.getAnimations()).toHaveLength(0);
  });
});

describe('AppLayoutComponent route fade', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter(ROUTES),
        {provide: BreakpointObserver, useValue: new PinnedBreakpointObserver('sidebar')},
      ],
    }).compileComponents();
  });

  it('fades the main region in when the page changes, in any app that uses the shell', async () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    await router.navigateByUrl('/budgets');
    expect(main.getAnimations()).toHaveLength(0);

    await router.navigateByUrl('/settings');
    expect(main.getAnimations()).toHaveLength(1);
  });
});
