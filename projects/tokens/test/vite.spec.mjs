import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';

import {BRAND_FILES} from '../brand/index.mjs';
import {lifekitBrand} from '../brand/vite.mjs';
import {packagedAssets as brandAssetsDir} from './packaged.mjs';

function emitted(plugin) {
  const files = new Map();
  plugin.generateBundle.call({emitFile: ({fileName, source}) => files.set(fileName, source)});
  return files;
}

function serve(plugin, url) {
  let handler;
  plugin.configureServer({middlewares: {use: fn => (handler = fn)}});
  const res = {headers: {}, setHeader: (k, v) => (res.headers[k] = v), end: b => (res.body = b)};
  let passed = false;
  handler({url}, res, () => (passed = true));
  return {res, passed};
}

describe('lifekitBrand (Vite plugin)', () => {
  it('emits the app icon set at the site root', () => {
    const files = emitted(lifekitBrand({app: 'lk'}));
    assert.deepEqual([...files.keys()], [...BRAND_FILES]);
    assert.ok(
      files.get('favicon.svg').equals(readFileSync(join(brandAssetsDir('lk'), 'favicon.svg')))
    );
  });

  it('emits the standard manifest when given app names', () => {
    const files = emitted(lifekitBrand({app: 'lk', manifest: {name: 'Lifekit'}}));
    const manifest = JSON.parse(files.get('manifest.webmanifest'));
    assert.equal(manifest.name, 'Lifekit');
    assert.equal(manifest.background_color, '#f3f5f6');
  });

  it('serves icons in dev and passes other requests through', () => {
    const plugin = lifekitBrand({app: 'fs'});
    const hit = serve(plugin, '/favicon.ico?v=2');
    assert.equal(hit.passed, false);
    assert.equal(hit.res.headers['Content-Type'], 'image/x-icon');
    assert.ok(hit.res.body.equals(readFileSync(join(brandAssetsDir('fs'), 'favicon.ico'))));
    assert.equal(serve(plugin, '/src/main.ts').passed, true);
  });

  it('ignores unrelated requests without reading any file', () => {
    const reads = [];
    const plugin = lifekitBrand({app: 'fs'}, path => reads.push(path));
    for (const url of [
      '/src/main.ts',
      '/@vite/client',
      '/../package.json',
      '/manifest.webmanifest',
    ]) {
      assert.equal(serve(plugin, url).passed, true, url);
    }
    assert.deepEqual(reads, []);
  });

  it('reads a brand file lazily on first request and serves it from memory after', () => {
    const reads = [];
    const plugin = lifekitBrand({app: 'fs'}, path => {
      reads.push(path);
      return readFileSync(path);
    });
    assert.deepEqual(reads, []);
    const first = serve(plugin, '/icon-192.png');
    const second = serve(plugin, '/icon-192.png');
    const expected = readFileSync(join(brandAssetsDir('fs'), 'icon-192.png'));
    assert.ok(first.res.body.equals(expected));
    assert.ok(second.res.body.equals(expected));
    assert.equal(second.res.headers['Content-Type'], 'image/png');
    assert.deepEqual(reads, [join(brandAssetsDir('fs'), 'icon-192.png')]);
  });

  it('rejects an unknown app', () => {
    assert.throws(() => lifekitBrand({app: 'zz'}), /Unknown lifekit app/);
  });
});
