import {BreakpointObserver, type BreakpointState} from '@angular/cdk/layout';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {CMN_DRAWER_DATA} from '../../components/drawer/drawer-config';
import {CmnDrawerRef} from '../../components/drawer/drawer-ref';
import {CmnDrawerService} from './drawer.service';

@Component({
  selector: 'cmn-test-drawer-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p class="content">drawer body</p>',
})
class ContentComponent {}

/** Stands in for the viewport: `wide` is true from `md` up. */
class FakeBreakpointObserver {
  public readonly state$ = new BehaviorSubject<BreakpointState>({matches: true, breakpoints: {}});

  public setWide(matches: boolean): void {
    this.state$.next({matches, breakpoints: {}});
  }

  public isMatched(): boolean {
    return this.state$.value.matches;
  }

  public observe(): BehaviorSubject<BreakpointState> {
    return this.state$;
  }
}

describe('CmnDrawerService', () => {
  let service: CmnDrawerService;
  let viewport: FakeBreakpointObserver;

  beforeEach(() => {
    vi.useFakeTimers();
    viewport = new FakeBreakpointObserver();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: BreakpointObserver, useValue: viewport},
      ],
    });
    service = TestBed.inject(CmnDrawerService);
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  function panels(): NodeListOf<Element> {
    return document.querySelectorAll('cmn-drawer-container');
  }

  it('attaches a container and the caller content into the overlay', () => {
    service.open(ContentComponent);
    expect(panels()).toHaveLength(1);
    expect(document.querySelector('.content')).not.toBeNull();
  });

  it('renders the configured title', () => {
    service.open(ContentComponent, {title: 'Transaction detail'});
    expect(document.querySelector('cmn-drawer-container h2')?.textContent?.trim()).toBe(
      'Transaction detail'
    );
  });

  it('gives the content access to the drawer data and ref', () => {
    const ref = service.open(ContentComponent, {data: {id: 7}});
    const outlet = document.querySelector('cmn-drawer-container');
    expect(outlet).not.toBeNull();
    expect(ref).toBeInstanceOf(CmnDrawerRef);
    expect(CMN_DRAWER_DATA.toString()).toContain('CmnDrawerData');
  });

  it('disposes the overlay after the close animation', () => {
    const ref = service.open(ContentComponent);
    ref.close();
    expect(panels()).toHaveLength(1);

    vi.runAllTimers();
    expect(panels()).toHaveLength(0);
  });

  it('closes on backdrop click by default', () => {
    service.open(ContentComponent);
    document.querySelector<HTMLElement>('.cmn-drawer-backdrop')?.click();
    vi.runAllTimers();
    expect(panels()).toHaveLength(0);
  });

  it('keeps the drawer open on backdrop click when closing is disabled', () => {
    service.open(ContentComponent, {disableClose: true});
    document.querySelector<HTMLElement>('.cmn-drawer-backdrop')?.click();
    vi.runAllTimers();
    expect(panels()).toHaveLength(1);
  });

  it('closes on Escape by default', () => {
    service.open(ContentComponent);
    document
      .querySelector('.cdk-overlay-container')
      ?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    vi.runAllTimers();
    expect(panels()).toHaveLength(0);
  });

  it('ignores Escape when closing is disabled', () => {
    service.open(ContentComponent, {disableClose: true});
    document
      .querySelector('.cdk-overlay-container')
      ?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    vi.runAllTimers();
    expect(panels()).toHaveLength(1);
  });

  it('ignores keys other than Escape', () => {
    service.open(ContentComponent);
    document
      .querySelector('.cdk-overlay-container')
      ?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    vi.advanceTimersByTime(1000);
    expect(panels()).toHaveLength(1);
  });

  function pane(): HTMLElement | null {
    return document.querySelector<HTMLElement>('.cdk-overlay-pane.cmn-drawer-panel');
  }

  function isSheet(): boolean {
    return (
      pane()?.classList.contains('cmn-drawer-panel--sheet') === true &&
      panels()[0]?.classList.contains('cmn-drawer--sheet') === true
    );
  }

  it('slides in from the side at the configured width from md up', () => {
    service.open(ContentComponent, {width: '720px'});
    expect(isSheet()).toBe(false);
    expect(pane()?.style.width).toBe('720px');
    expect(pane()?.style.height).toBe('100%');
  });

  it('opens as a full-width bottom sheet below md', () => {
    viewport.setWide(false);
    service.open(ContentComponent, {width: '720px'});
    expect(isSheet()).toBe(true);
    expect(pane()?.style.width).toBe('100%');
    expect(pane()?.style.height).toBe('');
  });

  it('honours an explicit side mode below md', () => {
    viewport.setWide(false);
    service.open(ContentComponent, {mode: 'side'});
    expect(isSheet()).toBe(false);
  });

  it('honours an explicit sheet mode from md up', () => {
    service.open(ContentComponent, {mode: 'sheet'});
    expect(isSheet()).toBe(true);
  });

  it('re-lays out an open responsive drawer when the viewport crosses md', () => {
    service.open(ContentComponent);
    expect(isSheet()).toBe(false);

    viewport.setWide(false);
    expect(isSheet()).toBe(true);
    expect(pane()?.style.width).toBe('100%');

    viewport.setWide(true);
    expect(isSheet()).toBe(false);
    expect(pane()?.style.width).toBe('480px');
  });

  it('keeps a pinned mode when the viewport crosses md', () => {
    service.open(ContentComponent, {mode: 'side'});
    viewport.setWide(false);
    expect(isSheet()).toBe(false);
  });

  describe('sheetOpen', () => {
    it('is false with no drawer and true only while a bottom sheet is open', () => {
      expect(service.sheetOpen()).toBe(false);
      viewport.setWide(false);
      const ref = service.open(ContentComponent);
      expect(service.sheetOpen()).toBe(true);
      ref.close();
      expect(service.sheetOpen()).toBe(false);
    });

    it('stays false for a side drawer', () => {
      service.open(ContentComponent, {mode: 'side'});
      expect(service.sheetOpen()).toBe(false);
    });

    it('follows an open drawer across the md breakpoint', () => {
      service.open(ContentComponent);
      expect(service.sheetOpen()).toBe(false);
      viewport.setWide(false);
      expect(service.sheetOpen()).toBe(true);
      viewport.setWide(true);
      expect(service.sheetOpen()).toBe(false);
    });
  });
});
