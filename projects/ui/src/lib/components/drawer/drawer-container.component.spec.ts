import {type OverlayRef} from '@angular/cdk/overlay';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {CmnDrawerContainerComponent} from './drawer-container.component';
import {CmnDrawerRef} from './drawer-ref';

describe('CmnDrawerContainerComponent', () => {
  let fixture: ComponentFixture<CmnDrawerContainerComponent>;
  let drawerRef: CmnDrawerRef;

  beforeEach(async () => {
    drawerRef = new CmnDrawerRef();
    const overlayRef: Partial<OverlayRef> = {dispose: vi.fn()};
    drawerRef.overlayRef = overlayRef as OverlayRef;

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CmnDrawerContainerComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: CmnDrawerRef, useValue: drawerRef},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CmnDrawerContainerComponent);
  });

  function closeButton(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      'button[aria-label="Close drawer"]'
    );
  }

  it('renders the title the service sets on it', () => {
    fixture.componentInstance.title.set('Transaction detail');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')?.textContent?.trim()).toBe(
      'Transaction detail'
    );
  });

  it('renders an empty heading when no title is set', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')?.textContent?.trim()).toBe(
      ''
    );
  });

  /** The container flips to `open` inside a requestAnimationFrame after the view init. */
  async function settleEntryAnimation(): Promise<void> {
    fixture.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    fixture.detectChanges();
  }

  it('starts neither open nor closing before the entry frame runs', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.isOpen).toBe(false);
    expect(fixture.componentInstance.isClosing).toBe(false);
  });

  it('marks itself open on the first animation frame', async () => {
    await settleEntryAnimation();
    expect(fixture.componentInstance.isOpen).toBe(true);
    expect((fixture.nativeElement as HTMLElement).classList.contains('cmn-drawer--open')).toBe(
      true
    );
  });

  it('flips to closing when the ref announces a close', async () => {
    await settleEntryAnimation();
    drawerRef.close();
    fixture.detectChanges();

    expect(fixture.componentInstance.isClosing).toBe(true);
    expect(fixture.componentInstance.isOpen).toBe(false);
  });

  it('mirrors the closing state onto the host class', async () => {
    await settleEntryAnimation();
    drawerRef.close();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).classList.contains('cmn-drawer--closing')).toBe(
      true
    );
    expect((fixture.nativeElement as HTMLElement).classList.contains('cmn-drawer--open')).toBe(
      false
    );
  });

  it('closes through the ref when the header button is pressed', () => {
    const spy = vi.spyOn(drawerRef, 'close');
    fixture.detectChanges();
    closeButton()?.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('exposes a portal outlet for the service to attach content into', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.portalOutlet()).toBeTruthy();
  });
});

describe('CmnDrawerContainerComponent as a bottom sheet', () => {
  const DISMISS_DRAG_PX = 120;
  const SHORT_DRAG_PX = 40;

  let fixture: ComponentFixture<CmnDrawerContainerComponent>;
  let drawerRef: CmnDrawerRef;
  let host: HTMLElement;

  beforeEach(async () => {
    drawerRef = new CmnDrawerRef();
    const overlayRef: Partial<OverlayRef> = {dispose: vi.fn()};
    drawerRef.overlayRef = overlayRef as OverlayRef;

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CmnDrawerContainerComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: CmnDrawerRef, useValue: drawerRef},
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CmnDrawerContainerComponent);
    fixture.componentInstance.sheet.set(true);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  function dragZone(): HTMLElement {
    return host.querySelector('h2')?.parentElement?.parentElement as HTMLElement;
  }

  function pointer(type: string, clientY: number, target: Element = dragZone()): void {
    target.dispatchEvent(new PointerEvent(type, {clientY, pointerId: 1, bubbles: true}));
    fixture.detectChanges();
  }

  function drag(distance: number): void {
    pointer('pointerdown', 0);
    pointer('pointermove', distance);
    pointer('pointerup', distance);
  }

  it('shows a drag handle and the sheet host class', () => {
    expect(host.querySelector('[data-testid="drawer-handle"]')).not.toBeNull();
    expect(host.classList.contains('cmn-drawer--sheet')).toBe(true);
  });

  it('has no handle in the side-panel presentation', () => {
    fixture.componentInstance.sheet.set(false);
    fixture.detectChanges();
    expect(host.querySelector('[data-testid="drawer-handle"]')).toBeNull();
    expect(host.classList.contains('cmn-drawer--sheet')).toBe(false);
  });

  it('follows the pointer while dragging down and ignores upward drags', () => {
    pointer('pointerdown', 100);
    pointer('pointermove', 150);
    expect(host.style.transform).toBe('translateY(50px)');
    expect(host.classList.contains('cmn-drawer--dragging')).toBe(true);

    pointer('pointermove', 60);
    expect(host.style.transform).toBe('');
  });

  it('dismisses when released past the threshold', () => {
    const spy = vi.spyOn(drawerRef, 'close');
    drag(DISMISS_DRAG_PX);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(host.classList.contains('cmn-drawer--dragging')).toBe(false);
  });

  it('snaps back when released before the threshold', () => {
    const spy = vi.spyOn(drawerRef, 'close');
    drag(SHORT_DRAG_PX);
    expect(spy).not.toHaveBeenCalled();
    expect(host.style.transform).toBe('');
  });

  it('snaps back instead of dismissing when closing is disabled', () => {
    const spy = vi.spyOn(drawerRef, 'close');
    fixture.componentInstance.disableClose.set(true);
    drag(DISMISS_DRAG_PX);
    expect(spy).not.toHaveBeenCalled();
  });

  it('treats a cancelled pointer as a release', () => {
    const spy = vi.spyOn(drawerRef, 'close');
    pointer('pointerdown', 0);
    pointer('pointermove', DISMISS_DRAG_PX);
    pointer('pointercancel', DISMISS_DRAG_PX);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not start a drag from the close button', () => {
    const button = host.querySelector('button[aria-label="Close drawer"]') as HTMLElement;
    pointer('pointerdown', 0, button);
    pointer('pointermove', DISMISS_DRAG_PX, button);
    expect(fixture.componentInstance.dragging()).toBe(false);
    expect(host.style.transform).toBe('');
  });

  it('ignores moves and releases without a drag in progress', () => {
    const spy = vi.spyOn(drawerRef, 'close');
    pointer('pointermove', DISMISS_DRAG_PX);
    pointer('pointerup', DISMISS_DRAG_PX);
    expect(spy).not.toHaveBeenCalled();
    expect(host.style.transform).toBe('');
  });

  describe('stops', () => {
    const MOUSE_CLICK_DETAIL = 1;

    function grabber(): HTMLButtonElement {
      return host.querySelector('button.cmn-drawer-grabber') as HTMLButtonElement;
    }

    function tapGrabber(): void {
      pointer('pointerdown', 0, grabber());
      pointer('pointerup', 0, grabber());
    }

    function isFull(): boolean {
      return host.classList.contains('cmn-drawer--full');
    }

    it('opens at the half stop', () => {
      expect(fixture.componentInstance.stop()).toBe('half');
      expect(isFull()).toBe(false);
      expect(grabber().getAttribute('aria-label')).toBe('Expand sheet');
    });

    it('cycles half, full, half when the grabber is tapped', () => {
      tapGrabber();
      expect(fixture.componentInstance.stop()).toBe('full');
      expect(isFull()).toBe(true);
      expect(grabber().getAttribute('aria-label')).toBe('Collapse sheet');

      tapGrabber();
      expect(fixture.componentInstance.stop()).toBe('half');
      expect(isFull()).toBe(false);
    });

    it('does not close the sheet on a tap', () => {
      const spy = vi.spyOn(drawerRef, 'close');
      tapGrabber();
      expect(spy).not.toHaveBeenCalled();
    });

    it('leaves the stop alone when the header, not the grabber, is tapped', () => {
      pointer('pointerdown', 0);
      pointer('pointerup', 0);
      expect(fixture.componentInstance.stop()).toBe('half');
    });

    it('treats a drag that starts on the grabber as a drag, not a tap', () => {
      const spy = vi.spyOn(drawerRef, 'close');
      pointer('pointerdown', 0, grabber());
      pointer('pointermove', SHORT_DRAG_PX, grabber());
      pointer('pointerup', SHORT_DRAG_PX, grabber());
      expect(fixture.componentInstance.stop()).toBe('half');
      expect(spy).not.toHaveBeenCalled();
      expect(host.style.transform).toBe('');
    });

    it('leaves the stop alone when the grabber is swiped up', () => {
      fixture.componentInstance.stop.set('full');
      pointer('pointerdown', DISMISS_DRAG_PX, grabber());
      pointer('pointermove', 0, grabber());
      pointer('pointerup', 0, grabber());
      expect(fixture.componentInstance.stop()).toBe('full');
    });

    it('leaves the stop alone when a grabber press is cancelled', () => {
      pointer('pointerdown', 0, grabber());
      pointer('pointercancel', 0, grabber());
      expect(fixture.componentInstance.stop()).toBe('half');
      expect(fixture.componentInstance.dragging()).toBe(false);
    });

    it('still dismisses by dragging the grabber past the threshold, from either stop', () => {
      const spy = vi.spyOn(drawerRef, 'close');
      tapGrabber();
      pointer('pointerdown', 0, grabber());
      pointer('pointermove', DISMISS_DRAG_PX, grabber());
      pointer('pointerup', DISMISS_DRAG_PX, grabber());
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('cycles on a keyboard activation of the grabber', () => {
      grabber().dispatchEvent(new MouseEvent('click', {detail: 0, bubbles: true}));
      expect(fixture.componentInstance.stop()).toBe('full');
    });

    it('does not cycle twice for a pointer click, which the tap already handled', () => {
      tapGrabber();
      grabber().dispatchEvent(new MouseEvent('click', {detail: MOUSE_CLICK_DETAIL, bubbles: true}));
      expect(fixture.componentInstance.stop()).toBe('full');
    });

    it('carries no full stop class in the side-panel presentation', () => {
      tapGrabber();
      fixture.componentInstance.sheet.set(false);
      fixture.detectChanges();
      expect(isFull()).toBe(false);
    });
  });

  it('does not drag in the side-panel presentation', () => {
    fixture.componentInstance.sheet.set(false);
    fixture.detectChanges();
    pointer('pointerdown', 0);
    pointer('pointermove', DISMISS_DRAG_PX);
    expect(fixture.componentInstance.dragging()).toBe(false);
  });
});
