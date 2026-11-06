import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {MARKER, MAX_ROWS, parseChanges, renderReport, screenName} from '../baseline-report.mjs';

const SCRIPT = fileURLToPath(new URL('../baseline-report.mjs', import.meta.url));
const SNAP = 'projects/ui/e2e/screens/templates.spec.ts-snapshots';
const file = (name, project = 'chromium') => `${SNAP}/${name}-${project}-linux.png`;
const REPO = 'lifekit-hq/lifekit-common';

describe('parseChanges', () => {
  it('keeps only added, modified and deleted Linux baselines, sorted', () => {
    const changes = parseChanges(
      [
        `M\t${file('b-desktop-light')}`,
        `A\t${file('a-phone-dark')}`,
        `D\t${file('c-phone-light')}`,
        `M\t${SNAP}/a-phone-light-chromium-win32.png`,
        'M\tprojects/ui/src/foo.ts',
        `M\tprojects/ui/e2e/screens/${'x'}-chromium-linux.png`,
        '',
      ].join('\n')
    );
    assert.deepEqual(
      changes.map(({status, path}) => [status, screenName(path)]),
      [
        ['added', 'a-phone-dark'],
        ['changed', 'b-desktop-light'],
        ['removed', 'c-phone-light'],
      ]
    );
  });
});

describe('renderReport', () => {
  it('prints nothing when no baseline changed', () => {
    assert.equal(renderReport({repo: REPO, base: 'b', head: 'h', changes: []}), '');
  });

  it('links the base image as before and the head image as after', () => {
    const path = file('t-phone-light');
    const body = renderReport({
      repo: REPO,
      base: 'base1',
      head: 'head1',
      changes: [{status: 'changed', path}],
    });
    assert.ok(body.startsWith(MARKER));
    assert.match(
      body,
      new RegExp(`blob/base1/${path}\\?raw=true" alt="t-phone-light before" width="195"`)
    );
    assert.match(body, new RegExp(`blob/head1/${path}\\?raw=true" alt="t-phone-light after"`));
    assert.match(body, /1 changed, 0 added, 0 removed/);
  });

  it('shows a new screen with no before image and a removed one with no after image', () => {
    const body = renderReport({
      repo: REPO,
      base: 'b',
      head: 'h',
      changes: [
        {status: 'added', path: file('n-desktop-dark')},
        {status: 'removed', path: file('o-desktop-dark')},
      ],
    });
    assert.match(body, /`n-desktop-dark` \(added\) \| _new screen_ \| <img src=".*\/blob\/h\//);
    assert.match(body, /`o-desktop-dark` \(removed\) \| <img src=".*\/blob\/b\/.*\| _removed_ \|/);
    assert.match(body, /width="400"/);
  });

  it('caps the rows and says how many it left out', () => {
    const changes = Array.from({length: MAX_ROWS + 3}, (_, i) => ({
      status: 'changed',
      path: file(`s${String(i).padStart(3, '0')}-phone-light`),
    }));
    const body = renderReport({repo: REPO, base: 'b', head: 'h', changes});
    assert.equal(body.match(/<img src=/g).length, MAX_ROWS * 2);
    assert.match(body, /and 3 more/);
    assert.ok(body.length < 65_000);
  });
});

describe('the command', () => {
  it('reads the baselines two commits differ by', () => {
    const dir = mkdtempSync(join(tmpdir(), 'baseline-report-'));
    const git = (...args) => execFileSync('git', ['-C', dir, ...args], {encoding: 'utf8'}).trim();
    try {
      git('init', '-q');
      git('config', 'user.email', 't@example.com');
      git('config', 'user.name', 't');
      mkdirSync(join(dir, SNAP), {recursive: true});
      writeFileSync(join(dir, file('x-phone-light')), 'one');
      git('add', '.');
      git('commit', '-qm', 'base');
      const base = git('rev-parse', 'HEAD');
      writeFileSync(join(dir, file('x-phone-light')), 'two');
      writeFileSync(join(dir, file('y-desktop-light')), 'new');
      git('add', '.');
      git('commit', '-qm', 'head');
      const head = git('rev-parse', 'HEAD');
      const out = execFileSync(
        process.execPath,
        [SCRIPT, '--repo', REPO, '--base', base, '--head', head],
        {cwd: dir, encoding: 'utf8'}
      );
      assert.match(out, /1 changed, 1 added, 0 removed/);
      assert.match(out, new RegExp(`blob/${base}/`));
      assert.match(out, new RegExp(`blob/${head}/`));
      const quiet = execFileSync(
        process.execPath,
        [SCRIPT, '--repo', REPO, '--base', head, '--head', head],
        {cwd: dir, encoding: 'utf8'}
      );
      assert.equal(quiet, '');
    } finally {
      rmSync(dir, {recursive: true, force: true});
    }
  });
});
