/**
 * Test helper: the package's own generated icons (brand/dist), which `npm run test:tokens`
 * builds before the suites run. Suites never rebuild it themselves — they run in
 * parallel and would race.
 */
import {existsSync} from 'node:fs';

import {brandAssetsDir} from '../brand/index.mjs';

export function packagedAssets(app) {
  const dir = brandAssetsDir(app);
  if (!existsSync(dir)) {
    throw new Error(`${dir} is missing — run \`npm run build:brand\` first`);
  }
  return dir;
}
