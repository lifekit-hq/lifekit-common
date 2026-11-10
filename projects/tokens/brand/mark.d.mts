/** Every app initials pair the mark is drawn for. */
export declare const BRAND_APPS: readonly ['lk', 'fs', 'dc', 'bk'];

/** One of {@link BRAND_APPS}. */
export type BrandApp = (typeof BRAND_APPS)[number];

/** Tile corner radius on the 32-unit grid. */
export declare const TILE_RADIUS: number;

export interface MarkOptions {
  app: BrandApp;
  /** Tile fill: a hex colour, or a CSS `var(--token)` when drawn inline in a page. */
  tile: string;
  /** Glyph colour: a hex colour, or a CSS `var(--token)` when drawn inline in a page. */
  ink: string;
}

/** The mark: rounded tile + app glyph, 32×32 viewBox, transparent corners. */
export declare function markSvg(options: MarkOptions): string;

/** Full-bleed square for apple-touch-icon and the maskable manifest icon (180 viewBox). */
export declare function fullBleedSvg(options: MarkOptions): string;

/** The tile and ink a seeded app's static icons wear (light theme). */
export declare function seedMarkColors(
  seed: string,
  intensity?: number
): {tile: string; ink: string};
