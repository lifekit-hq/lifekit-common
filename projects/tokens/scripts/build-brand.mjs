/**
 * Generates every derived brand file from the one mark source (brand/mark.mjs) and the
 * token colours (theme.css), into brand/dist/ — run by `prepack` (so every published
 * tarball carries fresh output) and by the workspace build. Output is never committed or
 * hand-edited.
 *
 *   brand/dist/<app>/favicon.svg, favicon.ico (16+32), apple-touch-icon.png (180, opaque),
 *                    icon-192.png, icon-512.png, icon-maskable-512.png
 *   brand/dist/manifest.fragment.json   standard manifest fields (same for every app)
 *   brand/dist/head.html                head template (title placeholder)
 *   brand/dist/theme-init.js            the pre-paint theme script (inline it)
 *   brand/dist/theme-init.csp-hash.txt  its CSP `script-src` hash expression
 */
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {Resvg} from '@resvg/resvg-js';

import {BRAND_APPS, fullBleedSvg, markSvg} from '../brand/mark.mjs';
import {headMarkup, manifestFragment} from '../brand/standard.mjs';
import {THEME_SCRIPT, themeScriptCspHash} from '../brand/theme-script.mjs';
import {brandColors} from '../brand/tokens.mjs';
import {encodeIco} from './ico.mjs';

export const DEFAULT_OUT_DIR = fileURLToPath(new URL('../brand/dist/', import.meta.url));

/** Rasterises an SVG to a `size`×`size` PNG. */
export function renderPng(svg, size) {
  return new Resvg(svg, {fitTo: {mode: 'width', value: size}, font: {loadSystemFonts: false}})
    .render()
    .asPng();
}

/** Every file for one app, as `[fileName, contents]`. */
export function appAssets(app, colors = brandColors()) {
  const mark = markSvg({app, tile: colors.tile, ink: colors.ink});
  const fullBleed = fullBleedSvg({app, tile: colors.tile, ink: colors.ink});
  return [
    ['favicon.svg', `${mark}\n`],
    ['favicon.ico', encodeIco([16, 32].map(size => ({size, png: renderPng(mark, size)})))],
    ['apple-touch-icon.png', renderPng(fullBleed, 180)],
    ['icon-192.png', renderPng(mark, 192)],
    ['icon-512.png', renderPng(mark, 512)],
    ['icon-maskable-512.png', renderPng(fullBleed, 512)],
  ];
}

/** Regenerates `outDir` from scratch. */
export function buildBrand({outDir = DEFAULT_OUT_DIR, colors = brandColors()} = {}) {
  rmSync(outDir, {recursive: true, force: true});
  for (const app of BRAND_APPS) {
    const dir = join(outDir, app);
    mkdirSync(dir, {recursive: true});
    for (const [file, contents] of appAssets(app, colors)) writeFileSync(join(dir, file), contents);
  }
  writeFileSync(
    join(outDir, 'manifest.fragment.json'),
    `${JSON.stringify(manifestFragment(colors), null, 2)}\n`
  );
  writeFileSync(join(outDir, 'head.html'), `${headMarkup({title: '{App}'}, colors)}\n`);
  writeFileSync(join(outDir, 'theme-init.js'), `${THEME_SCRIPT}\n`);
  writeFileSync(join(outDir, 'theme-init.csp-hash.txt'), `${themeScriptCspHash()}\n`);
  return outDir;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = buildBrand();
  console.log(`brand: ${BRAND_APPS.join(', ')} → ${out}`);
}
