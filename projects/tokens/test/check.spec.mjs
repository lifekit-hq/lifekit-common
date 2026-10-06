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
  MANIFEST_ICONS,
  manifestFragment,
  normalizeBasePath,
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
      .replace('content="#0c1113"', 'content="#0C1113"');
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
      'brand-petrol theme-color',
      h => h.replace('content="#f3f5f6"', 'content="#175a6d"'),
      'theme-color',
    ],
    [
      'single theme-color',
      h => h.replace(/<meta name="theme-color"[^>]*dark[^>]*>/, ''),
      'theme-color',
    ],
    [
      'extra theme-color',
      h => `${h}\n<meta name="theme-color" content="#f3f5f6" />`,
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

  describe('base path', () => {
    const scopedHead = (basePath = '/console/') => headMarkup({title: APP_NAME, basePath});
    const check = (head, basePath = '/console/') =>
      checkHead(indexHtml(head), {appName: APP_NAME, basePath});

    it('keeps the default output at the site root', () => {
      assert.equal(headMarkup({title: APP_NAME, basePath: '/'}), headMarkup({title: APP_NAME}));
      const links = headMarkup({title: APP_NAME})
        .split('\n')
        .filter(l => l.startsWith('<link'));
      assert.deepEqual(links, [
        '<link rel="icon" href="/favicon.ico" sizes="32x32" />',
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
        '<link rel="manifest" href="/manifest.webmanifest" />',
      ]);
    });

    it('prefixes the head links and accepts them under the base path', () => {
      assert.match(scopedHead(), /href="\/console\/favicon\.ico"/);
      assert.match(scopedHead('console'), /href="\/console\/manifest\.webmanifest"/);
      assert.deepEqual(check(scopedHead()), []);
    });

    it('accepts relative hrefs, which resolve against the base path', () => {
      const head = headMarkup({title: APP_NAME})
        .replace('href="/favicon.ico"', 'href="favicon.ico?v=2"')
        .replace('href="/favicon.svg"', 'href="./favicon.svg"')
        .replace('href="/apple-touch-icon.png"', 'href="apple-touch-icon.png#x"')
        .replace('href="/manifest.webmanifest"', 'href="manifest.webmanifest"');
      assert.deepEqual(check(head), []);
    });

    it('flags root-absolute links when the app is served under a base path', () => {
      const problems = check(headMarkup({title: APP_NAME}));
      assert.deepEqual(
        rules(problems).filter(r => r === 'links').length,
        8,
        JSON.stringify(problems)
      );
      assert.match(problems[0].message, /href="\/console\/favicon\.ico"/);
    });

    it('flags prefixed links when the app is served at the root', () => {
      assert.ok(rules(check(scopedHead(), '/')).includes('links'));
    });

    it('never matches external or data: links', () => {
      const head = scopedHead().replace(
        'href="/console/favicon.ico"',
        'href="https://cdn.test/console/favicon.ico"'
      );
      assert.ok(rules(check(head)).includes('links'));
    });

    it('rejects a malformed value', () => {
      assert.throws(() => headMarkup({title: 'x', basePath: '../x'}), /base path/);
      assert.throws(() => checkHead(indexHtml(), {basePath: '/a b/'}), /base path/);
    });
  });

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
    ['brand-petrol theme_color', m => ({...m, theme_color: '#175a6d'}), /theme_color/],
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

  describe('base path', () => {
    const scoped = () =>
      brandManifest({name: APP_NAME, shortName: 'Finance', basePath: '/console/'});

    it('defaults to the site root', () => {
      const {id, start_url: startUrl, scope} = manifest();
      assert.deepEqual([id, startUrl, scope], ['/', '/', '/']);
      assert.deepEqual(manifestFragment(), manifestFragment(undefined, {basePath: '/'}));
    });

    it('derives id, start_url and scope from brandManifest', () => {
      const {id, start_url: startUrl, scope, ...rest} = scoped();
      assert.deepEqual([id, startUrl, scope], ['/console/', '/console/', '/console/']);
      assert.equal(rest.basePath, undefined);
      assert.equal(rest.display, 'standalone');
    });

    it('keeps the default icons at the site root', () => {
      assert.deepEqual(manifest().icons, MANIFEST_ICONS);
      assert.deepEqual(manifestFragment(undefined, {basePath: '/'}).icons, [
        {src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
        {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
        {src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
      ]);
    });

    it('prefixes the icon srcs with the base path', () => {
      assert.deepEqual(
        scoped().icons.map(i => i.src),
        ['/console/icon-192.png', '/console/icon-512.png', '/console/icon-maskable-512.png']
      );
    });

    it('accepts relative icon srcs, which resolve against the base path', () => {
      const relative = {
        ...scoped(),
        icons: scoped().icons.map(i => ({...i, src: i.src.replace('/console/', './')})),
      };
      assert.deepEqual(checkManifest(relative, {basePath: '/console/'}), []);
    });

    it('flags root-absolute icon srcs when a base path is set', () => {
      const rootIcons = {...scoped(), icons: manifest().icons};
      const problems = checkManifest(rootIcons, {basePath: '/console/'});
      assert.equal(problems.length, 1, JSON.stringify(problems));
      assert.match(problems[0].message, /icons.*missing \/console\/icon-192\.png/);
    });

    it('accepts a manifest served under the base path', () => {
      assert.deepEqual(checkManifest(scoped(), {appName: APP_NAME, basePath: '/console/'}), []);
    });

    it('flags a root-scoped manifest when a base path is set, and the reverse', () => {
      const wrong = checkManifest(manifest(), {basePath: '/console/'});
      assert.equal(wrong.length, 4, JSON.stringify(wrong));
      assert.match(wrong[0].message, /`id` is "\/", expected "\/console\/"/);
      const reverse = checkManifest(scoped());
      assert.equal(reverse.length, 4, JSON.stringify(reverse));
    });

    it('normalises the value', () => {
      for (const input of ['/console/', '/console', 'console', 'console/', '//console//']) {
        assert.equal(normalizeBasePath(input), '/console/', input);
      }
      assert.equal(normalizeBasePath('/a/b'), '/a/b/');
      assert.equal(normalizeBasePath(undefined), '/');
      assert.equal(normalizeBasePath('/'), '/');
    });

    it('rejects a malformed value', () => {
      for (const input of [
        '',
        '  ',
        'https://x.test/console/',
        '/con sole/',
        '/a/../b/',
        '/a/./',
        '/c?x=1',
        '/c#h',
        '\\c\\',
        null,
      ]) {
        assert.throws(() => normalizeBasePath(input), /base path/, String(input));
      }
      assert.throws(() => brandManifest({name: 'App', basePath: '../x'}), /base path/);
      assert.throws(() => checkManifest({}, {basePath: '/a b/'}), /base path/);
    });
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

    it('checks the manifest scope against --base-path', () => {
      for (const file of BRAND_FILES) {
        copyFileSync(join(packagedAssets(app), file), join(dist, file));
      }
      const result = run('--app', app, '--name', APP_NAME, '--base-path', '/console/', dist);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /`scope` is "\/", expected "\/console\/"/);

      writeFileSync(
        join(dist, 'manifest.webmanifest'),
        JSON.stringify(brandManifest({name: APP_NAME, shortName: 'Finance', basePath: 'console'}))
      );
      writeFileSync(
        join(dist, 'index.html'),
        indexHtml(headMarkup({title: APP_NAME, basePath: 'console'}))
      );
      const ok = run('--app', app, '--name', APP_NAME, '--base-path', '/console', dist);
      assert.equal(ok.status, 0, ok.stderr);
      assert.equal(run('--app', app, '--name', APP_NAME, dist).status, 1);
    });

    it('checks the head links and icon srcs against --base-path', () => {
      for (const file of BRAND_FILES) {
        copyFileSync(join(packagedAssets(app), file), join(dist, file));
      }
      writeFileSync(
        join(dist, 'manifest.webmanifest'),
        JSON.stringify(brandManifest({name: APP_NAME, shortName: 'Finance', basePath: '/console/'}))
      );
      const bad = run('--app', app, '--name', APP_NAME, '--base-path', '/console/', dist);
      assert.equal(bad.status, 1);
      assert.match(
        bad.stderr,
        /\[links\] expected one <link rel="icon" href="\/console\/favicon\.ico"/
      );

      writeFileSync(
        join(dist, 'index.html'),
        indexHtml(headMarkup({title: APP_NAME, basePath: '/console/'}))
      );
      const ok = run('--app', app, '--name', APP_NAME, '--base-path', '/console/', dist);
      assert.equal(ok.status, 0, ok.stderr);
      assert.equal(run('--app', app, '--name', APP_NAME, dist).status, 1);
    });

    it('exits 2 on a malformed --base-path', () => {
      const result = run('--app', app, '--base-path', 'https://x.test/', dist);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /--base-path: invalid base path/);
    });

    it('exits 2 on bad usage', () => {
      assert.equal(run('--app', 'zz', dist).status, 2);
      assert.equal(run(dist).status, 2);
      assert.equal(run('--bogus').status, 2);
    });
  });
});
