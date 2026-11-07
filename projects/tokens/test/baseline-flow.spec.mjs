/**
 * The baseline gate end to end, with the real parts and no fakes: Playwright's own runner and pixel
 * comparison (the oracle) drive the fixture's default options over a real Chromium render of two
 * label variants of one screen, then the report action's baseline-report.mjs reads the git history of the
 * baselines that run wrote. It pins what the gate promises: an unchanged screen passes, a
 * one-word change fails (the comparison is exact), a missing baseline fails until updated on
 * purpose, and a changed baseline produces a before and after.
 */
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {cpSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {after, before, describe, it} from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
// An app imports the fixture from `node_modules`. The scratch project installs a copy there, so the
// run proves the images land beside the spec that lists the routes (issue #253 feared they would
// resolve into the installed package, `<package>/screen/baseline.mjs-snapshots`).
const INSTALLED = 'lib/node_modules/@lifekit-hq/tokens/screen';
const PLAYWRIGHT = join(ROOT, 'node_modules/@playwright/test/cli.js');
const REPORT = join(ROOT, '.github/actions/baseline-report/baseline-report.mjs');
const REPO = 'lifekit-hq/lifekit-common';

const config = fixture => `
import {screenBaselineConfig} from '${fixture}';
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

const spec = fixture => `
import {defineScreenBaselines} from '${fixture}';
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

/** Where Playwright puts them: beside the spec that lists the routes, as docs/SCREEN-BASELINES.md says. */
const BASELINES = 'screens.spec.mjs-snapshots';
const baselines = () =>
  readdirSync(join(dir, BASELINES)).filter(name => name.endsWith('-linux.png'));

describe('the screen baseline gate', {skip: process.platform !== 'linux'}, () => {
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'baseline-flow-'));
    symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
    cpSync(join(ROOT, 'projects/tokens/screen'), join(dir, INSTALLED), {recursive: true});
    const fixture = pathToFileURL(join(dir, INSTALLED, 'index.mjs')).href;
    writeFileSync(join(dir, 'playwright.config.mjs'), config(fixture));
    writeFileSync(join(dir, 'screens.spec.mjs'), spec(fixture));
    git('init', '-q');
    git('config', 'user.email', 't@example.com');
    git('config', 'user.name', 't');
    git('config', 'core.autocrlf', 'false');
    writeFileSync(join(dir, '.gitignore'), '/node_modules\ntest-results\n');
  });

  after(() => rmSync(dir, {recursive: true, force: true}));

  it('fails a screen that has no baseline and writes nothing', () => {
    const run = playwright('Save');
    assert.notEqual(run.status, 0, run.stdout);
    assert.equal(readdirSync(dir).includes(BASELINES) ? baselines().length : 0, 0);
  });

  it('writes the first baselines only on an explicit update, then passes the same screen', () => {
    const update = playwright('Save', '--update-snapshots=all');
    assert.equal(update.status, 0, update.stdout + update.stderr);
    assert.deepEqual(
      readdirSync(join(dir, INSTALLED)).filter(name => name.endsWith('-snapshots')),
      [],
      'no baseline lands in the installed package'
    );
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
