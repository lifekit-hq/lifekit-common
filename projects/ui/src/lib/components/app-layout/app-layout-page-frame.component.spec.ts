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
  }

  let frameStyle: HTMLStyleElement;

  beforeEach(() => {
    frameStyle = document.createElement('style');
    frameStyle.textContent =
      `cmn-app-layout main { height: ${MAIN_PX}px; overflow-y: auto } ` +
      `cmn-app-layout main > .h-full { height: ${FRAME_PX}px }`;
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
});
