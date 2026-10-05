/**
 * Vite plugin: serves an app's lifekit icons from the site root in dev and emits them
 * into the build, straight from the installed @lifekit-hq/tokens — nothing is copied
 * into the app's repo. Optionally emits `manifest.webmanifest` too (skip that when
 * another plugin, e.g. vite-plugin-pwa, owns the manifest — pass it `brandManifest()`).
 *
 *   import {lifekitBrand} from '@lifekit-hq/tokens/brand/vite';
 *   plugins: [lifekitBrand({app: 'lk', manifest: {name: 'Lifekit', shortName: 'Lifekit'}})]
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import {BRAND_FILES, brandAssetsDir, brandManifest} from './standard.mjs';

const MANIFEST_FILE = 'manifest.webmanifest';

const CONTENT_TYPES = {
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

/**
 * @param {{app: string, manifest?: {name: string, shortName?: string}}} options
 * @param {(path: string) => Buffer} [readFile] file reader, injectable for tests
 */
export function lifekitBrand({app, manifest}, readFile = readFileSync) {
  const dir = brandAssetsDir(app);
  const names = manifest ? [...BRAND_FILES, MANIFEST_FILE] : [...BRAND_FILES];
  const cache = new Map();
  const source = name => {
    if (!names.includes(name)) return undefined;
    if (!cache.has(name)) {
      cache.set(
        name,
        name === MANIFEST_FILE
          ? JSON.stringify(brandManifest(manifest), null, 2) + '\n'
          : readFile(join(dir, name))
      );
    }
    return cache.get(name);
  };

  return {
    name: 'lifekit-brand',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').replace(/[?#].*$/, '').replace(/^\//, '');
        const body = source(name);
        if (body === undefined) return next();
        res.setHeader('Content-Type', CONTENT_TYPES[name.slice(name.lastIndexOf('.'))]);
        res.end(body);
      });
    },
    generateBundle() {
      for (const fileName of names) {
        this.emitFile({type: 'asset', fileName, source: source(fileName)});
      }
    },
  };
}
