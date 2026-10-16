import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router, RouterOutlet, type Routes} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {withLkViewTransitions} from './lk-view-transitions.feature';

@Component({
  selector: 'cmn-test-page',
  template: 'page',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class PageComponent {}

@Component({
  selector: 'cmn-test-shell',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ShellComponent {}

const ROUTES: Routes = [
  {path: 'budgets', component: PageComponent},
  {path: 'settings', component: PageComponent},
  {path: 'detail/:id', component: PageComponent},
  {
    path: 'ledger',
    component: ShellComponent,
    children: [
      {path: 'list', component: PageComponent},
      {path: 'chart', component: PageComponent},
    ],
  },
];

interface FakeTransition {
  skipTransition: ReturnType<typeof vi.fn>;
}

/** Stands in for `document.startViewTransition`, recording each transition it starts. */
function stubStartViewTransition(): FakeTransition[] {
  const started: FakeTransition[] = [];
  vi.spyOn(document, 'startViewTransition').mockImplementation(((update: () => void) => {
    update();
    const transition = {
      skipTransition: vi.fn(),
      updateCallbackDone: Promise.resolve(),
      ready: Promise.resolve(),
      finished: Promise.resolve(),
    };
    started.push(transition);
    return transition;
  }) as unknown as typeof document.startViewTransition);
  return started;
}

function stubReducedMotion(reduce: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => {
    const list: Pick<MediaQueryList, 'matches'> = {matches: reduce && query.includes('reduce')};
    return list as MediaQueryList;
  });
}

async function setup(options?: Parameters<typeof withLkViewTransitions>[0]) {
  TestBed.configureTestingModule({
    providers: [provideRouter(ROUTES, withLkViewTransitions(options))],
  });
  const harness = await RouterTestingHarness.create();
  return {harness, router: TestBed.inject(Router)};
}

describe('withLkViewTransitions', () => {
  let started: FakeTransition[];

  beforeEach(() => {
    TestBed.resetTestingModule();
    started = stubStartViewTransition();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('crossfades a navigation that changes the matched route', async () => {
    const {harness} = await setup();
    await harness.navigateByUrl('/budgets');
    await harness.navigateByUrl('/settings');

    expect(started.at(-1)?.skipTransition).not.toHaveBeenCalled();
  });

  it('skips the first navigation by default', async () => {
    const {harness} = await setup();
    await harness.navigateByUrl('/budgets');

    expect(started).toHaveLength(0);
  });

  it('crossfades the first navigation when skipInitialTransition is false', async () => {
    const {harness} = await setup({skipInitialTransition: false});
    await harness.navigateByUrl('/budgets');

    expect(started).toHaveLength(1);
    expect(started[0].skipTransition).not.toHaveBeenCalled();
  });

  it.each([
    ['only query params change', '/budgets?period=3m', '/budgets?period=1m'],
    ['a replaceUrl-style query write on the same route', '/budgets', '/budgets?q=rent'],
    ['only the fragment changes', '/budgets', '/budgets#top'],
    ['only a path param changes', '/detail/1', '/detail/2'],
    ['only a child query param changes', '/ledger/list', '/ledger/list?sort=desc'],
  ])('skips the crossfade when %s', async (_name, from, to) => {
    const {harness, router} = await setup();
    await harness.navigateByUrl(from);
    await router.navigateByUrl(to, {replaceUrl: true});

    expect(started.at(-1)?.skipTransition).toHaveBeenCalledTimes(1);
  });

  it('crossfades a change of child route under the same parent', async () => {
    const {harness} = await setup();
    await harness.navigateByUrl('/ledger/list');
    await harness.navigateByUrl('/ledger/chart');

    expect(started.at(-1)?.skipTransition).not.toHaveBeenCalled();
  });

  it('skips the crossfade when the reader prefers reduced motion', async () => {
    stubReducedMotion(true);
    const {harness} = await setup();
    await harness.navigateByUrl('/budgets');
    await harness.navigateByUrl('/settings');

    expect(started.at(-1)?.skipTransition).toHaveBeenCalledTimes(1);
  });

  it('calls onViewTransitionCreated only for a transition that goes ahead', async () => {
    const onViewTransitionCreated = vi.fn();
    const {harness} = await setup({onViewTransitionCreated});
    await harness.navigateByUrl('/budgets');
    await harness.navigateByUrl('/budgets?period=3m');
    expect(onViewTransitionCreated).not.toHaveBeenCalled();

    await harness.navigateByUrl('/settings');
    expect(onViewTransitionCreated).toHaveBeenCalledTimes(1);
  });
});
