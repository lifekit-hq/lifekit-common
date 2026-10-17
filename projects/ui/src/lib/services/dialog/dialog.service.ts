import {Dialog, type DialogConfig, type DialogRef} from '@angular/cdk/dialog';
import {type ComponentType} from '@angular/cdk/portal';
import {inject, Injectable, signal} from '@angular/core';
import {map, type Observable} from 'rxjs';

import {
  ConfirmDialogComponent,
  type ConfirmDialogData,
} from '../../components/dialog/confirm-dialog.component';
import {
  CMN_DIALOG_DATA,
  CMN_DIALOG_PRESENTATION,
  CmnDialogConfig,
  type CmnDialogOpenConfig,
} from '../../components/dialog/dialog-config';
import {CmnDialogContainerComponent} from '../../components/dialog/dialog-container.component';
import {CmnDialogRef} from '../../components/dialog/dialog-ref';

@Injectable({providedIn: 'root'})
export class CmnDialogService {
  private readonly cdkDialog = inject(Dialog);

  public open<R = unknown, D = unknown, C = unknown>(
    component: ComponentType<C>,
    config: CmnDialogOpenConfig<D> = {}
  ): CmnDialogRef<R, C> {
    const cdkConfig = new CmnDialogConfig<D>();
    cdkConfig.data = config.data;
    cdkConfig.disableClose = config.disableClose ?? false;
    cdkConfig.ariaLabel = config.ariaLabel;
    cdkConfig.autoFocus = config.autoFocus ?? 'first-tabbable';
    cdkConfig.title = config.title;
    cdkConfig.size = config.size ?? 'md';
    cdkConfig.phone = config.phone ?? (cdkConfig.size === 'full' ? 'full-screen' : 'sheet');
    cdkConfig.cancelLabel = config.cancelLabel ?? 'Cancel';
    cdkConfig.hasBackdrop = config.hasBackdrop ?? true;
    cdkConfig.panelClass = config.panelClass ?? [
      'cmn-dialog-panel',
      `cmn-dialog-panel--${cdkConfig.size}`,
    ];
    cdkConfig.backdropClass = config.hasBackdrop === false ? '' : 'cmn-dialog-backdrop';
    cdkConfig.container = config.container ?? CmnDialogContainerComponent;
    cdkConfig.viewContainerRef = config.viewContainerRef;
    cdkConfig.injector = config.injector;
    const dataValue = config.data ?? null;
    cdkConfig.providers = (_ref, _config, container) => [
      {provide: CMN_DIALOG_DATA, useValue: dataValue},
      {
        provide: CMN_DIALOG_PRESENTATION,
        useValue:
          container instanceof CmnDialogContainerComponent
            ? container.presentation
            : signal('dialog' as const),
      },
    ];

    const ref = this.cdkDialog.open<R, D, C>(
      component,
      cdkConfig as unknown as DialogConfig<D, DialogRef<R, C>>
    );
    return new CmnDialogRef<R, C>(ref);
  }

  public confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.open<boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      data,
      title: data.title,
      size: 'sm',
      phone: 'action-sheet',
      cancelLabel: data.cancelLabel,
    })
      .afterClosed()
      .pipe(map(result => result === true));
  }
}
