import {BreakpointObserver} from '@angular/cdk/layout';
import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import {AppLayoutComponent} from './app-layout.component';

describe('AppLayoutComponent page frame', () => {
  let viewport: PinnedBreakpointObserver;

  beforeEach(async () => {
    viewport = new PinnedBreakpointObserver('sidebar');
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter([{path: '**', children: []}]),
        {provide: BreakpointObserver, useValue: viewport},
      ],
    }).compileComponents();
  });

  const FRAME_PX = 100;
  const MAIN_PX = 300;

  @Component({
    imports: [AppLayoutComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <cmn-app-layout [phoneOverlay]="overlay()">
        @if (notice()) {
          <div cmnAppLayoutNotice class="notice" style="height: 40px"></div>
        }
        <div class="host">
          @for (row of rows(); track row) {
            <div class="row" style="height: 100px"></div>
          }
        </div>
      </cmn-app-layout>
    `,
  })
  class OverflowHostComponent {
    public readonly overlay = signal(true);
    public readonly rows = signal([1, 2, 3]);
    public readonly notice = signal(false);
  }

  let frameStyle: HTMLStyleElement;

  beforeEach(() => {
    frameStyle = document.createElement('style');
    frameStyle.textContent =
      `cmn-app-layout main { height: ${MAIN_PX}px; overflow-y: auto } ` +
      `cmn-app-layout main > .flow-root { height: ${FRAME_PX}px }`;
    document.head.appendChild(frameStyle);
  });

  afterEach(() => frameStyle.remove());

  function spacerHeight(host: ComponentFixture<OverflowHostComponent>): string {
    const main = (host.nativeElement as HTMLElement).querySelector('main') as HTMLElement;
    return (main.querySelector(':scope > div[aria-hidden]') as HTMLElement).style.height;
  }

  it('should size the spacer to what overflows the frame, as content comes and goes', async () => {
    viewport.pin('phone');
    const host = TestBed.createComponent(OverflowHostComponent);
    host.detectChanges();
    await vi.waitFor(() => expect(spacerHeight(host)).toBe('200px'));

    host.componentInstance.rows.set([1, 2, 3, 4, 5]);
    host.detectChanges();
    await vi.waitFor(() => expect(spacerHeight(host)).toBe('400px'));

    host.componentInstance.rows.set([1]);
    host.detectChanges();
    await vi.waitFor(() => expect(spacerHeight(host)).toBe('0px'));
  });

  it('should leave no spacer outside the phone overlay', async () => {
    viewport.pin('phone');
    const host = TestBed.createComponent(OverflowHostComponent);
    host.detectChanges();
    await vi.waitFor(() => expect(spacerHeight(host)).toBe('200px'));

    host.componentInstance.overlay.set(false);
    host.detectChanges();
    await vi.waitFor(() => expect(spacerHeight(host)).toBe(''));
  });

  it('should size the frame below what sits above it in main, and drop that outside the overlay', async () => {
    viewport.pin('phone');
    const host = TestBed.createComponent(OverflowHostComponent);
    host.componentInstance.notice.set(true);
    host.detectChanges();
    const main = (host.nativeElement as HTMLElement).querySelector('main') as HTMLElement;
    await vi.waitFor(() => expect(main.style.getPropertyValue('--cmn-page-above')).toBe('40px'));

    host.componentInstance.notice.set(false);
    host.detectChanges();
    await vi.waitFor(() => expect(main.style.getPropertyValue('--cmn-page-above')).toBe('0px'));

    host.componentInstance.overlay.set(false);
    host.detectChanges();
    await vi.waitFor(() => expect(main.style.getPropertyValue('--cmn-page-above')).toBe(''));
  });

  const FILL_VARIANTS = [
    'has-[[data-cmn-fill]]:flex',
    'has-[[data-cmn-fill]]:flex-col',
    'has-[[data-cmn-fill]]:[&>:not(router-outlet)]:min-h-0',
    'has-[[data-cmn-fill]]:[&>:not(router-outlet)]:flex-1',
  ];

  function frame(host: ComponentFixture<OverflowHostComponent>): HTMLElement {
    return (host.nativeElement as HTMLElement).querySelector(
      'main > div:not(.sticky)'
    ) as HTMLElement;
  }

  it('should bound the plain frame below the title only while a fill page shows', () => {
    viewport.pin('sidebar');
    const host = TestBed.createComponent(OverflowHostComponent);
    host.componentInstance.overlay.set(false);
    host.detectChanges();
    const classes = frame(host).classList;
    expect(classes).toContain('contents');
    for (const cls of [...FILL_VARIANTS, 'has-[[data-cmn-fill]]:flex-1']) {
      expect(classes).toContain(cls);
    }
    // Without a fill page the frame keeps no box of its own: only the `has` variants add one
    expect(classes).not.toContain('flow-root');
    expect(classes).not.toContain('flex-1');
  });

  it('should hand a fill page the rest of the frame in the phone overlay too', () => {
    viewport.pin('phone');
    const host = TestBed.createComponent(OverflowHostComponent);
    host.detectChanges();
    const classes = frame(host).classList;
    expect(classes).toContain('flow-root');
    for (const cls of FILL_VARIANTS) {
      expect(classes).toContain(cls);
    }
  });
});
