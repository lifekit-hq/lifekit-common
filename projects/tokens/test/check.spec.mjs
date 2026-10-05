import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {after, before, beforeEach, describe, it} from 'node:test';

import {
  BRAND_FILES,
  brandManifest,
  checkBrowserChrome,
  checkHead,
  checkManifest,
  headMarkup,
} from '../brand/index.mjs';
import {buildBrand} from '../scripts/build-brand.mjs';
import {packagedAssets} from './packaged.mjs';

const BIN = fileURLToPath(new URL('../bin/lifekit-chrome-check.mjs', import.meta.url));
const APP_NAME = 'Finance Sentry';

function indexHtml(head = headMarkup({title: APP_NAME})) {
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n${head}\n</head>\n<body></body>\n</html>\n`;
}

function rules(problems) {
  return problems.map(p => p.rule);
}

describe('checkHead', () => {
  it('accepts the head template', () => {
    assert.deepEqual(checkHead(indexHtml(), {appName: APP_NAME}), []);
  });

  it('accepts relative hrefs, reordered attributes and unquoted values', () => {
    const head = headMarkup({title: APP_NAME})
      .replace('href="/favicon.svg" type="image/svg+xml"', "type='image/svg+xml' href=favicon.svg")
      .replace('href="/manifest.webmanifest"', 'href="./manifest.webmanifest"')
      .replace('content="#0e1120"', 'content="#0E1120"');
    assert.deepEqual(checkHead(indexHtml(head), {appName: APP_NAME}), []);
  });

  it('decodes entities in the title', () => {
    const html = indexHtml(headMarkup({title: 'R&D'}));
    assert.match(html, /R&amp;D/);
    assert.deepEqual(checkHead(html, {appName: 'R&D'}), []);
  });

  const drift = [
    ['wrong title', h => h.replace(`<title>${APP_NAME}`, '<title>Accounts'), 'title'],
    ['no title', h => h.replace(/<title>.*<\/title>/, ''), 'title'],
    [
      'brand-indigo theme-color',
      h => h.replace('content="#f7f8fa"', 'content="#4f46e5"'),
      'theme-color',
    ],
    [
      'single theme-color',
      h => h.replace(/<meta name="theme-color"[^>]*dark[^>]*>/, ''),
      'theme-color',
    ],
    [
      'extra theme-color',
      h => `${h}\n<meta name="theme-color" content="#f7f8fa" />`,
      'theme-color',
    ],
    ['missing color-scheme', h => h.replace(/<meta name="color-scheme"[^>]*>/, ''), 'color-scheme'],
    [
      'zoom-locked viewport',
      h => h.replace('viewport-fit=cover', 'viewport-fit=cover, maximum-scale=1'),
      'viewport',
    ],
    ['missing apple-touch-icon', h => h.replace(/<link rel="apple-touch-icon"[^>]*>/, ''), 'links'],
    ['ico without sizes', h => h.replace(' sizes="32x32"', ''), 'links'],
    ['blank data: favicon', h => `${h}\n<link rel="icon" href="data:," />`, 'links'],
    ['extra png favicon', h => `${h}\n<link rel="icon" href="/favicon-32.png" />`, 'links'],
  ];
  for (const [label, mutate, rule] of drift) {
    it(`flags ${label}`, () => {
      const problems = checkHead(indexHtml(mutate(headMarkup({title: APP_NAME}))), {
        appName: APP_NAME,
      });
      assert.ok(rules(problems).includes(rule), JSON.stringify(problems));
    });
  }

  it('reports a document without a head', () => {
    assert.deepEqual(rules(checkHead('<html></html>')), ['head']);
  });
});

describe('checkManifest', () => {
  const manifest = () => brandManifest({name: APP_NAME, shortName: 'Finance'});

  it('accepts brandManifest output', () => {
    assert.deepEqual(checkManifest(manifest(), {appName: APP_NAME}), []);
  });

  it('allows extra fields', () => {
    assert.deepEqual(checkManifest({...manifest(), description: 'x', lang: 'en'}), []);
  });

  const drift = [
    ['off-token background', m => ({...m, background_color: '#06080f'}), /background_color/],
    ['brand-indigo theme_color', m => ({...m, theme_color: '#4f46e5'}), /theme_color/],
    ['browser display', m => ({...m, display: 'browser'}), /display/],
    ['long short_name', m => ({...m, short_name: 'Finance Sentry'}), /short_name/],
    ['wrong name', m => ({...m, name: 'Finance'}), /`name`/],
    ['missing maskable icon', m => ({...m, icons: m.icons.slice(0, 2)}), /icons.*missing/],
    [
      'extra icon',
      m => ({...m, icons: [...m.icons, {src: '/x.png', sizes: '48x48', type: 'image/png'}]}),
      /icons.*unexpected/,
    ],
    ['no icons', ({icons, ...m}) => m, /icons/],
  ];
  for (const [label, mutate, pattern] of drift) {
    it(`flags ${label}`, () => {
      const problems = checkManifest(mutate(manifest()), {appName: APP_NAME});
      assert.ok(
        problems.some(p => pattern.test(p.message)),
        JSON.stringify(problems)
      );
    });
  }

  it('rejects a non-object', () => {
    assert.equal(checkManifest([]).length, 1);
  });

  it('brandManifest refuses an over-long short_name', () => {
    assert.throws(() => brandManifest({name: 'Finance Sentry'}), /short_name/);
  });
});

describe('checkBrowserChrome (built output)', () => {
  let assets;
  let dist;
  const app = 'fs';

  before(() => {
    assets = buildBrand({outDir: mkdtempSync(join(tmpdir(), 'lk-brand-'))});
  });
  after(() => rmSync(assets, {recursive: true, force: true}));

  beforeEach(() => {
    dist = mkdtempSync(join(tmpdir(), 'lk-app-'));
    writeFileSync(join(dist, 'index.html'), indexHtml());
    writeFileSync(
      join(dist, 'manifest.webmanifest'),
      JSON.stringify(brandManifest({name: APP_NAME, shortName: 'Finance'}))
    );
    for (const file of BRAND_FILES) copyFileSync(join(assets, app, file), join(dist, file));
  });

  const check = () =>
    checkBrowserChrome({distDir: dist, app, appName: APP_NAME, assetsDir: join(assets, app)});

  it('passes a compliant app', () => {
    assert.deepEqual(check(), []);
  });

  it('flags an icon from another app', () => {
    copyFileSync(join(assets, 'lk', 'favicon.svg'), join(dist, 'favicon.svg'));
    assert.deepEqual(check(), [
      {rule: 'icons', message: 'favicon.svg differs from @lifekit-hq/tokens/brand/fs/favicon.svg'},
    ]);
  });

  it('flags a missing icon', () => {
    rmSync(join(dist, 'icon-maskable-512.png'));
    assert.deepEqual(rules(check()), ['icons']);
  });

  it('flags a missing or invalid manifest', () => {
    writeFileSync(join(dist, 'manifest.webmanifest'), '{');
    assert.deepEqual(rules(check()), ['manifest']);
    rmSync(join(dist, 'manifest.webmanifest'));
    assert.deepEqual(rules(check()), ['manifest']);
  });

  it('flags a missing index.html', () => {
    rmSync(join(dist, 'index.html'));
    assert.deepEqual(rules(check()), ['head']);
  });

  describe('CLI', () => {
    const run = (...args) => spawnSync(process.execPath, [BIN, ...args], {encoding: 'utf8'});

    it('exits 0 for a compliant app built against the packaged icons', () => {
      for (const file of BRAND_FILES) {
        copyFileSync(join(packagedAssets(app), file), join(dist, file));
      }
      const result = run('--app', app, '--name', APP_NAME, dist);
      assert.equal(result.status, 0, result.stderr);
    });

    it('exits 1 and lists every deviation', () => {
      writeFileSync(join(dist, 'index.html'), indexHtml(headMarkup({title: 'Wrong'})));
      rmSync(join(dist, 'favicon.ico'));
      const result = run('--app', app, '--name', APP_NAME, dist);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /\[title\]/);
      assert.match(result.stderr, /\[icons\] favicon\.ico is missing/);
    });

    it('exits 2 on bad usage', () => {
      assert.equal(run('--app', 'zz', dist).status, 2);
      assert.equal(run(dist).status, 2);
      assert.equal(run('--bogus').status, 2);
    });
  });
});
