/**
 * `lifekit-whats-new` (docs/WHATS-NEW.md): the notes file and the release-please changelog become
 * the `whats-new.json` that `cmn-whats-new` reads. The parser is pure; the bin test drives the CLI.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, describe, it} from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  buildWhatsNew,
  cleanSubject,
  isUserFacing,
  parseChangelog,
  parseNotes,
} from '../whats-new/parse.mjs';

const BIN = fileURLToPath(new URL('../bin/lifekit-whats-new.mjs', import.meta.url));

const link = (label, url) => `([${label}](${url}))`;
const entry = (scope, subject, issue = 12) =>
  `* ${scope ? `**${scope}:** ` : ''}${subject} ${link(`#${issue}`, 'https://x/issues/1')} ${link('abc1234', 'https://x/commit/abc1234')}`;

const release = (version, date, sections) =>
  [
    `## [${version}](https://x/compare/v0...v${version}) (${date})`,
    '',
    ...Object.entries(sections).flatMap(([name, entries]) => ['', `### ${name}`, '', ...entries]),
    '',
  ].join('\n');

describe('parseChangelog', () => {
  it('keeps Features and Bug Fixes and drops the other sections', () => {
    const text = release('1.2.0', '2026-10-05', {
      Features: [entry('frontend', 'show a thing')],
      'Bug Fixes': [entry('frontend', 'fix a thing')],
      Performance: [entry('frontend', 'speed a thing up')],
      Documentation: [entry('frontend', 'describe a thing')],
    });

    assert.deepEqual(parseChangelog(text), [
      {version: '1.2.0', date: '2026-10-05', changes: ['Show a thing', 'Fix a thing']},
    ]);
  });

  it('drops internal scopes, spec numbers and internal terms, and keeps a mixed scope', () => {
    const text = release('1.2.0', '2026-10-05', {
      Features: [
        entry('ci', 'speed up the pipeline'),
        entry('auth,mcp', 'move the host'),
        entry('040', 'persona as code'),
        entry('frontend', 'scope alerts with a query filter'),
        entry('frontend', 'add a rate-limit banner'),
        entry('frontend', 'show the token expiry'),
        entry('frontend', 'cover the page with a test'),
        entry('radar,subscriptions', 'show the latest signals'),
        entry(undefined, 'a scopeless entry'),
      ],
    });

    assert.deepEqual(parseChangelog(text)[0].changes, [
      'Show the latest signals',
      'A scopeless entry',
    ]);
  });

  it("drops an app's own internal scope", () => {
    const text = release('1.2.0', '2026-10-05', {
      Features: [entry('bank-sync', 'run sooner'), entry('frontend', 'show a thing')],
    });

    assert.deepEqual(parseChangelog(text, {internalScopes: ['bank-sync']})[0].changes, [
      'Show a thing',
    ]);
  });

  it('strips issue links, commit hashes and markdown links, and decodes entities', () => {
    assert.equal(
      cleanSubject(
        `adopt [@lifekit-hq](https://github.com/lifekit-hq) copy &lt;amount&gt; over ${link('#757', 'https://x/issues/757')} ${link('f36e0c9', 'https://x/commit/f36e0c9')}`
      ),
      'Adopt @lifekit-hq copy <amount> over'
    );
    assert.equal(
      cleanSubject(
        'let promotions skip the floor ([#728](https://x/issues/728)), closes [#704](https://x/issues/704)'
      ),
      'Let promotions skip the floor'
    );
  });

  it('keeps a version with no kept entries and reads the heading without a link', () => {
    const text = [
      '## 0.9.0 (2026-01-02)',
      '',
      '### Documentation',
      '',
      entry('docs', 'words'),
    ].join('\n');

    assert.deepEqual(parseChangelog(text), [{version: '0.9.0', date: '2026-01-02', changes: []}]);
  });

  it('keeps the newest six versions in changelog order', () => {
    const text = [8, 7, 6, 5, 4, 3, 2, 1]
      .map(minor =>
        release(`1.${minor}.0`, '2026-10-05', {Features: [entry('frontend', `item ${minor}`)]})
      )
      .join('\n');

    assert.deepEqual(
      parseChangelog(text).map(v => v.version),
      ['1.8.0', '1.7.0', '1.6.0', '1.5.0', '1.4.0', '1.3.0']
    );
  });
});

describe('isUserFacing', () => {
  it('matches whole words only', () => {
    assert.equal(isUserFacing('frontend', 'show the latest contest'), true);
    assert.equal(isUserFacing('frontend', 'add a test'), false);
  });
});

describe('parseNotes', () => {
  const text = [
    '<!-- ignored -->',
    '',
    '## 1.2.0',
    '',
    '- You can do a thing.',
    '- You can invite people. (owner)',
    '- (owner) You can see the ledger.',
    '',
    '## 1.1.0',
    '- Older line.',
    'not a bullet',
  ].join('\n');

  it('reads bullets per version and tags owner lines at either end', () => {
    const notes = parseNotes(text);

    assert.deepEqual(notes.get('1.2.0'), [
      {text: 'You can do a thing.', owner: false},
      {text: 'You can invite people.', owner: true},
      {text: 'You can see the ledger.', owner: true},
    ]);
    assert.deepEqual(notes.get('1.1.0'), [{text: 'Older line.', owner: false}]);
  });

  it('is empty for an empty file', () => {
    assert.equal(parseNotes('').size, 0);
  });
});

describe('buildWhatsNew', () => {
  const changelog = [
    release('1.2.0', '2026-10-05', {Features: [entry('frontend', 'show a thing')]}),
    release('1.1.0', '2026-09-29', {Features: [entry('frontend', 'show another thing')]}),
  ].join('\n');

  it('attaches the plain notes written for each changelog version', () => {
    const data = buildWhatsNew('## 1.2.0\n- You can do a thing.\n', changelog);

    assert.deepEqual(data.versions[0].notes, [{text: 'You can do a thing.', owner: false}]);
    assert.deepEqual(data.versions[0].changes, ['Show a thing']);
  });

  it('gives a version without notes an empty list, and ignores notes for an unreleased version', () => {
    const data = buildWhatsNew('## 9.9.9\n- Not released yet.\n', changelog);

    assert.deepEqual(
      data.versions.map(v => [v.version, v.notes.length]),
      [
        ['1.2.0', 0],
        ['1.1.0', 0],
      ]
    );
  });

  it('lists the notes file’s own versions, in file order, when there is no changelog', () => {
    const data = buildWhatsNew('## 2.0.0\n- New.\n\n## 1.9.0\n- Older.\n');

    assert.deepEqual(data.versions, [
      {version: '2.0.0', date: null, notes: [{text: 'New.', owner: false}], changes: []},
      {version: '1.9.0', date: null, notes: [{text: 'Older.', owner: false}], changes: []},
    ]);
  });
});

describe('lifekit-whats-new', () => {
  const dir = mkdtempSync(join(tmpdir(), 'whats-new-'));
  after(() => rmSync(dir, {recursive: true, force: true}));

  const notes = join(dir, 'notes.md');
  const out = join(dir, 'public', 'whats-new.json');
  writeFileSync(notes, '## 1.0.0\n- You can sign in.\n');

  const run = (...args) =>
    spawnSync(process.execPath, [BIN, '--notes', notes, '--out', out, ...args], {
      encoding: 'utf8',
    });

  it('writes the json, creating its folder', () => {
    const result = run();

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')).versions[0].notes, [
      {text: 'You can sign in.', owner: false},
    ]);
  });

  it('--check passes on a fresh file and fails once the notes move on', () => {
    assert.equal(run('--check').status, 0);

    writeFileSync(notes, '## 1.1.0\n- You can sign out.\n');
    const stale = run('--check');

    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /out of date/);
  });

  it('fails on a changelog path that does not exist', () => {
    mkdirSync(dir, {recursive: true});
    const result = run('--changelog', join(dir, 'missing.md'));

    assert.equal(result.status, 2);
    assert.match(result.stderr, /not found/);
  });
});
