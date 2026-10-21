import {BreakpointObserver} from '@angular/cdk/layout';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {PinnedBreakpointObserver} from '../../services/shell/pinned-breakpoints';
import {CMN_OVERLAY_INSET_BOTTOM} from '../../tokens/overlay-inset';
import {AppLayoutComponent} from './app-layout.component';

/** The bottom cover the shell publishes on the root, for overlays outside main (the toast stack). */
describe('AppLayoutComponent overlay inset', () => {
  const root = document.documentElement.style;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        provideRouter([{path: '**', children: []}]),
        {provide: BreakpointObserver, useValue: new PinnedBreakpointObserver('phone')},
      ],
    }).compileComponents();
  });

  afterEach(() => {
    root.removeProperty(CMN_OVERLAY_INSET_BOTTOM);
  });

  it('should publish the tab bar cover on the root in the overlay, and drop it outside it', async () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('navItems', [
      {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
    ]);
    fixture.componentRef.setInput('phoneOverlay', true);
    fixture.detectChanges();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    expect(root.getPropertyValue(CMN_OVERLAY_INSET_BOTTOM)).toMatch(/^\d+px$/);

    fixture.componentRef.setInput('phoneOverlay', false);
    fixture.detectChanges();
    expect(root.getPropertyValue(CMN_OVERLAY_INSET_BOTTOM)).toBe('');
  });

  it('should keep it published, with no frame unset, when the floating action changes', async () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('navItems', [
      {label: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard'},
    ]);
    fixture.componentRef.setInput('phoneOverlay', true);
    fixture.detectChanges();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    fixture.componentRef.setInput('floatingActionClearance', 56);
    fixture.detectChanges();
    expect(root.getPropertyValue(CMN_OVERLAY_INSET_BOTTOM)).toMatch(/^\d+px$/);
  });

  it('should drop it when the layout is destroyed', async () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentRef.setInput('phoneOverlay', true);
    fixture.detectChanges();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    fixture.destroy();
    expect(root.getPropertyValue(CMN_OVERLAY_INSET_BOTTOM)).toBe('');
  });
});
