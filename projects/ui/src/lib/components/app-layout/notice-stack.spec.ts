import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';

import {AppLayoutComponent} from './app-layout.component';

describe('AppLayoutComponent notices that are not showing', () => {
  // An app projects each notice as its own child (offline banner, update prompt, install hint); a
  // notice that is not showing is a box with no height. The column puts the group gap between the
  // notices that show (the stylesheet reads `data-cmn-notice-stacked`), never around idle ones.
  @Component({
    imports: [AppLayoutComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
      <cmn-app-layout>
        <div cmnAppLayoutNotice class="notice offline" style="display: block">
          @if (showing().offline) {
            <p style="height: 40px; margin: 0">Offline</p>
          }
        </div>
        <div cmnAppLayoutNotice class="notice update" style="display: block">
          @if (showing().update) {
            <p style="height: 40px; margin: 0">Update</p>
          }
        </div>
        <div cmnAppLayoutNotice class="notice install" style="display: block">
          @if (showing().install) {
            <p style="height: 40px; margin: 0">Install</p>
          }
        </div>
        <p>Body</p>
      </cmn-app-layout>
    `,
  })
  class IdleNoticesHostComponent {
    public readonly showing = signal({offline: false, update: false, install: false});
  }

  let host: ComponentFixture<IdleNoticesHostComponent>;

  const stacked = (): string[] =>
    Array.from((host.nativeElement as HTMLElement).querySelectorAll('[data-cmn-notices] > .notice'))
      .filter(el => el.hasAttribute('data-cmn-notice-stacked'))
      .map(el => el.classList[1] ?? '');
  const settle = async (): Promise<void> => {
    // The stacking follows the notices' resize, which the browser reports before the next paint.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  };
  const show = async (offline: boolean, update: boolean, install: boolean): Promise<void> => {
    host.componentInstance.showing.set({offline, update, install});
    host.detectChanges();
    await settle();
  };

  beforeEach(async () => {
    host = TestBed.createComponent(IdleNoticesHostComponent);
    host.detectChanges();
    await settle();
  });

  it('should stack nothing while no notice is showing', () => {
    expect(stacked()).toEqual([]);
  });

  it('should stack nothing for the one notice that is showing', async () => {
    await show(false, true, false);
    expect(stacked()).toEqual([]);
  });

  it('should stack a showing notice only under another showing one, past the idle ones', async () => {
    await show(true, false, true);
    expect(stacked()).toEqual(['install']);

    await show(true, true, true);
    expect(stacked()).toEqual(['update', 'install']);
  });

  it('should give the gap back when a notice goes away', async () => {
    await show(true, true, false);
    expect(stacked()).toEqual(['update']);
    await show(false, true, false);
    expect(stacked()).toEqual([]);
  });
});
