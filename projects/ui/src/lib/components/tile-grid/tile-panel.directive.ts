import {Directive, inject, input, TemplateRef} from '@angular/core';

import type {CmnTile} from './tile-grid.component';

/** What a panel template can read: the tile it belongs to, as `let-tile`. */
export interface CmnTilePanelContext {
  $implicit: CmnTile;
}

/**
 * The content of one tile's panel, written as `<ng-template cmnTilePanel="premium">`. The grid
 * draws the template of the open tile only, so a chart inside it is created when the tile opens
 * and destroyed when it closes.
 */
@Directive({selector: 'ng-template[cmnTilePanel]'})
export class TilePanelDirective {
  public readonly template = inject<TemplateRef<CmnTilePanelContext>>(TemplateRef);
  /** The `id` of the tile this panel belongs to. */
  public readonly tileId = input.required<string>({alias: 'cmnTilePanel'});

  public static ngTemplateContextGuard(
    _dir: TilePanelDirective,
    // Referenced only by the `ctx is …` type predicate, which typescript-eslint >=8.58 counts as unused.
    // eslint-disable-next-line unused-imports/no-unused-vars
    ctx: unknown
  ): ctx is CmnTilePanelContext {
    return true;
  }
}
