/**
 * The design judge the route scan runs: the impeccable detector engine, pinned to one version and
 * to the sha256 of each release binary, so a scan never runs a binary nobody reviewed. The engine is
 * not an npm package; it is a release asset, downloaded once into `~/.impeccable` (or
 * `$IMPECCABLE_HOME`) and verified before it is ever executed.
 */
import {createHash} from 'node:crypto';
import {
  accessSync,
  chmodSync,
  constants,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';

/** Must equal `.claude/skills/impeccable/scripts/VERSION`: the engine lifekit-common's own scan uses. */
export const IMPECCABLE_VERSION = '0.1.11';

const RELEASES = 'https://github.com/pbakaus/impeccable/releases/download';

/** The release asset and sha256 pinned for each platform (`<platform>-<arch>` of Node). */
export const IMPECCABLE_ENGINES = Object.freeze({
  'linux-x64': {
    asset: 'impeccable-linux-x64',
    sha256: '0221607e1f535af937ea267c347b1f90233b85dc2563cbd2eeefdf42e0e5c594',
  },
  'linux-arm64': {
    asset: 'impeccable-linux-arm64',
    sha256: 'a3036c5c2da08ac6a14fa4886e96a8b1651beab332af75cbe328092528d6e40a',
  },
});

const sha256Of = path => createHash('sha256').update(readFileSync(path)).digest('hex');

const isExecutable = path => {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/** Where the pinned engine for this platform is cached. */
export function pinnedEnginePath({env = process.env} = {}) {
  const home = env.IMPECCABLE_HOME || join(homedir(), '.impeccable');
  return join(home, 'bin', IMPECCABLE_VERSION, 'impeccable');
}

/**
 * Finds the engine to run. In order: the `engine` option, `$IMPECCABLE_BIN`, then the pinned release
 * binary for this platform, fetched and verified against its pinned sha256 when it is not cached
 * yet. Platforms with no pinned binary must name one with the option or the variable.
 *
 * @param {import('./index.d.mts').ResolveEngineOptions} [options]
 * @returns {Promise<string>} the path of the engine executable
 */
export async function resolveEngine({
  engine,
  env = process.env,
  fetchBinary = download,
  pins = IMPECCABLE_ENGINES,
  platform = `${process.platform}-${process.arch}`,
} = {}) {
  if (engine) return engine;
  if (env.IMPECCABLE_BIN) return env.IMPECCABLE_BIN;

  const key = platform;
  const pinned = pins[key];
  if (!pinned) {
    throw new Error(
      `route scan: no pinned impeccable engine for ${key}; set IMPECCABLE_BIN to an engine ${IMPECCABLE_VERSION} binary`
    );
  }
  const path = pinnedEnginePath({env});
  if (isExecutable(path) && sha256Of(path) === pinned.sha256) return path;

  const url = `${RELEASES}/engine-v${IMPECCABLE_VERSION}/${pinned.asset}`;
  const body = await fetchBinary(url);
  if (createHash('sha256').update(body).digest('hex') !== pinned.sha256) {
    throw new Error(`route scan: ${pinned.asset} does not match the pinned sha256`);
  }
  mkdirSync(dirname(path), {recursive: true});
  // Written beside the target and renamed into place, so parallel workers never run a partial file.
  const part = `${path}.part.${process.pid}`;
  try {
    await writeFile(part, body, {mode: 0o755});
    chmodSync(part, 0o755);
    renameSync(part, path);
  } finally {
    rmSync(part, {force: true});
  }
  return path;
}

async function download(url) {
  const response = await fetch(url, {redirect: 'follow'});
  if (!response.ok) throw new Error(`route scan: ${url} responded ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
