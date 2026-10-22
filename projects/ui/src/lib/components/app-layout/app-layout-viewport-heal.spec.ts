import {BreakpointObserver} from '@angular/cdk/layout';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import {AppLayoutComponent} from './app-layout.component';

const STATUS_BAR = 62;

/** The standalone iOS keyboard bug: only the phone shell re-measures its frame after the keyboard. */
describe('AppLayoutComponent keyboard viewport heal', () => {
  let fixture: ComponentFixture<AppLayoutComponent>;
  let viewport: PinnedBreakpointObserver;
  let field: HTMLInputElement;

  /** Opens and closes the keyboard on a field while the window reports a shrunk height. */
  function blurShrunk(): number {
    const frame = (fixture.nativeElement as HTMLElement).firstElementChild as HTMLElement;
    const watcher = new MutationObserver(() => undefined);
    watcher.observe(frame, {attributes: true, attributeFilter: ['style']});
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(window.innerHeight - STATUS_BAR);
    field.focus();
    field.blur();
    vi.restoreAllMocks();
    const flips = watcher.takeRecords().length;
    watcher.disconnect();
    return flips;
  }

  function show(shell: 'phone' | 'rail' | 'sidebar'): void {
    viewport.pin(shell);
    fixture.detectChanges();
    TestBed.tick();
  }

  beforeEach(async () => {
    viewport = new PinnedBreakpointObserver('sidebar');
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter([{path: '**', children: []}]),
        {provide: BreakpointObserver, useValue: viewport},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.detectChanges();
    field = document.createElement('input');
    (fixture.nativeElement as HTMLElement).querySelector('main')?.append(field);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should re-measure the phone frame when the keyboard leaves the window short', () => {
    show('phone');
    expect(blurShrunk()).toBeGreaterThan(0);
  });

  it('should leave the desktop and tablet shells alone', () => {
    show('sidebar');
    expect(blurShrunk()).toBe(0);
    show('rail');
    expect(blurShrunk()).toBe(0);
  });

  it('should stop healing once the window leaves the phone shell', () => {
    show('phone');
    show('rail');
    expect(blurShrunk()).toBe(0);
  });
});
