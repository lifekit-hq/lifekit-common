import {InjectionToken} from '@angular/core';

/**
 * `responsive` (default) slides in from the right from `md` up and opens as a
 * bottom sheet below it; `side` and `sheet` pin one presentation.
 */
export type CmnDrawerMode = 'responsive' | 'side' | 'sheet';

export interface CmnDrawerOpenConfig<D = unknown> {
  data?: D;
  title?: string;
  /** Side-panel width; ignored by the bottom sheet, which spans the viewport. */
  width?: string;
  disableClose?: boolean;
  mode?: CmnDrawerMode;
}

export const CMN_DRAWER_DATA = new InjectionToken<unknown>('CmnDrawerData');
