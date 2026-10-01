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
    '[class.cmn-drawer--dragging]': 'dragging()',
    '[style.transform]': 'dragTransform()',
  },
  template: `
    <div class="flex h-full min-h-0 flex-1 flex-col bg-surface-card" style="min-width: 0">
      <div
        [class.touch-none]="sheet()"
        (pointercancel)="onDragEnd()"
        (pointerdown)="onDragStart($event)"
        (pointermove)="onDragMove($event)"
        (pointerup)="onDragEnd()"
        class="shrink-0"
      >
        @if (sheet()) {
          <!-- Drag handle: pull the sheet down to dismiss it -->
          <div class="flex justify-center pt-cmn-2" data-testid="drawer-handle">
            <span class="h-1 w-10 rounded-full bg-border-strong" aria-hidden="true"></span>
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

  public readonly title = signal('');
  /** Bottom-sheet presentation (phone width); set by `CmnDrawerService`. */
  public readonly sheet = signal(false);
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
    if (!this.sheet() || this.isClosing || target?.closest('button')) {
      return;
    }
    this.dragStartY = event.clientY;
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
    this.dragOffset.set(Math.max(0, event.clientY - this.dragStartY));
  }

  public onDragEnd(): void {
    if (this.dragStartY === null) {
      return;
    }
    const offset = this.dragOffset();
    this.dragStartY = null;
    this.dragging.set(false);
    this.dragOffset.set(0);
    if (offset >= SHEET_DISMISS_DISTANCE_PX && !this.disableClose()) {
      this.drawerRef.close();
    }
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
