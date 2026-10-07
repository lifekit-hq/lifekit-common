import {CdkPortalOutlet} from '@angular/cdk/portal';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {IconComponent} from '../icon/icon.component';
import {CmnDrawerRef} from './drawer-ref';

type DrawerState = 'entering' | 'open' | 'closing';

/** The heights a bottom sheet rests at: up to half the viewport, or nearly all of it. */
export type CmnSheetStop = 'half' | 'full';

/** A press that moves less than this (px) is a tap on the grabber, not a drag. */
const GRABBER_TAP_SLOP_PX = 8;

/** How far (px) a sheet must be dragged down before release dismisses it. */
const SHEET_DISMISS_DISTANCE_PX = 96;

@Component({
  selector: 'cmn-drawer-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkPortalOutlet, IconComponent],
  host: {
    '[class.cmn-drawer--open]': 'isOpen',
    '[class.cmn-drawer--closing]': 'isClosing',
    '[class.cmn-drawer--sheet]': 'sheet()',
    '[class.cmn-drawer--full]': "sheet() && stop() === 'full'",
    '[class.cmn-drawer--dragging]': 'dragging()',
    '[style.transform]': 'dragTransform()',
  },
  template: `
    <div class="flex h-full min-h-0 flex-1 flex-col bg-surface-card" style="min-width: 0">
      <div
        [class.touch-none]="sheet()"
        (pointercancel)="onDragCancel()"
        (pointerdown)="onDragStart($event)"
        (pointermove)="onDragMove($event)"
        (pointerup)="onDragEnd()"
        class="shrink-0"
      >
        @if (sheet()) {
          <!-- Grabber: tap it to cycle the half and full stops, pull the sheet down to dismiss it -->
          <div class="flex justify-center" data-testid="drawer-handle">
            <button
              [attr.aria-label]="stop() === 'half' ? 'Expand sheet' : 'Collapse sheet'"
              (click)="onGrabberClick($event)"
              class="cmn-drawer-grabber flex h-cmn-8 w-full items-center justify-center"
              type="button"
            >
              <span class="h-1 w-10 rounded-full bg-border-strong" aria-hidden="true"></span>
            </button>
          </div>
        }
        <!-- Header -->
        <div
          class="flex items-center justify-between border-b border-border-default px-cmn-6 py-cmn-4"
        >
          <h2 class="text-cmn-base font-semibold text-text-primary">
            {{ title() }}
          </h2>
          <button
            (click)="drawerRef.close()"
            class="flex h-8 w-8 items-center justify-center rounded-cmn-md text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            aria-label="Close drawer"
          >
            <cmn-icon name="X" size="sm" />
          </button>
        </div>
      </div>
      <!-- Body -->
      <div class="min-h-0 flex-1 overflow-y-auto">
        <ng-template cdkPortalOutlet />
      </div>
    </div>
  `,
})
export class CmnDrawerContainerComponent implements AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private state: DrawerState = 'entering';
  private dragStartY: number | null = null;
  private dragStartedOnGrabber = false;
  private dragTravel = 0;

  public readonly title = signal('');
  /** Bottom-sheet presentation (phone width); set by `CmnDrawerService`. */
  public readonly sheet = signal(false);
  /** Where the sheet rests: `half` (content up to half the viewport) or `full`. */
  public readonly stop = signal<CmnSheetStop>('half');
  public readonly disableClose = signal(false);
  public readonly dragging = signal(false);
  public readonly dragOffset = signal(0);
  public readonly dragTransform = computed(() =>
    this.dragOffset() > 0 ? `translateY(${this.dragOffset()}px)` : null
  );
  public readonly drawerRef = inject(CmnDrawerRef);
  public readonly portalOutlet = viewChild.required(CdkPortalOutlet);

  public get isOpen(): boolean {
    return this.state === 'open';
  }

  public get isClosing(): boolean {
    return this.state === 'closing';
  }

  public onDragStart(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (!this.sheet() || this.isClosing || target?.closest('button:not(.cmn-drawer-grabber)')) {
      return;
    }
    this.dragStartedOnGrabber = !!target?.closest('.cmn-drawer-grabber');
    this.dragStartY = event.clientY;
    this.dragTravel = 0;
    this.dragging.set(true);
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone (or synthetic); moves still arrive by bubbling.
    }
  }

  public onDragMove(event: PointerEvent): void {
    if (this.dragStartY === null) {
      return;
    }
    const delta = event.clientY - this.dragStartY;
    this.dragTravel = Math.max(this.dragTravel, Math.abs(delta));
    this.dragOffset.set(Math.max(0, delta));
  }

  public onDragEnd(): void {
    this.finishDrag(false);
  }

  public onDragCancel(): void {
    this.finishDrag(true);
  }

  private finishDrag(cancelled: boolean): void {
    if (this.dragStartY === null) {
      return;
    }
    const offset = this.dragOffset();
    const tapped = !cancelled && this.dragStartedOnGrabber && this.dragTravel < GRABBER_TAP_SLOP_PX;
    this.dragStartY = null;
    this.dragStartedOnGrabber = false;
    this.dragging.set(false);
    this.dragOffset.set(0);
    if (tapped) {
      this.cycleStop();
    } else if (offset >= SHEET_DISMISS_DISTANCE_PX && !this.disableClose()) {
      this.drawerRef.close();
    }
  }

  /** Keyboard activation of the grabber; a pointer tap is handled in `onDragEnd`. */
  public onGrabberClick(event: MouseEvent): void {
    if (event.detail === 0) {
      this.cycleStop();
    }
  }

  public cycleStop(): void {
    this.stop.update(stop => (stop === 'half' ? 'full' : 'half'));
  }

  public ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.state = 'open';
      this.cdr.markForCheck();
    });

    this.drawerRef.beforeClose$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.state = 'closing';
      this.cdr.markForCheck();
    });
  }
}
