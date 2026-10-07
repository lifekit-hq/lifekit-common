import {BreakpointObserver} from '@angular/cdk/layout';
import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {PinnedBreakpointObserver, type PinnedViewport} from './pinned-breakpoints';
import {CmnShellService} from './shell.service';

describe('CmnShellService', () => {
  let viewport: PinnedBreakpointObserver;

  function shellFor(pinned: PinnedViewport): CmnShellService {
    viewport = new PinnedBreakpointObserver(pinned);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{provide: BreakpointObserver, useValue: viewport}],
    });
    return TestBed.inject(CmnShellService);
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('is the phone shell below 600px', () => {
    const shell = shellFor('phone');
    expect(shell.mode()).toBe('phone');
    expect(shell.isPhone()).toBe(true);
  });

  it('is the rail from 600px up to 839px', () => {
    const shell = shellFor('rail');
    expect(shell.mode()).toBe('rail');
    expect(shell.isPhone()).toBe(false);
  });

  it('is the sidebar from 840px', () => {
    const shell = shellFor('sidebar');
    expect(shell.mode()).toBe('sidebar');
    expect(shell.isPhone()).toBe(false);
  });

  it('keeps the phone shell on a landscape phone wider than 840px', () => {
    const shell = shellFor('phone-landscape');
    expect(shell.mode()).toBe('phone');
    expect(shell.isPhone()).toBe(true);
  });

  it('follows the viewport as it changes', () => {
    const shell = shellFor('phone');
    viewport.pin('rail');
    expect(shell.mode()).toBe('rail');
    viewport.pin('sidebar');
    expect(shell.mode()).toBe('sidebar');
    viewport.pin('phone-landscape');
    expect(shell.mode()).toBe('phone');
  });
});
