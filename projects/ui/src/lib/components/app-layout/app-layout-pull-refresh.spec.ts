import {BreakpointObserver} from '@angular/cdk/layout';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it, type Mock, vi} from 'vitest';

import {CmnDrawerService} from '../../services/drawer/drawer.service';
import {CmnPullRefreshService} from '../../services/pull-refresh/pull-refresh.service';
import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import {AppLayoutComponent, type NavItem} from './app-layout.component';
import {PULL_HOLD_PX, PULL_RESISTANCE, PULL_SLOP_PX, PULL_THRESHOLD_PX} from './pull-refresh';

@Component({
  selector: 'cmn-test-pull-sheet-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>Sheet</p>',
})
class SheetContentComponent {}

const NAV_ITEMS: NavItem[] = [
  {label: 'Tasks', icon: 'ListChecks', route: '/tasks'},
  {label: 'Calendar', icon: 'Calendar', route: '/calendar'},
];

const THRESHOLD_TRAVEL_PX = PULL_THRESHOLD_PX / PULL_RESISTANCE;

function fire(target: Element, type: string, y = 0): boolean {
  const touch = new Touch({identifier: 1, target, clientX: 100, clientY: y});
  const ended = type === 'touchend' || type === 'touchcancel';
  const event = new TouchEvent(type, {
    touches: ended ? [] : [touch],
    changedTouches: [touch],
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

/** Pull to refresh in the shell: the gesture is the layout's, the reload is the page's. */
describe('AppLayoutComponent pull to refresh', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  let service: CmnPullRefreshService;
  let main: HTMLElement;
  let reload: Mock<() => void>;
  let reduceMotion: boolean;

  const status = (): string =>
    (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent?.trim() ??
    '';
  const indicator = (): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(
      'cmn-pull-refresh-indicator'
    ) as HTMLElement;

  async function openAt(url: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
  }

  function pull(travel: number): boolean {
    fire(main, 'touchstart', 100);
    fire(main, 'touchmove', 100 + PULL_SLOP_PX + 1);
    return fire(main, 'touchmove', 100 + PULL_SLOP_PX + 1 + travel);
  }

  beforeEach(async () => {
    reduceMotion = false;
    vi.spyOn(window, 'matchMedia').mockImplementation(
      query =>
        ({
          matches: reduceMotion && query.includes('prefers-reduced-motion'),
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList
    );
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter([{path: '**', children: []}]),
        {provide: BreakpointObserver, useValue: new PinnedBreakpointObserver('phone')},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('navItems', NAV_ITEMS);
    fixture.componentRef.setInput('phoneOverlay', true);
    fixture.detectChanges();
    main = (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;
    service = TestBed.inject(CmnPullRefreshService);
    reload = vi.fn<() => void>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reload a tab root that registered a reload, with progress shown until it is done', async () => {
    let finish!: () => void;
    service.register(() => {
      reload();
      return new Promise<void>(resolve => (finish = resolve));
    });
    await openAt('/tasks');

    expect(pull(THRESHOLD_TRAVEL_PX)).toBe(true);
    fixture.detectChanges();
    expect(main.style.transform).not.toBe('');
    expect(indicator().querySelector('[data-cmn-pull-indicator]')).not.toBeNull();

    fire(main, 'touchend');
    fixture.detectChanges();
    expect(reload).toHaveBeenCalledOnce();
    expect(status()).toBe('Refreshing');
    expect(main.style.transform).toBe(`translateY(${PULL_HOLD_PX}px)`);
    expect(indicator().querySelector('.animate-spin')).not.toBeNull();

    finish();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(status()).toBe('');
    });
    expect(main.style.transform).toBe('');
  });

  it('should not pull a page that registered no reload', async () => {
    await openAt('/tasks');
    expect(pull(THRESHOLD_TRAVEL_PX)).toBe(false);
    expect(main.style.transform).toBe('');
  });

  it('should not pull a screen that is not a tab root, even with a reload registered', async () => {
    service.register(reload);
    await openAt('/tasks/42');
    expect(pull(THRESHOLD_TRAVEL_PX)).toBe(false);
    fire(main, 'touchend');
    expect(reload).not.toHaveBeenCalled();
  });

  it('should not pull while a bottom sheet is open', async () => {
    service.register(reload);
    await openAt('/tasks');
    TestBed.inject(CmnDrawerService).open(SheetContentComponent, {mode: 'sheet'});
    fixture.detectChanges();
    expect(pull(THRESHOLD_TRAVEL_PX)).toBe(false);
    fire(main, 'touchend');
    expect(reload).not.toHaveBeenCalled();
  });

  it('should not reload when released short of the threshold', async () => {
    service.register(reload);
    await openAt('/tasks');
    pull(THRESHOLD_TRAVEL_PX / 2);
    fire(main, 'touchend');
    fixture.detectChanges();
    expect(reload).not.toHaveBeenCalled();
    expect(main.style.transform).toBe('');
  });

  it('should keep the browser from chaining the overscroll, with or without a reload', () => {
    expect(main.classList).toContain('overscroll-y-contain');
  });

  it('should move the content with a settle transition, but not while a finger is on it', async () => {
    service.register(reload);
    await openAt('/tasks');
    expect(main.className).toContain('duration-cmn-medium');
    expect(main.className).toContain('motion-reduce:transition-none');

    pull(40);
    fixture.detectChanges();
    expect(main.className).not.toContain('duration-cmn-medium');
  });

  describe('under Reduce Motion', () => {
    beforeEach(() => {
      reduceMotion = true;
    });

    it('should leave the content where it is and still reload', async () => {
      service.register(reload);
      await openAt('/tasks');

      pull(THRESHOLD_TRAVEL_PX);
      fixture.detectChanges();
      expect(main.style.transform).toBe('');
      expect(
        indicator().querySelector<HTMLElement>('[data-cmn-pull-indicator]')?.style.opacity
      ).toBe('1');

      fire(main, 'touchend');
      fixture.detectChanges();
      expect(reload).toHaveBeenCalledOnce();
      expect(main.style.transform).toBe('');
      expect(status()).toBe('Refreshing');
    });
  });
});
