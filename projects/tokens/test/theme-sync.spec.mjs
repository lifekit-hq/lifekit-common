import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, beforeEach, describe, it} from 'node:test';

import {
  inlineThemeScript,
  pinCspHash,
  syncTheme,
  THEME_INIT_END,
  THEME_INIT_MARKER,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
  themeScriptCspHash,
} from '../brand/index.mjs';

const BIN = fileURLToPath(new URL('../bin/lifekit-theme-sync.mjs', import.meta.url));
const HASH = themeScriptCspHash();
const STALE_HASH = "'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='";

function page(body = '    <script>/* old */</script>') {
  return [
    '<!doctype html>',
    '<html>',
    '  <head>',
    `    ${THEME_INIT_MARKER}`,
    '    <!-- prettier-ignore -->',
    body,
    `    ${THEME_INIT_END}`,
    '    <meta name="mobile-web-app-capable" content="yes" />',
    '  </head>',
    '</html>',
    '',
  ].join('\n');
}

const inlined = () => page(`    <script>${THEME_SCRIPT}</script>`);
const csp = hash =>
  `add_header Content-Security-Policy "default-src 'self'; script-src 'self' ${hash}; style-src 'self'";\n`;

describe('inlineThemeScript', () => {
  it('writes the package script between the markers and leaves the rest of the page alone', () => {
    assert.equal(inlineThemeScript(page()), inlined());
  });

  it('is idempotent', () => {
    assert.equal(inlineThemeScript(inlined()), inlined());
  });

  it('inlines the bytes the CSP hash covers, so the pinned hash admits them', () => {
    const [, body] = inlineThemeScript(page()).match(/<script>([\s\S]*)<\/script>/);
    assert.equal(body, THEME_SCRIPT);
    assert.equal(themeScriptCspHash(body), HASH);
  });

  it('keeps the start marker’s indentation and also accepts a block without prettier-ignore', () => {
    const html =
      '<head>\n\t<!-- theme-init:start -->\n\t<script>x</script>\n\t<!-- theme-init:end -->\n</head>';
    assert.equal(
      inlineThemeScript(html),
      `<head>\n\t<!-- theme-init:start -->\n\t<script>${THEME_SCRIPT}</script>\n\t<!-- theme-init:end -->\n</head>`
    );
  });

  it('replaces a multi-line script, however long, without touching the markers', () => {
    const html = page(`    <script>${THEME_SCRIPT}\n// stray\n</script>`);
    assert.equal(inlineThemeScript(html), inlined());
  });

  it('accepts a CRLF page and keeps its line endings', () => {
    const crlf = text => text.replace(/\n/g, '\r\n');
    assert.equal(inlineThemeScript(crlf(page())), crlf(inlined()));
    assert.equal(inlineThemeScript(crlf(inlined())), crlf(inlined()));
  });

  it('refuses a page without the markers rather than passing vacuously', () => {
    assert.throws(
      () => inlineThemeScript('<head><script>old</script></head>'),
      /no theme-init block/
    );
  });

  it('keeps reading the ThemeService cache key, so appearance paints before the network answers', () => {
    assert.match(
      inlineThemeScript(page()),
      new RegExp(`localStorage\\.getItem\\('${THEME_STORAGE_KEY}'\\)`)
    );
    assert.equal(THEME_STORAGE_KEY, 'cmn-theme');
  });
});

describe('pinCspHash', () => {
  it('replaces the pinned hash and leaves the other sources alone', () => {
    assert.equal(pinCspHash(csp(STALE_HASH)), csp(HASH));
  });

  it('works on a JSON string value', () => {
    const json = hash =>
      `{"Content-Security-Policy": "script-src 'self' ${hash}; style-src 'self'"}`;
    assert.equal(pinCspHash(json(STALE_HASH)), json(HASH));
  });

  it('is idempotent', () => {
    assert.equal(pinCspHash(csp(HASH)), csp(HASH));
  });

  it('pins script-src without being confused by script-src-attr or script-src-elem', () => {
    const policy = hash =>
      `script-src 'self' ${hash}; script-src-elem 'self'; script-src-attr 'none'; style-src 'self'`;
    assert.equal(pinCspHash(policy(STALE_HASH)), policy(HASH));
    assert.throws(() => pinCspHash("script-src-attr 'none'"), /no script-src/);
  });

  it('refuses a CSP with no script-src, or with no or several hashes to choose from', () => {
    assert.throws(() => pinCspHash("default-src 'self'"), /no script-src/);
    assert.throws(() => pinCspHash("script-src 'self'; style-src 'self'"), /found 0/);
    assert.throws(
      () => pinCspHash(`script-src ${STALE_HASH} ${STALE_HASH.replace('A', 'B')}`),
      /found 2/
    );
  });
});

describe('syncTheme and lifekit-theme-sync', () => {
  let dir;
  const write = (name, text) => {
    mkdirSync(join(dir, name, '..'), {recursive: true});
    writeFileSync(join(dir, name), text);
  };
  const read = name => readFileSync(join(dir, name), 'utf8');
  const run = (...args) =>
    spawnSync(process.execPath, [BIN, ...args], {cwd: dir, encoding: 'utf8'});

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lifekit-theme-sync-'));
  });
  afterEach(() => rmSync(dir, {recursive: true, force: true}));

  it('rewrites src/index.html by default and then reports it in sync', () => {
    write('src/index.html', page());
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /updated src\/index\.html/);
    assert.equal(read('src/index.html'), inlined());
    const second = run();
    assert.equal(second.status, 0);
    assert.match(second.stdout, /in sync/);
  });

  it('--check exits 1 and writes nothing when the page is stale', () => {
    write('src/index.html', page());
    const result = run('--check');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /out of sync.*src\/index\.html/);
    assert.equal(read('src/index.html'), page());
  });

  it('--check exits 0 for a page the bin wrote', () => {
    write('src/index.html', inlined());
    assert.equal(run('--check').status, 0);
  });

  it('pins the hash in every --csp file and --check covers them too', () => {
    write('app/index.html', inlined());
    write('nginx.conf', csp(STALE_HASH));
    write('appsettings.json', `{"csp": "script-src 'self' ${STALE_HASH}; img-src 'self'"}`);
    const check = run(
      '--check',
      '--html',
      'app/index.html',
      '--csp',
      'nginx.conf',
      '--csp',
      'appsettings.json'
    );
    assert.equal(check.status, 1);
    assert.match(check.stderr, /nginx\.conf, appsettings\.json/);
    assert.doesNotMatch(check.stderr, /index\.html/);

    const rewrite = run(
      '--html',
      'app/index.html',
      '--csp',
      'nginx.conf',
      '--csp',
      'appsettings.json'
    );
    assert.equal(rewrite.status, 0, rewrite.stderr);
    assert.equal(read('nginx.conf'), csp(HASH));
    assert.match(
      read('appsettings.json'),
      new RegExp(`script-src 'self' ${HASH.replace(/[+/]/g, '\\$&')};`)
    );
    assert.equal(
      run('--check', '--html', 'app/index.html', '--csp', 'nginx.conf', '--csp', 'appsettings.json')
        .status,
      0
    );
  });

  it('exits 2, naming the file, for a missing file or a page without markers', () => {
    const missing = run('--html', 'nope.html');
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /nope\.html: no such file/);

    write('bare.html', '<head></head>');
    const bare = run('--html', 'bare.html');
    assert.equal(bare.status, 2);
    assert.match(bare.stderr, /bare\.html: no theme-init block/);
  });

  it('writes nothing when a later --csp file cannot be pinned', () => {
    write('index.html', page());
    write('nginx.conf', "script-src 'self'");
    const result = run('--html', 'index.html', '--csp', 'nginx.conf');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /nginx\.conf: script-src must carry exactly one/);
    assert.equal(read('index.html'), page());
  });

  it('exits 2 for an unknown option and prints the usage for --help', () => {
    const unknown = run('--nope');
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /usage: lifekit-theme-sync/);
    const help = run('--help');
    assert.equal(help.status, 0);
    assert.match(help.stdout, /usage: lifekit-theme-sync/);
  });

  it('returns the stale paths from the library call', () => {
    write('index.html', page());
    assert.deepEqual(syncTheme({html: join(dir, 'index.html'), check: true}), [
      join(dir, 'index.html'),
    ]);
    assert.deepEqual(syncTheme({html: join(dir, 'index.html')}), [join(dir, 'index.html')]);
    assert.deepEqual(syncTheme({html: join(dir, 'index.html')}), []);
  });
});
