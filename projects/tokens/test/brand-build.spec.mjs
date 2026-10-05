import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, describe, it} from 'node:test';

import {BRAND_APPS, BRAND_FILES, brandColors, markSvg} from '../brand/index.mjs';
import {buildBrand} from '../scripts/build-brand.mjs';
import {decodePng, isPng, pngSize} from './png.mjs';

function hexToRgb(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}

describe('brand colours', () => {
  it('come from theme.css tokens', () => {
    assert.deepEqual(brandColors(), {
      tile: '#4f46e5',
      ink: '#ffffff',
      surfaceLight: '#f7f8fa',
      surfaceDark: '#0e1120',
    });
  });

  it('follow a token change', () => {
    const css =
      ":root,\n[data-theme='light'] { --color-accent-700: #112233; --color-text-inverse: #FFF;" +
      " --color-surface-bg: #eeeeee; }\n/* dark */\n[data-theme='dark'] { --color-surface-bg: #000000; }";
    assert.deepEqual(brandColors(css), {
      tile: '#112233',
      ink: '#fff',
      surfaceLight: '#eeeeee',
      surfaceDark: '#000000',
    });
  });

  it('fail loudly when a token disappears', () => {
    assert.throws(() => brandColors("[data-theme='light'] {}"), /--color-accent-700/);
  });

  it('drive the emitted SVG and PNG', () => {
    const dirs = [1, 2].map(() => mkdtempSync(join(tmpdir(), 'lk-brand-colors-')));
    try {
      const custom = {...brandColors(), tile: '#112233', ink: '#ffeedd'};
      buildBrand({outDir: dirs[0]});
      buildBrand({outDir: dirs[1], colors: custom});
      const [base, changed] = dirs.map(dir => join(dir, 'lk'));
      for (const name of ['favicon.svg', 'icon-192.png']) {
        assert.notDeepEqual(
          readFileSync(join(base, name)),
          readFileSync(join(changed, name)),
          name
        );
      }
      assert.match(readFileSync(join(changed, 'favicon.svg'), 'utf8'), /#112233/);
    } finally {
      for (const dir of dirs) rmSync(dir, {recursive: true, force: true});
    }
  });
});

describe('markSvg', () => {
  it('draws the tile and glyph in the given colours', () => {
    const svg = markSvg({app: 'lk', tile: '#4f46e5', ink: '#ffffff'});
    assert.match(svg, /^<svg [^>]*viewBox="0 0 32 32"/);
    assert.match(svg, /<rect width="32" height="32" rx="7" fill="#4f46e5"\/>/);
    assert.match(svg, /stroke="#ffffff"/);
  });

  it('rejects an unknown app', () => {
    assert.throws(() => markSvg({app: 'zz', tile: '#000', ink: '#fff'}), /Unknown lifekit app/);
  });
});

describe('buildBrand', () => {
  let out;
  const colors = brandColors();
  before(() => {
    out = buildBrand({outDir: mkdtempSync(join(tmpdir(), 'lk-brand-'))});
  });
  after(() => rmSync(out, {recursive: true, force: true}));

  for (const app of BRAND_APPS) {
    describe(app, () => {
      const file = name => readFileSync(join(out, app, name));

      it('emits the full icon set', () => {
        for (const name of BRAND_FILES) assert.ok(file(name).length > 0, name);
      });

      it('favicon.svg is the mark', () => {
        assert.equal(
          file('favicon.svg').toString().trim(),
          markSvg({app, tile: colors.tile, ink: colors.ink})
        );
      });

      it('favicon.ico holds PNG images at 16 and 32 px', () => {
        const ico = file('favicon.ico');
        assert.equal(ico.readUInt16LE(2), 1, 'ICO type');
        assert.equal(ico.readUInt16LE(4), 2, 'image count');
        const sizes = [0, 1].map(i => {
          const entry = 6 + i * 16;
          const png = ico.subarray(
            ico.readUInt32LE(entry + 12),
            ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8)
          );
          assert.ok(isPng(png));
          assert.equal(pngSize(png).width, ico[entry]);
          return ico[entry];
        });
        assert.deepEqual(sizes, [16, 32]);
      });

      for (const [name, size] of [
        ['apple-touch-icon.png', 180],
        ['icon-192.png', 192],
        ['icon-512.png', 512],
        ['icon-maskable-512.png', 512],
      ]) {
        it(`${name} is ${size}×${size}`, () => {
          assert.deepEqual(pngSize(file(name)), {width: size, height: size});
        });
      }

      for (const name of ['apple-touch-icon.png', 'icon-maskable-512.png']) {
        it(`${name} is opaque and full-bleed in the tile colour`, () => {
          const {width, height, pixels} = decodePng(file(name));
          for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255);
          const tile = hexToRgb(colors.tile);
          for (const [x, y] of [
            [0, 0],
            [width - 1, 0],
            [0, height - 1],
            [width - 1, height - 1],
          ]) {
            const at = (y * width + x) * 4;
            assert.deepEqual([...pixels.subarray(at, at + 3)], tile, `corner ${x},${y}`);
          }
        });
      }

      it('icon-512.png keeps the rounded tile (transparent corners)', () => {
        const {pixels} = decodePng(file('icon-512.png'));
        assert.equal(pixels[3], 0);
      });

      it('icon-maskable-512.png keeps the glyph inside the 80% safe zone', () => {
        const {width, height, pixels} = decodePng(file('icon-maskable-512.png'));
        const tile = hexToRgb(colors.tile);
        const radius = 0.4 * width;
        let glyphPixels = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const at = (y * width + x) * 4;
            if (tile.every((c, i) => pixels[at + i] === c)) continue;
            glyphPixels++;
            const distance = Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2);
            assert.ok(distance <= radius, `glyph pixel ${x},${y} is outside the safe zone`);
          }
        }
        assert.ok(glyphPixels > 0, 'the glyph was drawn');
      });
    });
  }

  it('writes the shared manifest fragment and head template', () => {
    const fragment = JSON.parse(readFileSync(join(out, 'manifest.fragment.json'), 'utf8'));
    assert.equal(fragment.theme_color, colors.surfaceLight);
    assert.equal(fragment.icons.length, 3);
    const head = readFileSync(join(out, 'head.html'), 'utf8');
    assert.match(head, /content="#0e1120" media="\(prefers-color-scheme: dark\)"/);
  });
});
