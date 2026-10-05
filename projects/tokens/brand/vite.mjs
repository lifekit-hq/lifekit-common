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

const CONTENT_TYPES = {
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

/**
 * @param {{app: string, manifest?: {name: string, shortName?: string}}} options
 */
export function lifekitBrand({app, manifest}) {
  const dir = brandAssetsDir(app);
  const files = () => {
    const out = new Map(BRAND_FILES.map(file => [file, readFileSync(join(dir, file))]));
    if (manifest) {
      out.set('manifest.webmanifest', JSON.stringify(brandManifest(manifest), null, 2) + '\n');
    }
    return out;
  };

  return {
    name: 'lifekit-brand',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').replace(/[?#].*$/, '').replace(/^\//, '');
        const source = files().get(name);
        if (source === undefined) return next();
        res.setHeader('Content-Type', CONTENT_TYPES[name.slice(name.lastIndexOf('.'))]);
        res.end(source);
      });
    },
    generateBundle() {
      for (const [fileName, source] of files()) {
        this.emitFile({type: 'asset', fileName, source});
      }
    },
  };
}
