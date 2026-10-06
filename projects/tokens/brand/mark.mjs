/**
 * The lifekit mark — the single source every brand asset is generated from.
 *
 * One tile (the family), one two-letter glyph per app (the name). Geometry only: no
 * `<text>`, so the mark renders identically as a favicon, where web fonts never load.
 * Glyphs sit on a 32-unit grid with stems on whole units, so 16 px lands on whole pixels.
 *
 * Colours are parameters, never literals here: callers pass the token values
 * (`brandColors()` in ./tokens.mjs reads them from theme.css).
 */

/** Tile corner radius on the 32-unit grid. */
export const TILE_RADIUS = 7;

/**
 * Per-app glyphs on the 32-unit grid, keyed by the app's initials.
 * Adding an app = adding one entry here; every derived file follows.
 */
const GLYPHS = {
  // lk — Lifekit and the lifekit dashboard: two stems + the k's arm/leg as one mitred stroke.
  lk: ink =>
    `<rect x="6" y="6" width="4" height="20" rx="1" fill="${ink}"/>` +
    `<rect x="14" y="6" width="4" height="20" rx="1" fill="${ink}"/>` +
    `<path d="M24.5 10.5 L18 17.5 L25 26" fill="none" stroke="${ink}" stroke-width="4" stroke-linejoin="miter" stroke-linecap="butt"/>`,
  // fs — Finance Sentry: f (stem + top hook + crossbar) and a stacked geometric s.
  fs: ink =>
    `<path d="M9 26 V11 a4 4 0 0 1 4 -4 h1.5" fill="none" stroke="${ink}" stroke-width="4"/>` +
    `<rect x="5" y="13" width="9" height="3.5" rx="1" fill="${ink}"/>` +
    `<path d="M26.5 13 H20 a2.5 2.5 0 0 0 0 5 h3.5 a2.5 2.5 0 0 1 0 5 H17" fill="none" stroke="${ink}" stroke-width="3.5"/>`,
  // dc — devclaw: d (ring bowl + full-height stem) and an open c, sharing a 20.5 centre line.
  dc: ink =>
    `<circle cx="9.5" cy="20.5" r="4" fill="none" stroke="${ink}" stroke-width="3"/>` +
    `<rect x="12" y="6" width="3" height="20" fill="${ink}"/>` +
    `<path d="M25.3 17.7 A4 4 0 1 0 25.3 23.3" fill="none" stroke="${ink}" stroke-width="3"/>`,
};

/** Every app initials pair the mark is drawn for. */
export const BRAND_APPS = Object.freeze(Object.keys(GLYPHS));

function glyph(app, ink) {
  const draw = GLYPHS[app];
  if (!draw) {
    throw new Error(`Unknown lifekit app mark "${app}" (known: ${BRAND_APPS.join(', ')})`);
  }
  return draw(ink);
}

function svg(viewBox, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
}

/**
 * The mark: rounded tile + app glyph, 32×32 viewBox, transparent corners.
 * Used for favicon.svg/.ico and the manifest `purpose: any` icons.
 */
export function markSvg({app, tile, ink}) {
  return svg(
    '0 0 32 32',
    `<rect width="32" height="32" rx="${TILE_RADIUS}" fill="${tile}"/>${glyph(app, ink)}`
  );
}

/**
 * Full-bleed square: opaque tile colour to every edge, glyph scaled ×4 and centred on a
 * 180 canvas. The platform applies its own mask, so this one source serves both
 * apple-touch-icon (iOS rounds it) and the maskable manifest icon — the glyph stays
 * inside the central 80 % safe zone.
 */
export function fullBleedSvg({app, tile, ink}) {
  return svg(
    '0 0 180 180',
    `<rect width="180" height="180" fill="${tile}"/><g transform="translate(26 26) scale(4)">${glyph(app, ink)}</g>`
  );
}
