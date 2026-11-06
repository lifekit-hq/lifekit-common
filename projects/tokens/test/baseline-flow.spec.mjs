/**
 * The baseline gate end to end, with the real parts and no fakes: Playwright's own runner and pixel
 * comparison (the oracle) drive the fixture's default options over a real Chromium render of two
 * label variants of one screen, then scripts/baseline-report.mjs reads the git history of the
 * baselines that run wrote. It pins what the gate promises: an unchanged screen passes, a
 * one-word change fails (the comparison is exact), a missing baseline fails until updated on
 * purpose, and a changed baseline produces a before and after.
 */
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {after, before, describe, it} from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FIXTURE = pathToFileURL(join(ROOT, 'projects/tokens/screen/index.mjs')).href;
const PLAYWRIGHT = join(ROOT, 'node_modules/@playwright/test/cli.js');
const REPORT = join(ROOT, 'scripts/baseline-report.mjs');
const REPO = 'lifekit-hq/lifekit-common';

const CONFIG = `
import {screenBaselineConfig} from '${FIXTURE}';
import {defineConfig} from '@playwright/test';

export default defineConfig({
  ...screenBaselineConfig(),
  testDir: '.',
  testMatch: 'screens.spec.mjs',
  reporter: 'line',
  retries: 0,
  workers: 1,
  projects: [{name: 'chromium', use: {browserName: 'chromium'}}],
});
`;

const SPEC = `
import {defineScreenBaselines} from '${FIXTURE}';
import {expect, test} from '@playwright/test';

const page = label =>
  'data:text/html,' +
  encodeURIComponent(
    '<title>t</title><body style="margin:0;font:16px sans-serif"><main><h1>' + label + '</h1></main>'
  );

defineScreenBaselines(
  {test, expect},
  {routes: [{name: 'screen', url: () => page(process.env.LABEL)}], schemes: ['light']}
);
`;

let dir;

const git = (...args) => execFileSync('git', ['-C', dir, ...args], {encoding: 'utf8'}).trim();

/** One `playwright test` run in the scratch project, with the screen's label set. */
function playwright(label, ...flags) {
  return spawnSync(
    process.execPath,
    [PLAYWRIGHT, 'test', '-c', 'playwright.config.mjs', ...flags],
    {
      cwd: dir,
      env: {...process.env, LABEL: label, CI: '1'},
      encoding: 'utf8',
    }
  );
}

const baselines = () =>
  readdirSync(join(dir, 'screens.spec.mjs-snapshots')).filter(name => name.endsWith('-linux.png'));

describe('the screen baseline gate', {skip: process.platform !== 'linux'}, () => {
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'baseline-flow-'));
    symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
    writeFileSync(join(dir, 'playwright.config.mjs'), CONFIG);
    writeFileSync(join(dir, 'screens.spec.mjs'), SPEC);
    git('init', '-q');
    git('config', 'user.email', 't@example.com');
    git('config', 'user.name', 't');
    git('config', 'core.autocrlf', 'false');
    writeFileSync(join(dir, '.gitignore'), 'node_modules\ntest-results\n');
  });

  after(() => rmSync(dir, {recursive: true, force: true}));

  it('fails a screen that has no baseline and writes nothing', () => {
    const run = playwright('Save');
    assert.notEqual(run.status, 0, run.stdout);
    assert.equal(
      readdirSync(dir).includes('screens.spec.mjs-snapshots') ? baselines().length : 0,
      0
    );
  });

  it('writes the first baselines only on an explicit update, then passes the same screen', () => {
    const update = playwright('Save', '--update-snapshots=all');
    assert.equal(update.status, 0, update.stdout + update.stderr);
    assert.deepEqual(
      baselines(),
      ['screen-phone-light-chromium-linux.png', 'screen-desktop-light-chromium-linux.png'].sort()
    );
    git('add', '.');
    git('commit', '-qm', 'base');
    const again = playwright('Save');
    assert.equal(again.status, 0, again.stdout + again.stderr);
  });

  it('fails when one word of the label changes, and reports before and after once updated', () => {
    const base = git('rev-parse', 'HEAD');

    const drifted = playwright('Safe');
    assert.notEqual(drifted.status, 0, 'a one-word change must not pass');
    assert.match(drifted.stdout, /pixels? \(ratio [\d.]+ of all image pixels\) are different/);

    const update = playwright('Safe', '--update-snapshots=changed');
    assert.equal(update.status, 0, update.stdout + update.stderr);
    git('add', '.');
    git('commit', '-qm', 'head');
    const head = git('rev-parse', 'HEAD');
    assert.equal(playwright('Safe').status, 0);

    const report = execFileSync(
      process.execPath,
      [REPORT, '--repo', REPO, '--base', base, '--head', head],
      {cwd: dir, encoding: 'utf8'}
    );
    assert.match(report, /2 changed, 0 added, 0 removed/);
    for (const screen of ['screen-phone-light', 'screen-desktop-light']) {
      assert.match(report, new RegExp(`alt="${screen} before"`));
      assert.match(report, new RegExp(`alt="${screen} after"`));
    }
    assert.match(report, new RegExp(`blob/${base}/[^"]*screen-phone-light-chromium-linux\\.png`));
    assert.match(report, new RegExp(`blob/${head}/[^"]*screen-phone-light-chromium-linux\\.png`));
  });
});
