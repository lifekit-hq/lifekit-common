import {DialogConfig, DialogRef} from '@angular/cdk/dialog';
import {BreakpointObserver} from '@angular/cdk/layout';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject, map} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {SHEET_DISMISS_DISTANCE_PX} from '../../sheet-drag/sheet-drag';
import {CmnDialogConfig, type CmnDialogPhoneMode, type CmnDialogSize} from './dialog-config';
import {CmnDialogContainerComponent} from './dialog-container.component';

function makeConfig(overrides: Partial<CmnDialogConfig> = {}): CmnDialogConfig {
  const config = new CmnDialogConfig();
  Object.assign(config, overrides);
  return config;
}

describe('CmnDialogContainerComponent', () => {
  let fixture: ComponentFixture<CmnDialogContainerComponent>;
  let close: ReturnType<typeof vi.fn>;
  let desktop$: BehaviorSubject<boolean>;
  let overlayRef: {
    addPanelClass: ReturnType<typeof vi.fn>;
    removePanelClass: ReturnType<typeof vi.fn>;
  };

  function setup(config: CmnDialogConfig, desktop = true): void {
    close = vi.fn();
    desktop$ = new BehaviorSubject(desktop);
    overlayRef = {addPanelClass: vi.fn(), removePanelClass: vi.fn()};
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CmnDialogContainerComponent],
      providers: [
        {provide: DialogConfig, useValue: config},
        {provide: DialogRef, useValue: {close, overlayRef}},
        {
          provide: BreakpointObserver,
          useValue: {
            isMatched: () => desktop$.value,
            observe: () => desktop$.pipe(map(matches => ({matches, breakpoints: {}}))),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(CmnDialogContainerComponent);
    fixture.detectChanges();
  }

  function shell(): HTMLElement {
    return (fixture.nativeElement as HTMLElement).querySelector('section') as HTMLElement;
  }

  beforeEach(() => {
    setup(makeConfig());
  });

  it('marks the shell as a modal dialog', () => {
    expect(shell().getAttribute('role')).toBe('dialog');
    expect(shell().getAttribute('aria-modal')).toBe('true');
  });

  it('is held by a shadow and a hairline border', () => {
    expect(shell().classList).toContain('shadow-cmn-lg');
    expect(shell().classList).toContain('border');
    expect(shell().classList).toContain('border-border-default');
  });

  it('sizes the body to its content, leaving no empty band under the actions', () => {
    const body = (fixture.nativeElement as HTMLElement).querySelector('.cmn-dialog-shell__body');
    expect(body?.className).not.toMatch(/min-h-/);
  });

  it('omits aria-label when none is configured', () => {
    expect(shell().getAttribute('aria-label')).toBeNull();
  });

  it('applies a configured aria-label', () => {
    setup(makeConfig({ariaLabel: 'Connect an account'}));
    expect(shell().getAttribute('aria-label')).toBe('Connect an account');
  });

  it('renders no header when the config carries no title', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('header')).toBeNull();
  });

  it('renders a titled header with a close button', () => {
    setup(makeConfig({title: 'Settings'}));
    expect((fixture.nativeElement as HTMLElement).querySelector('h2')?.textContent?.trim()).toBe(
      'Settings'
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Close dialog"]')
    ).not.toBeNull();
  });

  it.each<[CmnDialogSize, string]>([
    ['sm', 'max-w-md'],
    ['md', 'max-w-xl'],
    ['lg', 'max-w-3xl'],
    ['full', 'h-[95vh]'],
  ])('applies the "%s" size classes', (size, expected) => {
    setup(makeConfig({title: 'Sized', size}));
    expect(shell().className).toContain(expected);
  });

  it('closes when the header close button is pressed', () => {
    setup(makeConfig({title: 'Settings'}));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')
      ?.click();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('ignores the close button when the dialog disables closing', () => {
    setup(makeConfig({title: 'Settings', disableClose: true}));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]')
      ?.click();
    expect(close).not.toHaveBeenCalled();
  });

  describe('on a phone', () => {
    const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

    function phone(phoneMode?: CmnDialogPhoneMode, overrides: Partial<CmnDialogConfig> = {}): void {
      setup(
        makeConfig({title: 'Edit account', ...(phoneMode ? {phone: phoneMode} : {}), ...overrides}),
        false
      );
    }

    function pointer(type: string, clientY: number, target: Element): void {
      target.dispatchEvent(new PointerEvent(type, {clientY, pointerId: 1, bubbles: true}));
      fixture.detectChanges();
    }

    function swipe(distance: number, target: Element = host().querySelector('header') as Element) {
      pointer('pointerdown', 0, target);
      pointer('pointermove', distance, target);
      pointer('pointerup', distance, target);
    }

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('presents a sheet by default, with a grabber and no card border or shadow on the sides', () => {
      phone();
      expect(host().dataset['presentation']).toBe('sheet');
      expect(host().querySelector('[data-testid="dialog-handle"]')).not.toBeNull();
      expect(shell().className).not.toContain('rounded-cmn-lg');
    });

    it('draws the centred dialog from md up whatever the phone mode', () => {
      setup(makeConfig({title: 'Edit account', phone: 'action-sheet'}), true);
      expect(host().dataset['presentation']).toBe('dialog');
      expect(host().querySelector('[data-testid="dialog-handle"]')).toBeNull();
      expect(shell().className).toContain('rounded-cmn-lg');
    });

    it('re-presents when the viewport crosses md while open', () => {
      phone();
      desktop$.next(true);
      fixture.detectChanges();
      expect(host().dataset['presentation']).toBe('dialog');
      desktop$.next(false);
      fixture.detectChanges();
      expect(host().dataset['presentation']).toBe('sheet');
    });

    it('anchors the overlay pane for the phone mode and releases it on desktop', () => {
      phone('full-screen');
      expect(overlayRef.addPanelClass).toHaveBeenLastCalledWith('cmn-dialog-panel--full-screen');
      desktop$.next(true);
      fixture.detectChanges();
      expect(overlayRef.removePanelClass).toHaveBeenCalled();
      expect(overlayRef.addPanelClass).toHaveBeenCalledTimes(1);
    });

    it('lets the full-screen mode carry no grabber and ignore swipes', () => {
      phone('full-screen');
      expect(host().querySelector('[data-testid="dialog-handle"]')).toBeNull();
      vi.useFakeTimers();
      swipe(SHEET_DISMISS_DISTANCE_PX * 2);
      vi.runAllTimers();
      expect(close).not.toHaveBeenCalled();
      expect(host().style.transform).toBe('');
    });

    it('follows a downward swipe on the header and slides out past the threshold', () => {
      phone();
      vi.useFakeTimers();
      pointer('pointerdown', 10, host().querySelector('header') as Element);
      pointer('pointermove', 70, host().querySelector('header') as Element);
      expect(host().style.transform).toBe('translateY(60px)');
      expect(host().classList.contains('cmn-dialog--dragging')).toBe(true);
      pointer('pointerup', 70, host().querySelector('header') as Element);
      expect(close).not.toHaveBeenCalled();
      expect(host().style.transform).toBe('');

      swipe(SHEET_DISMISS_DISTANCE_PX);
      expect(host().classList.contains('cmn-dialog--closing')).toBe(true);
      expect(close).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('can be swiped from the grabber of a headerless sheet', () => {
      phone('sheet', {title: undefined});
      vi.useFakeTimers();
      swipe(
        SHEET_DISMISS_DISTANCE_PX,
        host().querySelector('[data-testid="dialog-handle"]') as Element
      );
      vi.runAllTimers();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('does not start a swipe from the body, so its content still scrolls', () => {
      phone();
      vi.useFakeTimers();
      swipe(
        SHEET_DISMISS_DISTANCE_PX * 2,
        host().querySelector('.cmn-dialog-shell__body') as Element
      );
      vi.runAllTimers();
      expect(close).not.toHaveBeenCalled();
    });

    it('does not start a swipe from the close button', () => {
      phone();
      swipe(
        SHEET_DISMISS_DISTANCE_PX * 2,
        host().querySelector('button[aria-label="Close dialog"]') as Element
      );
      expect(host().classList.contains('cmn-dialog--dragging')).toBe(false);
    });

    it('snaps back instead of dismissing when closing is disabled', () => {
      phone('sheet', {disableClose: true});
      vi.useFakeTimers();
      swipe(SHEET_DISMISS_DISTANCE_PX * 2);
      vi.runAllTimers();
      expect(close).not.toHaveBeenCalled();
      expect(host().style.transform).toBe('');
    });

    it('lets a close predicate veto the slide-out', () => {
      const closePredicate = vi.fn().mockReturnValue(false);
      phone('sheet', {closePredicate});
      vi.useFakeTimers();
      swipe(SHEET_DISMISS_DISTANCE_PX);
      vi.runAllTimers();
      expect(closePredicate).toHaveBeenCalled();
      expect(close).not.toHaveBeenCalled();
      expect(host().classList.contains('cmn-dialog--closing')).toBe(false);
    });

    it('slides out for every caller of close, once', () => {
      phone();
      vi.useFakeTimers();
      const ref = TestBed.inject(DialogRef);
      ref.close();
      ref.close();
      expect(close).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('closes at once when the user prefers reduced motion', () => {
      phone();
      vi.spyOn(window, 'matchMedia').mockReturnValue({matches: true} as MediaQueryList);
      TestBed.inject(DialogRef).close();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('closes at once on desktop', () => {
      setup(makeConfig({title: 'Settings'}));
      TestBed.inject(DialogRef).close();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('draws an action sheet as a card above a separate Cancel button', () => {
      phone('action-sheet', {cancelLabel: 'Keep it'});
      expect(host().querySelector('header')).toBeNull();
      expect(host().querySelector('.cmn-dialog-shell__title')?.textContent?.trim()).toBe(
        'Edit account'
      );
      const cancel = host().querySelector<HTMLButtonElement>('.cmn-dialog-shell__cancel');
      expect(cancel?.textContent?.trim()).toBe('Keep it');
      vi.useFakeTimers();
      cancel?.click();
      vi.runAllTimers();
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('draws no Cancel on an action sheet that cannot be closed', () => {
      phone('action-sheet', {disableClose: true});
      expect(host().querySelector('.cmn-dialog-shell__cancel')).toBeNull();
    });

    it('swipes only a sheet, not an action sheet', () => {
      phone('action-sheet');
      vi.useFakeTimers();
      swipe(
        SHEET_DISMISS_DISTANCE_PX * 2,
        host().querySelector('.cmn-dialog-shell__body') as Element
      );
      vi.runAllTimers();
      expect(close).not.toHaveBeenCalled();
    });

    describe('with the on-screen keyboard', () => {
      type Listener = () => void;
      const listeners = new Map<string, Set<Listener>>();
      let viewport: {height: number; offsetTop: number; scale: number};

      beforeEach(() => {
        listeners.clear();
        viewport = {height: window.innerHeight, offsetTop: 0, scale: 1};
        Object.defineProperty(window, 'visualViewport', {
          configurable: true,
          value: {
            get height() {
              return viewport.height;
            },
            get offsetTop() {
              return viewport.offsetTop;
            },
            get scale() {
              return viewport.scale;
            },
            addEventListener: (type: string, fn: Listener) => {
              listeners.set(type, (listeners.get(type) ?? new Set()).add(fn));
            },
            removeEventListener: (type: string, fn: Listener) => listeners.get(type)?.delete(fn),
          },
        });
      });

      afterEach(() => {
        Reflect.deleteProperty(window, 'visualViewport');
      });

      function keyboard(height: number): void {
        viewport.height = window.innerHeight - height;
        listeners.get('resize')?.forEach(fn => fn());
        fixture.detectChanges();
      }

      it('publishes the keyboard height so the sheet rides above it', () => {
        phone();
        keyboard(300);
        expect(host().style.getPropertyValue('--cmn-keyboard-inset')).toBe('300px');
        expect(host().classList.contains('cmn-dialog--keyboard')).toBe(true);
        keyboard(0);
        expect(host().style.getPropertyValue('--cmn-keyboard-inset')).toBe('0px');
        expect(host().classList.contains('cmn-dialog--keyboard')).toBe(false);
      });

      it('ignores a small shrink (browser chrome) and a pinch zoom', () => {
        phone();
        keyboard(40);
        expect(host().classList.contains('cmn-dialog--keyboard')).toBe(false);
        viewport.scale = 2;
        keyboard(300);
        expect(host().classList.contains('cmn-dialog--keyboard')).toBe(false);
      });

      it('stops listening once the dialog is back on desktop', () => {
        phone();
        desktop$.next(true);
        fixture.detectChanges();
        expect(listeners.get('resize')?.size ?? 0).toBe(0);
      });
    });
  });
});
