import {BreakpointObserver} from '@angular/cdk/layout';
import {Overlay, type OverlayRef, type PositionStrategy} from '@angular/cdk/overlay';
import {ComponentPortal, type ComponentType} from '@angular/cdk/portal';
import {inject, Injectable, Injector} from '@angular/core';
import {distinctUntilChanged, map, skip, startWith, takeUntil} from 'rxjs';

import {CMN_DRAWER_DATA, type CmnDrawerOpenConfig} from '../../components/drawer/drawer-config';
import {CmnDrawerContainerComponent} from '../../components/drawer/drawer-container.component';
import {CmnDrawerRef} from '../../components/drawer/drawer-ref';
import {CMN_MEDIA_MD} from '../../tokens/breakpoints';

const DEFAULT_WIDTH = '480px';
const SHEET_PANEL_CLASS = 'cmn-drawer-panel--sheet';

interface DrawerLayout {
  width: string;
  height: string;
  positionStrategy: PositionStrategy;
}

@Injectable({providedIn: 'root'})
export class CmnDrawerService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly breakpoints = inject(BreakpointObserver);

  public open<R = unknown, D = unknown, C = unknown>(
    component: ComponentType<C>,
    config: CmnDrawerOpenConfig<D> = {}
  ): CmnDrawerRef<R> {
    const drawerRef = new CmnDrawerRef<R>();
    const mode = config.mode ?? 'responsive';
    const sheet =
      mode === 'sheet' || (mode === 'responsive' && !this.breakpoints.isMatched(CMN_MEDIA_MD));

    const overlayRef = this.overlay.create({
      ...this.layout(config, sheet),
      hasBackdrop: true,
      backdropClass: 'cmn-drawer-backdrop',
      panelClass: sheet ? ['cmn-drawer-panel', SHEET_PANEL_CLASS] : 'cmn-drawer-panel',
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });

    drawerRef.overlayRef = overlayRef;

    overlayRef.backdropClick().subscribe(() => {
      if (!config.disableClose) {
        drawerRef.close();
      }
    });

    overlayRef.keydownEvents().subscribe(e => {
      if (e.key === 'Escape' && !config.disableClose) {
        drawerRef.close();
      }
    });

    const childInjector = Injector.create({
      providers: [
        {provide: CmnDrawerRef, useValue: drawerRef},
        {provide: CMN_DRAWER_DATA, useValue: config.data ?? null},
      ],
      parent: this.injector,
    });

    const containerPortal = new ComponentPortal(CmnDrawerContainerComponent, null, childInjector);
    const containerRef = overlayRef.attach(containerPortal);

    containerRef.instance.title.set(config.title ?? '');
    containerRef.instance.sheet.set(sheet);
    containerRef.instance.disableClose.set(config.disableClose ?? false);
    containerRef.changeDetectorRef.detectChanges();

    const contentPortal = new ComponentPortal(component, null, childInjector);
    containerRef.instance.portalOutlet().attach(contentPortal);

    if (mode === 'responsive') {
      // Re-lay out an open drawer when the viewport crosses `md` (rotation, resize).
      this.breakpoints
        .observe(CMN_MEDIA_MD)
        .pipe(
          map(state => !state.matches),
          startWith(sheet),
          distinctUntilChanged(),
          skip(1),
          takeUntil(drawerRef.beforeClose$)
        )
        .subscribe(isSheet => {
          this.applyLayout(overlayRef, config, isSheet);
          containerRef.instance.sheet.set(isSheet);
          containerRef.changeDetectorRef.detectChanges();
        });
    }

    return drawerRef;
  }

  private layout(config: CmnDrawerOpenConfig, sheet: boolean): DrawerLayout {
    const position = this.overlay.position().global();
    return sheet
      ? {width: '100%', height: '', positionStrategy: position.bottom().left()}
      : {
          width: config.width ?? DEFAULT_WIDTH,
          height: '100%',
          positionStrategy: position.right().top(),
        };
  }

  private applyLayout(overlayRef: OverlayRef, config: CmnDrawerOpenConfig, sheet: boolean): void {
    const {width, height, positionStrategy} = this.layout(config, sheet);
    overlayRef.updateSize({width, height});
    overlayRef.updatePositionStrategy(positionStrategy);
    if (sheet) {
      overlayRef.addPanelClass(SHEET_PANEL_CLASS);
    } else {
      overlayRef.removePanelClass(SHEET_PANEL_CLASS);
    }
  }
}
