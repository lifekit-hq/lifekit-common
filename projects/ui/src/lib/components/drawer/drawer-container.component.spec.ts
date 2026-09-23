import {type OverlayRef} from '@angular/cdk/overlay';
import {provideHttpClient} from '@angular/common/http';
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
        provideHttpClient(),
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
