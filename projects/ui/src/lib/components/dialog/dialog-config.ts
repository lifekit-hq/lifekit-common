import {type CdkDialogContainer} from '@angular/cdk/dialog';
import {DialogConfig} from '@angular/cdk/dialog';
import {type ComponentType} from '@angular/cdk/portal';
import {InjectionToken, type Injector, type Signal, type ViewContainerRef} from '@angular/core';

export type CmnDialogSize = 'sm' | 'md' | 'lg' | 'full';
export type CmnDialogAutoFocus = 'first-tabbable' | 'first-heading' | 'dialog' | false;

/**
 * How a dialog is drawn below `md` (a phone), following the Apple HIG presentations:
 * - `sheet` (default): a bottom sheet for forms and details. Grabber, swipe down to dismiss,
 *   keyboard-safe, pads the bottom safe area, leaves the status bar visible.
 * - `full-screen`: for long multi-step flows (a stepper). Covers the viewport; dismissed by its
 *   close button, never by a swipe, so a half-finished flow is not lost to a stray gesture.
 * - `action-sheet`: for confirmations and a short choice. A floating card above a separate
 *   Cancel button; dismissed by Cancel, the backdrop or Escape.
 * - `dialog`: the centred desktop dialog, pinned on a phone too.
 * From `md` up every value draws the centred dialog.
 */
export type CmnDialogPhoneMode = 'sheet' | 'full-screen' | 'action-sheet' | 'dialog';

/** What a dialog is drawn as right now: its phone mode below `md`, `dialog` from `md` up. */
export type CmnDialogPresentation = CmnDialogPhoneMode;

export interface CmnDialogOpenConfig<D = unknown> {
  data?: D;
  disableClose?: boolean;
  title?: string;
  size?: CmnDialogSize;
  /**
   * Phone presentation, below `md`. Defaults to `sheet`, or `full-screen` for `size: 'full'`.
   * Ignored by custom containers (`container`), which draw their own chrome.
   */
  phone?: CmnDialogPhoneMode;
  /** Label of the action sheet's Cancel button (`phone: 'action-sheet'`); defaults to "Cancel". */
  cancelLabel?: string;
  ariaLabel?: string;
  autoFocus?: CmnDialogAutoFocus;
  viewContainerRef?: ViewContainerRef;
  injector?: Injector;
  // Overrides for custom dialogs that manage their own overlay/chrome.
  container?: ComponentType<CdkDialogContainer>;
  hasBackdrop?: boolean;
  panelClass?: string | string[];
}

export class CmnDialogConfig<D = unknown> extends DialogConfig<D> {
  public title?: string;
  public size: CmnDialogSize = 'md';
  public phone: CmnDialogPhoneMode = 'sheet';
  public cancelLabel = 'Cancel';
}

export const CMN_DIALOG_DATA = new InjectionToken<unknown>('CmnDialogData');

/**
 * The presentation the dialog is drawn in right now, live as the viewport crosses `md`. Provided
 * to the dialog's content so it can adapt (the confirm dialog drops its own Cancel on an action
 * sheet); absent for custom containers, where content reads it as `dialog`.
 */
export const CMN_DIALOG_PRESENTATION = new InjectionToken<Signal<CmnDialogPresentation>>(
  'CmnDialogPresentation'
);
