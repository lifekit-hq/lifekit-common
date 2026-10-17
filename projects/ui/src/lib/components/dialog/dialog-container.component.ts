import {CdkDialogContainer, DialogRef} from '@angular/cdk/dialog';
import {BreakpointObserver} from '@angular/cdk/layout';
import {CdkPortalOutlet} from '@angular/cdk/portal';
import {ChangeDetectionStrategy, Component, computed, effect, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';

import {CMN_MEDIA_MD} from '../../tokens/breakpoints';
import {PHONE_HIT_AREA_CLASSES} from '../../tokens/hit-area';
import {CmnSheetDrag} from '../sheet/sheet-drag';
import {
  type CmnDialogConfig,
  type CmnDialogPhoneMode,
  type CmnDialogPresentation,
  type CmnDialogSize,
} from './dialog-config';

/** How long the slide-out runs before the dialog is really closed; matches `--cmn-duration-short`. */
const CLOSE_ANIMATION_MS = 150;

/** A visual viewport shorter than the layout viewport by less than this is browser chrome, not a keyboard. */
const KEYBOARD_MIN_INSET_PX = 100;

/** Pinch-zoom shrinks the visual viewport too; below this scale it is not zoomed. */
const MAX_UNZOOMED_SCALE = 1.01;

const SHELL_BASE = 'cmn-dialog-shell relative flex flex-col bg-surface-card text-text-primary';

const DIALOG_SHELL =
  `${SHELL_BASE} rounded-cmn-lg border border-border-default shadow-cmn-lg overflow-hidden ` +
  'max-h-[90vh] w-full';

// Geometry that needs `env()`, `dvh` or the keyboard inset lives in tokens/theme.css, keyed on the
// host's `data-presentation`.
const PHONE_SHELL: Record<Exclude<CmnDialogPresentation, 'dialog'>, string> = {
  sheet: `${SHELL_BASE} overflow-hidden w-full border-t border-border-default shadow-cmn-lg`,
  'full-screen': `${SHELL_BASE} overflow-hidden w-full h-full`,
  'action-sheet': 'cmn-dialog-shell relative flex flex-col gap-cmn-2 w-full text-text-primary',
};

// Min-widths are gated behind the first breakpoint where they fit inside the
// panel's 1rem padding (viewport - 2rem >= min-width); below that the shell's
// `w-full` makes the dialog full-width-with-margin instead of clipping.
const SIZE_CLASSES: Record<CmnDialogSize, string> = {
  sm: 'min-w-0 sm:min-w-[24rem] max-w-md',
  md: 'min-w-0 sm:min-w-[32rem] max-w-xl',
  lg: 'min-w-0 md:min-w-[40rem] max-w-3xl',
  full: 'max-w-[95vw] h-[95vh]',
};

const BODY_BASE = 'cmn-dialog-shell__body overflow-y-auto p-cmn-6 flex-1';

const ACTION_CARD = 'bg-surface-card rounded-cmn-lg shadow-cmn-lg';

const PANEL_CLASS: Record<Exclude<CmnDialogPhoneMode, 'dialog'>, string> = {
  sheet: 'cmn-dialog-panel--sheet',
  'full-screen': 'cmn-dialog-panel--full-screen',
  'action-sheet': 'cmn-dialog-panel--action-sheet',
};

@Component({
  selector: 'cmn-dialog-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkPortalOutlet],
  host: {
    '[attr.data-presentation]': 'presentation()',
    '[class.cmn-dialog--closing]': 'closing()',
    '[class.cmn-dialog--dragging]': 'sheetDrag.dragging()',
    '[class.cmn-dialog--keyboard]': 'keyboardInset() > 0',
    '[style.transform]': 'sheetDrag.transform()',
    '[style.--cmn-keyboard-inset.px]': 'keyboardInset()',
  },
  template: `
    <section
      [class]="shellClasses()"
      [attr.aria-modal]="'true'"
      [attr.aria-label]="config.ariaLabel || null"
      (pointercancel)="sheetDrag.cancel()"
      (pointerdown)="onDragStart($event)"
      (pointermove)="sheetDrag.move($event)"
      (pointerup)="sheetDrag.end()"
      role="dialog"
    >
      @if (presentation() === 'sheet') {
        <!-- Grabber: decorative, the whole header is the drag zone -->
        <div
          class="cmn-dialog-shell__grabber flex h-cmn-8 shrink-0 touch-none items-center justify-center"
          data-drag-zone
          data-testid="dialog-handle"
          aria-hidden="true"
        >
          <span class="h-1 w-10 rounded-full bg-border-strong"></span>
        </div>
      }
      @if (config.title && presentation() !== 'action-sheet') {
        <header
          [class.touch-none]="presentation() === 'sheet'"
          class="cmn-dialog-shell__header flex items-center justify-between gap-cmn-3 px-cmn-6 py-cmn-4 border-b border-border-default"
          data-drag-zone
        >
          <h2 class="cmn-dialog-shell__title text-cmn-lg font-medium m-0">
            {{ config.title }}
          </h2>
          <button
            [class]="closeClasses()"
            (click)="onClose()"
            type="button"
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
      }
      <div [class]="bodyClasses()">
        @if (config.title && presentation() === 'action-sheet') {
          <h2 class="cmn-dialog-shell__title mb-cmn-2 text-center text-cmn-sm text-text-secondary">
            {{ config.title }}
          </h2>
        }
        <ng-template cdkPortalOutlet />
      </div>
      @if (presentation() === 'action-sheet' && !config.disableClose) {
        <button
          [class]="cancelClasses"
          (click)="onClose()"
          class="cmn-dialog-shell__cancel"
          type="button"
        >
          {{ config.cancelLabel }}
        </button>
      }
    </section>
  `,
})
export class CmnDialogContainerComponent extends CdkDialogContainer<CmnDialogConfig> {
  private readonly dialogRef = inject<DialogRef<unknown, unknown>>(DialogRef, {
    optional: true,
  });
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly isPhone = toSignal(
    this.breakpoints.observe(CMN_MEDIA_MD).pipe(map(state => !state.matches)),
    {initialValue: !this.breakpoints.isMatched(CMN_MEDIA_MD)}
  );

  /** What the dialog is drawn as right now: its phone mode below `md`, the centred dialog above. */
  public readonly presentation = computed<CmnDialogPresentation>(() =>
    this.isPhone() ? this._config.phone : 'dialog'
  );

  protected readonly closing = signal(false);
  protected readonly keyboardInset = signal(0);
  protected readonly sheetDrag = new CmnSheetDrag({
    enabled: () => this.presentation() === 'sheet' && !this.closing(),
    dismissible: () => !this._config.disableClose,
    dismiss: () => this.dialogRef?.close(),
  });
  protected readonly cancelClasses =
    `${ACTION_CARD} w-full min-h-14 px-cmn-4 text-cmn-md font-semibold text-accent-default ` +
    'hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-border-focus';

  public get config(): CmnDialogConfig {
    return this._config;
  }

  constructor() {
    super();
    this.animateDismissal();
    this.syncPanelClass();
    this.trackKeyboard();
  }

  protected shellClasses(): string {
    const presentation = this.presentation();
    return presentation === 'dialog'
      ? `${DIALOG_SHELL} ${SIZE_CLASSES[this._config.size ?? 'md']}`
      : PHONE_SHELL[presentation];
  }

  protected bodyClasses(): string {
    switch (this.presentation()) {
      case 'action-sheet':
        return `cmn-dialog-shell__body overflow-y-auto p-cmn-4 ${ACTION_CARD}`;
      case 'dialog':
        return BODY_BASE;
      default:
        return `${BODY_BASE} overscroll-contain`;
    }
  }

  protected closeClasses(): string {
    return (
      'cmn-dialog-shell__close inline-flex items-center justify-center w-8 h-8 rounded-cmn-sm ' +
      'hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-border-focus' +
      (this.presentation() === 'dialog' ? '' : ` ${PHONE_HIT_AREA_CLASSES}`)
    );
  }

  protected onDragStart(event: PointerEvent): void {
    const target = event.target as Element | null;
    // The drag zone is the grabber and header; the close button keeps its own press.
    if (target?.closest('[data-drag-zone]') && !target.closest('button')) {
      this.sheetDrag.start(event, true);
    }
  }

  protected onClose(): void {
    if (!this._config.disableClose) {
      this.dialogRef?.close();
    }
  }

  /**
   * CDK removes the overlay the instant a dialog closes. A phone presentation slides out first, so
   * a swipe, Cancel, Escape and the backdrop all leave the way the sheet arrived. The ref is
   * shared with the content, so wrapping its `close` covers every caller.
   */
  private animateDismissal(): void {
    const ref = this.dialogRef;
    if (!ref) {
      return;
    }
    const close = ref.close.bind(ref);
    ref.close = (result, options) => {
      if (this.presentation() === 'dialog' || this.prefersReducedMotion()) {
        close(result, options);
        return;
      }
      const predicate = this._config.closePredicate;
      if (
        this.closing() ||
        (predicate && !predicate(result, this._config, ref.componentInstance))
      ) {
        return;
      }
      this.closing.set(true);
      setTimeout(() => close(result, options), CLOSE_ANIMATION_MS);
    };
  }

  /** Anchors the overlay pane to the bottom edge (or the whole viewport) for the phone modes. */
  private syncPanelClass(): void {
    effect(() => {
      const overlay = this.dialogRef?.overlayRef;
      const presentation = this.presentation();
      if (!overlay) {
        return;
      }
      overlay.removePanelClass(Object.values(PANEL_CLASS));
      if (presentation !== 'dialog') {
        overlay.addPanelClass(PANEL_CLASS[presentation]);
      }
    });
  }

  /**
   * Keeps the sheet above the on-screen keyboard. Where the keyboard overlays the page (iOS, and
   * Android's default) the visual viewport shrinks while the layout viewport does not; the gap is
   * published as `--cmn-keyboard-inset` for the CSS. Where the keyboard resizes the layout
   * viewport the `dvh` units already follow it and the inset stays zero.
   */
  private syncKeyboardInset(viewport: VisualViewport, layoutHeight: number): void {
    const inset = layoutHeight - viewport.height - viewport.offsetTop;
    this.keyboardInset.set(
      viewport.scale <= MAX_UNZOOMED_SCALE && inset >= KEYBOARD_MIN_INSET_PX ? Math.round(inset) : 0
    );
  }

  private trackKeyboard(): void {
    effect(onCleanup => {
      const view = this._document.defaultView;
      const viewport = view?.visualViewport;
      if (this.presentation() === 'dialog' || !view || !viewport) {
        this.keyboardInset.set(0);
        return;
      }
      const update = (): void => this.syncKeyboardInset(viewport, view.innerHeight);
      update();
      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
      onCleanup(() => {
        viewport.removeEventListener('resize', update);
        viewport.removeEventListener('scroll', update);
      });
    });
  }

  private prefersReducedMotion(): boolean {
    return !!this._document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
